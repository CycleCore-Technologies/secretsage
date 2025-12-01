/**
 * Grant Command
 *
 * Decrypt and write credentials to .env for agent use.
 */

import { CredentialService } from '../core/service';
import { loadConfig } from '../config/loader';
import * as output from '../utils/output';
import { selectCredentials, confirm } from '../utils/prompts';

interface GrantOptions {
  all?: boolean;
  yes?: boolean;
  backup?: boolean;
}

export async function grantCommand(names: string[], options: GrantOptions): Promise<void> {
  const service = new CredentialService();
  const config = await loadConfig();

  // Check vault exists
  const vaults = await service.hasVault();
  if (!vaults.local && !vaults.global) {
    output.error('No vault found. Run `secretsage init` first.');
    process.exit(1);
  }

  await service.init();

  try {
    // Get list of available credentials
    const allCredentials = await service.list();

    if (allCredentials.length === 0) {
      output.error('No credentials in vault.');
      console.log(`Add credentials with: ${output.colors.highlight('secretsage add NAME')}`);
      process.exit(1);
    }

    let selectedNames: string[];

    if (options.all) {
      // Grant all credentials
      selectedNames = allCredentials.map((c) => c.name);
    } else if (names.length > 0) {
      // Use provided names
      selectedNames = names;

      // Validate names exist
      const availableNames = new Set(allCredentials.map((c) => c.name));
      const missingNames = selectedNames.filter((n) => !availableNames.has(n));

      if (missingNames.length > 0) {
        output.error(`Credentials not found: ${missingNames.join(', ')}`);
        output.info('Available credentials:');
        allCredentials.forEach((c) => console.log(`  ${output.credentialName(c.name)}`));
        process.exit(1);
      }
    } else {
      // Interactive selection
      selectedNames = await selectCredentials(
        allCredentials.map((c) => c.name),
        'Select credentials to grant to .env:'
      );
    }

    if (selectedNames.length === 0) {
      output.info('No credentials selected.');
      return;
    }

    // Confirmation (unless --yes)
    if (!options.yes && config.agent.requireConfirmation) {
      console.log('');
      console.log('Credentials to grant:');
      selectedNames.forEach((n) => console.log(`  ${output.credentialName(n)}`));
      console.log('');

      const proceed = await confirm('Write these credentials to .env?', true);
      if (!proceed) {
        console.log('Aborted.');
        return;
      }
    }

    // Grant credentials
    const spin = output.spinner('Decrypting and writing to .env...');
    spin.start();

    const { granted, envPath } = await service.grant(selectedNames, {
      backup: options.backup ?? config.agent.backupEnvOnGrant,
    });

    spin.succeed(`Granted ${granted.length} credential${granted.length === 1 ? '' : 's'} to .env`);

    console.log('');
    output.divider();
    granted.forEach((n) => console.log(`  ${output.colors.success('✓')} ${output.credentialName(n)}`));
    output.divider();
    output.keyValue('File', envPath);
    console.log('');

    // Remind about cleanup
    output.info('Remember to revoke when done:');
    console.log(`  ${output.colors.highlight('secretsage revoke --all')}`);
  } catch (error) {
    output.error((error as Error).message);
    process.exit(1);
  }
}

/**
 * Revoke Command
 *
 * Remove credentials from .env (vault remains intact).
 */

import * as fs from 'fs-extra';
import { parse as parseEnv } from 'dotenv';
import { CredentialService } from '../core/service';
import { getEnvPath } from '../config/paths';
import * as output from '../utils/output';
import { selectCredentials, confirm } from '../utils/prompts';

interface RevokeOptions {
  all?: boolean;
  yes?: boolean;
}

export async function revokeCommand(names: string[], options: RevokeOptions): Promise<void> {
  const service = new CredentialService();
  const envPath = getEnvPath();

  // Check if .env exists
  if (!(await fs.pathExists(envPath))) {
    output.info('No .env file found. Nothing to revoke.');
    return;
  }

  // Read current .env
  const content = await fs.readFile(envPath, 'utf8');
  const env = parseEnv(content);
  const envKeys = Object.keys(env);

  if (envKeys.length === 0) {
    output.info('.env file is empty. Nothing to revoke.');
    return;
  }

  // Get vault credentials for reference
  const vaults = await service.hasVault();
  let vaultCredentials: string[] = [];

  if (vaults.local || vaults.global) {
    await service.init();
    const creds = await service.list();
    vaultCredentials = creds.map((c) => c.name);
  }

  // Find credentials in .env that are also in vault
  const revokeableCreds = envKeys.filter((k) => vaultCredentials.includes(k));

  if (revokeableCreds.length === 0 && !options.all) {
    output.info('No SecretSage-managed credentials found in .env.');
    output.info('Use --all to remove all credentials from .env.');
    return;
  }

  let selectedNames: string[];

  if (options.all) {
    // Revoke all credentials in .env
    selectedNames = envKeys;
  } else if (names.length > 0) {
    // Use provided names
    selectedNames = names;

    // Validate names exist in .env
    const missingNames = selectedNames.filter((n) => !envKeys.includes(n));
    if (missingNames.length > 0) {
      output.warning(`Not found in .env: ${missingNames.join(', ')}`);
      selectedNames = selectedNames.filter((n) => envKeys.includes(n));
    }
  } else {
    // Interactive selection
    selectedNames = await selectCredentials(
      revokeableCreds,
      'Select credentials to remove from .env:'
    );
  }

  if (selectedNames.length === 0) {
    output.info('No credentials selected.');
    return;
  }

  // Confirmation (unless --yes)
  if (!options.yes) {
    console.log('');
    console.log('Credentials to remove from .env:');
    selectedNames.forEach((n) => console.log(`  ${output.credentialName(n)}`));
    console.log('');
    output.warning('Values will be removed from .env. Vault remains intact.');

    const proceed = await confirm('Continue?', true);
    if (!proceed) {
      console.log('Aborted.');
      return;
    }
  }

  // Revoke credentials
  const spin = output.spinner('Removing credentials from .env...');
  spin.start();

  try {
    const { revoked } = await service.revoke(selectedNames);

    if (revoked.length === 0) {
      spin.info('No credentials to revoke.');
      return;
    }

    spin.succeed(`Revoked ${revoked.length} credential${revoked.length === 1 ? '' : 's'} from .env`);

    console.log('');
    output.divider();
    revoked.forEach((n) => console.log(`  ${output.colors.warning('✗')} ${output.credentialName(n)}`));
    output.divider();
    console.log('');

    output.info('Credentials are still safe in the vault.');
    console.log(`  Re-grant with: ${output.colors.highlight('secretsage grant')}`);
  } catch (error) {
    spin.fail('Failed to revoke credentials');
    output.error((error as Error).message);
    process.exit(1);
  }
}

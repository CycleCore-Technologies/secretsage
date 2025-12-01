/**
 * Rotate Command
 *
 * Update the value of an existing credential.
 */

import { CredentialService } from '../core/service';
import * as output from '../utils/output';
import { promptCredentialValue, confirm } from '../utils/prompts';

interface RotateOptions {
  value?: string;
  yes?: boolean;
  quiet?: boolean;
}

/**
 * Read value from stdin (for piped input)
 */
async function readStdin(): Promise<string> {
  return new Promise((resolve, reject) => {
    let data = '';
    process.stdin.setEncoding('utf8');
    process.stdin.on('data', (chunk) => { data += chunk; });
    process.stdin.on('end', () => { resolve(data.trim()); });
    process.stdin.on('error', reject);

    // Handle case where stdin is a TTY (not piped)
    if (process.stdin.isTTY) {
      reject(new Error('No input provided via stdin. Use --value with a value or omit to use interactive prompt.'));
    }
  });
}

export async function rotateCommand(name: string, options: RotateOptions): Promise<void> {
  const service = new CredentialService();

  // Check vault exists
  const vaults = await service.hasVault();
  if (!vaults.local && !vaults.global) {
    output.error('No vault found. Run `secretsage init` first.');
    process.exit(1);
  }

  await service.init();

  // Check credential exists
  const credential = await service.get(name);
  if (!credential) {
    output.error(`Credential "${name}" not found in vault.`);
    const list = await service.list();
    if (list.length > 0) {
      output.info('Available credentials:');
      list.forEach((c) => console.log(`  ${c.name}`));
    }
    process.exit(1);
  }

  // Get new value
  let newValue: string;

  if (options.value === '-') {
    // Read from stdin
    try {
      newValue = await readStdin();
      if (!newValue) {
        output.error('Empty input received from stdin.');
        process.exit(1);
      }
    } catch (error) {
      output.error((error as Error).message);
      process.exit(1);
    }
  } else if (options.value) {
    newValue = options.value;
  } else {
    // Prompt for new value
    newValue = await promptCredentialValue(name);
  }

  // Confirm rotation
  if (!options.yes) {
    const confirmed = await confirm(
      `Are you sure you want to rotate "${name}"?`
    );
    if (!confirmed) {
      output.info('Cancelled.');
      return;
    }
  }

  // Update in vault
  const spin = options.quiet ? null : output.spinner(`Rotating ${name}...`);
  spin?.start();

  try {
    await service.add(name, newValue);
    spin?.stop();

    if (!options.quiet) {
      const vaultPath = await service.getVaultPath();
      output.credentialSaved(name, vaultPath);
      output.info('Credential rotated. Run `secretsage grant` to update .env');
    }
  } catch (error) {
    spin?.fail(`Failed to rotate ${name}`);
    output.error((error as Error).message);
    process.exit(1);
  }
}

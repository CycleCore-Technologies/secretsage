/**
 * Add Command
 *
 * Add a credential to the encrypted vault.
 */

import * as fs from 'fs-extra';
import { parse as parseEnv } from 'dotenv';
import { CredentialService } from '../core/service';
import { getEnvPath } from '../config/paths';
import * as output from '../utils/output';
import { promptCredentialValue } from '../utils/prompts';

interface AddOptions {
  value?: string;
  fromEnv?: boolean;
  quiet?: boolean;
}

export async function addCommand(name: string, options: AddOptions): Promise<void> {
  const service = new CredentialService();

  // Check vault exists
  const vaults = await service.hasVault();
  if (!vaults.local && !vaults.global) {
    output.error('No vault found. Run `secretsage init` first.');
    process.exit(1);
  }

  await service.init();

  // Validate credential name
  if (!/^[A-Z][A-Z0-9_]*$/.test(name)) {
    output.warning(`Credential name "${name}" doesn't follow ENV convention (UPPER_SNAKE_CASE).`);
  }

  let value: string;

  if (options.fromEnv) {
    // Import from existing .env
    const envPath = getEnvPath();
    if (!(await fs.pathExists(envPath))) {
      output.error('No .env file found in current directory.');
      process.exit(1);
    }

    const content = await fs.readFile(envPath, 'utf8');
    const env = parseEnv(content);

    if (!(name in env)) {
      output.error(`Credential "${name}" not found in .env file.`);
      process.exit(1);
    }

    value = env[name];
    if (!options.quiet) {
      output.info(`Importing ${name} from .env`);
    }
  } else if (options.value) {
    // Use provided value
    value = options.value;
  } else {
    // Prompt for value
    value = await promptCredentialValue(name);
  }

  // Add to vault
  const spin = options.quiet ? null : output.spinner(`Encrypting ${name}...`);
  spin?.start();

  try {
    await service.add(name, value);
    spin?.stop();

    if (!options.quiet) {
      const vaultPath = await service.getVaultPath();
      output.credentialSaved(name, vaultPath);

      output.info('Grant this credential to .env with:');
      console.log(`  ${output.colors.highlight(`secretsage grant ${name}`)}`);
      console.log('');
    }
  } catch (error) {
    spin?.fail(`Failed to add ${name}`);
    output.error((error as Error).message);
    process.exit(1);
  }
}

/**
 * Init Command
 *
 * Initialize SecretSage vault and generate encryption keypair.
 */

import { CredentialService } from '../core/service';
import { loadConfig, saveConfig } from '../config/loader';
import { getGlobalDir, getLocalDir } from '../config/paths';
import * as output from '../utils/output';
import { confirm, promptVaultLocation, promptCustomPath } from '../utils/prompts';
import { printBanner } from '../utils/banner';

interface InitOptions {
  local?: boolean;
  path?: string;
  yes?: boolean;
  force?: boolean;
}

export async function initCommand(options: InitOptions): Promise<void> {
  const service = new CredentialService();

  // Check existing vaults
  const vaults = await service.hasVault();

  if (vaults.local || vaults.global) {
    if (!options.force) {
      const existingLocation = vaults.local ? 'local (.secretsage/)' : 'global (~/.secretsage/)';
      output.warning(`A vault already exists: ${existingLocation}`);

      if (!options.yes) {
        const proceed = await confirm('Overwrite existing vault? This will delete all stored credentials.', false);
        if (!proceed) {
          console.log('Aborted.');
          return;
        }
      }
    }
  }

  // Determine vault location
  let local = options.local ?? false;
  let customPath: string | undefined = options.path;
  let locationType: 'global' | 'local' | 'custom' = 'global';

  if (options.path) {
    // Custom path provided via CLI flag
    locationType = 'custom';
    customPath = options.path;
  } else if (!options.yes && !options.local) {
    const choice = await promptVaultLocation();
    if (choice === 'custom') {
      locationType = 'custom';
      customPath = await promptCustomPath();
    } else if (choice === 'local') {
      locationType = 'local';
      local = true;
    } else {
      locationType = 'global';
    }
  } else if (options.local) {
    locationType = 'local';
    local = true;
  }

  // Show spinner
  const spin = output.spinner('Initializing SecretSage vault...');
  spin.start();

  try {
    // Initialize vault
    const { publicKey, vaultDir } = await service.initializeVault({
      local,
      customPath,
    });

    // Save config
    await saveConfig(
      {
        version: '1',
        vault: {
          defaultLocation: locationType,
          ...(customPath ? { customPath: vaultDir } : {}),
        },
        encryption: {
          provider: 'age',
        },
      },
      locationType === 'local'
    );

    // Update .gitignore
    const gitignoreUpdated = await service.updateGitignore();

    spin.succeed('Vault initialized successfully!');

    console.log('');
    output.divider();
    output.keyValue('Vault location', vaultDir);
    output.keyValue('Public key', publicKey);

    if (gitignoreUpdated) {
      output.keyValue('.gitignore', 'Updated (added .env, .secretsage/)');
    }

    output.divider();
    console.log('');

    output.info('Your vault is ready! Add credentials with:');
    console.log(`  ${output.colors.highlight('secretsage add OPENAI_API_KEY')}`);
    console.log('');
  } catch (error) {
    spin.fail('Failed to initialize vault');
    output.error((error as Error).message);
    process.exit(1);
  }
}

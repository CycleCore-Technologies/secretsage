/**
 * Status Command
 *
 * Show vault status and health check.
 */

import * as fs from 'fs-extra';
import { parse as parseEnv } from 'dotenv';
import { CredentialService } from '../core/service';
import { getEnvPath, getLocalDir, getGlobalDir, hasLocalVault, hasGlobalVault } from '../config/paths';
import * as output from '../utils/output';

interface StatusOptions {
  json?: boolean;
}

interface StatusInfo {
  vault: {
    path: string;
    type: 'local' | 'global' | 'custom' | 'none';
    exists: boolean;
  };
  credentials: {
    stored: number;
    granted: number;
    available: number;
  };
  env: {
    path: string;
    exists: boolean;
  };
}

export async function statusCommand(options: StatusOptions): Promise<void> {
  const service = new CredentialService();

  // Determine vault status
  const hasLocal = await hasLocalVault();
  const hasGlobal = await hasGlobalVault();

  let vaultType: 'local' | 'global' | 'custom' | 'none' = 'none';
  let vaultPath = '';
  let vaultExists = false;

  if (hasLocal) {
    vaultType = 'local';
    vaultPath = getLocalDir();
    vaultExists = true;
  } else if (hasGlobal) {
    vaultType = 'global';
    vaultPath = getGlobalDir();
    vaultExists = true;
  }

  // Get credential counts
  let storedCount = 0;
  let grantedCount = 0;
  const grantedNames: string[] = [];

  if (vaultExists) {
    await service.init();
    const credentials = await service.list();
    storedCount = credentials.length;

    // Check .env for granted credentials
    const envPath = getEnvPath();
    if (await fs.pathExists(envPath)) {
      const envContent = await fs.readFile(envPath, 'utf8');
      const envVars = parseEnv(envContent);
      const envNames = new Set(Object.keys(envVars));

      for (const cred of credentials) {
        if (envNames.has(cred.name)) {
          grantedCount++;
          grantedNames.push(cred.name);
        }
      }
    }
  }

  const envPath = getEnvPath();
  const envExists = await fs.pathExists(envPath);

  const status: StatusInfo = {
    vault: {
      path: vaultPath,
      type: vaultType,
      exists: vaultExists,
    },
    credentials: {
      stored: storedCount,
      granted: grantedCount,
      available: storedCount - grantedCount,
    },
    env: {
      path: envPath,
      exists: envExists,
    },
  };

  if (options.json) {
    console.log(JSON.stringify(status, null, 2));
    return;
  }

  // Human-readable output
  console.log('');
  output.header('SecretSage Status');
  output.divider();

  if (!vaultExists) {
    output.keyValue('Vault', output.colors.error('Not initialized'));
    output.info('Run `secretsage init` to create a vault.');
    console.log('');
    return;
  }

  // Vault info
  const vaultTypeLabel = vaultType === 'local' ? '(local)' : vaultType === 'global' ? '(global)' : '';
  output.keyValue('Vault', `${vaultPath} ${output.colors.dim(vaultTypeLabel)}`);

  // Credential counts
  output.keyValue('Credentials', `${storedCount} stored`);

  if (storedCount > 0) {
    const grantedLabel = grantedCount > 0
      ? output.colors.success(`${grantedCount} granted`)
      : output.colors.dim('0 granted');
    const availableLabel = (storedCount - grantedCount) > 0
      ? output.colors.warning(`${storedCount - grantedCount} available`)
      : output.colors.dim('0 available');
    output.keyValue('.env', `${grantedLabel}, ${availableLabel}`);
  }

  output.divider();
  console.log('');

  // Hints
  if (storedCount === 0) {
    output.info('Add credentials with: secretsage add <NAME>');
  } else if (grantedCount === 0) {
    output.info('Grant credentials to .env with: secretsage grant --all');
  } else if (grantedCount < storedCount) {
    output.info(`${storedCount - grantedCount} credentials available to grant.`);
  }
}

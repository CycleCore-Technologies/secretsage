/**
 * Config Command
 *
 * View or update SecretSage configuration.
 */

import * as fs from 'fs-extra';
import { loadConfig, saveConfig, getActiveConfigPath } from '../config/loader';
import {
  getGlobalDir,
  getLocalDir,
  getIdentityPath,
  getRecipientPath,
  hasLocalVault,
  hasGlobalVault,
} from '../config/paths';
import { AgeProvider } from '../encryption/age';
import * as output from '../utils/output';

interface ConfigOptions {
  show?: boolean;
  set?: string;
  path?: boolean;
}

export async function configCommand(options: ConfigOptions): Promise<void> {
  if (options.path) {
    // Show config file path
    const configPath = await getActiveConfigPath();
    console.log(configPath);
    return;
  }

  if (options.set) {
    // Set a config value
    await setConfigValue(options.set);
    return;
  }

  // Default: show config
  await showConfig();
}

async function showConfig(): Promise<void> {
  const config = await loadConfig();

  const hasLocal = await hasLocalVault();
  const hasGlobal = await hasGlobalVault();

  console.log('');
  console.log(output.colors.highlight('SecretSage Configuration'));
  console.log('');

  output.divider();

  // Vault status
  console.log(output.colors.muted('Vault:'));
  if (hasLocal) {
    output.keyValue('  Location', 'Local (.secretsage/)');
    output.keyValue('  Path', getLocalDir());
  } else if (hasGlobal) {
    output.keyValue('  Location', 'Global (~/.secretsage/)');
    output.keyValue('  Path', getGlobalDir());
  } else {
    output.keyValue('  Status', output.colors.warning('Not initialized'));
    console.log('');
    output.info('Run `secretsage init` to create a vault.');
    return;
  }

  // Public key
  try {
    const ageProvider = new AgeProvider();
    const recipientPath = hasLocal ? getRecipientPath(true) : getRecipientPath(false);

    if (await fs.pathExists(recipientPath)) {
      const publicKey = await ageProvider.loadRecipient(recipientPath);
      output.keyValue('  Public key', publicKey);
    }
  } catch {
    // Ignore errors
  }

  console.log('');

  // Encryption
  console.log(output.colors.muted('Encryption:'));
  output.keyValue('  Provider', config.encryption.provider);

  console.log('');

  // Agent settings
  console.log(output.colors.muted('Agent:'));
  output.keyValue('  Auto gitignore', config.agent.autoGitignore ? 'Yes' : 'No');
  output.keyValue('  Backup .env', config.agent.backupEnvOnGrant ? 'Yes' : 'No');
  output.keyValue('  Require confirm', config.agent.requireConfirmation ? 'Yes' : 'No');

  output.divider();
  console.log('');
}

async function setConfigValue(keyValue: string): Promise<void> {
  const [key, ...valueParts] = keyValue.split('=');
  const value = valueParts.join('=');

  if (!key || value === undefined) {
    output.error('Invalid format. Use: secretsage config --set key=value');
    process.exit(1);
  }

  const config = await loadConfig();

  // Parse the key path (e.g., 'agent.autoGitignore')
  const keys = key.split('.');

  // Navigate to the right config level
  let current: Record<string, unknown> = config as unknown as Record<string, unknown>;

  for (let i = 0; i < keys.length - 1; i++) {
    const k = keys[i];
    if (!(k in current) || typeof current[k] !== 'object') {
      output.error(`Unknown config key: ${key}`);
      process.exit(1);
    }
    current = current[k] as Record<string, unknown>;
  }

  const finalKey = keys[keys.length - 1];

  if (!(finalKey in current)) {
    output.error(`Unknown config key: ${key}`);
    process.exit(1);
  }

  // Parse value
  let parsedValue: unknown = value;
  if (value === 'true') parsedValue = true;
  else if (value === 'false') parsedValue = false;
  else if (!isNaN(Number(value))) parsedValue = Number(value);

  current[finalKey] = parsedValue;

  // Determine if local or global
  const isLocal = await hasLocalVault();

  // Save updated config
  await saveConfig(config, isLocal);

  output.success(`Set ${key} = ${String(parsedValue)}`);
}

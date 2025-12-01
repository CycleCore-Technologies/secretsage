/**
 * Configuration loader for SecretSage
 *
 * Handles loading and merging global and local configs.
 */

import * as fs from 'fs-extra';
import * as yaml from 'yaml';
import { getConfigPath, getGlobalDir, getLocalDir, hasLocalVault } from './paths';
import type { SecretSageConfig } from './types';
import { getDefaultConfig } from './types';

/**
 * Load configuration from file
 *
 * Priority:
 * 1. Local config (.secretsage/config.yaml)
 * 2. Global config (~/.secretsage/config.yaml)
 * 3. Default config
 */
export async function loadConfig(): Promise<SecretSageConfig> {
  const defaultConfig = getDefaultConfig();

  // Try to load global config first
  let globalConfig: Partial<SecretSageConfig> = {};
  const globalConfigPath = getConfigPath(false);

  if (await fs.pathExists(globalConfigPath)) {
    try {
      const content = await fs.readFile(globalConfigPath, 'utf8');
      globalConfig = yaml.parse(content) || {};
    } catch {
      // Ignore parse errors, use defaults
    }
  }

  // Try to load local config
  let localConfig: Partial<SecretSageConfig> = {};
  const localConfigPath = getConfigPath(true);

  if (await fs.pathExists(localConfigPath)) {
    try {
      const content = await fs.readFile(localConfigPath, 'utf8');
      localConfig = yaml.parse(content) || {};
    } catch {
      // Ignore parse errors, use defaults
    }
  }

  // Merge configs: default < global < local
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return deepMerge(defaultConfig as any, globalConfig as any, localConfig as any) as unknown as SecretSageConfig;
}

/**
 * Save configuration to file
 */
export async function saveConfig(
  config: Partial<SecretSageConfig>,
  local = false
): Promise<void> {
  const configPath = getConfigPath(local);
  const dir = local ? getLocalDir() : getGlobalDir();

  await fs.ensureDir(dir);

  const content = yaml.stringify(config, {
    indent: 2,
    lineWidth: 80,
  });

  // Add header comment
  const header = `# SecretSage Configuration
# https://cyclecore.ai
#
# Run 'secretsage config --show' to see all options
`;

  await fs.writeFile(configPath, header + content, { mode: 0o600 });
}

/**
 * Get the active config path (local if exists, otherwise global)
 */
export async function getActiveConfigPath(): Promise<string> {
  if (await hasLocalVault()) {
    return getConfigPath(true);
  }
  return getConfigPath(false);
}

/**
 * Check if local config exists
 */
export async function hasLocalConfig(): Promise<boolean> {
  return fs.pathExists(getConfigPath(true));
}

/**
 * Check if global config exists
 */
export async function hasGlobalConfig(): Promise<boolean> {
  return fs.pathExists(getConfigPath(false));
}

/**
 * Deep merge objects
 */
function deepMerge(
  target: Record<string, unknown>,
  ...sources: Record<string, unknown>[]
): Record<string, unknown> {
  const result = { ...target };

  for (const source of sources) {
    if (!source) continue;

    for (const key in source) {
      const sourceValue = source[key];
      const targetValue = result[key];

      if (
        sourceValue !== null &&
        typeof sourceValue === 'object' &&
        !Array.isArray(sourceValue) &&
        targetValue !== null &&
        typeof targetValue === 'object' &&
        !Array.isArray(targetValue)
      ) {
        // Recursively merge objects
        result[key] = deepMerge(
          targetValue as Record<string, unknown>,
          sourceValue as Record<string, unknown>
        );
      } else if (sourceValue !== undefined) {
        // Override with source value
        result[key] = sourceValue;
      }
    }
  }

  return result;
}

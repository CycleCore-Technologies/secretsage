/**
 * Configuration types for SecretSage
 */

/**
 * Main configuration schema
 */
export interface SecretSageConfig {
  /** Config file version */
  version: string;

  /** Vault settings */
  vault: VaultConfig;

  /** Encryption settings */
  encryption: EncryptionConfig;

  /** Credential source settings */
  sources: SourceConfig[];

  /** Agent/automation settings */
  agent: AgentConfig;
}

/**
 * Vault configuration
 */
export interface VaultConfig {
  /** Default vault location: 'global', 'local', or 'custom' */
  defaultLocation: 'global' | 'local' | 'custom';

  /** Custom global vault path (default: ~/.secretsage) */
  globalPath?: string;

  /** Custom local vault path (default: .secretsage) */
  localPath?: string;

  /** Custom vault path (user-specified arbitrary directory) */
  customPath?: string;
}

/**
 * Encryption configuration
 */
export interface EncryptionConfig {
  /** Encryption provider: 'age' (default) */
  provider: 'age';

  /** Path to identity file (overrides default) */
  identityPath?: string;

  /** Path to recipient file (overrides default) */
  recipientPath?: string;
}

/**
 * Credential source configuration
 */
export interface SourceConfig {
  /** Source type: 'local', '1password', 'bitwarden', etc. */
  type: string;

  /** Whether this source is enabled */
  enabled: boolean;

  /** Priority for resolution (lower = higher priority) */
  priority: number;

  /** Source-specific options */
  options?: Record<string, unknown>;
}

/**
 * Agent/automation configuration
 */
export interface AgentConfig {
  /** Automatically add .secretsage and .env to .gitignore */
  autoGitignore: boolean;

  /** Backup .env before granting credentials */
  backupEnvOnGrant: boolean;

  /** Require confirmation for grant operations */
  requireConfirmation: boolean;
}

/**
 * Default configuration
 */
export function getDefaultConfig(): SecretSageConfig {
  return {
    version: '1',
    vault: {
      defaultLocation: 'global',
    },
    encryption: {
      provider: 'age',
    },
    sources: [
      {
        type: 'local',
        enabled: true,
        priority: 1,
      },
    ],
    agent: {
      autoGitignore: true,
      backupEnvOnGrant: true,
      requireConfirmation: true,
    },
  };
}

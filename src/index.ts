/**
 * SecretSage - Terminal-based credential wizard for agent-driven development
 *
 * @packageDocumentation
 */

// Core types
export type {
  Credential,
  CredentialMetadata,
  CredentialScope,
} from './core/types';

// Interfaces for extensibility
export type { ICredentialSource } from './sources/types';
export type { IEncryptionProvider, KeyPair } from './encryption/types';

// Core service
export { CredentialService } from './core/service';

// Built-in implementations
export { AgeProvider } from './encryption/age';
export { LocalSource } from './sources/local';
export { CredentialSourceRegistry } from './sources/registry';

// Config
export { loadConfig } from './config/loader';
export { getConfigPath } from './config/paths';
export type { SecretSageConfig } from './config/types';

// Utilities
export { printBanner, BANNER, COMPACT_BANNER } from './utils/banner';

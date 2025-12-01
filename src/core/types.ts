/**
 * Core type definitions for SecretSage
 */

/**
 * A credential with its decrypted value
 */
export interface Credential {
  /** Credential name (e.g., OPENAI_API_KEY) */
  name: string;
  /** Decrypted credential value */
  value: string;
  /** Which source provided this credential */
  source: string;
  /** Optional metadata */
  metadata?: CredentialMetadata;
}

/**
 * Credential metadata (stored alongside encrypted value)
 */
export interface CredentialMetadata {
  /** Credential name */
  name: string;
  /** When the credential was added */
  createdAt?: Date;
  /** When the credential was last updated */
  updatedAt?: Date;
  /** Optional description */
  description?: string;
  /** Optional tags for organization */
  tags?: string[];
  /** Access scope restrictions */
  scope?: CredentialScope;
}

/**
 * Access scope for a credential
 * Used for agent access control (v2 feature)
 */
export interface CredentialScope {
  /** Allowed project paths */
  allowedPaths?: string[];
  /** Allowed agent identifiers */
  allowedAgents?: string[];
  /** Expiration time */
  validUntil?: Date;
}

/**
 * Result of a vault operation
 */
export interface VaultOperationResult {
  success: boolean;
  message?: string;
  error?: Error;
}

/**
 * Vault file entry (encrypted credential)
 */
export interface VaultEntry {
  /** Credential name */
  name: string;
  /** Encrypted value (age ciphertext) */
  encryptedValue: string;
  /** Metadata */
  metadata?: CredentialMetadata;
}

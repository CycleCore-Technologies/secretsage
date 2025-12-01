/**
 * Credential source interface
 *
 * Allows SecretSage to support different credential backends
 * (local vault, 1Password, Bitwarden, Keychain, etc.) through
 * a common interface.
 */

import type { Credential, CredentialMetadata } from '../core/types';

/**
 * Credential source interface
 *
 * Implementations must provide:
 * - Credential CRUD operations
 * - Availability check
 * - List/search functionality
 *
 * The modular design enables plugin-based credential sources.
 */
export interface ICredentialSource {
  /** Source identifier (e.g., 'local', '1password', 'bitwarden') */
  readonly id: string;

  /** Human-readable name */
  readonly name: string;

  /** Priority for source resolution (lower = higher priority) */
  readonly priority: number;

  /**
   * Check if the source is available and configured
   * (e.g., vault exists, CLI installed, authenticated)
   */
  isAvailable(): Promise<boolean>;

  /**
   * Get a credential by name
   *
   * @param name - Credential name (e.g., OPENAI_API_KEY)
   * @returns Credential with decrypted value, or null if not found
   */
  get(name: string): Promise<Credential | null>;

  /**
   * List all credential metadata (names, not values)
   *
   * @returns Array of credential metadata
   */
  list(): Promise<CredentialMetadata[]>;

  /**
   * Store a credential
   *
   * @param name - Credential name
   * @param value - Credential value (plaintext)
   * @param metadata - Optional metadata
   */
  set?(name: string, value: string, metadata?: Partial<CredentialMetadata>): Promise<void>;

  /**
   * Delete a credential
   *
   * @param name - Credential name
   * @returns true if deleted, false if not found
   */
  delete?(name: string): Promise<boolean>;

  /**
   * Search credentials by pattern
   *
   * @param pattern - Search pattern (glob or regex)
   * @returns Matching credential metadata
   */
  search?(pattern: string): Promise<CredentialMetadata[]>;

  /**
   * Initialize the source (create vault, authenticate, etc.)
   */
  initialize?(): Promise<void>;
}

/**
 * Encryption provider interface
 *
 * Allows SecretSage to support different encryption backends
 * (age, sodium, GPG, etc.) through a common interface.
 */

/**
 * Key pair for asymmetric encryption
 */
export interface KeyPair {
  /** Public key (recipient) - safe to share */
  publicKey: string;
  /** Private key (identity) - must be kept secret */
  privateKey: string;
}

/**
 * Encryption provider interface
 *
 * Implementations must provide:
 * - Key generation
 * - Encrypt with public key
 * - Decrypt with private key
 *
 * The modular design allows swapping encryption backends
 * as standards evolve.
 */
export interface IEncryptionProvider {
  /** Provider identifier (e.g., 'age', 'sodium') */
  readonly id: string;

  /** Human-readable name */
  readonly name: string;

  /**
   * Check if the provider is available
   * (e.g., required binaries installed, keys present)
   */
  isAvailable(): Promise<boolean>;

  /**
   * Generate a new key pair
   */
  generateKeyPair(): Promise<KeyPair>;

  /**
   * Encrypt plaintext using recipient's public key
   *
   * @param plaintext - Text to encrypt
   * @param recipient - Public key of recipient
   * @returns Encrypted ciphertext (base64 or armor format)
   */
  encrypt(plaintext: string, recipient: string): Promise<string>;

  /**
   * Decrypt ciphertext using private key
   *
   * @param ciphertext - Encrypted text
   * @param privateKey - Private key for decryption (optional if using stored identity)
   * @returns Decrypted plaintext
   */
  decrypt(ciphertext: string, privateKey?: string): Promise<string>;

  /**
   * Load private key from identity file
   *
   * @param identityPath - Path to identity file
   * @returns Private key string
   */
  loadIdentity?(identityPath: string): Promise<string>;

  /**
   * Save private key to identity file
   *
   * @param privateKey - Private key to save
   * @param identityPath - Path to identity file
   */
  saveIdentity?(privateKey: string, identityPath: string): Promise<void>;
}

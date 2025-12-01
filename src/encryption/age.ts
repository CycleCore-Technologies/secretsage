/**
 * Age Encryption Provider
 *
 * Implementation of IEncryptionProvider using the age-encryption npm package.
 * Age is a modern, simple encryption tool: https://age-encryption.org
 *
 * Based on typage: https://github.com/FiloSottile/typage
 */

import * as age from 'age-encryption';
import * as fs from 'fs-extra';
import * as path from 'path';
import type { IEncryptionProvider, KeyPair } from './types';

/**
 * Age encryption provider
 *
 * Uses age-encryption npm package for X25519 + ChaCha20-Poly1305.
 * Keys are age-native format (age1... for public, AGE-SECRET-KEY-... for private).
 */
export class AgeProvider implements IEncryptionProvider {
  readonly id = 'age';
  readonly name = 'age encryption';

  /**
   * Check if age encryption is available
   * (always true since we use the npm package, not CLI)
   */
  async isAvailable(): Promise<boolean> {
    return true;
  }

  /**
   * Generate a new age key pair
   *
   * @returns KeyPair with age-format public and private keys
   */
  async generateKeyPair(): Promise<KeyPair> {
    const identity = await age.generateIdentity();
    const recipient = await age.identityToRecipient(identity);

    return {
      publicKey: recipient,   // age1...
      privateKey: identity,   // AGE-SECRET-KEY-...
    };
  }

  /**
   * Encrypt plaintext with recipient's public key
   *
   * @param plaintext - Text to encrypt
   * @param recipient - Public key (age1...)
   * @returns Base64-encoded ciphertext
   */
  async encrypt(plaintext: string, recipient: string): Promise<string> {
    const encrypter = new age.Encrypter();
    encrypter.addRecipient(recipient);

    const plaintextBytes = new TextEncoder().encode(plaintext);
    const ciphertext = await encrypter.encrypt(plaintextBytes);

    // Convert Uint8Array to base64 for storage
    return this.uint8ArrayToBase64(ciphertext);
  }

  /**
   * Decrypt ciphertext with private key
   *
   * @param ciphertext - Base64-encoded ciphertext
   * @param privateKey - Private key (AGE-SECRET-KEY-...)
   * @returns Decrypted plaintext
   */
  async decrypt(ciphertext: string, privateKey: string): Promise<string> {
    const decrypter = new age.Decrypter();
    decrypter.addIdentity(privateKey);

    // Convert base64 back to Uint8Array
    const ciphertextBytes = this.base64ToUint8Array(ciphertext);
    const plaintext = await decrypter.decrypt(ciphertextBytes, 'text');

    return plaintext as string;
  }

  /**
   * Load private key from identity file
   *
   * @param identityPath - Path to identity file
   * @returns Private key string
   */
  async loadIdentity(identityPath: string): Promise<string> {
    const content = await fs.readFile(identityPath, 'utf8');

    // Identity file may have comments, extract the key line
    const lines = content.split('\n');
    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed.startsWith('AGE-SECRET-KEY-')) {
        return trimmed;
      }
    }

    throw new Error(`No valid age identity found in ${identityPath}`);
  }

  /**
   * Save private key to identity file
   *
   * @param privateKey - Private key to save
   * @param identityPath - Path to identity file
   */
  async saveIdentity(privateKey: string, identityPath: string): Promise<void> {
    // Ensure directory exists
    await fs.ensureDir(path.dirname(identityPath));

    // Create identity file with comment header
    const content = `# created: ${new Date().toISOString()}
# SecretSage identity file
# public key: (run 'secretsage config --show' to see)
${privateKey}
`;

    // Write with restrictive permissions (owner read/write only)
    await fs.writeFile(identityPath, content, { mode: 0o600 });
  }

  /**
   * Save public key to recipient file
   *
   * @param publicKey - Public key to save
   * @param recipientPath - Path to recipient file
   */
  async saveRecipient(publicKey: string, recipientPath: string): Promise<void> {
    await fs.ensureDir(path.dirname(recipientPath));

    const content = `# SecretSage recipient (public key)
# Share this key to allow others to encrypt credentials for you
${publicKey}
`;

    await fs.writeFile(recipientPath, content, { mode: 0o644 });
  }

  /**
   * Load public key from recipient file
   *
   * @param recipientPath - Path to recipient file
   * @returns Public key string
   */
  async loadRecipient(recipientPath: string): Promise<string> {
    const content = await fs.readFile(recipientPath, 'utf8');

    const lines = content.split('\n');
    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed.startsWith('age1')) {
        return trimmed;
      }
    }

    throw new Error(`No valid age recipient found in ${recipientPath}`);
  }

  /**
   * Convert Uint8Array to base64 string
   */
  private uint8ArrayToBase64(bytes: Uint8Array): string {
    // Use Buffer in Node.js for efficiency
    return Buffer.from(bytes).toString('base64');
  }

  /**
   * Convert base64 string to Uint8Array
   */
  private base64ToUint8Array(base64: string): Uint8Array {
    return new Uint8Array(Buffer.from(base64, 'base64'));
  }
}

/**
 * Default singleton instance
 */
export const ageProvider = new AgeProvider();

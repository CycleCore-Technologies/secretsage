/**
 * Local Credential Source
 *
 * Stores credentials in a local encrypted vault file.
 * Uses age encryption for secure storage.
 */

import * as fs from 'fs-extra';
import * as path from 'path';
import type { ICredentialSource } from '../types';
import type { Credential, CredentialMetadata, VaultEntry } from '../../core/types';
import { AgeProvider } from '../../encryption/age';
import { getVaultPath, getIdentityPath, getRecipientPath } from '../../config/paths';

/**
 * Local credential source using age-encrypted vault
 */
export class LocalSource implements ICredentialSource {
  readonly id = 'local';
  readonly name = 'Local Vault';
  readonly priority = 1;

  private encryptionProvider: AgeProvider;
  private vaultPath: string;
  private identityPath: string;
  private recipientPath: string;

  constructor(options?: {
    vaultPath?: string;
    identityPath?: string;
    recipientPath?: string;
  }) {
    this.encryptionProvider = new AgeProvider();
    this.vaultPath = options?.vaultPath ?? getVaultPath();
    this.identityPath = options?.identityPath ?? getIdentityPath();
    this.recipientPath = options?.recipientPath ?? getRecipientPath();
  }

  /**
   * Check if the local vault is available
   */
  async isAvailable(): Promise<boolean> {
    try {
      // Check if identity file exists
      const identityExists = await fs.pathExists(this.identityPath);
      return identityExists;
    } catch {
      return false;
    }
  }

  /**
   * Initialize the local vault
   * Creates identity file and vault directory
   */
  async initialize(): Promise<void> {
    // Generate new keypair
    const keyPair = await this.encryptionProvider.generateKeyPair();

    // Save identity (private key)
    await this.encryptionProvider.saveIdentity(keyPair.privateKey, this.identityPath);

    // Save recipient (public key)
    await this.encryptionProvider.saveRecipient(keyPair.publicKey, this.recipientPath);

    // Create empty vault file
    await this.writeVault([]);
  }

  /**
   * Get a credential by name
   */
  async get(name: string): Promise<Credential | null> {
    const entries = await this.readVault();
    const entry = entries.find((e) => e.name === name);

    if (!entry) {
      return null;
    }

    // Decrypt the value
    const privateKey = await this.encryptionProvider.loadIdentity(this.identityPath);
    const value = await this.encryptionProvider.decrypt(entry.encryptedValue, privateKey);

    return {
      name: entry.name,
      value,
      source: this.id,
      metadata: entry.metadata,
    };
  }

  /**
   * List all credential metadata
   */
  async list(): Promise<CredentialMetadata[]> {
    const entries = await this.readVault();
    return entries.map((entry) => ({
      name: entry.name,
      ...entry.metadata,
    }));
  }

  /**
   * Store a credential
   */
  async set(
    name: string,
    value: string,
    metadata?: Partial<CredentialMetadata>
  ): Promise<void> {
    // Read current vault
    const entries = await this.readVault();

    // Get public key for encryption
    const publicKey = await this.encryptionProvider.loadRecipient(this.recipientPath);

    // Encrypt the value
    const encryptedValue = await this.encryptionProvider.encrypt(value, publicKey);

    // Find existing entry or create new
    const existingIndex = entries.findIndex((e) => e.name === name);
    const now = new Date();

    const newEntry: VaultEntry = {
      name,
      encryptedValue,
      metadata: {
        name,
        createdAt: existingIndex >= 0 ? entries[existingIndex].metadata?.createdAt : now,
        updatedAt: now,
        ...metadata,
      },
    };

    if (existingIndex >= 0) {
      entries[existingIndex] = newEntry;
    } else {
      entries.push(newEntry);
    }

    // Write updated vault
    await this.writeVault(entries);
  }

  /**
   * Delete a credential
   */
  async delete(name: string): Promise<boolean> {
    const entries = await this.readVault();
    const index = entries.findIndex((e) => e.name === name);

    if (index < 0) {
      return false;
    }

    entries.splice(index, 1);
    await this.writeVault(entries);
    return true;
  }

  /**
   * Search credentials by pattern
   */
  async search(pattern: string): Promise<CredentialMetadata[]> {
    const entries = await this.readVault();
    const regex = new RegExp(pattern, 'i');

    return entries
      .filter((e) => regex.test(e.name))
      .map((e) => ({
        name: e.name,
        ...e.metadata,
      }));
  }

  /**
   * Get all credentials (decrypted)
   */
  async getAll(): Promise<Credential[]> {
    const entries = await this.readVault();
    const privateKey = await this.encryptionProvider.loadIdentity(this.identityPath);

    const credentials: Credential[] = [];

    for (const entry of entries) {
      const value = await this.encryptionProvider.decrypt(entry.encryptedValue, privateKey);
      credentials.push({
        name: entry.name,
        value,
        source: this.id,
        metadata: entry.metadata,
      });
    }

    return credentials;
  }

  /**
   * Get the public key (recipient)
   */
  async getPublicKey(): Promise<string> {
    return this.encryptionProvider.loadRecipient(this.recipientPath);
  }

  /**
   * Read vault entries from file
   */
  private async readVault(): Promise<VaultEntry[]> {
    try {
      const exists = await fs.pathExists(this.vaultPath);
      if (!exists) {
        return [];
      }

      const content = await fs.readFile(this.vaultPath, 'utf8');
      if (!content.trim()) {
        return [];
      }

      return JSON.parse(content) as VaultEntry[];
    } catch (error) {
      // If file doesn't exist or is invalid, return empty
      return [];
    }
  }

  /**
   * Write vault entries to file
   */
  private async writeVault(entries: VaultEntry[]): Promise<void> {
    await fs.ensureDir(path.dirname(this.vaultPath));

    // Write with restrictive permissions
    const content = JSON.stringify(entries, null, 2);
    await fs.writeFile(this.vaultPath, content, { mode: 0o600 });
  }
}

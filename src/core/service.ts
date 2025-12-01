/**
 * Credential Service
 *
 * Main service layer for SecretSage operations.
 * Orchestrates sources, encryption, and config.
 */

import * as fs from 'fs-extra';
import * as path from 'path';
import { parse as parseEnv } from 'dotenv';
import type { Credential, CredentialMetadata } from './types';
import { CredentialSourceRegistry } from '../sources/registry';
import { LocalSource } from '../sources/local';
import { loadConfig } from '../config/loader';
import {
  getEnvPath,
  getEnvBackupPath,
  getGitignorePath,
  getLocalDir,
  getGlobalDir,
  hasLocalVault,
  hasGlobalVault,
} from '../config/paths';

/**
 * Main credential service
 */
export class CredentialService {
  private registry: CredentialSourceRegistry;
  private localSource: LocalSource | null = null;
  private initialized = false;

  constructor() {
    this.registry = new CredentialSourceRegistry();
  }

  /**
   * Initialize the service with configured sources
   */
  async init(options?: { local?: boolean }): Promise<void> {
    if (this.initialized) return;

    const config = await loadConfig();

    // Create local source based on options or config
    const useLocal = options?.local ?? config.vault.defaultLocation === 'local';

    this.localSource = new LocalSource({
      vaultPath: useLocal
        ? path.join(getLocalDir(), 'vault.json')
        : path.join(getGlobalDir(), 'vault.json'),
      identityPath: useLocal
        ? path.join(getLocalDir(), 'identity.txt')
        : path.join(getGlobalDir(), 'identity.txt'),
      recipientPath: useLocal
        ? path.join(getLocalDir(), 'recipient.txt')
        : path.join(getGlobalDir(), 'recipient.txt'),
    });

    this.registry.register(this.localSource);
    this.initialized = true;
  }

  /**
   * Initialize a new vault
   */
  async initializeVault(options?: {
    local?: boolean;
    customPath?: string;
  }): Promise<{ publicKey: string; vaultDir: string }> {
    let vaultDir: string;

    if (options?.customPath) {
      // Use custom path (expand ~ if present)
      vaultDir = path.resolve(
        options.customPath.startsWith('~')
          ? path.join(require('os').homedir(), options.customPath.slice(1))
          : options.customPath
      );
    } else {
      vaultDir = options?.local ? getLocalDir() : getGlobalDir();
    }

    this.localSource = new LocalSource({
      vaultPath: path.join(vaultDir, 'vault.json'),
      identityPath: path.join(vaultDir, 'identity.txt'),
      recipientPath: path.join(vaultDir, 'recipient.txt'),
    });

    await this.localSource.initialize();
    const publicKey = await this.localSource.getPublicKey();

    return { publicKey, vaultDir };
  }

  /**
   * Check if a vault exists
   */
  async hasVault(): Promise<{ local: boolean; global: boolean }> {
    return {
      local: await hasLocalVault(),
      global: await hasGlobalVault(),
    };
  }

  /**
   * Get the active vault directory path
   */
  async getVaultPath(): Promise<string> {
    // Priority: local vault > custom path > global vault
    if (await hasLocalVault()) {
      return getLocalDir();
    }
    const config = await loadConfig();
    if (config.vault.defaultLocation === 'custom' && config.vault.customPath) {
      return config.vault.customPath;
    }
    return getGlobalDir();
  }

  /**
   * Add a credential to the vault
   */
  async add(name: string, value: string): Promise<void> {
    await this.ensureInitialized();
    await this.registry.set(name, value);
  }

  /**
   * Get a credential
   */
  async get(name: string): Promise<Credential | null> {
    await this.ensureInitialized();
    return this.registry.get(name);
  }

  /**
   * List all credentials
   */
  async list(): Promise<CredentialMetadata[]> {
    await this.ensureInitialized();
    return this.registry.list();
  }

  /**
   * Delete a credential
   */
  async delete(name: string): Promise<boolean> {
    await this.ensureInitialized();
    return this.registry.delete(name);
  }

  /**
   * Grant credentials to .env file
   */
  async grant(
    names: string[],
    options?: { backup?: boolean }
  ): Promise<{ granted: string[]; envPath: string }> {
    await this.ensureInitialized();

    const envPath = getEnvPath();

    // Read existing .env
    let existingEnv: Record<string, string> = {};
    if (await fs.pathExists(envPath)) {
      const content = await fs.readFile(envPath, 'utf8');
      existingEnv = parseEnv(content);

      // Backup if requested
      if (options?.backup !== false) {
        const backupPath = getEnvBackupPath();
        await fs.copyFile(envPath, backupPath);
      }
    }

    // Get requested credentials
    const granted: string[] = [];
    for (const name of names) {
      const cred = await this.registry.get(name);
      if (cred) {
        existingEnv[name] = cred.value;
        granted.push(name);
      }
    }

    // Write .env
    const envContent = this.stringifyEnv(existingEnv);
    await fs.writeFile(envPath, envContent);

    return { granted, envPath };
  }

  /**
   * Revoke credentials from .env file
   */
  async revoke(names: string[]): Promise<{ revoked: string[]; envPath: string }> {
    const envPath = getEnvPath();

    if (!(await fs.pathExists(envPath))) {
      return { revoked: [], envPath };
    }

    const content = await fs.readFile(envPath, 'utf8');
    const existingEnv = parseEnv(content);

    const revoked: string[] = [];
    for (const name of names) {
      if (name in existingEnv) {
        delete existingEnv[name];
        revoked.push(name);
      }
    }

    // Write updated .env
    const envContent = this.stringifyEnv(existingEnv);
    await fs.writeFile(envPath, envContent);

    return { revoked, envPath };
  }

  /**
   * Get all credentials (decrypted)
   */
  async getAll(): Promise<Credential[]> {
    await this.ensureInitialized();
    if (this.localSource) {
      return this.localSource.getAll();
    }
    return [];
  }

  /**
   * Add .secretsage and .env to .gitignore
   */
  async updateGitignore(): Promise<boolean> {
    const gitignorePath = getGitignorePath();
    const entriesToAdd = ['.env', '.env.*', '.secretsage/'];

    let content = '';
    if (await fs.pathExists(gitignorePath)) {
      content = await fs.readFile(gitignorePath, 'utf8');
    }

    const lines = content.split('\n').map((l) => l.trim());
    const additions: string[] = [];

    for (const entry of entriesToAdd) {
      if (!lines.includes(entry)) {
        additions.push(entry);
      }
    }

    if (additions.length === 0) {
      return false; // Nothing to add
    }

    const newContent =
      content.trimEnd() + '\n\n# SecretSage\n' + additions.join('\n') + '\n';
    await fs.writeFile(gitignorePath, newContent);

    return true;
  }

  /**
   * Ensure service is initialized
   */
  private async ensureInitialized(): Promise<void> {
    if (!this.initialized) {
      await this.init();
    }
  }

  /**
   * Convert env object to string format
   */
  private stringifyEnv(env: Record<string, string>): string {
    const lines: string[] = [];

    for (const [key, value] of Object.entries(env)) {
      // Quote values that contain special characters
      const needsQuotes = /[\s#"'\\]/.test(value) || value.includes('=');
      const quotedValue = needsQuotes ? `"${value.replace(/"/g, '\\"')}"` : value;
      lines.push(`${key}=${quotedValue}`);
    }

    return lines.join('\n') + '\n';
  }
}

/**
 * Default singleton instance
 */
export const credentialService = new CredentialService();

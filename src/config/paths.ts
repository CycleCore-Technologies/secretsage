/**
 * Platform-specific path utilities for SecretSage
 *
 * Handles cross-platform paths for:
 * - Global config: ~/.secretsage/
 * - Local config: .secretsage/
 * - Vault files
 * - Identity files
 */

import * as path from 'path';
import * as os from 'os';
import * as fs from 'fs-extra';

/**
 * Get the user's home directory
 */
export function getHomeDir(): string {
  return os.homedir();
}

/**
 * Get the global SecretSage directory
 * ~/.secretsage on Unix, %USERPROFILE%\.secretsage on Windows
 */
export function getGlobalDir(): string {
  return path.join(getHomeDir(), '.secretsage');
}

/**
 * Get the local SecretSage directory (in current project)
 */
export function getLocalDir(): string {
  return path.join(process.cwd(), '.secretsage');
}

/**
 * Get a custom vault directory (user-specified path)
 */
export function getCustomDir(customPath: string): string {
  return expandPath(customPath);
}

/**
 * Check if a local vault exists in the current directory
 */
export async function hasLocalVault(): Promise<boolean> {
  return fs.pathExists(path.join(getLocalDir(), 'identity.txt'));
}

/**
 * Check if a global vault exists
 */
export async function hasGlobalVault(): Promise<boolean> {
  return fs.pathExists(path.join(getGlobalDir(), 'identity.txt'));
}

/**
 * Check if a vault exists at a custom path
 */
export async function hasCustomVault(customPath: string): Promise<boolean> {
  return fs.pathExists(path.join(getCustomDir(customPath), 'identity.txt'));
}

/**
 * Get the active vault directory (local if exists, otherwise global)
 */
export async function getActiveDir(): Promise<string> {
  if (await hasLocalVault()) {
    return getLocalDir();
  }
  return getGlobalDir();
}

/**
 * Get the vault file path
 */
export function getVaultPath(local?: boolean): string {
  const dir = local ? getLocalDir() : getGlobalDir();
  return path.join(dir, 'vault.json');
}

/**
 * Get the identity (private key) file path
 */
export function getIdentityPath(local?: boolean): string {
  const dir = local ? getLocalDir() : getGlobalDir();
  return path.join(dir, 'identity.txt');
}

/**
 * Get the recipient (public key) file path
 */
export function getRecipientPath(local?: boolean): string {
  const dir = local ? getLocalDir() : getGlobalDir();
  return path.join(dir, 'recipient.txt');
}

/**
 * Get the config file path
 */
export function getConfigPath(local?: boolean): string {
  const dir = local ? getLocalDir() : getGlobalDir();
  return path.join(dir, 'config.yaml');
}

/**
 * Get the .env file path in the current directory
 */
export function getEnvPath(): string {
  return path.join(process.cwd(), '.env');
}

/**
 * Get the .env backup file path
 */
export function getEnvBackupPath(): string {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  return path.join(process.cwd(), `.env.backup.${timestamp}`);
}

/**
 * Get the .gitignore path in the current directory
 */
export function getGitignorePath(): string {
  return path.join(process.cwd(), '.gitignore');
}

/**
 * Resolve a path with ~ expansion
 */
export function expandPath(p: string): string {
  if (p.startsWith('~')) {
    return path.join(getHomeDir(), p.slice(1));
  }
  return path.resolve(p);
}

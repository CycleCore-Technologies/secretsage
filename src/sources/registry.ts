/**
 * Credential Source Registry
 *
 * Manages multiple credential sources with priority-based resolution.
 * Enables plugin architecture for future sources (1Password, Bitwarden, etc.)
 */

import type { ICredentialSource } from './types';
import type { Credential, CredentialMetadata } from '../core/types';

/**
 * Registry for credential sources
 *
 * Sources are resolved in priority order (lowest number = highest priority).
 * This allows fallback behavior when a credential isn't found in the
 * primary source.
 */
export class CredentialSourceRegistry {
  private sources: Map<string, ICredentialSource> = new Map();

  /**
   * Register a credential source
   *
   * @param source - Credential source to register
   */
  register(source: ICredentialSource): void {
    this.sources.set(source.id, source);
  }

  /**
   * Unregister a credential source
   *
   * @param sourceId - ID of source to remove
   */
  unregister(sourceId: string): void {
    this.sources.delete(sourceId);
  }

  /**
   * Get a specific source by ID
   *
   * @param sourceId - Source ID
   * @returns Source if found, undefined otherwise
   */
  getSource(sourceId: string): ICredentialSource | undefined {
    return this.sources.get(sourceId);
  }

  /**
   * Get all registered sources
   */
  getAllSources(): ICredentialSource[] {
    return Array.from(this.sources.values());
  }

  /**
   * Get available sources in priority order
   *
   * @returns Sources that are available and configured
   */
  async getAvailableSources(): Promise<ICredentialSource[]> {
    const available: ICredentialSource[] = [];

    for (const source of this.sources.values()) {
      if (await source.isAvailable()) {
        available.push(source);
      }
    }

    // Sort by priority (lower number = higher priority)
    return available.sort((a, b) => a.priority - b.priority);
  }

  /**
   * Get a credential from the first available source that has it
   *
   * @param name - Credential name
   * @returns Credential if found, null otherwise
   */
  async get(name: string): Promise<Credential | null> {
    for (const source of await this.getAvailableSources()) {
      const credential = await source.get(name);
      if (credential) {
        return credential;
      }
    }
    return null;
  }

  /**
   * List all credentials from all available sources
   *
   * @returns Combined list of credential metadata (deduplicated by name)
   */
  async list(): Promise<CredentialMetadata[]> {
    const seen = new Set<string>();
    const result: CredentialMetadata[] = [];

    for (const source of await this.getAvailableSources()) {
      const credentials = await source.list();
      for (const cred of credentials) {
        if (!seen.has(cred.name)) {
          seen.add(cred.name);
          result.push(cred);
        }
      }
    }

    return result;
  }

  /**
   * Set a credential in the specified source (or first writable source)
   *
   * @param name - Credential name
   * @param value - Credential value
   * @param sourceId - Optional specific source to use
   */
  async set(
    name: string,
    value: string,
    sourceId?: string
  ): Promise<void> {
    if (sourceId) {
      const source = this.sources.get(sourceId);
      if (!source) {
        throw new Error(`Source '${sourceId}' not found`);
      }
      if (!source.set) {
        throw new Error(`Source '${sourceId}' is read-only`);
      }
      await source.set(name, value);
      return;
    }

    // Use first available writable source
    for (const source of await this.getAvailableSources()) {
      if (source.set) {
        await source.set(name, value);
        return;
      }
    }

    throw new Error('No writable credential source available');
  }

  /**
   * Delete a credential from the specified source (or all sources)
   *
   * @param name - Credential name
   * @param sourceId - Optional specific source
   * @returns true if deleted from any source
   */
  async delete(name: string, sourceId?: string): Promise<boolean> {
    if (sourceId) {
      const source = this.sources.get(sourceId);
      if (!source) {
        throw new Error(`Source '${sourceId}' not found`);
      }
      if (!source.delete) {
        throw new Error(`Source '${sourceId}' doesn't support deletion`);
      }
      return source.delete(name);
    }

    // Delete from all sources
    let deleted = false;
    for (const source of await this.getAvailableSources()) {
      if (source.delete) {
        const result = await source.delete(name);
        deleted = deleted || result;
      }
    }
    return deleted;
  }
}

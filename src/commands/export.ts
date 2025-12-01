/**
 * Export Command
 *
 * Export vault credentials for backup or transfer.
 */

import * as fs from 'fs-extra';
import { CredentialService } from '../core/service';
import * as output from '../utils/output';

interface ExportOptions {
  output?: string;
  format?: 'json' | 'env';
  encrypted?: boolean;
  quiet?: boolean;
}

export async function exportCommand(options: ExportOptions): Promise<void> {
  const service = new CredentialService();

  // Check vault exists
  const vaults = await service.hasVault();
  if (!vaults.local && !vaults.global) {
    output.error('No vault found. Run `secretsage init` first.');
    process.exit(1);
  }

  await service.init();

  const credentials = await service.list();
  if (credentials.length === 0) {
    output.warning('No credentials in vault to export.');
    process.exit(0);
  }

  let exportContent: string;
  const format = options.format || 'json';

  if (options.encrypted) {
    // Export encrypted vault as-is
    const vaultPath = await service.getVaultPath();
    const vaultFile = `${vaultPath}/vault.json`;

    if (await fs.pathExists(vaultFile)) {
      exportContent = await fs.readFile(vaultFile, 'utf8');
    } else {
      output.error('Vault file not found.');
      process.exit(1);
    }

    if (!options.quiet && !options.output) {
      output.warning('Exporting encrypted vault (credentials remain encrypted)');
    }
  } else {
    // Decrypt and export
    const decrypted = await service.getAll();

    if (!options.quiet && !options.output) {
      output.warning('Exporting DECRYPTED credentials. Handle with care!');
    }

    if (format === 'env') {
      // Export as .env format
      exportContent = decrypted
        .map((c) => {
          const needsQuotes = /[\s#"'\\]/.test(c.value) || c.value.includes('=');
          const quotedValue = needsQuotes ? `"${c.value.replace(/"/g, '\\"')}"` : c.value;
          return `${c.name}=${quotedValue}`;
        })
        .join('\n') + '\n';
    } else {
      // Export as JSON
      exportContent = JSON.stringify(
        decrypted.map((c) => ({
          name: c.name,
          value: c.value,
          createdAt: c.metadata?.createdAt,
          updatedAt: c.metadata?.updatedAt,
        })),
        null,
        2
      ) + '\n';
    }
  }

  // Output
  if (options.output) {
    await fs.writeFile(options.output, exportContent, { mode: 0o600 });
    if (!options.quiet) {
      output.success(`Exported ${credentials.length} credentials to ${options.output}`);
    }
  } else {
    // Write to stdout
    process.stdout.write(exportContent);
  }
}

/**
 * Import Command
 *
 * Import credentials from backup or external source.
 */

import * as fs from 'fs-extra';
import { parse as parseEnv } from 'dotenv';
import { CredentialService } from '../core/service';
import * as output from '../utils/output';
import { confirm } from '../utils/prompts';

interface ImportOptions {
  input?: string;
  format?: 'json' | 'env';
  merge?: boolean;
  yes?: boolean;
  quiet?: boolean;
}

/**
 * Read from stdin
 */
async function readStdin(): Promise<string> {
  return new Promise((resolve, reject) => {
    let data = '';
    process.stdin.setEncoding('utf8');
    process.stdin.on('data', (chunk) => { data += chunk; });
    process.stdin.on('end', () => { resolve(data); });
    process.stdin.on('error', reject);

    if (process.stdin.isTTY) {
      reject(new Error('No input provided via stdin. Use --input to specify a file.'));
    }
  });
}

interface ImportedCredential {
  name: string;
  value: string;
}

export async function importCommand(options: ImportOptions): Promise<void> {
  const service = new CredentialService();

  // Check vault exists
  const vaults = await service.hasVault();
  if (!vaults.local && !vaults.global) {
    output.error('No vault found. Run `secretsage init` first.');
    process.exit(1);
  }

  await service.init();

  // Read input
  let content: string;
  if (options.input) {
    if (!(await fs.pathExists(options.input))) {
      output.error(`File not found: ${options.input}`);
      process.exit(1);
    }
    content = await fs.readFile(options.input, 'utf8');
  } else {
    try {
      content = await readStdin();
    } catch (error) {
      output.error((error as Error).message);
      process.exit(1);
    }
  }

  if (!content.trim()) {
    output.error('Empty input.');
    process.exit(1);
  }

  // Parse credentials
  let credentials: ImportedCredential[] = [];
  const format = options.format || 'json';

  try {
    if (format === 'env') {
      const parsed = parseEnv(content);
      credentials = Object.entries(parsed).map(([name, value]) => ({ name, value }));
    } else {
      const parsed = JSON.parse(content);
      if (Array.isArray(parsed)) {
        credentials = parsed.map((item) => ({
          name: item.name,
          value: item.value,
        }));
      } else {
        output.error('Invalid JSON format. Expected array of {name, value} objects.');
        process.exit(1);
      }
    }
  } catch (error) {
    output.error(`Failed to parse ${format} input: ${(error as Error).message}`);
    process.exit(1);
  }

  if (credentials.length === 0) {
    output.warning('No credentials found in input.');
    process.exit(0);
  }

  // Check for existing credentials
  const existing = await service.list();
  const existingNames = new Set(existing.map((c) => c.name));
  const newCreds = credentials.filter((c) => !existingNames.has(c.name));
  const updateCreds = credentials.filter((c) => existingNames.has(c.name));

  if (!options.quiet) {
    output.info(`Found ${credentials.length} credentials to import:`);
    output.info(`  New: ${newCreds.length}`);
    output.info(`  Update: ${updateCreds.length}`);
  }

  // Confirm import
  if (!options.yes) {
    const action = options.merge ? 'merge into' : 'import into';
    const confirmed = await confirm(
      `${action} vault? ${updateCreds.length > 0 ? `(${updateCreds.length} existing will be overwritten)` : ''}`
    );
    if (!confirmed) {
      output.info('Cancelled.');
      return;
    }
  }

  // Import credentials
  const spin = options.quiet ? null : output.spinner('Importing credentials...');
  spin?.start();

  try {
    let imported = 0;
    for (const cred of credentials) {
      if (!cred.name || typeof cred.value !== 'string') {
        if (!options.quiet) {
          output.warning(`Skipping invalid credential: ${JSON.stringify(cred)}`);
        }
        continue;
      }

      // Skip existing if not merging
      if (!options.merge && existingNames.has(cred.name)) {
        continue;
      }

      await service.add(cred.name, cred.value);
      imported++;
    }

    spin?.stop();

    if (!options.quiet) {
      output.success(`Imported ${imported} credentials.`);
    }
  } catch (error) {
    spin?.fail('Import failed');
    output.error((error as Error).message);
    process.exit(1);
  }
}

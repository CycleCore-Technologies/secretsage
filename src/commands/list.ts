/**
 * List Command
 *
 * List credential names in the vault.
 */

import { CredentialService } from '../core/service';
import * as output from '../utils/output';

interface ListOptions {
  json?: boolean;
  all?: boolean;
}

export async function listCommand(options: ListOptions): Promise<void> {
  const service = new CredentialService();

  // Check vault exists
  const vaults = await service.hasVault();
  if (!vaults.local && !vaults.global) {
    if (options.json) {
      output.jsonOutput({ credentials: [], error: 'No vault found' });
    } else {
      output.error('No vault found. Run `secretsage init` first.');
    }
    process.exit(1);
  }

  await service.init();

  try {
    const credentials = await service.list();

    if (options.json) {
      // Machine-readable output for agents
      output.jsonOutput({
        credentials: credentials.map((c) => ({
          name: c.name,
          createdAt: c.createdAt ? new Date(c.createdAt).toISOString() : undefined,
          updatedAt: c.updatedAt ? new Date(c.updatedAt).toISOString() : undefined,
          ...(options.all && c.description ? { description: c.description } : {}),
          ...(options.all && c.tags?.length ? { tags: c.tags } : {}),
        })),
        count: credentials.length,
      });
      return;
    }

    if (credentials.length === 0) {
      output.info('No credentials in vault.');
      console.log('');
      console.log(`Add credentials with: ${output.colors.highlight('secretsage add NAME')}`);
      return;
    }

    console.log('');
    console.log(output.colors.muted(`Credentials in vault (${credentials.length}):`));
    console.log('');

    for (const cred of credentials) {
      const name = output.credentialName(cred.name);
      const meta: string[] = [];

      if (options.all) {
        if (cred.updatedAt) {
          meta.push(output.colors.muted(`updated ${formatDate(cred.updatedAt)}`));
        } else if (cred.createdAt) {
          meta.push(output.colors.muted(`created ${formatDate(cred.createdAt)}`));
        }
        if (cred.description) {
          meta.push(output.colors.muted(cred.description));
        }
      }

      const suffix = meta.length > 0 ? ` ${output.colors.muted('·')} ${meta.join(' · ')}` : '';
      console.log(`  ${name}${suffix}`);
    }

    console.log('');
  } catch (error) {
    output.error((error as Error).message);
    process.exit(1);
  }
}

function formatDate(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  const now = new Date();
  const diff = now.getTime() - d.getTime();
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));

  if (days === 0) return 'today';
  if (days === 1) return 'yesterday';
  if (days < 7) return `${days} days ago`;
  if (days < 30) return `${Math.floor(days / 7)} weeks ago`;
  if (days < 365) return `${Math.floor(days / 30)} months ago`;
  return `${Math.floor(days / 365)} years ago`;
}

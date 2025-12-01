/**
 * Remove Command
 *
 * Delete a credential from the vault permanently.
 */

import { CredentialService } from '../core/service';
import * as output from '../utils/output';
import { confirm } from '../utils/prompts';

interface RemoveOptions {
  yes?: boolean;
  quiet?: boolean;
}

export async function removeCommand(name: string, options: RemoveOptions): Promise<void> {
  const service = new CredentialService();

  // Check vault exists
  const vaults = await service.hasVault();
  if (!vaults.local && !vaults.global) {
    output.error('No vault found. Run `secretsage init` first.');
    process.exit(1);
  }

  await service.init();

  // Check credential exists
  const credential = await service.get(name);
  if (!credential) {
    output.error(`Credential "${name}" not found in vault.`);
    const list = await service.list();
    if (list.length > 0) {
      output.info('Available credentials:');
      list.forEach((c) => console.log(`  ${c.name}`));
    }
    process.exit(1);
  }

  // Confirm deletion
  if (!options.yes) {
    const confirmed = await confirm(
      `Are you sure you want to permanently delete "${name}"?`
    );
    if (!confirmed) {
      output.info('Cancelled.');
      return;
    }
  }

  // Delete from vault
  const spin = options.quiet ? null : output.spinner(`Removing ${name}...`);
  spin?.start();

  try {
    const deleted = await service.delete(name);
    spin?.stop();

    if (deleted) {
      if (!options.quiet) {
        output.success(`Credential "${name}" removed from vault.`);
      }
    } else {
      output.error(`Failed to remove "${name}".`);
      process.exit(1);
    }
  } catch (error) {
    spin?.fail(`Failed to remove ${name}`);
    output.error((error as Error).message);
    process.exit(1);
  }
}

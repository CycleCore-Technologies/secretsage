#!/usr/bin/env node

/**
 * SecretSage CLI
 *
 * Terminal-based credential wizard for agent-driven development.
 * The missing OAuth for LLM agents.
 */

import { Command } from 'commander';
import chalk from 'chalk';
import { BANNER } from './utils/banner';
import { initCommand } from './commands/init';
import { addCommand } from './commands/add';
import { listCommand } from './commands/list';
import { grantCommand } from './commands/grant';
import { revokeCommand } from './commands/revoke';
import { configCommand } from './commands/config';
import { removeCommand } from './commands/remove';
import { rotateCommand } from './commands/rotate';
import { exportCommand } from './commands/export';
import { importCommand } from './commands/import';
import { statusCommand } from './commands/status';

const program = new Command();

program
  .name('secretsage')
  .description('Terminal-based credential wizard for agent-driven development')
  .version('0.2.0')
  .addHelpText('beforeAll', BANNER)
  .addHelpText('after', `
${chalk.magenta('Quick Start:')}
  ${chalk.white('secretsage init')}              Initialize vault and generate keypair
  ${chalk.white('secretsage add OPENAI_API_KEY')}  Add a credential
  ${chalk.white('secretsage grant --all')}        Grant all credentials to .env

${chalk.magenta('Agent Usage:')}
  ${chalk.white('secretsage list --json')}        Machine-readable credential list
  ${chalk.white('secretsage grant KEY --yes')}    Non-interactive grant for agents
`);

// Initialize vault
program
  .command('init')
  .description('Initialize SecretSage vault and generate encryption keypair')
  .option('-l, --local', 'Create vault in current directory instead of ~/.secretsage')
  .option('-p, --path <path>', 'Create vault at a custom directory path')
  .option('-y, --yes', 'Skip confirmation prompts')
  .option('--force', 'Overwrite existing configuration')
  .action(initCommand);

// Add credential
program
  .command('add <name>')
  .description('Add a credential to the encrypted vault')
  .option('-v, --value <value>', 'Credential value (use "-" for stdin, prompts if not provided)')
  .option('--from-env', 'Import value from existing .env file')
  .option('-q, --quiet', 'Minimal output')
  .action(addCommand);

// List credentials
program
  .command('list')
  .alias('ls')
  .description('List credential names in the vault')
  .option('--json', 'Output as JSON (agent-friendly)')
  .option('-a, --all', 'Include metadata')
  .action(listCommand);

// Grant credentials
program
  .command('grant [names...]')
  .description('Decrypt and write credentials to .env for agent use')
  .option('-a, --all', 'Grant all credentials')
  .option('-y, --yes', 'Skip confirmation (for agents)')
  .option('--no-backup', 'Skip .env backup')
  .action(grantCommand);

// Revoke credentials
program
  .command('revoke [names...]')
  .description('Remove credentials from .env (vault remains intact)')
  .option('-a, --all', 'Revoke all credentials')
  .option('-y, --yes', 'Skip confirmation')
  .action(revokeCommand);

// Config
program
  .command('config')
  .description('View or update SecretSage configuration')
  .option('-s, --show', 'Show current configuration')
  .option('--set <key=value>', 'Set a configuration value')
  .option('--path', 'Show configuration file path')
  .action(configCommand);

// Remove credential from vault
program
  .command('remove <name>')
  .alias('rm')
  .description('Permanently delete a credential from the vault')
  .option('-y, --yes', 'Skip confirmation')
  .option('-q, --quiet', 'Minimal output')
  .action(removeCommand);

// Rotate credential value
program
  .command('rotate <name>')
  .description('Update the value of an existing credential')
  .option('-v, --value <value>', 'New value (use "-" for stdin)')
  .option('-y, --yes', 'Skip confirmation')
  .option('-q, --quiet', 'Minimal output')
  .action(rotateCommand);

// Export vault
program
  .command('export')
  .description('Export vault credentials for backup or transfer')
  .option('-o, --output <file>', 'Output file (default: stdout)')
  .option('-f, --format <type>', 'Output format: json, env (default: json)', 'json')
  .option('--encrypted', 'Keep credentials encrypted (for backup)')
  .option('-q, --quiet', 'Minimal output')
  .action(exportCommand);

// Import credentials
program
  .command('import')
  .description('Import credentials from backup or external source')
  .option('-i, --input <file>', 'Input file (default: stdin)')
  .option('-f, --format <type>', 'Input format: json, env (default: json)', 'json')
  .option('--merge', 'Merge with existing vault (default: skip existing)')
  .option('-y, --yes', 'Skip confirmation')
  .option('-q, --quiet', 'Minimal output')
  .action(importCommand);

// Status check
program
  .command('status')
  .description('Show vault status and health check')
  .option('--json', 'Output as JSON (agent-friendly)')
  .action(statusCommand);

// Parse and run
program.parse(process.argv);

// Show help if no command
if (!process.argv.slice(2).length) {
  program.outputHelp();
}

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

const program = new Command();

program
  .name('secretsage')
  .description('Terminal-based credential wizard for agent-driven development')
  .version('0.1.0')
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
  .option('-v, --value <value>', 'Credential value (prompts if not provided)')
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

// Parse and run
program.parse(process.argv);

// Show help if no command
if (!process.argv.slice(2).length) {
  program.outputHelp();
}

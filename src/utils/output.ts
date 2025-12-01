import chalk from 'chalk';
import ora, { Ora } from 'ora';

/**
 * Output formatting utilities for consistent CLI experience
 */

export const colors = {
  success: chalk.green,
  error: chalk.red,
  warning: chalk.yellow,
  info: chalk.blue,
  muted: chalk.gray,
  highlight: chalk.magenta,
  key: chalk.cyan,
  value: chalk.white,
};

/**
 * Print a success message
 */
export function success(message: string): void {
  console.log(colors.success('✓'), message);
}

/**
 * Print an error message
 */
export function error(message: string): void {
  console.log(colors.error('✗'), message);
}

/**
 * Print a warning message
 */
export function warning(message: string): void {
  console.log(colors.warning('⚠'), message);
}

/**
 * Print an info message
 */
export function info(message: string): void {
  console.log(colors.info('ℹ'), message);
}

/**
 * Print a credential name (without value)
 */
export function credentialName(name: string): string {
  return colors.key(name);
}

/**
 * Create a spinner for async operations
 */
export function spinner(text: string): Ora {
  return ora({
    text,
    color: 'magenta',
  });
}

/**
 * Format JSON output for --json flag
 */
export function jsonOutput(data: unknown): void {
  console.log(JSON.stringify(data, null, 2));
}

/**
 * Print a divider line
 */
export function divider(): void {
  console.log(colors.muted('─'.repeat(50)));
}

/**
 * Format a key-value pair for display
 */
export function keyValue(key: string, value: string): void {
  console.log(`  ${colors.muted(key + ':')} ${value}`);
}

/**
 * Display credential saved feedback with mini ASCII art
 */
export function credentialSaved(name: string, vaultPath: string): void {
  console.log('');
  console.log(colors.success('   .---.'));
  console.log(colors.success('   | * |'), ' Credential saved!');
  console.log(colors.success("   '---'"));
  divider();
  keyValue('Name', colors.key(name));
  keyValue('Vault', vaultPath);
  divider();
  console.log('');
}

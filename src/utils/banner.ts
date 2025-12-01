import chalk from 'chalk';

/**
 * ASCII art banner for SecretSage
 * Displayed when running `secretsage` or `secretsage --help`
 */
export const BANNER = `
${chalk.magenta('   ___                      _    ___')}
${chalk.magenta('  / __|  ___  __  _ _  ___ | |_ / __|  __ _   __ _   ___')}
${chalk.magenta('  \\__ \\ / -_)/ _|| \'_|/ -_)|  _|\\__ \\ / _` | / _` | / -_)')}
${chalk.magenta('  |___/ \\___|\\___|_|  \\___| \\__||___/ \\__,_| \\__, | \\___|')}
${chalk.magenta('                                             |___/')}

${chalk.gray('  @cyclecore/secretsage')} ${chalk.dim('v0.1.0')}
${chalk.gray('  The missing OAuth for LLM agents')}
`;

/**
 * Compact banner for use in command output
 */
export const COMPACT_BANNER = `${chalk.magenta('SecretSage')} ${chalk.dim('v0.1.0')}`;

/**
 * Print the full banner to console
 */
export function printBanner(): void {
  console.log(BANNER);
}

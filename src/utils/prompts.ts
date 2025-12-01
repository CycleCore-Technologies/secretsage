import inquirer from 'inquirer';
import chalk from 'chalk';

/**
 * Inquirer prompt wrappers for consistent UX
 */

/**
 * Prompt for a credential value with masked input
 */
export async function promptCredentialValue(name: string): Promise<string> {
  const { value } = await inquirer.prompt([
    {
      type: 'password',
      name: 'value',
      message: `Enter value for ${chalk.cyan(name)}:`,
      mask: '*',
      validate: (input: string) => {
        if (!input || input.trim().length === 0) {
          return 'Value cannot be empty';
        }
        return true;
      },
    },
  ]);
  return value;
}

/**
 * Prompt for confirmation
 */
export async function confirm(message: string, defaultValue = false): Promise<boolean> {
  const { confirmed } = await inquirer.prompt([
    {
      type: 'confirm',
      name: 'confirmed',
      message,
      default: defaultValue,
    },
  ]);
  return confirmed;
}

/**
 * Prompt for credential selection with checkboxes
 */
export async function selectCredentials(
  credentials: string[],
  message = 'Select credentials to grant:'
): Promise<string[]> {
  if (credentials.length === 0) {
    return [];
  }

  const { selected } = await inquirer.prompt([
    {
      type: 'checkbox',
      name: 'selected',
      message,
      choices: credentials.map((name) => ({
        name,
        value: name,
        checked: false,
      })),
      validate: (answer: string[]) => {
        if (answer.length === 0) {
          return 'You must select at least one credential';
        }
        return true;
      },
    },
  ]);
  return selected;
}

/**
 * Prompt for vault location choice
 */
export async function promptVaultLocation(): Promise<'global' | 'local' | 'custom'> {
  const { location } = await inquirer.prompt([
    {
      type: 'list',
      name: 'location',
      message: 'Where should the vault be created?',
      choices: [
        {
          name: 'Global (~/.secretsage) - Shared across projects',
          value: 'global',
        },
        {
          name: 'Local (.secretsage) - Project-specific',
          value: 'local',
        },
        {
          name: 'Custom path - Specify a directory',
          value: 'custom',
        },
      ],
      default: 'global',
    },
  ]);
  return location;
}

/**
 * Prompt for custom vault path
 */
export async function promptCustomPath(): Promise<string> {
  const { customPath } = await inquirer.prompt([
    {
      type: 'input',
      name: 'customPath',
      message: 'Enter vault directory path:',
      validate: (input: string) => {
        if (!input || input.trim().length === 0) {
          return 'Path cannot be empty';
        }
        return true;
      },
    },
  ]);
  return customPath.trim();
}

/**
 * Prompt for text input
 */
export async function promptText(
  message: string,
  defaultValue?: string
): Promise<string> {
  const { value } = await inquirer.prompt([
    {
      type: 'input',
      name: 'value',
      message,
      default: defaultValue,
    },
  ]);
  return value;
}

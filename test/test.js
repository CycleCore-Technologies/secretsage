#!/usr/bin/env node

/**
 * SecretSage Smoke Tests
 *
 * Basic tests to verify core functionality before release.
 * Run with: npm test
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const os = require('os');

const PROJECT_DIR = path.resolve(__dirname, '..');
const CLI = `node ${path.join(PROJECT_DIR, 'cli.js')}`;
const TEST_DIR = path.join(os.tmpdir(), 'secretsage-test-' + Date.now());

let passed = 0;
let failed = 0;

function test(name, fn) {
  try {
    fn();
    console.log(`  \x1b[32m✓\x1b[0m ${name}`);
    passed++;
  } catch (err) {
    console.log(`  \x1b[31m✗\x1b[0m ${name}`);
    console.log(`    ${err.message}`);
    failed++;
  }
}

function exec(cmd, options = {}) {
  return execSync(cmd, {
    encoding: 'utf8',
    cwd: options.cwd || TEST_DIR,
    stdio: ['pipe', 'pipe', 'pipe'],
    ...options,
  });
}

function setup() {
  console.log('\nSetting up test environment...');
  fs.mkdirSync(TEST_DIR, { recursive: true });
  console.log(`  Test directory: ${TEST_DIR}\n`);
}

function cleanup() {
  console.log('\nCleaning up...');
  fs.rmSync(TEST_DIR, { recursive: true, force: true });
}

function runTests() {
  console.log('SecretSage Smoke Tests\n' + '='.repeat(40));

  // CLI basics
  console.log('\n\x1b[1mCLI Basics\x1b[0m');

  test('--help shows usage', () => {
    const output = exec(`${CLI} --help`);
    if (!output.includes('secretsage')) throw new Error('Missing secretsage in output');
    if (!output.includes('init')) throw new Error('Missing init command');
  });

  test('--version shows version', () => {
    const output = exec(`${CLI} --version`);
    if (!output.includes('0.1.0')) throw new Error('Missing version');
  });

  // Init command
  console.log('\n\x1b[1mInit Command\x1b[0m');

  test('init creates vault at custom path', () => {
    const vaultPath = path.join(TEST_DIR, 'custom-vault');
    exec(`${CLI} init --path ${vaultPath} --yes`);
    if (!fs.existsSync(path.join(vaultPath, 'identity.txt'))) {
      throw new Error('Identity file not created');
    }
    if (!fs.existsSync(path.join(vaultPath, 'vault.json'))) {
      throw new Error('Vault file not created');
    }
  });

  test('init --local creates .secretsage in current dir', () => {
    // Use a subdirectory to avoid conflicts
    const localDir = path.join(TEST_DIR, 'local-test');
    fs.mkdirSync(localDir, { recursive: true });
    exec(`${CLI} init --local --yes`, { cwd: localDir });
    if (!fs.existsSync(path.join(localDir, '.secretsage', 'identity.txt'))) {
      throw new Error('Local vault not created');
    }
  });

  // Add command
  console.log('\n\x1b[1mAdd Command\x1b[0m');

  test('add creates credential in vault', () => {
    const output = exec(`${CLI} add TEST_KEY --value "test-value-123"`, { cwd: TEST_DIR });
    if (!output.includes('Credential saved')) throw new Error('Add failed');
  });

  test('add warns about non-standard names', () => {
    const output = exec(`${CLI} add lowercase_key --value "test"`, { cwd: TEST_DIR });
    if (!output.includes('UPPER_SNAKE_CASE')) throw new Error('Missing warning');
  });

  // List command
  console.log('\n\x1b[1mList Command\x1b[0m');

  test('list shows credentials', () => {
    const output = exec(`${CLI} list`, { cwd: TEST_DIR });
    if (!output.includes('TEST_KEY')) throw new Error('Missing credential');
  });

  test('list --json outputs valid JSON', () => {
    const output = exec(`${CLI} list --json`, { cwd: TEST_DIR });
    const data = JSON.parse(output);
    if (!data.credentials) throw new Error('Missing credentials array');
    if (data.count < 1) throw new Error('No credentials found');
  });

  // Grant command
  console.log('\n\x1b[1mGrant Command\x1b[0m');

  test('grant writes to .env', () => {
    exec(`${CLI} grant TEST_KEY --yes`, { cwd: TEST_DIR });
    const envPath = path.join(TEST_DIR, '.env');
    if (!fs.existsSync(envPath)) throw new Error('.env not created');
    const content = fs.readFileSync(envPath, 'utf8');
    if (!content.includes('TEST_KEY=')) throw new Error('Credential not in .env');
  });

  // Revoke command
  console.log('\n\x1b[1mRevoke Command\x1b[0m');

  test('revoke removes from .env', () => {
    exec(`${CLI} revoke TEST_KEY --yes`, { cwd: TEST_DIR });
    const envPath = path.join(TEST_DIR, '.env');
    const content = fs.readFileSync(envPath, 'utf8');
    if (content.includes('TEST_KEY=')) throw new Error('Credential still in .env');
  });

  // Config command
  console.log('\n\x1b[1mConfig Command\x1b[0m');

  test('config shows current settings', () => {
    const output = exec(`${CLI} config`);
    // Config command should show something - check for common config elements
    if (!output.includes('version') && !output.includes('encryption') && !output.includes('Configuration')) {
      throw new Error('Missing config output');
    }
  });
}

// Main
setup();
try {
  runTests();
} finally {
  cleanup();
}

console.log('\n' + '='.repeat(40));
console.log(`Results: \x1b[32m${passed} passed\x1b[0m, \x1b[31m${failed} failed\x1b[0m\n`);

process.exit(failed > 0 ? 1 : 0);

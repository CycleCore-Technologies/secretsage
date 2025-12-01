# Changelog

All notable changes to SecretSage will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.2.0] - 2025-12-01

### Added

- **New Commands**
  - `secretsage remove <name>` - Permanently delete credentials from vault
  - `secretsage rotate <name>` - Update value of existing credential
  - `secretsage export` - Export vault for backup or transfer
  - `secretsage import` - Import credentials from backup or external source
  - `secretsage status` - Show vault status and health check

- **stdin Support**
  - `--value -` flag now reads from stdin for `add` and `rotate` commands
  - Enables piping secrets from other tools

- **Agent Improvements**
  - `secretsage status --json` for machine-readable health checks
  - Export/import with `--format json` or `--format env`

### Changed

- Expanded npm keywords for better discoverability (claude-code, cursor, windsurf, copilot, ai-agents)

### Fixed

- `--value -` now properly reads from stdin instead of storing literal "-"

---

## [0.1.0] - 2025-12-01

### Added

- **Core Commands**
  - `secretsage init` - Initialize vault with age encryption keypair
  - `secretsage add <name>` - Add credentials to encrypted vault
  - `secretsage list` - List credential names (supports `--json` for agents)
  - `secretsage grant` - Decrypt and write credentials to `.env`
  - `secretsage revoke` - Remove credentials from `.env`
  - `secretsage config` - View/update configuration

- **Vault Locations**
  - Global vault (`~/.secretsage/`) for shared credentials
  - Local vault (`.secretsage/`) for project-specific credentials
  - Custom path (`--path <dir>`) for arbitrary locations

- **Security Features**
  - Age encryption (X25519 + ChaCha20-Poly1305)
  - File permissions (0600 for identity files)
  - Automatic `.gitignore` updates
  - Backup before grant operations

- **Agent Integration**
  - `--json` output for machine-readable responses
  - `--yes` flag for non-interactive automation
  - `--quiet` mode for minimal output

- **UX**
  - Interactive prompts with inquirer
  - Spinner feedback for async operations
  - Credential saved confirmation with ASCII art
  - Color-coded output

### Security

- Credentials encrypted at rest using age encryption
- Private keys stored with restrictive permissions
- No credentials transmitted over network

---

Created by [CycleCore Technologies](https://cyclecore.ai)

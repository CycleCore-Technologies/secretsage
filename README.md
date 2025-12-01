# SecretSage

```
   ___                      _    ___
  / __|  ___  __  _ _  ___ | |_ / __|  __ _   __ _   ___
  \__ \ / -_)/ _|| '_|/ -_)|  _|\__ \ / _` | / _` | / -_)
  |___/ \___|\___|_|  \___| \__||___/ \__,_| \__, | \___|
                                             |___/
```

**The missing OAuth for LLM agents.**

Terminal-based credential wizard for agent-driven development. Store credentials securely with age encryption, grant them to agents on demand, revoke when done.

## Installation

```bash
npm install -g @cyclecore/secretsage
```

Or use directly with npx:

```bash
npx @cyclecore/secretsage
```

## Quick Start

```bash
# Initialize vault (one-time setup)
secretsage init

# Add a credential
secretsage add OPENAI_API_KEY

# Grant to .env for agent use
secretsage grant OPENAI_API_KEY

# Revoke when done
secretsage revoke --all
```

## Why SecretSage?

Agents need credentials. But you don't want to:
- Paste keys into agent prompts
- Hardcode them in `.env` files committed to git
- Teach agents how to use your password manager

SecretSage provides a simple flow:
1. Store credentials once in an encrypted vault
2. Grant them to `.env` when an agent needs them
3. Revoke them when the agent is done

Think of it as OAuth for LLM agents.

## Commands

### `secretsage init`

Initialize the vault and generate encryption keypair.

```bash
secretsage init                       # Interactive, prompts for location
secretsage init --local               # Create vault in current directory
secretsage init --path ~/my-vault     # Create vault at custom path
secretsage init --yes                 # Skip prompts, use defaults
```

### `secretsage add <name>`

Add a credential to the encrypted vault.

```bash
secretsage add OPENAI_API_KEY              # Prompts for value
secretsage add API_KEY --value "sk-..."    # Provide value directly
secretsage add DATABASE_URL --from-env     # Import from existing .env
```

### `secretsage list`

List credential names in the vault.

```bash
secretsage list          # Human-readable output
secretsage list --json   # Machine-readable for agents
secretsage list --all    # Include metadata
```

### `secretsage grant [names...]`

Decrypt and write credentials to `.env`.

```bash
secretsage grant                         # Interactive selection
secretsage grant OPENAI_API_KEY          # Specific credential
secretsage grant --all                   # All credentials
secretsage grant API_KEY --yes           # Non-interactive (for agents)
```

### `secretsage revoke [names...]`

Remove credentials from `.env` (vault remains intact).

```bash
secretsage revoke                    # Interactive selection
secretsage revoke OPENAI_API_KEY     # Specific credential
secretsage revoke --all              # All credentials
```

### `secretsage config`

View or update configuration.

```bash
secretsage config                              # Show current config
secretsage config --path                       # Show config file path
secretsage config --set agent.autoGitignore=false
```

## Agent Integration

### Automatic Grant

Agents can request credentials programmatically:

```bash
# Agent runs this when it needs a credential
npx @cyclecore/secretsage grant OPENAI_API_KEY --yes
source .env
```

### Shell Script Pattern

```bash
#!/bin/bash
if [ -z "$OPENAI_API_KEY" ]; then
  echo "Need OPENAI_API_KEY - launching SecretSage..."
  npx @cyclecore/secretsage grant OPENAI_API_KEY --yes
  source .env
fi
# Continue with agent work...
```

### JSON Output for Agents

```bash
secretsage list --json
```

```json
{
  "credentials": [
    { "name": "OPENAI_API_KEY" },
    { "name": "DATABASE_URL" }
  ],
  "count": 2
}
```

## Security

- **age encryption**: Modern, audited cryptography ([age-encryption.org](https://age-encryption.org))
- **Local storage**: Credentials never leave your machine
- **File permissions**: Identity files are stored with 0600 permissions
- **Auto-gitignore**: Automatically adds `.env` and `.secretsage/` to `.gitignore`
- **Backup on grant**: Creates `.env.backup.*` before modifying

## Vault Locations

| Location | Path | Use Case |
|----------|------|----------|
| Global | `~/.secretsage/` | Share credentials across projects |
| Local | `.secretsage/` | Project-specific credentials |
| Custom | Any path | Shared drives, team locations |

The global vault is used by default. Use `--local` flag, `--path <dir>`, or set `vault.defaultLocation` in config.

## Configuration

Global config: `~/.secretsage/config.yaml`
Local config: `.secretsage/config.yaml`

```yaml
version: "1"

vault:
  defaultLocation: global  # global | local

encryption:
  provider: age

agent:
  autoGitignore: true
  backupEnvOnGrant: true
  requireConfirmation: true
```

## Roadmap

- [ ] MCP server mode for direct agent integration
- [ ] 1Password plugin
- [ ] Bitwarden plugin
- [ ] macOS Keychain plugin
- [ ] Team vaults with shared recipients
- [ ] Audit logging
- [ ] Credential rotation reminders

## License

Apache 2.0 - CycleCore Technologies

---

Built with love by [CycleCore Technologies](https://cyclecore.ai)

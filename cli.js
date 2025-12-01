#!/usr/bin/env node

/**
 * SecretSage CLI
 *
 * Terminal-based credential wizard for agent-driven development.
 * The missing OAuth for LLM agents.
 *
 * Usage:
 *   secretsage init          Initialize vault and generate keypair
 *   secretsage add <name>    Add a credential to the vault
 *   secretsage list          List credential names
 *   secretsage grant         Grant credentials to .env
 *   secretsage revoke        Remove credentials from .env
 */

require('./dist/cli.js');

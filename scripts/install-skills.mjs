#!/usr/bin/env node
/**
 * Install ERPNext domain skills for Cursor, Claude, Gemini CLI, and OpenCode.
 *
 * Copies .cursor/skills/ and .cursor/memory-lane/ to each client's discovery path.
 */

import {
  installSkills,
  printInstallResults,
  SKILL_CLIENTS,
} from './lib/skills-install.mjs';

function parseArgs(argv) {
  let scope = 'workspace';
  /** @type {string[] | undefined} */
  let clients;

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === '--scope' && argv[i + 1]) {
      scope = argv[++i];
      continue;
    }
    if (arg === '--clients' && argv[i + 1]) {
      clients = argv[++i].split(',').map((s) => s.trim()).filter(Boolean);
      continue;
    }
    if (arg === '--help' || arg === '-h') {
      console.log(`Usage: npm run install-skills [-- --scope workspace|user] [--clients cursor,claude,gemini,opencode]

Installs ERPNext skills from .cursor/skills/ to:

  cursor   → .cursor/skills/     (workspace) or ~/.cursor/skills/     (user)
  claude   → .claude/skills/     (workspace) or ~/.claude/skills/     (user)
  gemini   → .gemini/skills/     (workspace) or ~/.gemini/skills/     (user)
  opencode → .opencode/skills/   (workspace) or ~/.config/opencode/skills/ (user)

Also copies .cursor/memory-lane/ beside each skills folder so skill links resolve.

Default: --scope workspace --clients cursor,claude,gemini,opencode
`);
      process.exit(0);
    }
  }

  if (scope !== 'workspace' && scope !== 'user') {
    throw new Error('--scope must be workspace or user');
  }

  return { scope, clients };
}

try {
  const { scope, clients } = parseArgs(process.argv.slice(2));
  const results = await installSkills({ scope, clients });
  printInstallResults(results);
} catch (error) {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`install-skills failed: ${message}`);
  console.error(`Supported clients: ${SKILL_CLIENTS.map((c) => c.id).join(', ')}`);
  process.exit(1);
}

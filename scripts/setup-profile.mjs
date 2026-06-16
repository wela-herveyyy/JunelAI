#!/usr/bin/env node
/**
 * User profile setup — interactive or CLI (for humans and AI agents).
 *
 * Interactive:
 *   npm run setup-profile
 *
 * Non-interactive (AI / automation):
 *   npm run setup-profile -- --full-name "Hervey Geralph C. Mapano" --work-email "hervey.geralph@livro.systems" --json
 */

import readline from 'node:readline/promises';
import { stdin as input, stdout as output } from 'node:process';

import {
  askField,
  hasCliProfileInput,
  loadProfile,
  mergeIdentityFields,
  parseProfileArgs,
  writeProfile,
} from './lib/profile.mjs';

function printHelp() {
  console.log(`
ERPNext MCP — User Profile Setup

Interactive:
  npm run setup-profile

Non-interactive (AI agents may run this):
  npm run setup-profile -- --full-name "Name" --work-email "you@company.com" --json

Options:
  --full-name, --fullName    Full name
  --position                 Job title / designation
  --work-email, --workEmail  Work email
  --company                  Company name
  --department               Department
  --json                     Print result JSON (for agents)
  --yes, -y                  Skip confirmation when stdin is not a TTY
  --help, -h                 Show this help

Saves to ~/.erpnext-mcp/user-profile.json and .cursor/memory-lane/user-profile.md
`);
}

async function main() {
  const cli = parseProfileArgs(process.argv);

  if (cli.help) {
    printHelp();
    return;
  }

  const { path: existingPath, profile: existing } = await loadProfile();
  let profile;

  if (hasCliProfileInput(cli)) {
    profile = mergeIdentityFields(existing, cli);
  } else {
    const rl = readline.createInterface({ input, output });

    console.log('\nERPNext MCP — User Profile Setup\n');
    console.log('Press Enter to keep the current value in [brackets].\n');

    if (existing.fullName || existing.workEmail) {
      console.log(`Current profile: ${existingPath}\n`);
    }

    profile = {
      ...existing,
      fullName: await askField(rl, 'Full name', existing.fullName),
      position: await askField(rl, 'Position', existing.position),
      workEmail: await askField(rl, 'Work email', existing.workEmail),
      company: await askField(rl, 'Company', existing.company),
      department: await askField(rl, 'Department', existing.department),
    };

    rl.close();
  }

  if (!profile.fullName && !profile.workEmail) {
    console.error('\nAt least Full name or Work email is required.');
    process.exit(1);
  }

  await writeProfile(profile, { json: cli.json });
}

main().catch((error) => {
  console.error('Setup failed:', error?.message || error);
  process.exit(1);
});

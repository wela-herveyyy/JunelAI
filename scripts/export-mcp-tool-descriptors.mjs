#!/usr/bin/env node
/**
 * Export MCP tool JSON descriptors (for Cursor mcps cache / docs).
 * Runs automatically after `npm run build`.
 */

import { mkdir, readdir, unlink, writeFile } from 'node:fs/promises';
import { homedir } from 'node:os';
import { join } from 'node:path';

import { TOOL_DEFINITIONS } from '../build/handlers/tools/definitions.js';

const REPO_OUT = join(process.cwd(), '.cursor', 'mcp-tool-descriptors', 'user-erpnext', 'tools');

/** Cursor project mcps cache (agent tool discovery). */
const CURSOR_MCPS_CANDIDATES = [
  join(
    homedir(),
    '.cursor',
    'projects',
    'c-Users-hmapa-Documents-PROJECTS-MCPs-erpnext-mcp-server',
    'mcps',
    'user-erpnext',
    'tools'
  ),
];

function toDescriptor(tool) {
  return {
    name: tool.name,
    description: tool.description,
    arguments: tool.inputSchema,
  };
}

async function exportToDir(outDir) {
  await mkdir(outDir, { recursive: true });
  const expected = new Set(TOOL_DEFINITIONS.map((tool) => `${tool.name}.json`));
  for (const entry of await readdir(outDir)) {
    if (entry.endsWith('.json') && !expected.has(entry)) {
      await unlink(join(outDir, entry));
    }
  }
  for (const tool of TOOL_DEFINITIONS) {
    const path = join(outDir, `${tool.name}.json`);
    await writeFile(path, `${JSON.stringify(toDescriptor(tool), null, 2)}\n`, 'utf8');
  }
}

await exportToDir(REPO_OUT);
console.log(`Exported ${TOOL_DEFINITIONS.length} MCP tool descriptors to ${REPO_OUT}`);

for (const cursorDir of CURSOR_MCPS_CANDIDATES) {
  try {
    await exportToDir(cursorDir);
    const names = await readdir(cursorDir);
    console.log(`Synced ${names.length} tool descriptors to ${cursorDir}`);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.warn(`Skipped Cursor mcps sync (${cursorDir}): ${message}`);
  }
}

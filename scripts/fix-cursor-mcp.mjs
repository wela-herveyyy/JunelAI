#!/usr/bin/env node
/**
 * Configure Cursor for erpnext MCP: build/index.js + 16-tool split for Cursor UI.
 *
 * Cursor shows at most ~16 tools per MCP server. With 17 tools registered, it drops
 * get_doctype_fields. This script splits into:
 *   - erpnext (16 tools, includes note_document)
 *   - erpnext-fields (get_doctype_fields only)
 */

import { homedir } from 'node:os';
import { join } from 'node:path';
import { readFile, readdir, unlink, writeFile } from 'node:fs/promises';

import { TOOL_DEFINITIONS } from '../build/handlers/tools/definitions.js';

const MCP_JSON = join(homedir(), '.cursor', 'mcp.json');
const MCPS_TOOLS = join(
  homedir(),
  '.cursor',
  'projects',
  'c-Users-hmapa-Documents-PROJECTS-MCPs-erpnext-mcp-server',
  'mcps',
  'user-erpnext',
  'tools'
);
const BUILD_ENTRY = join(process.cwd(), 'build', 'index.js').replace(/\\/g, '/');
const OVERFLOW_TOOL = 'get_doctype_fields';

async function fixMcpJson() {
  const raw = await readFile(MCP_JSON, 'utf8');
  const config = JSON.parse(raw);
  const erpnext = config.mcpServers?.erpnext;
  if (!erpnext) {
    console.warn('No erpnext block in mcp.json');
    return;
  }

  const sharedEnv = { ...(erpnext.env ?? {}) };
  erpnext.command = 'node';
  erpnext.args = [BUILD_ENTRY];
  erpnext.env = {
    ...sharedEnv,
    ERPNEXT_MCP_TOOL_EXCLUDE: OVERFLOW_TOOL,
  };

  config.mcpServers['erpnext-fields'] = {
    command: 'node',
    args: [BUILD_ENTRY],
    env: {
      ...sharedEnv,
      ERPNEXT_MCP_TOOL_INCLUDE: OVERFLOW_TOOL,
    },
  };

  await writeFile(MCP_JSON, `${JSON.stringify(config, null, 2)}\n`, 'utf8');
  console.log('Updated mcp.json:');
  console.log(`  erpnext → all tools except ${OVERFLOW_TOOL} (16 for Cursor UI)`);
  console.log(`  erpnext-fields → ${OVERFLOW_TOOL} only`);
}

async function purgeStaleToolCache() {
  const expected = new Set(TOOL_DEFINITIONS.map((t) => `${t.name}.json`));
  const entries = await readdir(MCPS_TOOLS);
  let removed = 0;
  for (const entry of entries) {
    if (entry.endsWith('.json') && !expected.has(entry)) {
      await unlink(join(MCPS_TOOLS, entry));
      console.log('Removed stale cache:', entry);
      removed++;
    }
  }
  console.log(`Cache purge done (${removed} stale file(s) removed)`);
  console.log(`Server registers ${TOOL_DEFINITIONS.length} tools total`);
  console.log(
    'Cursor erpnext server should show 16; use erpnext-fields for get_doctype_fields'
  );
}

await fixMcpJson();
await purgeStaleToolCache();

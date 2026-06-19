#!/usr/bin/env node
/**
 * Verify source definitions, build output, and live ListTools all match.
 */

import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import { TOOL_DEFINITIONS as sourceTools } from '../build/handlers/tools/definitions.js';

const transport = new StdioClientTransport({
  command: 'node',
  args: ['build/index.js'],
  env: { ...process.env },
});

const client = new Client({ name: 'verify-tools', version: '1.0.0' });
await client.connect(transport);
const { tools } = await client.listTools();
await client.close();

const sourceNames = sourceTools.map((tool) => tool.name).sort();
const liveNames = tools.map((tool) => tool.name).sort();

console.log(`Source/build definitions: ${sourceNames.length}`);
console.log(`Live ListTools response:  ${liveNames.length}`);

const missing = sourceNames.filter((name) => !liveNames.includes(name));
const extra = liveNames.filter((name) => !sourceNames.includes(name));

if (missing.length) {
  console.error('\nMissing from live server:', missing.join(', '));
}
if (extra.length) {
  console.error('\nExtra on live server:', extra.join(', '));
}

if (missing.length || extra.length || sourceNames.length !== liveNames.length) {
  console.error('\nTool registry mismatch — run: npm run build');
  process.exit(1);
}

console.log('\nAll tools registered:');
for (const name of liveNames) {
  console.log(`  - ${name}`);
}

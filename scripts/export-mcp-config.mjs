#!/usr/bin/env node
/**
 * Re-export MCP config snippets for all supported clients
 * from an existing credentials file.
 */

import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { buildMcpConfig, loadCredentials } from './lib/credentials.mjs';
import { exportMcpSetup } from './lib/mcp-clients.mjs';
import { normalizeUrl } from './lib/sid-auth.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));

async function main() {
  const explicitPath = process.argv[2];
  const { path: credentialsPath, data } = await loadCredentials(explicitPath);

  if (!data) {
    console.error(`No credentials at: ${credentialsPath}`);
    console.error('Run: npm run setup-sid');
    process.exit(1);
  }

  const baseUrl = normalizeUrl(data.ERPNEXT_URL || '');
  if (!baseUrl) {
    console.error('ERPNEXT_URL missing from credentials file');
    process.exit(1);
  }

  const serverPath = join(__dirname, '..', 'build', 'index.js').replace(/\\/g, '/');
  const config = buildMcpConfig({
    serverPath,
    credentialsPath,
    baseUrl,
  });

  await exportMcpSetup(config);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});

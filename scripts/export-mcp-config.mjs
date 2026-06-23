#!/usr/bin/env node
/**
 * Re-export MCP config snippets for all supported clients
 * from an existing credentials file.
 */

import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { buildMcpConfig, buildMcpUrlConfig, loadCredentials } from './lib/credentials.mjs';
import { exportMcpSetup } from './lib/mcp-clients.mjs';
import { normalizeUrl } from './lib/sid-auth.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));

function parseArgs(argv) {
  const args = {
    credentialsPath: '',
    http: false,
    port: process.env.MCP_PORT || '3100',
    host: process.env.MCP_HOST || '127.0.0.1',
    path: process.env.MCP_PATH || '/mcp',
    authToken: process.env.MCP_AUTH_TOKEN || '',
  };

  for (let i = 2; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === '--http') args.http = true;
    else if (arg === '--port' && argv[i + 1]) args.port = argv[++i];
    else if (arg === '--host' && argv[i + 1]) args.host = argv[++i];
    else if (arg === '--path' && argv[i + 1]) args.path = argv[++i];
    else if (arg === '--auth-token' && argv[i + 1]) args.authToken = argv[++i];
    else if (!arg.startsWith('-') && !args.credentialsPath) args.credentialsPath = arg;
  }

  return args;
}

async function main() {
  const cli = parseArgs(process.argv);
  const { path: credentialsPath, data } = await loadCredentials(cli.credentialsPath || undefined);

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

  if (cli.http) {
    const mcpPath = cli.path.startsWith('/') ? cli.path : `/${cli.path}`;
    const url = `http://${cli.host}:${cli.port}${mcpPath}`;
    const config = buildMcpUrlConfig({
      url,
      authToken: cli.authToken || undefined,
    });
    await exportMcpSetup({ mcpServers: config.mcpServers });
    console.log('\nStart the HTTP server in another terminal:');
    console.log(`  npm run start:http -- --host ${cli.host} --port ${cli.port} --path ${mcpPath}`);
    if (cli.authToken) {
      console.log('  MCP_AUTH_TOKEN is set — pass the same value when starting the server.');
    }
    return;
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

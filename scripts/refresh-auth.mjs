#!/usr/bin/env node
/**
 * Refresh ERPNext MCP session — for humans and AI agents.
 *
 * Finds sid from (in order): --sid, clipboard, Cursor mcp.json, credentials.json
 * Validates, resolves CSRF, saves ~/.erpnext-mcp/credentials.json
 *
 * Usage:
 *   npm run refresh-auth
 *   npm run refresh-auth -- --sid YOUR_SID --json
 *   npm run refresh-auth -- --clipboard --json
 */

import axios from 'axios';
import { readFile } from 'node:fs/promises';

import { readClipboardText } from './lib/clipboard.mjs';
import { applyWriteAuth } from './lib/csrf.mjs';
import {
  credentialsToEnv,
  loadCredentials,
  resolveCredentialsPath,
  saveCredentials,
} from './lib/credentials.mjs';
import { getMcpClients } from './lib/mcp-clients.mjs';
import {
  DEFAULT_ERP_URL,
  extractSidFromText,
  normalizeUrl,
  validateSidSession,
} from './lib/sid-auth.mjs';

function parseArgs(argv) {
  const args = { sid: '', url: '', json: false, clipboard: false, help: false };
  for (let i = 2; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--help' || arg === '-h') args.help = true;
    else if (arg === '--json') args.json = true;
    else if (arg === '--clipboard') args.clipboard = true;
    else if (arg === '--sid' && argv[i + 1]) args.sid = argv[++i];
    else if (arg === '--url' && argv[i + 1]) args.url = argv[++i];
  }
  return args;
}

function printHelp() {
  console.log(`
ERPNext MCP — Refresh Auth (AI-friendly)

Auto-finds sid from: --sid → clipboard (--clipboard) → Cursor mcp.json → credentials.json

Examples:
  npm run refresh-auth
  npm run refresh-auth -- --clipboard --json
  npm run refresh-auth -- --sid "abc123..." --json

After success, restart the ERPNext MCP server in Cursor (toggle off/on).
`);
}

async function findSidFromMcpConfig() {
  for (const client of getMcpClients()) {
    try {
      const raw = await readFile(client.configPath, 'utf8');
      const config = JSON.parse(raw);
      const sid = config?.mcpServers?.erpnext?.env?.ERPNEXT_SID;
      if (sid) {
        return { sid, source: client.configPath };
      }
    } catch {
      // try next client config path
    }
  }
  return null;
}

async function resolveSid(args) {
  if (args.sid) {
    const sid = extractSidFromText(args.sid);
    if (!sid) throw new Error('--sid value is not a valid sid');
    return { sid, source: 'cli --sid' };
  }

  if (args.clipboard || !args.sid) {
    const fromClip = extractSidFromText(readClipboardText());
    if (fromClip) {
      return { sid: fromClip, source: 'clipboard' };
    }
  }

  const fromMcp = await findSidFromMcpConfig();
  if (fromMcp) {
    return fromMcp;
  }

  const { data } = await loadCredentials();
  if (data?.ERPNEXT_SID) {
    return { sid: data.ERPNEXT_SID, source: resolveCredentialsPath() };
  }

  return null;
}

async function resolveCsrfForSid(baseUrl, sid) {
  const client = axios.create({
    baseURL: baseUrl,
    headers: {
      Accept: 'application/json',
      Cookie: `sid=${sid}`,
    },
  });
  await applyWriteAuth(client, { ERPNEXT_SID: sid });
  return client.defaults.headers['X-Frappe-CSRF-Token'] || '';
}

async function main() {
  const args = parseArgs(process.argv);
  if (args.help) {
    printHelp();
    return;
  }

  const { data: existing } = await loadCredentials();
  const env = credentialsToEnv(existing || {});
  const baseUrl = normalizeUrl(args.url || env.ERPNEXT_URL || DEFAULT_ERP_URL);

  const resolved = await resolveSid(args);
  if (!resolved) {
    const message =
      'No sid found. Log in to ERPNext, copy the sid cookie, then run:\n' +
      '  npm run refresh-auth -- --sid YOUR_SID --json\n' +
      'Or copy sid to clipboard and run: npm run refresh-auth -- --clipboard --json';
    if (args.json) {
      console.log(JSON.stringify({ status: 'error', message }, null, 2));
    } else {
      console.error(message);
    }
    process.exit(1);
  }

  const session = await validateSidSession(baseUrl, resolved.sid);
  let csrfToken = session.csrfToken;
  if (!csrfToken) {
    csrfToken = await resolveCsrfForSid(baseUrl, session.sid);
  }

  const credentials = {
    ERPNEXT_URL: baseUrl,
    ERPNEXT_SID: session.sid,
    ERPNEXT_CSRF_TOKEN: csrfToken,
    _meta: {
      authMethod: 'sid',
      loggedUser: session.user,
    },
  };

  const savedPath = await saveCredentials(credentials);
  const result = {
    status: 'success',
    user: session.user,
    sidSource: resolved.source,
    credentialsPath: savedPath,
    message: 'Session saved. Restart the ERPNext MCP server in Cursor.',
  };

  if (args.json) {
    console.log(JSON.stringify(result, null, 2));
  } else {
    console.log('\nAuth refreshed');
    console.log(`User: ${session.user}`);
    console.log(`SID from: ${resolved.source}`);
    console.log(`Saved: ${savedPath}`);
    console.log('\nRestart the ERPNext MCP server in Cursor (toggle off/on).\n');
  }
}

main().catch((error) => {
  const message = error?.message || String(error);
  if (process.argv.includes('--json')) {
    console.log(JSON.stringify({ status: 'error', message }, null, 2));
  } else {
    console.error(`Refresh failed: ${message}`);
    console.error('\nLog in to ERPNext, copy a fresh sid, then:');
    console.error('  npm run refresh-auth -- --sid YOUR_SID --json\n');
  }
  process.exit(1);
});

#!/usr/bin/env node
/**
 * Interactive ERPNext MCP auth setup.
 *
 * For SID-only browser session flow, use: npm run setup-sid
 */

import axios from 'axios';
import readline from 'node:readline/promises';
import { stdin as input, stdout as output } from 'node:process';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFile } from 'node:child_process';
import { platform } from 'node:os';

import { exportMcpSetup } from './lib/mcp-clients.mjs';
import {
  buildMcpConfig,
  saveCredentials,
} from './lib/credentials.mjs';
import {
  DEFAULT_ERP_URL,
  normalizeUrl,
} from './lib/sid-auth.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));

function parseArgs(argv) {
  const args = { url: '', apiKey: '', apiSecret: '', json: false };
  for (let i = 2; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--json') args.json = true;
    else if (arg === '--url' && argv[i + 1]) args.url = argv[++i];
    else if ((arg === '--api-key' || arg === '--apiKey') && argv[i + 1]) args.apiKey = argv[++i];
    else if ((arg === '--api-secret' || arg === '--apiSecret') && argv[i + 1]) args.apiSecret = argv[++i];
  }
  return args;
}

function openBrowser(url) {
  const cmd = platform() === 'win32' ? 'cmd' : platform() === 'darwin' ? 'open' : 'xdg-open';
  const args = platform() === 'win32' ? ['/c', 'start', '', url] : [url];
  execFile(cmd, args, () => { });
}

async function testApiKey(baseUrl, apiKey, apiSecret) {
  const client = axios.create({
    baseURL: baseUrl,
    headers: {
      Authorization: `token ${apiKey}:${apiSecret}`,
      Accept: 'application/json',
    },
  });
  const res = await client.get('/api/method/frappe.auth.get_logged_user');
  return res.data?.message;
}

async function loginWithCredentials(baseUrl, username, password) {
  const client = axios.create({
    baseURL: baseUrl,
    headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
  });
  const res = await client.post('/api/method/login', { usr: username, pwd: password });
  if (res.data?.message !== 'Logged In' && res.data?.message !== 'No App') {
    throw new Error(res.data?.message || 'Login failed');
  }
  const userRes = await client.get('/api/method/frappe.auth.get_logged_user');
  return userRes.data?.message;
}


async function persist(credentials, baseUrl) {
  const serverPath = join(__dirname, '..', 'build', 'index.js').replace(/\\/g, '/');
  const savedPath = await saveCredentials(credentials);
  const config = buildMcpConfig({
    serverPath,
    credentialsPath: savedPath,
    baseUrl,
  });
  await exportMcpSetup(config);
  return savedPath;
}

async function main() {
  const cli = parseArgs(process.argv);

  if (cli.apiKey || cli.apiSecret) {
    const baseUrl = normalizeUrl(cli.url || process.env.X_ERPNEXT_URL || DEFAULT_ERP_URL);
    try {
      const verifiedUser = await testApiKey(baseUrl, cli.apiKey, cli.apiSecret);
      const savedPath = await persist({
        ERPNEXT_URL: baseUrl,
        ERPNEXT_API_KEY: cli.apiKey,
        ERPNEXT_API_SECRET: cli.apiSecret,
        _meta: { authMethod: 'api_key', loggedUser: verifiedUser },
      }, baseUrl);
      if (cli.json) {
        console.log(JSON.stringify({ ok: true, method: 'api_key', user: verifiedUser, url: baseUrl, credentials: savedPath }));
      } else {
        console.log(`\nConnected as: ${verifiedUser}`);
        console.log(`Saved credentials: ${savedPath}`);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      if (cli.json) console.log(JSON.stringify({ ok: false, error: message }));
      else console.error(`\nAuth failed: ${message}\n`);
      process.exit(1);
    }
    return;
  }

  const rl = readline.createInterface({ input, output });

  console.log('\nERPNext MCP — Auth Setup\n');
  console.log('Supports Cursor, Claude, Gemini, Codex, and OpenCode.');
  console.log('For full SID browser flow, run: npm run setup-sid\n');

  const baseUrl = normalizeUrl(
    (await rl.question(`ERPNext URL [${DEFAULT_ERP_URL}]: `)).trim() || DEFAULT_ERP_URL
  );

  console.log('\nChoose auth method:');
  console.log('  1) API Key + Secret (recommended)');
  console.log('  2) Username + Password (auto login)');
  console.log('  3) SID browser session (runs full setup-sid flow)\n');

  const choice = (await rl.question('Enter 1, 2, or 3: ')).trim();

  if (choice === '3') {
    rl.close();
    const { spawn } = await import('node:child_process');
    spawn(process.execPath, [join(__dirname, 'setup-sid.mjs'), '--url', baseUrl], {
      stdio: 'inherit',
    });
    return;
  }

  let credentials = { ERPNEXT_URL: baseUrl, _meta: { authMethod: 'unknown' } };
  let verifiedUser = '';

  try {
    if (choice === '1') {
      console.log('\nOpening ERPNext so you can generate API keys...');
      openBrowser(`${baseUrl}/app/user-profile`);

      const apiKey = (await rl.question('API Key: ')).trim();
      const apiSecret = (await rl.question('API Secret: ')).trim();
      if (!apiKey || !apiSecret) throw new Error('API key and secret are required');

      verifiedUser = await testApiKey(baseUrl, apiKey, apiSecret);
      credentials = {
        ERPNEXT_URL: baseUrl,
        ERPNEXT_API_KEY: apiKey,
        ERPNEXT_API_SECRET: apiSecret,
        _meta: { authMethod: 'api_key', loggedUser: verifiedUser },
      };
    } else if (choice === '2') {
      const username = (await rl.question('ERPNext email / username: ')).trim();
      const password = (await rl.question('Password: ')).trim();
      if (!username || !password) throw new Error('Username and password are required');

      verifiedUser = await loginWithCredentials(baseUrl, username, password);
      credentials = {
        ERPNEXT_URL: baseUrl,
        ERPNEXT_USERNAME: username,
        ERPNEXT_PASSWORD: password,
        _meta: { authMethod: 'password', loggedUser: verifiedUser },
      };
    } else {
      throw new Error('Invalid choice');
    }
  } catch (err) {
    console.error(`\nAuth failed: ${err.message || err}\n`);
    rl.close();
    process.exit(1);
  }

  console.log(`\nConnected as: ${verifiedUser}`);

  const savedPath = await persist(credentials, baseUrl);
  console.log(`Saved credentials: ${savedPath}`);

  rl.close();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

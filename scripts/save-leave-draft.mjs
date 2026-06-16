#!/usr/bin/env node
/**
 * Save a Leave Application as draft (docstatus 0) in ERPNext.
 *
 * Usage:
 *   npm run save-leave-draft
 *   npm run save-leave-draft -- scripts/drafts/leave-application-2026-06-24.json
 */

import axios from 'axios';
import { readFile } from 'node:fs/promises';
import { homedir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { credentialsToEnv, loadCredentials } from './lib/credentials.mjs';
import { applyWriteAuth } from './lib/csrf.mjs';
import { normalizeUrl } from './lib/sid-auth.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DEFAULT_DRAFT = join(__dirname, 'drafts', 'leave-application-2026-06-24.json');

async function resolveEnv() {
  const { path: credentialsPath, data } = await loadCredentials();
  const env = credentialsToEnv(data);
  if (env.ERPNEXT_URL) {
    return { env, source: credentialsPath };
  }

  const mcpPaths = [
    join(homedir(), '.cursor', 'mcp.json'),
    join(process.env.APPDATA || '', 'Cursor', 'User', 'globalStorage', 'cursor.mcp', 'mcp.json'),
  ];

  for (const mcpPath of mcpPaths) {
    try {
      const mcp = JSON.parse(await readFile(mcpPath, 'utf8'));
      const serverEnv = mcp?.mcpServers?.erpnext?.env;
      if (serverEnv?.ERPNEXT_URL) {
        return { env: serverEnv, source: mcpPath };
      }
    } catch {
      // try next path
    }
  }

  throw new Error('No ERPNext auth found. Run: npm run setup-sid');
}

async function createClient(env, baseUrl) {
  const headers = {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  };

  if (env.ERPNEXT_API_KEY && env.ERPNEXT_API_SECRET) {
    headers.Authorization = `token ${env.ERPNEXT_API_KEY}:${env.ERPNEXT_API_SECRET}`;
  } else if (env.ERPNEXT_SID) {
    headers.Cookie = `sid=${env.ERPNEXT_SID}`;
  } else {
    throw new Error('No auth in credentials. Run: npm run setup-sid');
  }

  const client = axios.create({ baseURL: baseUrl, headers });

  const userRes = await client.get('/api/method/frappe.auth.get_logged_user');
  const user = userRes.data?.message;
  if (!user || user === 'Guest') {
    throw new Error('Session expired or not logged in. Run: npm run setup-sid');
  }

  if (env.ERPNEXT_SID || env.ERPNEXT_COOKIE) {
    await applyWriteAuth(client, env);
  }

  return { client, user };
}

async function main() {
  const draftPath = process.argv[2] || DEFAULT_DRAFT;
  const draft = JSON.parse(await readFile(draftPath, 'utf8'));
  const { env, source } = await resolveEnv();
  const baseUrl = normalizeUrl(env.ERPNEXT_URL);

  const { doctype, ...doc } = draft;
  const { client, user } = await createClient(env, baseUrl);

  try {
    const res = await client.post(`/api/resource/${encodeURIComponent(doctype)}`, { data: doc });
    const saved = res.data?.data;
    console.log('Draft saved in ERPNext');
    console.log(`User: ${user}`);
    console.log(`ID: ${saved?.name}`);
    console.log(`Status: ${saved?.status || 'Open'} (docstatus ${saved?.docstatus ?? 0})`);
    console.log(`Dates: ${saved?.from_date} → ${saved?.to_date}`);
    console.log(`Open in ERPNext: ${baseUrl}/app/leave-application/${saved?.name}`);
  } catch (error) {
    const detail = error.response?.data;
    console.error('Failed to save draft:', detail?._error_message || detail?.message || error.message);
    if (detail) {
      console.error(JSON.stringify(detail, null, 2));
    }
    console.error(`\nAuth source: ${source}`);
    console.error('Draft file is ready — retry after: npm run setup-sid');
    process.exit(1);
  }
}

main().catch((error) => {
  console.error(error.message || error);
  process.exit(1);
});

#!/usr/bin/env node
/**
 * Verify saved ERPNext MCP credentials (SID, API key, or username/password).
 */

import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import axios from 'axios';

import { credentialsToEnv, loadCredentials, resolveCredentialsPath } from './lib/credentials.mjs';
import { normalizeUrl, validateSidSession } from './lib/sid-auth.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));

async function verifyApiKey(baseUrl, apiKey, apiSecret) {
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

async function verifyPassword(baseUrl, username, password) {
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

async function main() {
  const explicitPath = process.argv[2];
  const credentialsPath = resolveCredentialsPath(explicitPath);
  const { data } = await loadCredentials(credentialsPath);

  if (!data) {
    console.error(`No credentials file found at: ${credentialsPath}`);
    console.error('Run: npm run setup-sid');
    process.exit(1);
  }

  const env = credentialsToEnv(data);
  const baseUrl = normalizeUrl(env.ERPNEXT_URL || '');
  if (!baseUrl) {
    console.error('ERPNEXT_URL missing from credentials file');
    process.exit(1);
  }

  try {
    let user = '';
    let method = data._meta?.authMethod || 'unknown';

    if (env.ERPNEXT_API_KEY && env.ERPNEXT_API_SECRET) {
      user = await verifyApiKey(baseUrl, env.ERPNEXT_API_KEY, env.ERPNEXT_API_SECRET);
      method = 'api_key';
    } else if (env.ERPNEXT_SID) {
      const session = await validateSidSession(baseUrl, env.ERPNEXT_SID);
      user = session.user;
      method = 'sid';
    } else if (env.ERPNEXT_USERNAME && env.ERPNEXT_PASSWORD) {
      user = await verifyPassword(baseUrl, env.ERPNEXT_USERNAME, env.ERPNEXT_PASSWORD);
      method = 'password';
    } else {
      throw new Error('Credentials file has no supported auth fields');
    }

    console.log('Auth OK');
    console.log(`File: ${credentialsPath}`);
    console.log(`Method: ${method}`);
    console.log(`User: ${user}`);
    if (data._meta?.savedAt) {
      console.log(`Saved: ${data._meta.savedAt}`);
    }
  } catch (error) {
    console.error('Auth FAILED');
    console.error(`File: ${credentialsPath}`);
    console.error(error.message || error);
    if (env.ERPNEXT_SID) {
      console.error('\nSID likely expired. Run: npm run setup-sid');
    }
    process.exit(1);
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});

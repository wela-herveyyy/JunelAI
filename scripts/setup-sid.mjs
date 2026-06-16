#!/usr/bin/env node
/**
 * Option C — full SID session setup (no localhost loopback).
 *
 * Flow:
 * 1. Open ERPNext login in the browser
 * 2. Show local helper guide (file://)
 * 3. User copies sid from DevTools
 * 4. Script reads clipboard or accepts manual paste
 * 5. Validates session + CSRF, saves ~/.erpnext-mcp/credentials.json
 * 6. Prints MCP config for Cursor, Claude, Gemini, Codex, and OpenCode
 */

import readline from 'node:readline/promises';
import { stdin as input, stdout as output } from 'node:process';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { openBrowser, openLocalFile } from './lib/browser.mjs';
import { readClipboardText } from './lib/clipboard.mjs';
import {
  buildMcpConfig,
  saveCredentials,
} from './lib/credentials.mjs';
import { exportMcpSetup } from './lib/mcp-clients.mjs';
import {
  DEFAULT_ERP_URL,
  extractSidFromText,
  normalizeUrl,
  validateSidSession,
} from './lib/sid-auth.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));

function parseArgs(argv) {
  const args = { sid: '', url: '', yes: false };
  for (let i = 2; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--sid' && argv[i + 1]) {
      args.sid = argv[++i];
    } else if (arg === '--url' && argv[i + 1]) {
      args.url = argv[++i];
    } else if (arg === '--yes' || arg === '-y') {
      args.yes = true;
    }
  }
  return args;
}

function printConfig(config) {
  return exportMcpSetup(config);
}

async function promptForSid(rl, presetSid) {
  if (presetSid) {
    return presetSid;
  }

  console.log('\nAfter you copy sid from DevTools, press Enter to read the clipboard.');
  console.log('Or type/paste sid manually, then press Enter.\n');

  const first = (await rl.question('SID (Enter = read clipboard): ')).trim();
  if (first) {
    const sid = extractSidFromText(first);
    if (!sid) throw new Error('That value does not look like a valid sid');
    return sid;
  }

  const clipboard = readClipboardText();
  const sid = extractSidFromText(clipboard);
  if (!sid) {
    const manual = (await rl.question('Clipboard empty or unrecognized. Paste sid: ')).trim();
    const parsed = extractSidFromText(manual);
    if (!parsed) throw new Error('Could not detect a valid sid');
    return parsed;
  }

  console.log('Detected sid from clipboard.');
  return sid;
}

async function main() {
  const args = parseArgs(process.argv);
  const rl = readline.createInterface({ input, output });
  const serverPath = join(__dirname, '..', 'build', 'index.js').replace(/\\/g, '/');
  const helperPath = join(__dirname, 'sid-helper.html');

  console.log('\nERPNext MCP — SID Setup (Option C)\n');
  console.log('Works with Cursor, Claude, Gemini, Codex, and OpenCode.');
  console.log('No localhost callback. Browser login + one cookie copy only.\n');

  const baseUrl = normalizeUrl(
    args.url || (await rl.question(`ERPNext URL [${DEFAULT_ERP_URL}]: `)).trim() || DEFAULT_ERP_URL
  );

  if (!args.sid) {
    console.log('\nOpening ERPNext login...');
    openBrowser(`${baseUrl}/login`);
    console.log('Opening step-by-step helper...');
    openLocalFile(helperPath);
  }

  let sid = '';
  try {
    sid = await promptForSid(rl, args.sid);
    console.log('\nValidating session...');
    const session = await validateSidSession(baseUrl, sid);

    const credentials = {
      ERPNEXT_URL: baseUrl,
      ERPNEXT_SID: session.sid,
      ERPNEXT_CSRF_TOKEN: session.csrfToken,
      _meta: {
        authMethod: 'sid',
        loggedUser: session.user,
      },
    };

    const savedPath = await saveCredentials(credentials);
    console.log(`\nConnected as: ${session.user}`);
    console.log(`Saved credentials: ${savedPath}`);

    const config = buildMcpConfig({
      serverPath,
      credentialsPath: savedPath,
      baseUrl,
    });
    await printConfig(config);

    if (!args.yes) {
      console.log('When SID expires, run: npm run setup-sid');
    }
  } catch (error) {
    console.error(`\nSID setup failed: ${error.message || error}`);
    console.error('Log in to ERPNext again, copy a fresh sid, and re-run: npm run setup-sid\n');
    rl.close();
    process.exit(1);
  }

  rl.close();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});

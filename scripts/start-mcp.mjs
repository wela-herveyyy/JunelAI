#!/usr/bin/env node
/**
 * MCP entrypoint: rebuild when src/ is newer than build/, then start the server.
 * Use this in mcp.json instead of build/index.js so Cursor always runs current tools.
 */

import { spawnSync } from 'node:child_process';
import { readdir, stat } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const BUILD_ENTRY = join(ROOT, 'build', 'index.js');
const SRC_DIR = join(ROOT, 'src');

async function newestMtime(dir) {
  let newest = 0;

  async function walk(current) {
    const entries = await readdir(current, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = join(current, entry.name);
      if (entry.isDirectory()) {
        await walk(fullPath);
        continue;
      }
      if (!entry.name.endsWith('.ts')) continue;
      const fileStat = await stat(fullPath);
      newest = Math.max(newest, fileStat.mtimeMs);
    }
  }

  await walk(dir);
  return newest;
}

async function needsRebuild() {
  try {
    const buildStat = await stat(BUILD_ENTRY);
    const srcMtime = await newestMtime(SRC_DIR);
    return srcMtime > buildStat.mtimeMs;
  } catch {
    return true;
  }
}

async function rebuild() {
  console.error('[erpnext-mcp] Rebuilding (source is newer than build/)...');
  const result = spawnSync('npm', ['run', 'build'], {
    cwd: ROOT,
    stdio: 'inherit',
    shell: process.platform === 'win32',
  });
  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}

if (await needsRebuild()) {
  await rebuild();
}

await import(pathToFileURL(BUILD_ENTRY).href);

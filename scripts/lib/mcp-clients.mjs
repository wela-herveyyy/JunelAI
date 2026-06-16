import { mkdir, writeFile } from 'node:fs/promises';
import { homedir, platform } from 'node:os';
import { join } from 'node:path';

import { CREDENTIALS_DIR } from './credentials.mjs';

const OS = platform();
const IS_WIN = OS === 'win32';
const IS_MAC = OS === 'darwin';

/** @typedef {{ id: string, name: string, configPath: string, settingsHint: string, format: 'json' | 'toml' }} McpClient */

/** @returns {McpClient[]} */
export function getMcpClients() {
  const home = homedir();

  return [
    {
      id: 'cursor',
      name: 'Cursor',
      configPath: IS_WIN
        ? join(process.env.APPDATA || join(home, 'AppData', 'Roaming'), 'Cursor', 'User', 'globalStorage', 'cursor.mcp', 'mcp.json')
        : IS_MAC
          ? join(home, '.cursor', 'mcp.json')
          : join(home, '.cursor', 'mcp.json'),
      settingsHint: 'Cursor → Settings → MCP → Edit config (or merge into mcp.json)',
      format: 'json',
    },
    {
      id: 'claude',
      name: 'Claude Desktop',
      configPath: IS_WIN
        ? join(process.env.APPDATA || join(home, 'AppData', 'Roaming'), 'Claude', 'claude_desktop_config.json')
        : IS_MAC
          ? join(home, 'Library', 'Application Support', 'Claude', 'claude_desktop_config.json')
          : join(home, '.config', 'Claude', 'claude_desktop_config.json'),
      settingsHint: 'Claude Desktop → Settings → Developer → Edit Config',
      format: 'json',
    },
    {
      id: 'gemini',
      name: 'Gemini CLI',
      configPath: join(home, '.gemini', 'settings.json'),
      settingsHint: 'Gemini CLI user settings (merge mcpServers into ~/.gemini/settings.json)',
      format: 'json',
    },
    {
      id: 'codex',
      name: 'Codex CLI',
      configPath: join(home, '.codex', 'config.toml'),
      settingsHint: 'Codex CLI config (~/.codex/config.toml) — use generated codex.config.toml snippet',
      format: 'toml',
    },
    {
      id: 'opencode',
      name: 'OpenCode',
      configPath: IS_WIN
        ? join(process.env.APPDATA || join(home, 'AppData', 'Roaming'), 'opencode', 'config.json')
        : join(home, '.config', 'opencode', 'config.json'),
      settingsHint: 'OpenCode → merge mcpServers into your OpenCode config.json',
      format: 'json',
    },
  ];
}

export function buildCodexToml(serverEntry) {
  const lines = [
    '[mcp_servers.erpnext]',
    `command = ${JSON.stringify(serverEntry.command)}`,
    `args = ${JSON.stringify(serverEntry.args)}`,
    '',
    '[mcp_servers.erpnext.env]',
  ];

  for (const [key, value] of Object.entries(serverEntry.env || {})) {
    lines.push(`${key} = ${JSON.stringify(value)}`);
  }

  return `${lines.join('\n')}\n`;
}

export function printMcpSetupInstructions(mcpConfig) {
  const serverEntry = mcpConfig.mcpServers.erpnext;
  const clients = getMcpClients();

  console.log('\n=== MCP config (all JSON-based clients) ===\n');
  console.log('Merge this block into your app config under "mcpServers":\n');
  console.log(JSON.stringify(mcpConfig, null, 2));

  console.log('\n=== Supported AI clients ===\n');
  for (const client of clients) {
    console.log(`${client.name}`);
    console.log(`  Config file: ${client.configPath}`);
    console.log(`  How: ${client.settingsHint}`);
    console.log('');
  }

  console.log('=== Codex CLI (TOML) ===\n');
  console.log(buildCodexToml(serverEntry));

  console.log('=== Notes ===');
  console.log('- JSON clients (Cursor, Claude, Gemini, OpenCode): use the same mcpServers JSON.');
  console.log('- Codex: append the TOML block to ~/.codex/config.toml.');
  console.log('- Restart your AI app after saving the config.');
  console.log('- When SID expires: npm run setup-sid\n');
}

export async function writeMcpClientFiles(mcpConfig) {
  const outDir = join(CREDENTIALS_DIR, 'client-configs');
  await mkdir(outDir, { recursive: true });

  const serverEntry = mcpConfig.mcpServers.erpnext;
  const files = {
    'mcpServers.json': JSON.stringify(mcpConfig, null, 2),
    'cursor.mcp.json': JSON.stringify(mcpConfig, null, 2),
    'claude_desktop_config.json': JSON.stringify(mcpConfig, null, 2),
    'gemini.settings.json': JSON.stringify(mcpConfig, null, 2),
    'opencode.config.json': JSON.stringify(mcpConfig, null, 2),
    'codex.config.toml': buildCodexToml(serverEntry),
    'README.txt': [
      'ERPNext MCP — generated client configs',
      '',
      'JSON apps (Cursor, Claude Desktop, Gemini CLI, OpenCode):',
      '  Copy mcpServers from mcpServers.json into each app config file.',
      '',
      'Codex CLI:',
      '  Merge codex.config.toml into ~/.codex/config.toml',
      '',
      'Per-app default paths are listed when you run npm run setup-sid',
    ].join('\n'),
  };

  const written = [];
  for (const [name, content] of Object.entries(files)) {
    const path = join(outDir, name);
    await writeFile(path, content, { mode: 0o600 });
    written.push(path);
  }

  console.log(`\nSaved client config snippets: ${outDir}`);
  for (const path of written) {
    console.log(`  - ${path}`);
  }

  return { outDir, written };
}

export async function exportMcpSetup(mcpConfig) {
  printMcpSetupInstructions(mcpConfig);
  return writeMcpClientFiles(mcpConfig);
}

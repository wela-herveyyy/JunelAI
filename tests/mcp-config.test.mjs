import test from 'node:test';
import assert from 'node:assert/strict';
import { buildAntigravityConfig, buildCodexToml } from '../scripts/lib/mcp-clients.mjs';
import { buildMcpConfig, buildMcpUrlConfig } from '../scripts/lib/credentials.mjs';

test('Antigravity remote config preserves auth and removes legacy URL keys', () => {
  const generic = buildMcpUrlConfig({ url: 'https://example.com/mcp', apiKey: 'key', apiSecret: 'secret', erpnextUrl: 'https://erp.example.com' });
  const result = buildAntigravityConfig(generic);
  assert.deepEqual(result, { mcpServers: { erpnext: {
    serverUrl: 'https://example.com/mcp',
    headers: { Authorization: 'token key:secret', 'X-ERPNext-URL': 'https://erp.example.com' },
  } } });
  assert.equal(generic.mcpServers.erpnext.url, 'https://example.com/mcp');
});

test('Antigravity stdio uses the compiled entry and credentials file', () => {
  const config = buildMcpConfig({ serverPath: 'C:/project/build/index.js', credentialsPath: 'C:/credentials.json', baseUrl: 'https://erp.example.com' });
  assert.deepEqual(buildAntigravityConfig(config), config);
});

test('remote Codex export contains valid HTTP configuration instead of undefined commands', () => {
  const output = buildCodexToml({ url: 'https://example.com/mcp', headers: { Authorization: 'Bearer sid' } });
  assert.match(output, /url = "https:\/\/example.com\/mcp"/);
  assert.match(output, /http_headers/);
  assert.doesNotMatch(output, /undefined|command =|args =/);
});

import test from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { mkdtemp, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';

test('compiled HTTP and stdio servers initialize and discover tools', { timeout: 20000 }, async () => {
  const mock = createServer((req, res) => {
    res.setHeader('Content-Type', 'application/json');
    if (req.url === '/api/method/frappe.auth.get_logged_user') {
      res.end(JSON.stringify({ message: 'test@example.com' }));
    } else {
      res.statusCode = 404;
      res.end('{}');
    }
  });
  mock.listen(0, '127.0.0.1');
  await once(mock, 'listening');
  const erpUrl = `http://127.0.0.1:${mock.address().port}`;
  const temp = await mkdtemp(join(tmpdir(), 'erpnext-transport-'));
  const credentialsPath = join(temp, 'credentials.json');
  await writeFile(credentialsPath, JSON.stringify({ ERPNEXT_URL: erpUrl, ERPNEXT_API_KEY: 'test', ERPNEXT_API_SECRET: 'secret' }));
  const env = Object.fromEntries(Object.entries(process.env).filter(([key]) => !key.startsWith('ERPNEXT_') && !key.startsWith('MCP_') && key !== 'X_ERPNEXT_URL'));
  env.ERPNEXT_CREDENTIALS_FILE = credentialsPath;
  let child;
  const clients = [];
  try {
    child = spawn(process.execPath, ['build/index.js', '--http', '--port', '0'], { env, stdio: ['ignore', 'pipe', 'pipe'] });
    const url = await new Promise((resolve, reject) => {
      let logs = '';
      child.stderr.on('data', chunk => {
        logs += chunk;
        const match = logs.match(/running on (http:\/\/[^\s]+)/);
        if (match) resolve(match[1]);
      });
      child.on('error', reject);
      child.on('exit', code => reject(new Error(`HTTP server exited: ${code}: ${logs}`)));
    });
    const http = new StreamableHTTPClientTransport(new URL(url));
    const client = new Client({ name: 'http-test', version: '1.0.0' });
    clients.push(client);
    await client.connect(http);
    assert.equal((await client.listTools()).tools.length, 17);
    assert.ok(http.sessionId);
    await http.terminateSession();
    // Exercise hosted authentication separately from local saved defaults.
    const remote = new StreamableHTTPClientTransport(new URL(url), { requestInit: { headers: {
      Authorization: 'token test:secret', 'X-ERPNext-URL': erpUrl,
    } } });
    const remoteClient = new Client({ name: 'remote-test', version: '1.0.0' });
    clients.push(remoteClient);
    await remoteClient.connect(remote);
    assert.equal((await remoteClient.listTools()).tools.length, 17);
    await remote.terminateSession();
    const stdioClient = new Client({ name: 'stdio-test', version: '1.0.0' });
    clients.push(stdioClient);
    await stdioClient.connect(new StdioClientTransport({ command: process.execPath, args: ['build/index.js'], env, stderr: 'pipe' }));
    assert.equal((await stdioClient.listTools()).tools.length, 17);
  } finally {
    for (const client of clients) await client.close();
    if (child && child.exitCode === null) { child.kill(); await once(child, 'exit'); }
    mock.closeAllConnections();
    await new Promise(resolve => mock.close(resolve));
    await rm(temp, { recursive: true, force: true });
  }
});

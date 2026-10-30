import test from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { once } from 'node:events';

import { ERPNextClient } from '../build/client/erpnext-client.js';
import { Logger, LogLevel } from '../build/utils/logger.js';

test('API-key writes do not require a CSRF token', async () => {
  const requests = [];
  const server = createServer((req, res) => {
    requests.push({ method: req.method, url: req.url, authorization: req.headers.authorization });
    res.setHeader('Content-Type', 'application/json');

    if (req.method === 'POST' && req.url === '/api/resource/Comment') {
      res.end(JSON.stringify({ data: { name: 'COMMENT-0001' } }));
      return;
    }

    res.statusCode = 404;
    res.end(JSON.stringify({ exc_type: 'NotFound' }));
  });

  server.listen(0, '127.0.0.1');
  await once(server, 'listening');
  const previousKey = process.env.ERPNEXT_API_KEY;
  const previousSecret = process.env.ERPNEXT_API_SECRET;
  process.env.ERPNEXT_API_KEY = 'test-key';
  process.env.ERPNEXT_API_SECRET = 'test-secret';

  try {
    const baseUrl = `http://127.0.0.1:${server.address().port}`;
    const client = new ERPNextClient(new Logger(LogLevel.ERROR), baseUrl);

    const created = await client.createDocument('Comment', { content: 'hello' });

    assert.deepEqual(created, { name: 'COMMENT-0001' });
    assert.deepEqual(requests, [{
      method: 'POST',
      url: '/api/resource/Comment',
      authorization: 'token test-key:test-secret',
    }]);
  } finally {
    if (previousKey === undefined) delete process.env.ERPNEXT_API_KEY;
    else process.env.ERPNEXT_API_KEY = previousKey;
    if (previousSecret === undefined) delete process.env.ERPNEXT_API_SECRET;
    else process.env.ERPNEXT_API_SECRET = previousSecret;
    server.closeAllConnections();
    await new Promise(resolve => server.close(resolve));
  }
});

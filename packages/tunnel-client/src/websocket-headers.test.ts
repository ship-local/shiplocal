import assert from 'node:assert/strict';
import http from 'node:http';
import { describe, it } from 'node:test';
import { WebSocket, WebSocketServer } from 'ws';
import { extractWebSocketProtocols, sanitizeWebSocketHeaders } from './websocket-headers.js';

describe('extractWebSocketProtocols', () => {
  it('parses a single protocol', () => {
    assert.deepEqual(extractWebSocketProtocols({ 'sec-websocket-protocol': 'vite-hmr' }), [
      'vite-hmr',
    ]);
  });

  it('parses a comma-separated list', () => {
    assert.deepEqual(
      extractWebSocketProtocols({ 'sec-websocket-protocol': 'vite-hmr, vite-ping' }),
      ['vite-hmr', 'vite-ping'],
    );
  });

  it('returns undefined when missing', () => {
    assert.equal(extractWebSocketProtocols({ origin: 'https://example.com' }), undefined);
  });
});

describe('sanitizeWebSocketHeaders', () => {
  it('strips hop-by-hop and websocket handshake headers including protocol', () => {
    const sanitized = sanitizeWebSocketHeaders(
      {
        origin: 'https://foo.shiplocal.cloud',
        'user-agent': 'Mozilla/5.0',
        'sec-websocket-protocol': 'vite-hmr',
        'sec-websocket-key': 'abc',
        upgrade: 'websocket',
      },
      5173,
    );

    assert.equal(sanitized['host'], 'localhost:5173');
    assert.equal(sanitized['origin'], 'http://localhost:5173');
    assert.equal(sanitized['user-agent'], 'Mozilla/5.0');
    assert.equal(sanitized['sec-websocket-protocol'], undefined);
    assert.equal(sanitized['sec-websocket-key'], undefined);
    assert.equal(sanitized['upgrade'], undefined);
  });
});

describe('Vite HMR WebSocket handshake relay', () => {
  it('connects when protocol is passed via constructor, not headers alone', async () => {
    const server = http.createServer();
    const wss = new WebSocketServer({ noServer: true });

    server.on('upgrade', (req, socket, head) => {
      const protocol = req.headers['sec-websocket-protocol'];
      const url = new URL(req.url ?? '/', 'http://localhost');
      // Mirror Vite's gate: only accept vite-hmr / vite-ping on `/`
      if (
        protocol !== undefined &&
        ['vite-hmr', 'vite-ping'].includes(protocol) &&
        url.pathname === '/'
      ) {
        wss.handleUpgrade(req, socket, head, (ws) => {
          ws.send(JSON.stringify({ type: 'connected' }));
        });
      }
    });

    await new Promise<void>((resolve) => {
      server.listen(0, '127.0.0.1', () => {
        resolve();
      });
    });

    const address = server.address();
    assert.ok(address && typeof address === 'object');
    const port = address.port;

    const browserHeaders = {
      origin: 'https://foo.shiplocal.cloud',
      'sec-websocket-protocol': 'vite-hmr',
      'user-agent': 'Mozilla/5.0',
    };

    // Broken approach (pre-fix): protocol only in headers
    await new Promise<void>((resolve, reject) => {
      const headers = {
        ...sanitizeWebSocketHeaders(browserHeaders, port),
        'sec-websocket-protocol': 'vite-hmr',
      };
      const ws = new WebSocket(`ws://127.0.0.1:${String(port)}/?token=abc`, { headers });
      const timer = setTimeout(() => {
        ws.terminate();
        reject(new Error('headers-only approach unexpectedly hung'));
      }, 1000);
      ws.on('open', () => {
        clearTimeout(timer);
        ws.close();
        reject(new Error('headers-only approach should fail against Vite'));
      });
      ws.on('error', (err) => {
        clearTimeout(timer);
        assert.match(err.message, /subprotocol/i);
        resolve();
      });
    });

    // Fixed approach: protocols constructor argument
    const message = await new Promise<string>((resolve, reject) => {
      const headers = sanitizeWebSocketHeaders(browserHeaders, port);
      const protocols = extractWebSocketProtocols(browserHeaders);
      assert.ok(protocols);
      const ws = new WebSocket(`ws://127.0.0.1:${String(port)}/?token=abc`, protocols, {
        headers,
      });
      const timer = setTimeout(() => {
        ws.terminate();
        reject(new Error('protocols approach timed out'));
      }, 1000);
      ws.on('message', (data) => {
        clearTimeout(timer);
        ws.close();
        if (typeof data === 'string') {
          resolve(data);
          return;
        }
        if (Buffer.isBuffer(data)) {
          resolve(data.toString('utf8'));
          return;
        }
        if (Array.isArray(data)) {
          resolve(Buffer.concat(data).toString('utf8'));
          return;
        }
        resolve(Buffer.from(data).toString('utf8'));
      });
      ws.on('error', (err) => {
        clearTimeout(timer);
        reject(err);
      });
    });

    const payload = JSON.parse(message) as { type: string };
    assert.equal(payload.type, 'connected');
    await new Promise<void>((resolve, reject) => {
      server.close((err) => {
        if (err) {
          reject(err);
          return;
        }
        resolve();
      });
    });
  });
});

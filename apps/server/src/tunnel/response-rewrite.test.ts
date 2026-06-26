import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  applyCorsHeaders,
  buildPreflightHeaders,
  rewriteSetCookieHeaders,
} from './response-rewrite.js';

describe('response rewrite', () => {
  it('adds CORS headers for sibling origins', () => {
    const headers = applyCorsHeaders(
      { 'content-type': 'application/json' },
      { origin: 'https://myapp.example.com', isSiblingOrigin: true },
      true,
    );

    assert.equal(headers['Access-Control-Allow-Origin'], 'https://myapp.example.com');
    assert.equal(headers['Access-Control-Allow-Credentials'], 'true');
  });

  it('skips CORS for unrelated origins', () => {
    const headers = applyCorsHeaders(
      { 'content-type': 'application/json' },
      { origin: 'https://evil.example.com', isSiblingOrigin: false },
      true,
    );

    assert.equal(headers['Access-Control-Allow-Origin'], undefined);
  });

  it('builds preflight headers', () => {
    const headers = buildPreflightHeaders('https://myapp.example.com', {
      'access-control-request-method': 'POST',
      'access-control-request-headers': 'Content-Type',
    });

    assert.equal(headers['Access-Control-Allow-Origin'], 'https://myapp.example.com');
    assert.equal(headers['Access-Control-Allow-Methods'], 'POST');
  });

  it('rewrites localhost Set-Cookie domains', () => {
    const headers = rewriteSetCookieHeaders(
      {
        'set-cookie': 'session=abc; Path=/; Domain=localhost; HttpOnly',
      },
      'myapp-api.example.com',
      true,
    );

    const cookie = headers['set-cookie'];
    assert.ok(Array.isArray(cookie));
    assert.match(cookie[0] ?? '', /Domain=myapp-api\.example\.com/);
    assert.match(cookie[0] ?? '', /Secure/);
  });
});

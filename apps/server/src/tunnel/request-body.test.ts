import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { bodyFromParsedRequest, withBodyContentLength } from './request-body.js';

describe('bodyFromParsedRequest', () => {
  it('returns null for missing bodies', () => {
    assert.equal(bodyFromParsedRequest(undefined), null);
    assert.equal(bodyFromParsedRequest(null), null);
  });

  it('passes through buffers and strings', () => {
    assert.deepEqual(bodyFromParsedRequest(Buffer.from('abc')), Buffer.from('abc'));
    assert.deepEqual(bodyFromParsedRequest('hello'), Buffer.from('hello'));
  });

  it('re-serializes JSON objects Fastify already parsed', () => {
    const body = bodyFromParsedRequest({ email: 'a@b.com', password: 'secret' });
    assert.ok(body);
    assert.deepEqual(JSON.parse(body.toString('utf8')), {
      email: 'a@b.com',
      password: 'secret',
    });
  });
});

describe('withBodyContentLength', () => {
  it('replaces content-length with the forwarded body size', () => {
    const headers = withBodyContentLength(
      { 'Content-Type': 'application/json', 'content-length': '999' },
      Buffer.from('{"ok":true}'),
    );
    assert.equal(headers['content-length'], '11');
    assert.equal(headers['Content-Type'], 'application/json');
  });

  it('omits content-length for empty bodies', () => {
    const headers = withBodyContentLength({ 'content-length': '4' }, Buffer.alloc(0));
    assert.equal(headers['content-length'], undefined);
  });
});

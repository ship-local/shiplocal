import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { parseTunnelHost } from './subdomain.js';

describe('parseTunnelHost', () => {
  it('parses project preview subdomains', () => {
    assert.equal(parseTunnelHost('myapp.shiplocal.cloud', 'shiplocal.cloud'), 'myapp');
  });

  it('ignores reserved dashboard and infra hosts', () => {
    assert.equal(parseTunnelHost('app.shiplocal.cloud', 'shiplocal.cloud'), null);
    assert.equal(parseTunnelHost('www.shiplocal.cloud', 'shiplocal.cloud'), null);
    assert.equal(parseTunnelHost('api.shiplocal.cloud', 'shiplocal.cloud'), null);
  });

  it('ignores the marketing apex host', () => {
    assert.equal(parseTunnelHost('shiplocal.cloud', 'shiplocal.cloud'), null);
  });
});

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  collectCspPolicies,
  extractCspFromHtmlMeta,
  wouldCspAllowExternalScript,
} from './csp-script-check.js';

const OVERLAY = 'https://shiplocal.cloud/overlay.js';

describe('CSP script check', () => {
  it('allows injection when no CSP is present', () => {
    assert.equal(wouldCspAllowExternalScript(OVERLAY, []), true);
  });

  it('allows injection when script host is listed', () => {
    assert.equal(
      wouldCspAllowExternalScript(OVERLAY, ["script-src 'self' https://shiplocal.cloud"]),
      true,
    );
  });

  it('allows injection for https: scheme source', () => {
    assert.equal(wouldCspAllowExternalScript(OVERLAY, ['script-src https:']), true);
  });

  it('blocks injection for script-src none', () => {
    assert.equal(wouldCspAllowExternalScript(OVERLAY, ["script-src 'none'"]), false);
  });

  it('blocks injection for self-only policies on a different origin', () => {
    assert.equal(
      wouldCspAllowExternalScript(OVERLAY, ["script-src 'self'"], 'https://preview.shiplocal.app'),
      false,
    );
  });

  it('blocks injection for strict-dynamic policies', () => {
    assert.equal(
      wouldCspAllowExternalScript(OVERLAY, ["script-src 'strict-dynamic' 'nonce-abc'"]),
      false,
    );
  });

  it('blocks when any policy rejects the script', () => {
    assert.equal(
      wouldCspAllowExternalScript(OVERLAY, [
        'script-src https://shiplocal.cloud',
        "default-src 'self'",
      ]),
      false,
    );
  });

  it('reads CSP from meta tags', () => {
    const html =
      '<head><meta http-equiv="Content-Security-Policy" content="script-src \'self\'"></head>';
    assert.deepEqual(extractCspFromHtmlMeta(html), ["script-src 'self'"]);
    assert.equal(
      wouldCspAllowExternalScript(
        OVERLAY,
        collectCspPolicies({}, html),
        'https://preview.shiplocal.app',
      ),
      false,
    );
  });
});

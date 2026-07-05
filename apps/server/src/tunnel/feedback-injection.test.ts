import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  injectFeedbackOverlay,
  isDevBundlerHtml,
  shouldInjectFeedbackOverlay,
} from './feedback-injection.js';

const API_URL = 'https://api.example.com';

describe('feedback overlay injection', () => {
  it('detects Next/Vite dev bundler markup', () => {
    assert.equal(
      isDevBundlerHtml('<script src="/_next/static/chunks/webpack.js"></script>'),
      false,
    );
    assert.equal(isDevBundlerHtml('<script src="/_next/webpack-hmr"></script>'), true);
    assert.equal(isDevBundlerHtml('<script type="module" src="/@vite/client"></script>'), true);
  });

  it('skips injection for dev bundler HTML', () => {
    const html = '<html><body><script src="/_next/webpack-hmr"></script></body></html>';
    assert.equal(shouldInjectFeedbackOverlay(html, API_URL), false);
    assert.equal(injectFeedbackOverlay(html, 't1', API_URL), html);
  });

  it('injects on dev bundler HTML when forceInDev is true', () => {
    const html = '<html><body><script src="/_next/webpack-hmr"></script></body></html>';
    assert.equal(shouldInjectFeedbackOverlay(html, API_URL, { forceInDev: true }), true);
    const result = injectFeedbackOverlay(html, 'tunnel-1', API_URL, { forceInDev: true });
    assert.match(result, /data-shiplocal-overlay/);
  });

  it('still skips dev HTML when forceInDev but CSP blocks overlay', () => {
    const html = '<html><body><script src="/_next/webpack-hmr"></script></body></html>';
    assert.equal(
      shouldInjectFeedbackOverlay(html, API_URL, {
        forceInDev: true,
        responseHeaders: { 'content-security-policy': "script-src 'self'" },
        documentOrigin: 'https://preview.example.com',
      }),
      false,
    );
  });

  it('skips duplicate injection', () => {
    const html =
      '<html><body data-shiplocal-overlay><script data-shiplocal-overlay></script></body></html>';
    assert.equal(shouldInjectFeedbackOverlay(html, API_URL), false);
  });

  it('skips injection when CSP would block the overlay script', () => {
    const html = '<html><body><main>Hello</main></body></html>';
    assert.equal(
      shouldInjectFeedbackOverlay(html, API_URL, {
        responseHeaders: {
          'content-security-policy': "script-src 'self'",
        },
        documentOrigin: 'https://preview.example.com',
      }),
      false,
    );
    assert.equal(
      injectFeedbackOverlay(html, 'tunnel-1', API_URL, {
        responseHeaders: {
          'content-security-policy': "script-src 'self'",
        },
        documentOrigin: 'https://preview.example.com',
      }),
      html,
    );
  });

  it('injects once before closing body for production HTML', () => {
    const html = '<html><body><main>Hello</main></body></html>';
    const result = injectFeedbackOverlay(html, 'tunnel-1', API_URL);
    assert.match(result, /data-shiplocal-overlay/);
    assert.match(result, /overlay\.js/);
    assert.equal(result.match(/data-shiplocal-overlay/g)?.length, 1);
  });
});

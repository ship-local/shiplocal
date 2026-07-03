import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  findHmrWebSocketPath,
  findScriptSrcInHtml,
  formatBytes,
  formatCompressionRatio,
  formatDoctorReport,
  formatMs,
} from './doctor-helpers.js';

describe('doctor helpers', () => {
  it('formats durations and sizes', () => {
    assert.equal(formatMs(42), '42 ms');
    assert.equal(formatMs(1500), '1.5 s');
    assert.equal(formatBytes(512), '512 B');
    assert.equal(formatBytes(2048), '2.0 KB');
  });

  it('finds a Next.js chunk script', () => {
    const html = '<script src="/_next/static/chunks/main-abc123.js" defer></script>';
    assert.equal(findScriptSrcInHtml(html), '/_next/static/chunks/main-abc123.js');
  });

  it('detects webpack HMR path', () => {
    const html = '<script src="/_next/static/chunks/webpack.js"></script>';
    assert.equal(findHmrWebSocketPath(html), '/_next/webpack-hmr');
  });

  it('formats a pasteable report', () => {
    const report = formatDoctorReport(
      'https://shiplocal.cloud',
      [{ name: 'Auth', status: 'ok', message: 'token valid', ms: 40 }],
      { 'Tunnel HTML': '820 ms' },
    );
    assert.match(report, /ShipLocal Doctor/);
    assert.match(report, /Overall: healthy/);
  });

  it('calculates compression savings', () => {
    assert.equal(formatCompressionRatio(1000, 400), '60% smaller on wire');
    assert.equal(formatCompressionRatio(100, 100), undefined);
  });
});

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { resolveCommandPort } from './port.js';

describe('resolveCommandPort', () => {
  it('prefers the positional port', () => {
    assert.equal(resolveCommandPort('5173', '3000'), 5173);
  });

  it('falls back to the option port', () => {
    assert.equal(resolveCommandPort(undefined, '8080'), 8080);
  });

  it('defaults to 3000', () => {
    assert.equal(resolveCommandPort(), 3000);
  });
});

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  buildProjectSubdomain,
  dedupeSlug,
  isValidProjectSlug,
  isValidTargetName,
  slugifyProjectName,
} from './slug.js';

describe('slug utilities', () => {
  it('slugifies project names', () => {
    assert.equal(slugifyProjectName('My Demo Site'), 'my-demo-site');
    assert.equal(slugifyProjectName('  Hello   World!! '), 'hello-world');
  });

  it('builds flat subdomains', () => {
    assert.equal(buildProjectSubdomain('myapp', 'web'), 'myapp');
    assert.equal(buildProjectSubdomain('myapp', 'api'), 'myapp-api');
  });

  it('rejects reserved slugs', () => {
    assert.equal(isValidProjectSlug('api'), false);
    assert.equal(isValidProjectSlug('myapp'), true);
  });

  it('validates target names', () => {
    assert.equal(isValidTargetName('api'), true);
    assert.equal(isValidTargetName('tunnel'), false);
  });

  it('dedupes slug collisions', () => {
    const taken = new Set(['myapp']);
    assert.equal(dedupeSlug('myapp', taken), 'myapp-2');
  });
});

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { isComingSoonPost } from './blog.js';

describe('isComingSoonPost', () => {
  it('detects coming soon in content preview', () => {
    assert.equal(isComingSoonPost({}, '_This article is coming soon._\n\n**Coming soon**'), true);
  });

  it('returns false for published articles', () => {
    assert.equal(
      isComingSoonPost(
        {},
        'Every developer who ships work for someone else has lived this moment.',
      ),
      false,
    );
  });

  it('respects frontmatter status', () => {
    assert.equal(isComingSoonPost({ status: 'coming_soon' }, ''), true);
    assert.equal(isComingSoonPost({ status: 'published' }, 'Full article body.'), false);
  });
});

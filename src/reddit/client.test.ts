import { test } from 'node:test';
import assert from 'node:assert/strict';
import { sortParams, buildUrl } from './client';

test('sortParams adds t=day for top and controversial, nothing for hot/new', () => {
  assert.deepEqual(sortParams('top'), { t: 'day' });
  assert.deepEqual(sortParams('controversial'), { t: 'day' });
  assert.deepEqual(sortParams('hot'), {});
  assert.deepEqual(sortParams('new'), {});
});

test('buildUrl appends query params onto the base URL', () => {
  const url = buildUrl('/r/berserk/hot', { limit: '25' });
  assert.equal(url, 'https://oauth.reddit.com/r/berserk/hot?limit=25');
});

test('buildUrl omits the query string entirely when there are no params', () => {
  const url = buildUrl('/subreddits/mine/subscriber', {});
  assert.equal(url, 'https://oauth.reddit.com/subreddits/mine/subscriber');
});

test('buildUrl handles multiple params in insertion order', () => {
  const url = buildUrl('/search', { q: 'berserk', sort: 'relevance' });
  assert.equal(url, 'https://oauth.reddit.com/search?q=berserk&sort=relevance');
});

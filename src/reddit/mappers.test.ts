import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mapPost, mapComment, mapSubreddit, mapListing } from './mappers';

test('mapPost extracts fields and reports no image for a plain text post', () => {
  const post = mapPost({
    kind: 't3',
    data: {
      id: 'abc123',
      subreddit: 'berserk',
      title: 'A great discussion',
      author: 'alice',
      score: 42,
      num_comments: 7,
      created_utc: 1700000000,
      selftext: 'some text',
      url: 'https://reddit.com/r/berserk/abc123',
    },
  });
  assert.deepEqual(post, {
    id: 'abc123',
    subreddit: 'berserk',
    title: 'A great discussion',
    author: 'alice',
    score: 42,
    numComments: 7,
    createdUtc: 1700000000,
    selftext: 'some text',
    url: 'https://reddit.com/r/berserk/abc123',
    hasImage: false,
  });
});

test('mapPost detects an image post via post_hint', () => {
  const post = mapPost({ kind: 't3', data: { id: 'x', post_hint: 'image' } });
  assert.equal(post.hasImage, true);
});

test('mapPost detects a gallery post via is_gallery', () => {
  const post = mapPost({ kind: 't3', data: { id: 'x', is_gallery: true } });
  assert.equal(post.hasImage, true);
});

test('mapPost detects an image post via preview.images', () => {
  const post = mapPost({ kind: 't3', data: { id: 'x', preview: { images: [{ id: '1' }] } } });
  assert.equal(post.hasImage, true);
});

test('mapComment maps a plain comment with no replies', () => {
  const thing = mapComment({
    kind: 't1',
    data: { id: 'c1', author: 'bob', body: 'nice post', score: 5, created_utc: 1700000001, replies: '' },
  });
  assert.deepEqual(thing, {
    kind: 'comment',
    id: 'c1',
    author: 'bob',
    body: 'nice post',
    score: 5,
    createdUtc: 1700000001,
    replies: [],
  });
});

test('mapComment maps nested replies recursively', () => {
  const thing = mapComment({
    kind: 't1',
    data: {
      id: 'c1',
      author: 'bob',
      body: 'top',
      score: 5,
      created_utc: 1,
      replies: {
        kind: 'Listing',
        data: {
          children: [
            { kind: 't1', data: { id: 'c2', author: 'carol', body: 'reply', score: 1, created_utc: 2, replies: '' } },
          ],
        },
      },
    },
  });
  if (thing.kind !== 'comment') throw new Error('expected a comment');
  assert.equal(thing.replies.length, 1);
  assert.equal(thing.replies[0]?.id, 'c2');
});

test('mapComment redacts an inline embedded image with a placeholder', () => {
  const thing = mapComment({
    kind: 't1',
    data: {
      id: 'c1',
      author: 'bob',
      body: 'look at this ![img](abc123) cool right',
      score: 1,
      created_utc: 1,
      replies: '',
    },
  });
  if (thing.kind !== 'comment') throw new Error('expected a comment');
  assert.equal(thing.body, 'look at this [has_image 🖼️] cool right');
});

test('mapComment maps a "more" stub', () => {
  const thing = mapComment({
    kind: 'more',
    data: { id: 'm1', children: ['c3', 'c4'], count: 2 },
  });
  assert.deepEqual(thing, { kind: 'more', id: 'm1', childIds: ['c3', 'c4'], count: 2 });
});

test('mapSubreddit extracts fields', () => {
  const subreddit = mapSubreddit({
    kind: 't5',
    data: { display_name: 'berserk', title: 'Berserk', subscribers: 100000, public_description: 'The manga' },
  });
  assert.deepEqual(subreddit, {
    name: 'berserk',
    title: 'Berserk',
    subscribers: 100000,
    publicDescription: 'The manga',
  });
});

test('mapListing maps children with the given item mapper and carries the after cursor', () => {
  const listing = mapListing(
    {
      kind: 'Listing',
      data: { after: 't3_next', children: [{ kind: 't5', data: { display_name: 'a' } }] },
    },
    mapSubreddit
  );
  assert.equal(listing.after, 't3_next');
  assert.equal(listing.children.length, 1);
  assert.equal(listing.children[0]?.name, 'a');
});

test('mapListing defaults after to null and children to [] when absent', () => {
  const listing = mapListing({ kind: 'Listing', data: {} }, mapSubreddit);
  assert.equal(listing.after, null);
  assert.deepEqual(listing.children, []);
});

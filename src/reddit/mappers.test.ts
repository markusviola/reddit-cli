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
    primaryAttachment: null,
    bodySegments: [{ kind: 'text', text: 'some text' }],
  });
});

test('mapPost detects an image post via post_hint and keeps the direct url', () => {
  const post = mapPost({ kind: 't3', data: { id: 'x', post_hint: 'image', url: 'https://i.redd.it/x.jpg' } });
  assert.equal(post.hasImage, true);
  assert.deepEqual(post.primaryAttachment, {
    id: 'x',
    images: [{ id: 'x', url: 'https://i.redd.it/x.jpg', width: 0, height: 0 }],
  });
});

test('mapPost extracts a single preview image url and decodes HTML entities', () => {
  const post = mapPost({
    kind: 't3',
    data: {
      id: 'x',
      preview: {
        images: [{ id: 'p1', source: { url: 'https://preview.redd.it/a.jpg?width=640&amp;s=abc', width: 640, height: 480 } }],
      },
    },
  });
  assert.equal(post.hasImage, true);
  assert.deepEqual(post.primaryAttachment, {
    id: 'p1',
    images: [{ id: 'p1', url: 'https://preview.redd.it/a.jpg?width=640&s=abc', width: 640, height: 480 }],
  });
});

test('mapPost extracts an ordered gallery from gallery_data + media_metadata', () => {
  const post = mapPost({
    kind: 't3',
    data: {
      id: 'g1',
      is_gallery: true,
      gallery_data: { items: [{ media_id: 'm2' }, { media_id: 'm1' }, { media_id: 'm3' }] },
      media_metadata: {
        m1: { status: 'valid', s: { u: 'https://i.redd.it/m1.jpg?s=x&amp;y=1', x: 100, y: 200 } },
        m2: { status: 'valid', s: { u: 'https://i.redd.it/m2.jpg', x: 300, y: 400 } },
        m3: { status: 'valid', s: { u: 'https://i.redd.it/m3.jpg', x: 10, y: 20 } },
      },
    },
  });
  assert.equal(post.hasImage, true);
  assert.equal(post.primaryAttachment?.images.length, 3);
  assert.deepEqual(
    post.primaryAttachment?.images.map((image) => image.id),
    ['m2', 'm1', 'm3'],
    'gallery order must follow gallery_data.items, not media_metadata key order'
  );
  assert.equal(post.primaryAttachment?.images[1]?.url, 'https://i.redd.it/m1.jpg?s=x&y=1');
});

test('mapPost positions a self-text inline image between paragraphs', () => {
  const post = mapPost({
    kind: 't3',
    data: {
      id: 'x',
      is_self: true,
      selftext: 'intro paragraph\n\n![alt](abc123)\n\noutro paragraph',
      media_metadata: { abc123: { status: 'valid', s: { u: 'https://preview.redd.it/abc123.jpg', x: 50, y: 60 } } },
    },
  });
  assert.equal(post.hasImage, true);
  assert.equal(post.primaryAttachment, null);
  assert.deepEqual(post.bodySegments, [
    { kind: 'text', text: 'intro paragraph' },
    { kind: 'image', attachment: { id: 'abc123', images: [{ id: 'abc123', url: 'https://preview.redd.it/abc123.jpg', width: 50, height: 60 }] } },
    { kind: 'text', text: 'outro paragraph' },
  ]);
});

test('mapPost reports no image when media_metadata is an empty object', () => {
  const post = mapPost({ kind: 't3', data: { id: 'x', media_metadata: {} } });
  assert.equal(post.hasImage, false);
  assert.equal(post.primaryAttachment, null);
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
    bodySegments: [{ kind: 'text', text: 'nice post' }],
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

test('mapComment preserves an inline embedded image as an addressable image segment', () => {
  const thing = mapComment({
    kind: 't1',
    data: {
      id: 'c1',
      author: 'bob',
      body: 'look at this ![img](abc123) cool right',
      score: 1,
      created_utc: 1,
      replies: '',
      media_metadata: { abc123: { s: { u: 'https://preview.redd.it/abc123.png', x: 8, y: 9 } } },
    },
  });
  if (thing.kind !== 'comment') throw new Error('expected a comment');
  assert.deepEqual(thing.bodySegments, [
    { kind: 'text', text: 'look at this' },
    { kind: 'image', attachment: { id: 'abc123', images: [{ id: 'abc123', url: 'https://preview.redd.it/abc123.png', width: 8, height: 9 }] } },
    { kind: 'text', text: 'cool right' },
  ]);
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

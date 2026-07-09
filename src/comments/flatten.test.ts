import { test } from 'node:test';
import assert from 'node:assert/strict';
import { flattenVisibleComments } from './flatten';
import type { RedditThing } from '../reddit/types';

// Reproduces the exact fixture from the design spec: alice (collapsed, 3
// replies), bob (expanded) -> carol (collapsed, 1 reply) + dave, erin (no replies).
function fixture(): RedditThing[] {
  return [
    {
      kind: 'comment',
      id: 'alice',
      author: 'alice',
      body: 'This show really peaked at episode 200, no argument.',
      score: 128,
      createdUtc: 0,
      replies: [
        { kind: 'comment', id: 'a1', author: 'x', body: '1', score: 0, createdUtc: 0, replies: [] },
        { kind: 'comment', id: 'a2', author: 'x', body: '2', score: 0, createdUtc: 0, replies: [] },
        { kind: 'comment', id: 'a3', author: 'x', body: '3', score: 0, createdUtc: 0, replies: [] },
      ],
    },
    {
      kind: 'comment',
      id: 'bob',
      author: 'bob',
      body: 'Wait until you see what happens after the eclipse arc',
      score: 54,
      createdUtc: 0,
      replies: [
        {
          kind: 'comment',
          id: 'carol',
          author: 'carol',
          body: 'Right?? I was not ready',
          score: 12,
          createdUtc: 0,
          replies: [{ kind: 'comment', id: 'c1', author: 'x', body: '1', score: 0, createdUtc: 0, replies: [] }],
        },
        {
          kind: 'comment',
          id: 'dave',
          author: 'dave',
          body: 'same here honestly',
          score: 3,
          createdUtc: 0,
          replies: [],
        },
      ],
    },
    {
      kind: 'comment',
      id: 'erin',
      author: 'erin',
      body: 'Golden Age movies did it justice at least',
      score: 7,
      createdUtc: 0,
      replies: [],
    },
  ];
}

test('top-level comments are always visible even with nothing expanded', () => {
  const rows = flattenVisibleComments(fixture(), new Set());
  const topLevelIds = rows.filter((row) => row.depth === 0).map((row) => row.id);
  assert.deepEqual(topLevelIds, ['alice', 'bob', 'erin']);
});

test('an unexpanded comment with replies gets a collapsedReplies child row', () => {
  const rows = flattenVisibleComments(fixture(), new Set());
  const alice = rows.find((row) => row.id === 'alice');
  const aliceCollapsed = rows.find((row) => row.id === 'collapsed:alice');
  assert.ok(alice);
  assert.ok(aliceCollapsed);
  assert.equal(aliceCollapsed?.depth, 1);
  assert.deepEqual(aliceCollapsed?.content, { type: 'collapsedReplies', replyCount: 3 });
});

test('expanding a comment reveals its replies, still collapsed themselves', () => {
  const rows = flattenVisibleComments(fixture(), new Set(['bob']));
  const ids = rows.map((row) => row.id);
  assert.deepEqual(ids, ['alice', 'collapsed:alice', 'bob', 'carol', 'collapsed:carol', 'dave', 'erin']);
});

test('expanding a nested reply reveals its own replies too', () => {
  const rows = flattenVisibleComments(fixture(), new Set(['bob', 'carol']));
  const ids = rows.map((row) => row.id);
  assert.deepEqual(ids, ['alice', 'collapsed:alice', 'bob', 'carol', 'c1', 'dave', 'erin']);
});

test('erin has no replies, so no collapsed row and continuesBelow is false', () => {
  const rows = flattenVisibleComments(fixture(), new Set());
  const erin = rows.find((row) => row.id === 'erin');
  assert.equal(erin?.content.type, 'comment');
  if (erin?.content.type === 'comment') {
    assert.equal(erin.content.continuesBelow, false);
  }
});

test('ancestorContinues reflects sibling position at each depth (bob/carol/dave case)', () => {
  const rows = flattenVisibleComments(fixture(), new Set(['bob']));
  const bob = rows.find((row) => row.id === 'bob');
  const carol = rows.find((row) => row.id === 'carol');
  const dave = rows.find((row) => row.id === 'dave');
  assert.equal(bob?.isLastSibling, false);
  assert.deepEqual(bob?.ancestorContinues, []);
  assert.equal(carol?.isLastSibling, false);
  assert.deepEqual(carol?.ancestorContinues, [true]);
  assert.equal(dave?.isLastSibling, true);
  assert.deepEqual(dave?.ancestorContinues, [true]);
});

test('a "more" stub renders as its own navigable row', () => {
  const withMore: RedditThing[] = [
    {
      kind: 'comment',
      id: 'p1',
      author: 'x',
      body: 'parent',
      score: 0,
      createdUtc: 0,
      replies: [{ kind: 'more', id: 'm1', childIds: ['a', 'b'], count: 2 }],
    },
  ];
  const rows = flattenVisibleComments(withMore, new Set(['p1']));
  const more = rows.find((row) => row.id === 'more:m1');
  assert.deepEqual(more?.content, { type: 'more', count: 2, childIds: ['a', 'b'] });
});

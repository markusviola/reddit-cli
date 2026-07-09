import { test } from 'node:test';
import assert from 'node:assert/strict';
import { branchPrefix, continuationPrefix } from './render';
import { flattenVisibleComments } from './flatten';
import type { RedditThing } from '../reddit/types';

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

test('branchPrefix matches the mockup for alice, bob, carol, dave, erin', () => {
  const rows = flattenVisibleComments(fixture(), new Set(['bob']));
  const byId = new Map(rows.map((row) => [row.id, row]));

  const alice = byId.get('alice');
  const aliceCollapsed = byId.get('collapsed:alice');
  const bob = byId.get('bob');
  const carol = byId.get('carol');
  const carolCollapsed = byId.get('collapsed:carol');
  const dave = byId.get('dave');
  const erin = byId.get('erin');
  assert.ok(alice && aliceCollapsed && bob && carol && carolCollapsed && dave && erin);

  assert.equal(branchPrefix(alice), '├─ ');
  assert.equal(branchPrefix(aliceCollapsed), '│  └─ ');
  assert.equal(branchPrefix(bob), '├─ ');
  assert.equal(branchPrefix(carol), '│  ├─ ');
  assert.equal(branchPrefix(carolCollapsed), '│  │  └─ ');
  assert.equal(branchPrefix(dave), '│  └─ ');
  assert.equal(branchPrefix(erin), '└─ ');
});

test('continuationPrefix matches the mockup body-line indentation', () => {
  const rows = flattenVisibleComments(fixture(), new Set(['bob']));
  const byId = new Map(rows.map((row) => [row.id, row]));

  const alice = byId.get('alice');
  const bob = byId.get('bob');
  const carol = byId.get('carol');
  const dave = byId.get('dave');
  assert.ok(alice?.content.type === 'comment' && bob?.content.type === 'comment');
  assert.ok(carol?.content.type === 'comment' && dave?.content.type === 'comment');

  assert.equal(continuationPrefix(alice, alice.content.continuesBelow), '│  ');
  assert.equal(continuationPrefix(bob, bob.content.continuesBelow), '│  ');
  assert.equal(continuationPrefix(carol, carol.content.continuesBelow), '│  │  ');
  assert.equal(continuationPrefix(dave, dave.content.continuesBelow), '│     ');
});

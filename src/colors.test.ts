import { test } from 'node:test';
import assert from 'node:assert/strict';
import { usernameColor, PALETTE } from './colors';

test('the palette never contains green or greenBright', () => {
  // @ts-expect-error - testing that non-palette colors are excluded
  assert.equal(PALETTE.includes('green'), false);
  // @ts-expect-error - testing that non-palette colors are excluded
  assert.equal(PALETTE.includes('greenBright'), false);
});

test('usernameColor is deterministic for the same username', () => {
  assert.equal(usernameColor('alice'), usernameColor('alice'));
  assert.equal(usernameColor('bob'), usernameColor('bob'));
});

test('usernameColor always returns a color from the palette', () => {
  for (const name of ['alice', 'bob', 'carol', 'dave', 'erin', '']) {
    assert.equal(PALETTE.includes(usernameColor(name)), true);
  }
});

test('usernameColor gives different usernames a chance to differ', () => {
  const colors = new Set(['alice', 'bob', 'carol', 'dave', 'erin'].map(usernameColor));
  assert.ok(colors.size > 1, 'expected at least two distinct colors among 5 usernames');
});

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { computeFooterHeight } from './Footer';

test('a wide terminal fits the footer text on one line: 2 border rows + 1 content row', () => {
  assert.equal(computeFooterHeight(200), 3);
});

test('a narrow terminal wraps the footer text, adding extra rows on top of the border', () => {
  const wideHeight = computeFooterHeight(200);
  const narrowHeight = computeFooterHeight(40);
  assert.ok(narrowHeight > wideHeight, 'a narrower terminal must reserve more rows for the wrapped footer text');
});

test('an extremely narrow terminal never crashes and still reserves at least the border rows', () => {
  assert.ok(computeFooterHeight(1) >= 2);
});

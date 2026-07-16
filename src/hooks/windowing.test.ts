import { test } from 'node:test';
import assert from 'node:assert/strict';
import { advanceVisibleWindow, advanceVisibleWindowWithIndicators, INITIAL_VISIBLE_WINDOW } from './windowing';

test('empty list returns an empty window', () => {
  assert.deepEqual(advanceVisibleWindow(INITIAL_VISIBLE_WINDOW, 0, 0, [], 10), { start: 0, end: 0 });
});

test('fresh mount shows from the top, filling downward', () => {
  const heights = Array(10).fill(1);
  assert.deepEqual(advanceVisibleWindow(INITIAL_VISIBLE_WINDOW, 10, 0, heights, 5), { start: 0, end: 5 });
});

test('fresh mount with more room than content shows everything', () => {
  const heights = Array(5).fill(1);
  assert.deepEqual(advanceVisibleWindow(INITIAL_VISIBLE_WINDOW, 5, 0, heights, 100), { start: 0, end: 5 });
});

test('moving the selection within the current window does not move the window at all', () => {
  const heights = Array(20).fill(1);
  const first = advanceVisibleWindow(INITIAL_VISIBLE_WINDOW, 20, 0, heights, 5);
  assert.deepEqual(first, { start: 0, end: 5 });
  const second = advanceVisibleWindow(first, 20, 1, heights, 5);
  assert.deepEqual(second, first, 'window must stay put while selection is still comfortably inside it');
  const third = advanceVisibleWindow(second, 20, 3, heights, 5);
  assert.deepEqual(third, first, 'window must stay put right up to the last fully-visible row');
});

test('moving down past the bottom edge jumps so the selection becomes the new top', () => {
  const heights = Array(20).fill(1);
  let window = advanceVisibleWindow(INITIAL_VISIBLE_WINDOW, 20, 0, heights, 5); // {0,5}
  window = advanceVisibleWindow(window, 20, 4, heights, 5); // sticky, still {0,5}
  window = advanceVisibleWindow(window, 20, 5, heights, 5); // jump
  assert.deepEqual(window, { start: 5, end: 10 });
});

test('moving up past the top edge jumps so the selection becomes the new bottom', () => {
  const heights = Array(20).fill(1);
  let window = advanceVisibleWindow(INITIAL_VISIBLE_WINDOW, 20, 0, heights, 5); // {0,5}
  window = advanceVisibleWindow(window, 20, 5, heights, 5); // jump -> {5,10}
  window = advanceVisibleWindow(window, 20, 10, heights, 5); // jump -> {10,15}
  window = advanceVisibleWindow(window, 20, 9, heights, 5); // jump up
  assert.deepEqual(window, { start: 5, end: 10 });
});

test('sticky window survives many consecutive small moves in the same direction', () => {
  const heights = Array(20).fill(1);
  let window = advanceVisibleWindow(INITIAL_VISIBLE_WINDOW, 20, 0, heights, 5); // {0,5}
  for (let index = 1; index <= 4; index += 1) {
    window = advanceVisibleWindow(window, 20, index, heights, 5);
    assert.deepEqual(window, { start: 0, end: 5 }, `index ${index} should still be inside the initial window`);
  }
  window = advanceVisibleWindow(window, 20, 5, heights, 5);
  assert.deepEqual(window, { start: 5, end: 10 });
});

test('a single oversized item is still shown alone rather than hidden', () => {
  const heights = [1, 1, 50, 1, 1];
  const window = advanceVisibleWindow(INITIAL_VISIBLE_WINDOW, 5, 2, heights, 5);
  assert.ok(window.start <= 2 && window.end > 2);
});

test('respects variable per-item heights, never overshooting the budget', () => {
  const heights = [3, 3, 3, 3];
  const window = advanceVisibleWindow(INITIAL_VISIBLE_WINDOW, 4, 0, heights, 5);
  assert.deepEqual(window, { start: 0, end: 1 });
});

test('shrinking itemCount clamps a stale window instead of going out of bounds', () => {
  const heights = Array(3).fill(1);
  const stale = { start: 5, end: 9 };
  const window = advanceVisibleWindow(stale, 3, 1, heights, 5);
  assert.ok(window.start <= 1 && window.end >= 2 && window.end <= 3);
});

test('a window that no longer fits its budget shrinks from the edge farther from the selection', () => {
  // Selection near the top of a window that used to fit at height 5 but the
  // terminal (or item heights) shrank to 3 — must trim from the bottom first.
  const heights = Array(10).fill(1);
  const window = advanceVisibleWindow({ start: 0, end: 5 }, 10, 1, heights, 3);
  assert.deepEqual(window, { start: 0, end: 3 });
});

test('with indicators: no indicators when everything fits', () => {
  const heights = Array(3).fill(1);
  const result = advanceVisibleWindowWithIndicators(INITIAL_VISIBLE_WINDOW, 3, 0, heights, 10);
  assert.deepEqual(result, { start: 0, end: 3, hasAbove: false, hasBelow: false });
});

test('with indicators: shows a below indicator and shrinks the window for it', () => {
  const heights = Array(10).fill(1);
  const result = advanceVisibleWindowWithIndicators(INITIAL_VISIBLE_WINDOW, 10, 0, heights, 5);
  assert.equal(result.hasAbove, false);
  assert.equal(result.hasBelow, true);
  assert.equal(result.end - result.start, 4);
});

test('with indicators: shows both indicators once scrolled into the middle', () => {
  const heights = Array(20).fill(1);
  const first = advanceVisibleWindowWithIndicators(INITIAL_VISIBLE_WINDOW, 20, 5, heights, 6);
  const second = advanceVisibleWindowWithIndicators(first, 20, 6, heights, 6);
  assert.equal(second.hasAbove, true);
  assert.equal(second.hasBelow, true);
});

test('with indicators: staying within the sticky window keeps the same bounds', () => {
  const heights = Array(20).fill(1);
  const first = advanceVisibleWindowWithIndicators(INITIAL_VISIBLE_WINDOW, 20, 0, heights, 6);
  const second = advanceVisibleWindowWithIndicators(first, 20, 2, heights, 6);
  assert.deepEqual(second, first);
});

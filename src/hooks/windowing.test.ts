import { test } from 'node:test';
import assert from 'node:assert/strict';
import { computeVisibleWindow, computeVisibleWindowWithIndicators } from './windowing';

test('empty list returns an empty window', () => {
  assert.deepEqual(computeVisibleWindow(0, 0, [], 10), { start: 0, end: 0 });
});

test('selection at the start keeps the window anchored to the top', () => {
  const heights = Array(10).fill(1);
  assert.deepEqual(computeVisibleWindow(10, 0, heights, 5), { start: 0, end: 5 });
});

test('selection at the end anchors the window to the bottom', () => {
  const heights = Array(10).fill(1);
  assert.deepEqual(computeVisibleWindow(10, 9, heights, 5), { start: 5, end: 10 });
});

test('selection in the middle centers the window around it', () => {
  const heights = Array(20).fill(1);
  const { start, end } = computeVisibleWindow(20, 10, heights, 5);
  assert.ok(start <= 10 && end > 10);
  assert.equal(end - start, 5);
});

test('available height larger than total content shows everything', () => {
  const heights = Array(5).fill(1);
  assert.deepEqual(computeVisibleWindow(5, 2, heights, 100), { start: 0, end: 5 });
});

test('a single oversized item is still shown alone rather than hidden', () => {
  const heights = [1, 1, 50, 1, 1];
  const { start, end } = computeVisibleWindow(5, 2, heights, 5);
  assert.ok(start <= 2 && end > 2);
});

test('respects variable per-item heights, not just item count', () => {
  const heights = [3, 3, 3, 3];
  const { start, end } = computeVisibleWindow(4, 0, heights, 5);
  assert.deepEqual({ start, end }, { start: 0, end: 2 });
});

test('with indicators: no indicators when everything fits', () => {
  const heights = Array(3).fill(1);
  const result = computeVisibleWindowWithIndicators(3, 1, heights, 10);
  assert.deepEqual(result, { start: 0, end: 3, hasAbove: false, hasBelow: false });
});

test('with indicators: shows a below indicator and shrinks the window for it', () => {
  const heights = Array(10).fill(1);
  const result = computeVisibleWindowWithIndicators(10, 0, heights, 5);
  assert.equal(result.hasAbove, false);
  assert.equal(result.hasBelow, true);
  assert.equal(result.end - result.start, 4);
});

test('with indicators: shows both indicators when selection is in the middle', () => {
  const heights = Array(20).fill(1);
  const result = computeVisibleWindowWithIndicators(20, 10, heights, 6);
  assert.equal(result.hasAbove, true);
  assert.equal(result.hasBelow, true);
});

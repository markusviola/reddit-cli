import { test } from 'node:test';
import assert from 'node:assert/strict';
import { formatRelativeTime } from './relativeTime';

const NOW = 1_700_000_000;

test('just now for sub-minute elapsed', () => {
  assert.equal(formatRelativeTime(NOW - 30, NOW), 'just now');
});

test('minutes, hours, days, months, years each pick their unit', () => {
  assert.equal(formatRelativeTime(NOW - 5 * 60, NOW), '5min ago');
  assert.equal(formatRelativeTime(NOW - 3 * 60 * 60, NOW), '3hr ago');
  assert.equal(formatRelativeTime(NOW - 2 * 60 * 60 * 24, NOW), '2d ago');
  assert.equal(formatRelativeTime(NOW - 40 * 60 * 60 * 24, NOW), '1mo ago');
  assert.equal(formatRelativeTime(NOW - 400 * 60 * 60 * 24, NOW), '1yr ago');
});

test('future or equal timestamps clamp to just now', () => {
  assert.equal(formatRelativeTime(NOW + 1000, NOW), 'just now');
  assert.equal(formatRelativeTime(NOW, NOW), 'just now');
});

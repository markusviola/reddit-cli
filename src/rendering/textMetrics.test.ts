import { test } from 'node:test';
import assert from 'node:assert/strict';
import { estimateWrappedLines, truncateToLines } from './textMetrics';

test('short text within width is one line', () => {
  assert.equal(estimateWrappedLines('hello', 80), 1);
});

test('empty text is still one line', () => {
  assert.equal(estimateWrappedLines('', 80), 1);
});

test('text longer than width wraps into multiple lines', () => {
  assert.equal(estimateWrappedLines('a'.repeat(85), 80), 2);
  assert.equal(estimateWrappedLines('a'.repeat(160), 80), 2);
  assert.equal(estimateWrappedLines('a'.repeat(161), 80), 3);
});

test('embedded newlines are summed per fragment', () => {
  assert.equal(estimateWrappedLines('short\nline', 80), 2);
  assert.equal(estimateWrappedLines(`${'a'.repeat(85)}\nshort`, 80), 3);
});

test('width of zero or negative is treated as width 1', () => {
  assert.equal(estimateWrappedLines('abc', 0), 3);
  assert.equal(estimateWrappedLines('abc', -5), 3);
});

// Raw char count gives 2 lines; word-wrap needs 3, matching
// Ink's wrap-ansi("hard") output for this input.
test('wraps at word boundaries, not raw character count', () => {
  assert.equal(estimateWrappedLines('aaaaa bbbbb ccccc', 10), 3);
});

test('a word exactly filling the remaining width still fits', () => {
  assert.equal(estimateWrappedLines('hello world', 11), 1);
  assert.equal(estimateWrappedLines('hello world', 10), 2);
});

test('a single word longer than width is hard-broken', () => {
  assert.equal(estimateWrappedLines('supercalifragilisticexpialidocious', 10), 4);
});

test('a long word after other words wraps to its own line(s)', () => {
  assert.equal(estimateWrappedLines('hi supercalifragilisticexpialidocious', 10), 5);
});

// CJK chars are 2 columns each but 1 code unit; .length (3)
// under-counts the true 6-column width.
test('double-width CJK characters are measured by column, not length', () => {
  assert.equal(estimateWrappedLines('古古古', 5), 2);
  assert.equal(estimateWrappedLines('古古古', 6), 1);
});

// A ZWJ emoji is 11 code units but renders as one 2-column
// glyph; .length over-counts it, hard-breaking wrongly.
test('a multi-codepoint emoji sequence is measured by display width', () => {
  assert.equal(estimateWrappedLines('👨‍👩‍👧‍👦', 5), 1);
});

test('text that already fits within the line limit is returned unchanged', () => {
  assert.equal(truncateToLines('short text', 80, 3), 'short text');
});

test('text past the line limit is cut down and gets a trailing ellipsis', () => {
  const words = Array.from({ length: 20 }, (_, index) => `word${index}`);
  const result = truncateToLines(words.join(' '), 20, 1);
  assert.ok(result.endsWith('…'));
  assert.ok(estimateWrappedLines(result, 20) <= 1, 'the truncated result (with ellipsis) must itself fit the limit');
});

test('the truncated result is a prefix of the original words, never reordered or cut mid-word', () => {
  const words = ['alpha', 'bravo', 'charlie', 'delta', 'echo', 'foxtrot', 'golf', 'hotel'];
  const result = truncateToLines(words.join(' '), 20, 1);
  const kept = result.slice(0, -1).trim();
  const keptWords = kept.length === 0 ? [] : kept.split(' ');
  assert.deepEqual(keptWords, words.slice(0, keptWords.length));
});

test('a single word too long to fit even with the ellipsis still returns just the ellipsis', () => {
  const result = truncateToLines('supercalifragilisticexpialidocious', 10, 1);
  assert.equal(result, '…');
});

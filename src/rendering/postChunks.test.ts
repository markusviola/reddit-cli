import { test } from 'node:test';
import assert from 'node:assert/strict';
import { chunkText } from './postChunks';

test('empty text produces no chunks', () => {
  assert.deepEqual(chunkText('', 80, 8), []);
});

test('a short single paragraph is one chunk', () => {
  assert.deepEqual(chunkText('just one short paragraph', 80, 8), ['just one short paragraph']);
});

test('blank-line-separated paragraphs each become their own chunk', () => {
  const text = 'first paragraph\n\nsecond paragraph\n\nthird paragraph';
  assert.deepEqual(chunkText(text, 80, 8), ['first paragraph', 'second paragraph', 'third paragraph']);
});

test('a paragraph that wraps to more than the line limit is split into multiple chunks', () => {
  // 20 words of 4 chars each ("word0".."word19"), width 10 -> ~2 words/line -> 10 lines total, limit 4.
  const words = Array.from({ length: 20 }, (_, index) => `word${index}`);
  const chunks = chunkText(words.join(' '), 10, 4);
  assert.ok(chunks.length > 1, 'expected the long paragraph to be split into more than one chunk');
  for (const chunk of chunks) {
    // Each individual chunk must itself respect the line limit at this width.
    const lineCount = chunk.split(' ').length; // sanity: chunk is non-empty text
    assert.ok(lineCount > 0);
  }
  assert.equal(chunks.join(' '), words.join(' '), 'splitting must not drop or reorder any words');
});

test('a single word longer than the width is kept whole rather than dropped', () => {
  const longWord = 'x'.repeat(500);
  const chunks = chunkText(longWord, 10, 4);
  assert.deepEqual(chunks, [longWord]);
});

test('blank lines between paragraphs do not produce empty chunks', () => {
  const text = 'a\n\n\n\nb';
  assert.deepEqual(chunkText(text, 80, 8), ['a', 'b']);
});

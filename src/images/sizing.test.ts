import { test } from 'node:test';
import assert from 'node:assert/strict';
import { computeImageCellSize, reservedRowsForImage } from './sizing';

const OPTS = { cellAspect: 0.5, cellPixelWidth: 10 };

test('targets two thirds of the terminal width for a large image', () => {
  const size = computeImageCellSize({ width: 4000, height: 3000 }, { columns: 100, rows: 100 }, OPTS);
  assert.equal(size.cols, 66, 'width should be two thirds of 100 columns');
});

test('preserves aspect ratio when computing rows from cols', () => {
  // 2:1 image at 66 cols -> visual: 66*cellW wide, rows*cellH tall.
  // rows = round(66 * (1/2) * 0.5) = round(16.5) = 17
  const size = computeImageCellSize({ width: 2000, height: 1000 }, { columns: 100, rows: 200 }, OPTS);
  assert.equal(size.cols, 66);
  assert.equal(size.rows, 17);
});

test('does not upscale an image whose native cell width is below two thirds of the terminal', () => {
  // 200px / 10px-per-cell = 20 native cols, two thirds of terminal = 53 -> keep 20.
  const size = computeImageCellSize({ width: 200, height: 200 }, { columns: 80, rows: 200 }, OPTS);
  assert.equal(size.cols, 20, 'small images render at native cell width, not upscaled to two thirds');
});

test('shrinks width when the computed height would exceed two thirds of the terminal', () => {
  // Tall image: at two-thirds width the rows would blow past 2/3 of rows.
  const terminal = { columns: 100, rows: 30 };
  const maxRows = Math.floor((30 * 2) / 3); // 20
  const size = computeImageCellSize({ width: 1000, height: 4000 }, terminal, OPTS);
  assert.ok(size.rows <= maxRows, `rows ${size.rows} must fit within 2/3 max (${maxRows})`);
  assert.ok(size.cols < 66, 'width must have been reduced below two thirds to fit the height cap');
});

test('falls back to a sane aspect when pixel dimensions are unknown', () => {
  const size = computeImageCellSize({ width: 0, height: 0 }, { columns: 80, rows: 80 }, OPTS);
  assert.ok(size.cols >= 1 && size.rows >= 1);
});

test('never returns a zero or negative dimension on a tiny terminal', () => {
  const size = computeImageCellSize({ width: 4000, height: 3000 }, { columns: 1, rows: 1 }, OPTS);
  assert.ok(size.cols >= 1 && size.rows >= 1);
});

test('reservedRowsForImage adds margin, outline, and a counter row for galleries', () => {
  const single = reservedRowsForImage({ cols: 20, rows: 10 }, false);
  const gallery = reservedRowsForImage({ cols: 20, rows: 10 }, true);
  assert.equal(single, 10 + 4 + 2, 'image rows + 4 margin + 2 outline');
  assert.equal(gallery, 10 + 4 + 2 + 1, 'plus one counter row for a gallery');
});

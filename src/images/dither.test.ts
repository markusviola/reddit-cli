import { test } from 'node:test';
import assert from 'node:assert/strict';
import { bayerThreshold, ditherToTwoColor, luminance } from './dither';

const WHITE = { r: 255, g: 255, b: 255 };
const BLACK = { r: 0, g: 0, b: 0 };

test('luminance weights green highest and blue lowest', () => {
  assert.ok(luminance({ r: 0, g: 255, b: 0 }) > luminance({ r: 255, g: 0, b: 0 }));
  assert.ok(luminance({ r: 255, g: 0, b: 0 }) > luminance({ r: 0, g: 0, b: 255 }));
  assert.equal(luminance(BLACK), 0);
});

test('bayer thresholds tile every 4 pixels and span 0..255', () => {
  assert.equal(bayerThreshold(0, 0), bayerThreshold(4, 4));
  assert.equal(bayerThreshold(1, 0), bayerThreshold(5, 8));
  assert.ok(bayerThreshold(0, 0) > 0 && bayerThreshold(0, 0) < 16);
  assert.ok(bayerThreshold(0, 3) > 240 && bayerThreshold(0, 3) < 255);
});

test('a fully bright image becomes entirely the high color', () => {
  const luma = new Uint8Array(16).fill(255);
  const out = ditherToTwoColor(luma, 4, 4, WHITE, BLACK);
  for (let i = 0; i < out.length; i += 3) assert.equal(out[i], 255);
});

test('a fully dark image becomes entirely the low color', () => {
  const luma = new Uint8Array(16).fill(0);
  const out = ditherToTwoColor(luma, 4, 4, WHITE, BLACK);
  for (let i = 0; i < out.length; i += 3) assert.equal(out[i], 0);
});

test('a uniform mid-gray dithers to exactly half high / half low', () => {
  const luma = new Uint8Array(16).fill(128);
  const out = ditherToTwoColor(luma, 4, 4, WHITE, BLACK);
  let high = 0;
  for (let i = 0; i < out.length; i += 3) if (out[i] === 255) high++;
  assert.equal(high, 8, '8 of the 16 Bayer cells fall below the 128 threshold');
});

test('output is 3 bytes per pixel and only ever the two given colors', () => {
  const luma = new Uint8Array([0, 64, 128, 192, 255, 32, 96, 160, 224, 16, 48, 80, 112, 144, 176, 208]);
  const fg = { r: 10, g: 20, b: 30 };
  const bg = { r: 200, g: 210, b: 220 };
  const out = ditherToTwoColor(luma, 4, 4, fg, bg);
  assert.equal(out.length, 4 * 4 * 3);
  for (let i = 0; i < out.length; i += 3) {
    const pixel = `${out[i]},${out[i + 1]},${out[i + 2]}`;
    assert.ok(pixel === '10,20,30' || pixel === '200,210,220', `unexpected color ${pixel}`);
  }
});

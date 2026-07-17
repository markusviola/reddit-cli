import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ColorProbe, parseOscColors } from './terminalColors';

test('parses a BEL-terminated OSC 11 background report', () => {
  const { background } = parseOscColors('\x1b]11;rgb:0000/0000/0000\x07');
  assert.deepEqual(background, { r: 0, g: 0, b: 0 });
});

test('parses an ST-terminated OSC 10 foreground report', () => {
  const { foreground } = parseOscColors('\x1b]10;rgb:ffff/ffff/ffff\x1b\\');
  assert.deepEqual(foreground, { r: 255, g: 255, b: 255 });
});

test('parses both colors from a combined response', () => {
  const raw = '\x1b]10;rgb:c0c0/c0c0/c0c0\x07\x1b]11;rgb:2020/2020/2020\x07';
  const { foreground, background } = parseOscColors(raw);
  assert.deepEqual(foreground, { r: 192, g: 192, b: 192 });
  assert.deepEqual(background, { r: 32, g: 32, b: 32 });
});

test('scales channels of fewer than 4 hex digits', () => {
  const { background } = parseOscColors('\x1b]11;rgb:ff/80/00\x07');
  assert.deepEqual(background, { r: 255, g: 128, b: 0 });
});

test('garbage and partial responses parse to null', () => {
  assert.deepEqual(parseOscColors('not an escape at all'), { foreground: null, background: null });
  assert.deepEqual(parseOscColors('\x1b]11;rgb:0000/0000'), { foreground: null, background: null });
});

test('ColorProbe completes once both colors arrive across chunks', () => {
  const probe = new ColorProbe();
  assert.equal(probe.feed('\x1b]10;rgb:ffff/'), '');
  assert.equal(probe.complete, false, 'incomplete OSC is held, not emitted');
  probe.feed('ffff/ffff\x07\x1b]11;rgb:0000/0000/0000\x07');
  assert.equal(probe.complete, true);
  assert.deepEqual(probe.foreground, { r: 255, g: 255, b: 255 });
  assert.deepEqual(probe.background, { r: 0, g: 0, b: 0 });
});

test('ColorProbe returns non-OSC keystrokes as leftover, stripping the report', () => {
  const probe = new ColorProbe();
  const leftover = probe.feed('\x1b]11;rgb:0000/0000/0000\x07\x1b[C');
  assert.equal(leftover, '\x1b[C', 'a right-arrow arriving mid-query is preserved');
});

test('ColorProbe fires onComplete exactly when both colors are known', () => {
  const probe = new ColorProbe();
  let fired = 0;
  probe.onComplete = () => {
    fired++;
  };
  probe.feed('\x1b]11;rgb:0000/0000/0000\x07');
  assert.equal(fired, 0, 'only background so far');
  probe.feed('\x1b]10;rgb:ffff/ffff/ffff\x07');
  assert.equal(fired, 1);
});

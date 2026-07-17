import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseKey } from './standaloneViewer';

test('parses right/left arrow escape sequences', () => {
  assert.deepEqual(parseKey('\x1b[C'), { key: 'next', consumed: 3 });
  assert.deepEqual(parseKey('\x1b[D'), { key: 'prev', consumed: 3 });
});

test('parses application-cursor-mode arrows (ESC O)', () => {
  assert.deepEqual(parseKey('\x1bOC'), { key: 'next', consumed: 3 });
  assert.deepEqual(parseKey('\x1bOD'), { key: 'prev', consumed: 3 });
});

test('backspace, delete, and ctrl-c all close', () => {
  assert.deepEqual(parseKey('\x7f'), { key: 'close', consumed: 1 });
  assert.deepEqual(parseKey('\x08'), { key: 'close', consumed: 1 });
  assert.deepEqual(parseKey('\x03'), { key: 'close', consumed: 1 });
});

test('waits for more bytes when an escape sequence is split', () => {
  assert.equal(parseKey('\x1b'), null, 'lone ESC is ambiguous');
  assert.equal(parseKey('\x1b['), null, 'CSI introducer with no final byte');
});

test('ESC followed by a non-CSI byte reads as Escape (close)', () => {
  assert.deepEqual(parseKey('\x1bz'), { key: 'close', consumed: 2 });
});

test('other single bytes are ignored one at a time', () => {
  assert.deepEqual(parseKey('a'), { key: 'ignore', consumed: 1 });
});

test('unrecognized CSI sequences are consumed whole, not mid-sequence', () => {
  assert.deepEqual(parseKey('\x1b[A'), { key: 'ignore', consumed: 3 });
});

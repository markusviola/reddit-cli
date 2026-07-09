import { test } from 'node:test';
import assert from 'node:assert/strict';
import { isRecord, asRecord, asString, asNumber, asBoolean } from './parse';

test('isRecord is true for plain objects, false for null/arrays/primitives', () => {
  assert.equal(isRecord({}), true);
  assert.equal(isRecord({ a: 1 }), true);
  assert.equal(isRecord(null), false);
  assert.equal(isRecord([1, 2]), false);
  assert.equal(isRecord('x'), false);
  assert.equal(isRecord(42), false);
});

test('asRecord returns the value itself when it is a record, else {}', () => {
  const record = { a: 1 };
  assert.equal(asRecord(record), record);
  assert.deepEqual(asRecord(null), {});
  assert.deepEqual(asRecord('nope'), {});
});

test('asString returns the string, or the fallback for non-strings', () => {
  assert.equal(asString('hello'), 'hello');
  assert.equal(asString(42), '');
  assert.equal(asString(undefined, 'default'), 'default');
});

test('asNumber returns finite numbers, or the fallback otherwise', () => {
  assert.equal(asNumber(42), 42);
  assert.equal(asNumber(Number.NaN), 0);
  assert.equal(asNumber('42'), 0);
  assert.equal(asNumber(undefined, -1), -1);
});

test('asBoolean returns the boolean, or the fallback for non-booleans', () => {
  assert.equal(asBoolean(true), true);
  assert.equal(asBoolean(false), false);
  assert.equal(asBoolean('true'), false);
  assert.equal(asBoolean(undefined, true), true);
});

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { selectionReducer } from './selectionReducer';

test('up decrements the index', () => {
  assert.deepEqual(selectionReducer({ index: 2 }, { type: 'up' }), { index: 1 });
});

test('up clamps at 0', () => {
  assert.deepEqual(selectionReducer({ index: 0 }, { type: 'up' }), { index: 0 });
});

test('down increments the index', () => {
  assert.deepEqual(selectionReducer({ index: 0 }, { type: 'down', itemCount: 3 }), { index: 1 });
});

test('down clamps at itemCount - 1', () => {
  assert.deepEqual(selectionReducer({ index: 2 }, { type: 'down', itemCount: 3 }), { index: 2 });
});

test('down with itemCount 0 stays at 0', () => {
  assert.deepEqual(selectionReducer({ index: 0 }, { type: 'down', itemCount: 0 }), { index: 0 });
});

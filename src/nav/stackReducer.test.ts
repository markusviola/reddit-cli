import { test } from 'node:test';
import assert from 'node:assert/strict';
import { stackReducer } from './stackReducer';

type TestFrame = { id: number };

test('push appends a new frame', () => {
  const result = stackReducer<TestFrame>([{ id: 1 }], { type: 'push', frame: { id: 2 } });
  assert.deepEqual(result, [{ id: 1 }, { id: 2 }]);
});

test('pop removes the last frame when more than one remains', () => {
  const result = stackReducer<TestFrame>([{ id: 1 }, { id: 2 }], { type: 'pop' });
  assert.deepEqual(result, [{ id: 1 }]);
});

test('pop is a no-op at the root (single frame)', () => {
  const stack = [{ id: 1 }];
  const result = stackReducer<TestFrame>(stack, { type: 'pop' });
  assert.deepEqual(result, [{ id: 1 }]);
});

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseToken, checkExpiry, TokenExpiredError } from './token';

test('parseToken extracts all fields from a raw JSON string', () => {
  const raw = JSON.stringify({
    accessToken: 'abc',
    refreshToken: 'def',
    expiresAt: 1234,
    scope: '*',
    tokenType: 'bearer',
  });
  const token = parseToken(raw);
  assert.deepEqual(token, {
    accessToken: 'abc',
    refreshToken: 'def',
    expiresAt: 1234,
    scope: '*',
    tokenType: 'bearer',
  });
});

test('parseToken coerces missing/wrong-typed fields to safe defaults', () => {
  const token = parseToken('{}');
  assert.deepEqual(token, {
    accessToken: '',
    refreshToken: '',
    expiresAt: 0,
    scope: '',
    tokenType: '',
  });
});

test('checkExpiry does not throw when the token has not expired', () => {
  const token = parseToken(
    JSON.stringify({ accessToken: 'a', refreshToken: 'b', expiresAt: 2000, scope: '*', tokenType: 'bearer' })
  );
  assert.doesNotThrow(() => checkExpiry(token, 1000));
});

test('checkExpiry throws TokenExpiredError when the token has expired', () => {
  const token = parseToken(
    JSON.stringify({ accessToken: 'a', refreshToken: 'b', expiresAt: 1000, scope: '*', tokenType: 'bearer' })
  );
  assert.throws(() => checkExpiry(token, 2000), TokenExpiredError);
});

test('checkExpiry treats expiresAt exactly equal to now as expired', () => {
  const token = parseToken(
    JSON.stringify({ accessToken: 'a', refreshToken: 'b', expiresAt: 1000, scope: '*', tokenType: 'bearer' })
  );
  assert.throws(() => checkExpiry(token, 1000), TokenExpiredError);
});

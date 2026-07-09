import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseToken, checkExpiry, TokenExpiredError } from './token';

function encodeToken(fields: Record<string, unknown>): string {
  const inner = Buffer.from(JSON.stringify(fields), 'utf8').toString('base64url');
  return JSON.stringify({ token: inner, copyPaste: false });
}

test('parseToken extracts all fields from the on-disk shape (base64url JSON under "token")', () => {
  const raw = encodeToken({
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
  const token = parseToken(encodeToken({}));
  assert.deepEqual(token, {
    accessToken: '',
    refreshToken: '',
    expiresAt: 0,
    scope: '',
    tokenType: '',
  });
});

test('parseToken defaults safely when the outer "token" field is missing or not valid base64url JSON', () => {
  const token = parseToken(JSON.stringify({ copyPaste: false }));
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
    encodeToken({ accessToken: 'a', refreshToken: 'b', expiresAt: 2000, scope: '*', tokenType: 'bearer' })
  );
  assert.doesNotThrow(() => checkExpiry(token, 1000));
});

test('checkExpiry throws TokenExpiredError when the token has expired', () => {
  const token = parseToken(
    encodeToken({ accessToken: 'a', refreshToken: 'b', expiresAt: 1000, scope: '*', tokenType: 'bearer' })
  );
  assert.throws(() => checkExpiry(token, 2000), TokenExpiredError);
});

test('checkExpiry treats expiresAt exactly equal to now as expired', () => {
  const token = parseToken(
    encodeToken({ accessToken: 'a', refreshToken: 'b', expiresAt: 1000, scope: '*', tokenType: 'bearer' })
  );
  assert.throws(() => checkExpiry(token, 1000), TokenExpiredError);
});

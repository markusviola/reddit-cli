import { readFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';
import { asRecord, asString, asNumber } from './reddit/parse';

export type DevvitToken = {
  accessToken: string;
  refreshToken: string;
  expiresAt: number;
  scope: string;
  tokenType: string;
};

export class TokenExpiredError extends Error {
  constructor() {
    super('Token expired — run: npm run login');
    this.name = 'TokenExpiredError';
  }
}

function decodeInner(encoded: string): Record<string, unknown> {
  try {
    const decoded: unknown = JSON.parse(Buffer.from(encoded, 'base64url').toString('utf8'));
    return asRecord(decoded);
  } catch {
    return {};
  }
}

export function parseToken(raw: string): DevvitToken {
  const outer: unknown = JSON.parse(raw);
  const outerRecord = asRecord(outer);
  const inner = decodeInner(asString(outerRecord.token));
  return {
    accessToken: asString(inner.accessToken),
    refreshToken: asString(inner.refreshToken),
    expiresAt: asNumber(inner.expiresAt),
    scope: asString(inner.scope),
    tokenType: asString(inner.tokenType),
  };
}

export function checkExpiry(token: DevvitToken, now: number): void {
  if (token.expiresAt <= now) {
    throw new TokenExpiredError();
  }
}

let cachedToken: DevvitToken | null = null;

export function loadToken(now: number): DevvitToken {
  if (cachedToken !== null && cachedToken.expiresAt > now) {
    return cachedToken;
  }
  const tokenPath = join(homedir(), '.devvit', 'token');
  const raw = readFileSync(tokenPath, 'utf8');
  const token = parseToken(raw);
  checkExpiry(token, now);
  cachedToken = token;
  return token;
}

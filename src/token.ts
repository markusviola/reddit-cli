import { readFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';

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

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function asString(value: unknown): string {
  return typeof value === 'string' ? value : '';
}

function asNumber(value: unknown): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : 0;
}

function decodeInner(encoded: string): Record<string, unknown> {
  try {
    const decoded: unknown = JSON.parse(Buffer.from(encoded, 'base64url').toString('utf8'));
    return isRecord(decoded) ? decoded : {};
  } catch {
    return {};
  }
}

export function parseToken(raw: string): DevvitToken {
  const outer: unknown = JSON.parse(raw);
  const outerRecord = isRecord(outer) ? outer : {};
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

export function loadToken(now: number): DevvitToken {
  const tokenPath = join(homedir(), '.devvit', 'token');
  const raw = readFileSync(tokenPath, 'utf8');
  const token = parseToken(raw);
  checkExpiry(token, now);
  return token;
}

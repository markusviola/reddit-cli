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

export function parseToken(raw: string): DevvitToken {
  const parsed: unknown = JSON.parse(raw);
  const json = isRecord(parsed) ? parsed : {};
  return {
    accessToken: asString(json.accessToken),
    refreshToken: asString(json.refreshToken),
    expiresAt: asNumber(json.expiresAt),
    scope: asString(json.scope),
    tokenType: asString(json.tokenType),
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

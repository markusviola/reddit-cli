# Reddit TUI Browser Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Turn this repo from a Devvit "hello world" web-app scaffold into a standalone, read-only, keyboard-driven terminal Reddit browser (Ink + React), authenticated via the existing `~/.devvit/token` file.

**Architecture:** A thin custom fetch client talks to `oauth.reddit.com` using the token Devvit's `login` command already manages. Ink (React for CLIs) renders the UI; navigation is a simple push/pop stack of screens. Pure logic (token expiry, raw→normalized Reddit data mapping, comment-tree flattening/tree-branch rendering, username color hashing, list-selection state) lives in plain `.ts` files with unit tests (Node's built-in test runner via `tsx`); Ink components stay thin and are verified by running the app.

**Tech Stack:** Node >=22.2.0, TypeScript (strict), React 19, Ink 7, `ink-text-input` 6, `tsx` (dev/test runner), the existing `devvit` CLI package (only for `npm run login`).

## Global Constraints

- Node engine floor: `>=22.2.0` (unchanged from the existing `package.json`).
- Read-only, forever: no voting, commenting, posting, or any account-mutating call — ever, in any task.
- No image/media rendering anywhere. Posts with image/gallery media get a **badge**, not colored text: yellow background, black text, reading `with image`, directly below the title, in every list row and on the Thread screen. Comments with an inline embedded image get `[has_image 🖼️]` substituted in place of the image reference within the comment body text — the substitution happens once, during raw→normalized mapping, so it can never reach the renderer unhandled.
- Global color convention: post titles render blue (`color="blue"`). Usernames render in a color deterministically hashed from the username, drawn from a fixed palette that **excludes** `'green'`/`'greenBright'`. When a row is the current selection cursor, its *entire* text (title, username, everything except the image badge) renders green + bold, overriding blue/hashed colors; colors revert when the cursor moves off. The image badge's yellow/black styling never changes with selection.
- Global keybindings: ↑/↓ moves the selection cursor in every list (feed, search results, comment tree). Enter is the one universal "activate" key (open post/subreddit, or expand/collapse a collapsed comment-replies placeholder, or fetch a "more replies" stub). Backspace pops one screen off the navigation stack (no-op at the root `MainMenu` screen). Ctrl+C twice within ~1s exits the whole app; a single press is ignored.
- Pagination is auto-load-more: reaching the last visible item in any list fetches and appends the next page automatically. No explicit "next page" key anywhere.
- `top`/`controversial` sort defaults to Reddit's `t=day` timeframe; there is no separate timeframe control (out of scope).
- Code style (from the rewritten `AGENTS.md`): prefer type aliases over interfaces; prefer named exports over default exports; never use the `as` cast operator — use type guards or variable-type annotations against `unknown`/`any` instead.
- Comment tree spacing/rendering exactly as specified: `│` continues a still-open ancestor branch, `├─` marks a sibling with more below it, `└─` marks the last sibling at a depth, `▸` marks a collapsed subtree, and one blank line separates each top-level comment block (no blank line between a comment and its own nested replies).
- Imports are extensionless relative paths (e.g. `from './token'`, not `'./token.js'` or `'./token.ts'`) — consistent with `"moduleResolution": "Bundler"` in `tsconfig.json`, and `tsx` resolves these correctly both when running the app and when running tests.
- Test files are co-located with their source file as `<name>.test.ts`, using Node's built-in test runner (`import { test } from 'node:test'; import assert from 'node:assert/strict';`), executed via `node --import tsx --test <path>`.

---

### Task 1: Strip Devvit scaffolding, rewrite project config

**Files:**
- Delete: `devvit.json`, `vite.config.ts`, `src/client/` (entire directory), `src/server/routes/api.ts`, `src/server/routes/forms.ts`, `src/server/routes/menu.ts`, `src/server/routes/triggers.ts`, `src/server/core/post.ts`, `src/server/index.ts`, `src/shared/api.ts`, `tools/tsconfig.base.json`, `tools/tsconfig.client.json`, `tools/tsconfig.server.json`, `tools/tsconfig.shared.json`, `tools/tsconfig.vite.json` (and the now-empty `tools/` directory), `public/snoo.png` (and the now-empty `public/` directory)
- Modify: `package.json`, `tsconfig.json`, `eslint.config.js`, `README.md`, `AGENTS.md`, `.github/dependabot.yml`
- Create: `src/cli.tsx`

**Interfaces:**
- Produces: a working `npm install` / `npm run type-check` / `npm run lint` baseline that every later task builds on. No runtime behavior yet beyond a placeholder log line.

- [ ] **Step 1: Delete the Devvit web-app files and directories**

```bash
git rm -r devvit.json vite.config.ts src/client src/server src/shared public tools
```

- [ ] **Step 2: Rewrite `package.json`**

```json
{
  "private": true,
  "name": "iudex-cli",
  "version": "0.0.0",
  "license": "BSD-3-Clause",
  "type": "module",
  "scripts": {
    "start": "tsx src/cli.tsx",
    "type-check": "tsc --noEmit",
    "lint": "eslint 'src/**/*.{ts,tsx}'",
    "login": "devvit login",
    "prettier": "prettier --write .",
    "test": "node --import tsx --test 'src/**/*.test.ts'"
  },
  "engines": {
    "node": ">=22.2.0"
  },
  "dependencies": {
    "devvit": "0.13.6",
    "ink": "7.1.0",
    "ink-text-input": "6.0.0",
    "react": "19.2.7"
  },
  "devDependencies": {
    "@eslint/js": "10.0.1",
    "@types/node": "^22.19.19",
    "@types/react": "19.2.17",
    "eslint": "10.5.0",
    "eslint-plugin-react-hooks": "7.1.1",
    "globals": "17.6.0",
    "prettier": "3.8.4",
    "tsx": "4.23.0",
    "typescript": "6.0.3",
    "typescript-eslint": "8.62.0"
  }
}
```

- [ ] **Step 3: Rewrite `tsconfig.json`** (drop the composite multi-project setup now that there's no separate client/server/shared realm)

```json
{
  "$schema": "https://json.schemastore.org/tsconfig.json",
  "compilerOptions": {
    "allowUnreachableCode": false,
    "allowUnusedLabels": false,
    "exactOptionalPropertyTypes": true,
    "forceConsistentCasingInFileNames": true,
    "noImplicitOverride": true,
    "noUncheckedIndexedAccess": true,
    "noUncheckedSideEffectImports": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "resolveJsonModule": true,
    "strict": true,
    "types": ["node"],
    "isolatedModules": true,
    "esModuleInterop": true,
    "module": "ESNext",
    "moduleResolution": "Bundler",
    "skipLibCheck": true,
    "sourceMap": true,
    "target": "ES2022",
    "lib": ["ES2023"],
    "jsx": "react-jsx",
    "noEmit": true
  },
  "include": ["src/**/*"]
}
```

- [ ] **Step 4: Rewrite `eslint.config.js`** (single flat config for `src/**/*.{ts,tsx}`, Node globals, no more client/server/shared split, drop `react-refresh` — it's a browser HMR concept, irrelevant to a CLI)

```js
import { defineConfig } from 'eslint/config';
import globals from 'globals';
import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import reactHooks from 'eslint-plugin-react-hooks';

export default defineConfig([
  {
    files: ['src/**/*.{ts,tsx}'],
    extends: [js.configs.recommended, ...tseslint.configs.recommended],
    languageOptions: {
      ecmaVersion: 2023,
      globals: globals.node,
      parserOptions: {
        project: ['./tsconfig.json'],
        tsconfigRootDir: import.meta.dirname,
      },
    },
    plugins: {
      'react-hooks': reactHooks,
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      '@typescript-eslint/no-floating-promises': 'error',
    },
    ignores: ['**/node_modules/**', '**/dist/**'],
  },
]);
```

- [ ] **Step 5: Rewrite `README.md`**

```md
# iudex-cli

A read-only, keyboard-driven terminal browser for Reddit.

## Setup

1. `npm install`
2. `npm run login` — opens a browser to authenticate via Reddit OAuth
   (through the Devvit CLI). The token is stored at `~/.devvit/token` and
   used directly by this app.
3. `npm start`

## Commands

- `npm start`: Launch the CLI
- `npm run login`: Re-authenticate when the token expires
- `npm run type-check`: Type-check the project
- `npm run lint`: Lint the project
- `npm test`: Run unit tests

## Controls

- ↑ / ↓ — move selection
- Enter — open / expand
- Backspace — go back
- Ctrl+C twice — quit
- `s` (in a feed) — cycle sort: hot → top → new → controversial
```

- [ ] **Step 6: Rewrite `AGENTS.md`**

```md
You are writing a terminal Reddit browser (Ink + React CLI app). Read-only — no voting, commenting, or posting, ever.

## Tech Stack

- **UI**: Ink (React for CLIs), React 19
- **Reddit API**: a thin custom fetch wrapper against oauth.reddit.com, authenticated via the token at `~/.devvit/token` (managed by `npm run login`, i.e. `devvit login`)
- **TypeScript**: strict mode, Node 22

## Layout

- `src/token.ts`: token loading + expiry check
- `src/reddit/`: API client, raw-value coercion helpers, normalized types, raw→normalized mappers
- `src/colors.ts`: username color hashing
- `src/comments/`: comment-tree flattening + tree-branch rendering (pure logic)
- `src/nav/`: navigation stack (push/pop) + global keybindings
- `src/hooks/`: shared list-navigation hook (↑/↓/Enter/auto-pagination)
- `src/components/`: shared Ink components (PostList, SubredditList, CommentTree, ImageTag)
- `src/screens/`: one file per screen
- `src/App.tsx`: root component, switches on the nav stack's top frame
- `src/cli.tsx`: entry point — checks the token, then renders `<App/>`

## Commands

- `npm start`: Launch the CLI
- `npm run type-check`: Type-check
- `npm run lint`: Lint
- `npm test`: Run all unit tests
- `node --import tsx --test src/path/to/file.test.ts`: Run a single test file

## Code Style

- Prefer type aliases over interfaces when writing typescript
- Prefer named exports over default exports
- Never cast typescript types (no `as`) — use type guards or variable
  type annotations against `unknown`/`any` instead
- Pure logic (token expiry, comment-tree flattening/rendering, color
  hashing, raw→normalized mappers, selection state) lives in plain `.ts`
  files with unit tests. Ink components stay thin and are verified
  manually by running the app.
```

- [ ] **Step 7: Simplify `.github/dependabot.yml`** (drop the `vite`/`tailwind` groups, those deps are gone)

```yaml
# Dependabot configuration to update npm packages weekly
version: 2
updates:
  - package-ecosystem: "npm"
    directory: "/" # Location of your package.json and package-lock.json
    schedule:
      interval: "cron"
      cronjob: "0 17 * * 1,2" # At 5pm on Monday and Tuesday - https://crontab.guru/
      timezone: "America/New_York"
    open-pull-requests-limit: 10 # Optional: prevents PR spam by limiting active updates
    ignore:
      - dependency-name: "@types/node"
        update-types: ["version-update:semver-major"]
    groups:
      devvit:
        patterns:
          - "devvit"
          - "@devvit/*"
      eslint:
        patterns:
          - "eslint"
          - "@eslint/*"
          - "typescript-eslint"
      react:
        patterns:
          - "react"
          - "@types/react"
```

- [ ] **Step 8: Create a placeholder entry point so type-check/lint have something to check**

```tsx
// src/cli.tsx
console.log('iudex-cli — under construction');
```

- [ ] **Step 9: Install dependencies and verify the baseline**

```bash
rm -rf node_modules package-lock.json
npm install
npm run type-check
npm run lint
```
Expected: all three commands exit 0. (If you're not already on Node ≥22.2 via `nvm`, switch first — `nvm use 22.14.0` or similar — matching the earlier fix for this repo's x64/arm64 native-binary mismatch.)

- [ ] **Step 10: Commit**

```bash
git add -A
git commit -m "Strip Devvit web-app scaffolding, rewrite project config for a plain TS CLI"
```

---

### Task 2: Token loading and expiry check

**Files:**
- Create: `src/token.ts`
- Test: `src/token.test.ts`

**Interfaces:**
- Produces: `DevvitToken` type (`{ accessToken, refreshToken, expiresAt, scope, tokenType }`), `TokenExpiredError` class, `parseToken(raw: string): DevvitToken`, `checkExpiry(token: DevvitToken, now: number): void` (throws `TokenExpiredError` if `token.expiresAt <= now`), `loadToken(now: number): DevvitToken` (reads `~/.devvit/token`, parses, checks expiry, returns). Every later task that talks to Reddit calls `loadToken`.

- [ ] **Step 1: Write the failing tests**

```ts
// src/token.test.ts
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
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `node --import tsx --test src/token.test.ts`
Expected: FAIL — `src/token.ts` does not exist yet, so the import throws a module-resolution error.

- [ ] **Step 3: Write the implementation**

```ts
// src/token.ts
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
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `node --import tsx --test src/token.test.ts`
Expected: PASS, 5 tests.

- [ ] **Step 5: Type-check and commit**

```bash
npm run type-check
git add src/token.ts src/token.test.ts
git commit -m "Add token loading and expiry check"
```

---

### Task 3: Raw-value coercion helpers

**Files:**
- Create: `src/reddit/parse.ts`
- Test: `src/reddit/parse.test.ts`

**Interfaces:**
- Produces: `isRecord(value: unknown): value is Record<string, unknown>`, `asRecord(value: unknown): Record<string, unknown>`, `asString(value: unknown, fallback?: string): string`, `asNumber(value: unknown, fallback?: number): number`, `asBoolean(value: unknown, fallback?: boolean): boolean`. Used by every mapper in Task 4 to read Reddit's raw JSON without `as` casts.

- [ ] **Step 1: Write the failing tests**

```ts
// src/reddit/parse.test.ts
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
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `node --import tsx --test src/reddit/parse.test.ts`
Expected: FAIL — `src/reddit/parse.ts` does not exist yet.

- [ ] **Step 3: Write the implementation**

```ts
// src/reddit/parse.ts
export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export function asRecord(value: unknown): Record<string, unknown> {
  return isRecord(value) ? value : {};
}

export function asString(value: unknown, fallback = ''): string {
  return typeof value === 'string' ? value : fallback;
}

export function asNumber(value: unknown, fallback = 0): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}

export function asBoolean(value: unknown, fallback = false): boolean {
  return typeof value === 'boolean' ? value : fallback;
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `node --import tsx --test src/reddit/parse.test.ts`
Expected: PASS, 5 tests.

- [ ] **Step 5: Type-check and commit**

```bash
npm run type-check
git add src/reddit/parse.ts src/reddit/parse.test.ts
git commit -m "Add raw-value coercion helpers for parsing Reddit API responses"
```

---

### Task 4: Normalized Reddit types and raw→normalized mappers

**Files:**
- Create: `src/reddit/types.ts`, `src/reddit/mappers.ts`
- Test: `src/reddit/mappers.test.ts`

**Interfaces:**
- Consumes: `asRecord`, `asString`, `asNumber`, `asBoolean` from `./parse` (Task 3).
- Produces: types `Listing<T>`, `RedditPost`, `RedditComment`, `MoreComments`, `RedditThing`, `RedditSubreddit`; functions `mapPost(raw: unknown): RedditPost`, `mapComment(raw: unknown): RedditThing`, `mapSubreddit(raw: unknown): RedditSubreddit`, `mapListing<T>(raw: unknown, mapItem: (item: unknown) => T): Listing<T>`. `src/reddit/client.ts` (Task 7), `src/comments/flatten.ts` (Task 6), and every screen consume these types/functions.

- [ ] **Step 1: Write `src/reddit/types.ts`**

```ts
// src/reddit/types.ts
export type Listing<T> = {
  after: string | null;
  children: T[];
};

export type RedditPost = {
  id: string;
  subreddit: string;
  title: string;
  author: string;
  score: number;
  numComments: number;
  createdUtc: number;
  selftext: string;
  url: string;
  hasImage: boolean;
};

export type RedditComment = {
  kind: 'comment';
  id: string;
  author: string;
  body: string;
  score: number;
  createdUtc: number;
  replies: RedditThing[];
};

export type MoreComments = {
  kind: 'more';
  id: string;
  childIds: string[];
  count: number;
};

export type RedditThing = RedditComment | MoreComments;

export type RedditSubreddit = {
  name: string;
  title: string;
  subscribers: number;
  publicDescription: string;
};
```

- [ ] **Step 2: Write the failing tests for the mappers**

```ts
// src/reddit/mappers.test.ts
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mapPost, mapComment, mapSubreddit, mapListing } from './mappers';

test('mapPost extracts fields and reports no image for a plain text post', () => {
  const post = mapPost({
    kind: 't3',
    data: {
      id: 'abc123',
      subreddit: 'berserk',
      title: 'A great discussion',
      author: 'alice',
      score: 42,
      num_comments: 7,
      created_utc: 1700000000,
      selftext: 'some text',
      url: 'https://reddit.com/r/berserk/abc123',
    },
  });
  assert.deepEqual(post, {
    id: 'abc123',
    subreddit: 'berserk',
    title: 'A great discussion',
    author: 'alice',
    score: 42,
    numComments: 7,
    createdUtc: 1700000000,
    selftext: 'some text',
    url: 'https://reddit.com/r/berserk/abc123',
    hasImage: false,
  });
});

test('mapPost detects an image post via post_hint', () => {
  const post = mapPost({ kind: 't3', data: { id: 'x', post_hint: 'image' } });
  assert.equal(post.hasImage, true);
});

test('mapPost detects a gallery post via is_gallery', () => {
  const post = mapPost({ kind: 't3', data: { id: 'x', is_gallery: true } });
  assert.equal(post.hasImage, true);
});

test('mapPost detects an image post via preview.images', () => {
  const post = mapPost({ kind: 't3', data: { id: 'x', preview: { images: [{ id: '1' }] } } });
  assert.equal(post.hasImage, true);
});

test('mapComment maps a plain comment with no replies', () => {
  const thing = mapComment({
    kind: 't1',
    data: { id: 'c1', author: 'bob', body: 'nice post', score: 5, created_utc: 1700000001, replies: '' },
  });
  assert.deepEqual(thing, {
    kind: 'comment',
    id: 'c1',
    author: 'bob',
    body: 'nice post',
    score: 5,
    createdUtc: 1700000001,
    replies: [],
  });
});

test('mapComment maps nested replies recursively', () => {
  const thing = mapComment({
    kind: 't1',
    data: {
      id: 'c1',
      author: 'bob',
      body: 'top',
      score: 5,
      created_utc: 1,
      replies: {
        kind: 'Listing',
        data: {
          children: [
            { kind: 't1', data: { id: 'c2', author: 'carol', body: 'reply', score: 1, created_utc: 2, replies: '' } },
          ],
        },
      },
    },
  });
  if (thing.kind !== 'comment') throw new Error('expected a comment');
  assert.equal(thing.replies.length, 1);
  assert.equal(thing.replies[0]?.id, 'c2');
});

test('mapComment redacts an inline embedded image with a placeholder', () => {
  const thing = mapComment({
    kind: 't1',
    data: {
      id: 'c1',
      author: 'bob',
      body: 'look at this ![img](abc123) cool right',
      score: 1,
      created_utc: 1,
      replies: '',
    },
  });
  if (thing.kind !== 'comment') throw new Error('expected a comment');
  assert.equal(thing.body, 'look at this [has_image 🖼️] cool right');
});

test('mapComment maps a "more" stub', () => {
  const thing = mapComment({
    kind: 'more',
    data: { id: 'm1', children: ['c3', 'c4'], count: 2 },
  });
  assert.deepEqual(thing, { kind: 'more', id: 'm1', childIds: ['c3', 'c4'], count: 2 });
});

test('mapSubreddit extracts fields', () => {
  const subreddit = mapSubreddit({
    kind: 't5',
    data: { display_name: 'berserk', title: 'Berserk', subscribers: 100000, public_description: 'The manga' },
  });
  assert.deepEqual(subreddit, {
    name: 'berserk',
    title: 'Berserk',
    subscribers: 100000,
    publicDescription: 'The manga',
  });
});

test('mapListing maps children with the given item mapper and carries the after cursor', () => {
  const listing = mapListing(
    {
      kind: 'Listing',
      data: { after: 't3_next', children: [{ kind: 't5', data: { display_name: 'a' } }] },
    },
    mapSubreddit
  );
  assert.equal(listing.after, 't3_next');
  assert.equal(listing.children.length, 1);
  assert.equal(listing.children[0]?.name, 'a');
});

test('mapListing defaults after to null and children to [] when absent', () => {
  const listing = mapListing({ kind: 'Listing', data: {} }, mapSubreddit);
  assert.equal(listing.after, null);
  assert.deepEqual(listing.children, []);
});
```

- [ ] **Step 3: Run tests to verify they fail**

Run: `node --import tsx --test src/reddit/mappers.test.ts`
Expected: FAIL — `src/reddit/mappers.ts` does not exist yet.

- [ ] **Step 4: Write `src/reddit/mappers.ts`**

```ts
// src/reddit/mappers.ts
import { asRecord, asString, asNumber, asBoolean } from './parse';
import type { Listing, RedditPost, RedditComment, MoreComments, RedditThing, RedditSubreddit } from './types';

const INLINE_IMAGE_PATTERN = /!\[[^\]]*\]\([a-zA-Z0-9_-]+\)/g;

export function mapPost(raw: unknown): RedditPost {
  const data = asRecord(asRecord(raw).data);
  return {
    id: asString(data.id),
    subreddit: asString(data.subreddit),
    title: asString(data.title),
    author: asString(data.author),
    score: asNumber(data.score),
    numComments: asNumber(data.num_comments),
    createdUtc: asNumber(data.created_utc),
    selftext: asString(data.selftext),
    url: asString(data.url),
    hasImage: postHasImage(data),
  };
}

function postHasImage(data: Record<string, unknown>): boolean {
  if (asString(data.post_hint) === 'image') return true;
  if (asBoolean(data.is_gallery)) return true;
  return Array.isArray(asRecord(data.preview).images);
}

export function mapComment(raw: unknown): RedditThing {
  const record = asRecord(raw);
  if (asString(record.kind) === 'more') {
    return mapMoreComments(record);
  }
  const data = asRecord(record.data);
  return {
    kind: 'comment',
    id: asString(data.id),
    author: asString(data.author),
    body: redactInlineImages(asString(data.body)),
    score: asNumber(data.score),
    createdUtc: asNumber(data.created_utc),
    replies: mapReplies(data.replies),
  };
}

function mapMoreComments(record: Record<string, unknown>): MoreComments {
  const data = asRecord(record.data);
  const children = data.children;
  return {
    kind: 'more',
    id: asString(data.id),
    childIds: Array.isArray(children) ? children.filter((child): child is string => typeof child === 'string') : [],
    count: asNumber(data.count),
  };
}

function mapReplies(replies: unknown): RedditThing[] {
  const children = asRecord(asRecord(replies).data).children;
  return Array.isArray(children) ? children.map(mapComment) : [];
}

function redactInlineImages(body: string): string {
  return body.replace(INLINE_IMAGE_PATTERN, '[has_image 🖼️]');
}

export function mapSubreddit(raw: unknown): RedditSubreddit {
  const data = asRecord(asRecord(raw).data);
  return {
    name: asString(data.display_name),
    title: asString(data.title),
    subscribers: asNumber(data.subscribers),
    publicDescription: asString(data.public_description),
  };
}

export function mapListing<T>(raw: unknown, mapItem: (item: unknown) => T): Listing<T> {
  const data = asRecord(asRecord(raw).data);
  const children = data.children;
  return {
    after: typeof data.after === 'string' ? data.after : null,
    children: Array.isArray(children) ? children.map(mapItem) : [],
  };
}
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `node --import tsx --test src/reddit/mappers.test.ts`
Expected: PASS, 11 tests.

- [ ] **Step 6: Type-check and commit**

```bash
npm run type-check
git add src/reddit/types.ts src/reddit/mappers.ts src/reddit/mappers.test.ts
git commit -m "Add normalized Reddit types and raw-to-normalized mappers"
```

---

### Task 5: Username color hashing

**Files:**
- Create: `src/colors.ts`
- Test: `src/colors.test.ts`

**Interfaces:**
- Produces: `PALETTE` (readonly array of Ink color-name strings, excludes `'green'`/`'greenBright'`), `PaletteColor` (union of `PALETTE`'s members), `usernameColor(username: string): PaletteColor`. Consumed by `src/components/CommentTree.tsx` (Task 14) wherever a username needs a color.

- [ ] **Step 1: Write the failing tests**

```ts
// src/colors.test.ts
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { usernameColor, PALETTE } from './colors';

test('the palette never contains green or greenBright', () => {
  assert.equal(PALETTE.includes('green'), false);
  assert.equal(PALETTE.includes('greenBright'), false);
});

test('usernameColor is deterministic for the same username', () => {
  assert.equal(usernameColor('alice'), usernameColor('alice'));
  assert.equal(usernameColor('bob'), usernameColor('bob'));
});

test('usernameColor always returns a color from the palette', () => {
  for (const name of ['alice', 'bob', 'carol', 'dave', 'erin', '']) {
    assert.equal(PALETTE.includes(usernameColor(name)), true);
  }
});

test('usernameColor gives different usernames a chance to differ', () => {
  const colors = new Set(['alice', 'bob', 'carol', 'dave', 'erin'].map(usernameColor));
  assert.ok(colors.size > 1, 'expected at least two distinct colors among 5 usernames');
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `node --import tsx --test src/colors.test.ts`
Expected: FAIL — `src/colors.ts` does not exist yet.

- [ ] **Step 3: Write the implementation**

```ts
// src/colors.ts
export const PALETTE = [
  'red',
  'yellow',
  'blue',
  'magenta',
  'cyan',
  'white',
  'redBright',
  'yellowBright',
  'blueBright',
  'magentaBright',
  'cyanBright',
] as const;

export type PaletteColor = (typeof PALETTE)[number];

export function usernameColor(username: string): PaletteColor {
  const index = hashString(username) % PALETTE.length;
  const color = PALETTE[index];
  if (color === undefined) throw new Error('unreachable: hash modulo is always within palette bounds');
  return color;
}

function hashString(value: string): number {
  let hash = 0;
  for (let i = 0; i < value.length; i++) {
    hash = (hash * 31 + value.charCodeAt(i)) >>> 0;
  }
  return hash;
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `node --import tsx --test src/colors.test.ts`
Expected: PASS, 4 tests.

- [ ] **Step 5: Type-check and commit**

```bash
npm run type-check
git add src/colors.ts src/colors.test.ts
git commit -m "Add deterministic username color hashing"
```

---

### Task 6: Comment tree flattening and tree-branch rendering

**Files:**
- Create: `src/comments/flatten.ts`, `src/comments/render.ts`
- Test: `src/comments/flatten.test.ts`, `src/comments/render.test.ts`

**Interfaces:**
- Consumes: `RedditThing` from `../reddit/types` (Task 4).
- Produces: `CommentRow` type, `CommentRowContent` type (`'comment' | 'collapsedReplies' | 'more'`), `flattenVisibleComments(thread: RedditThing[], expandedIds: ReadonlySet<string>): CommentRow[]`, `branchPrefix(row): string`, `continuationPrefix(row, continuesBelow): string`. Consumed by `src/components/CommentTree.tsx` (Task 14).

- [ ] **Step 1: Write the failing tests for `flatten.ts`**

```ts
// src/comments/flatten.test.ts
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { flattenVisibleComments } from './flatten';
import type { RedditThing } from '../reddit/types';

// Reproduces the exact fixture from the design spec: alice (collapsed, 3
// replies), bob (expanded) -> carol (collapsed, 1 reply) + dave, erin (no replies).
function fixture(): RedditThing[] {
  return [
    {
      kind: 'comment',
      id: 'alice',
      author: 'alice',
      body: 'This show really peaked at episode 200, no argument.',
      score: 128,
      createdUtc: 0,
      replies: [
        { kind: 'comment', id: 'a1', author: 'x', body: '1', score: 0, createdUtc: 0, replies: [] },
        { kind: 'comment', id: 'a2', author: 'x', body: '2', score: 0, createdUtc: 0, replies: [] },
        { kind: 'comment', id: 'a3', author: 'x', body: '3', score: 0, createdUtc: 0, replies: [] },
      ],
    },
    {
      kind: 'comment',
      id: 'bob',
      author: 'bob',
      body: 'Wait until you see what happens after the eclipse arc',
      score: 54,
      createdUtc: 0,
      replies: [
        {
          kind: 'comment',
          id: 'carol',
          author: 'carol',
          body: 'Right?? I was not ready',
          score: 12,
          createdUtc: 0,
          replies: [{ kind: 'comment', id: 'c1', author: 'x', body: '1', score: 0, createdUtc: 0, replies: [] }],
        },
        {
          kind: 'comment',
          id: 'dave',
          author: 'dave',
          body: 'same here honestly',
          score: 3,
          createdUtc: 0,
          replies: [],
        },
      ],
    },
    {
      kind: 'comment',
      id: 'erin',
      author: 'erin',
      body: 'Golden Age movies did it justice at least',
      score: 7,
      createdUtc: 0,
      replies: [],
    },
  ];
}

test('top-level comments are always visible even with nothing expanded', () => {
  const rows = flattenVisibleComments(fixture(), new Set());
  const topLevelIds = rows.filter((row) => row.depth === 0).map((row) => row.id);
  assert.deepEqual(topLevelIds, ['alice', 'bob', 'erin']);
});

test('an unexpanded comment with replies gets a collapsedReplies child row', () => {
  const rows = flattenVisibleComments(fixture(), new Set());
  const alice = rows.find((row) => row.id === 'alice');
  const aliceCollapsed = rows.find((row) => row.id === 'collapsed:alice');
  assert.ok(alice);
  assert.ok(aliceCollapsed);
  assert.equal(aliceCollapsed?.depth, 1);
  assert.deepEqual(aliceCollapsed?.content, { type: 'collapsedReplies', replyCount: 3 });
});

test('expanding a comment reveals its replies, still collapsed themselves', () => {
  const rows = flattenVisibleComments(fixture(), new Set(['bob']));
  const ids = rows.map((row) => row.id);
  assert.deepEqual(ids, ['alice', 'collapsed:alice', 'bob', 'carol', 'collapsed:carol', 'dave', 'erin']);
});

test('expanding a nested reply reveals its own replies too', () => {
  const rows = flattenVisibleComments(fixture(), new Set(['bob', 'carol']));
  const ids = rows.map((row) => row.id);
  assert.deepEqual(ids, ['alice', 'collapsed:alice', 'bob', 'carol', 'c1', 'dave', 'erin']);
});

test('erin has no replies, so no collapsed row and continuesBelow is false', () => {
  const rows = flattenVisibleComments(fixture(), new Set());
  const erin = rows.find((row) => row.id === 'erin');
  assert.equal(erin?.content.type, 'comment');
  if (erin?.content.type === 'comment') {
    assert.equal(erin.content.continuesBelow, false);
  }
});

test('ancestorContinues reflects sibling position at each depth (bob/carol/dave case)', () => {
  const rows = flattenVisibleComments(fixture(), new Set(['bob']));
  const bob = rows.find((row) => row.id === 'bob');
  const carol = rows.find((row) => row.id === 'carol');
  const dave = rows.find((row) => row.id === 'dave');
  // bob is not the last top-level sibling (erin follows) -> depth-0 column continues
  assert.equal(bob?.isLastSibling, false);
  assert.deepEqual(bob?.ancestorContinues, []);
  // carol is not the last of bob's replies (dave follows) -> depth-1 continues too
  assert.equal(carol?.isLastSibling, false);
  assert.deepEqual(carol?.ancestorContinues, [true]);
  // dave IS the last of bob's replies
  assert.equal(dave?.isLastSibling, true);
  assert.deepEqual(dave?.ancestorContinues, [true]);
});

test('a "more" stub renders as its own navigable row', () => {
  const withMore: RedditThing[] = [
    {
      kind: 'comment',
      id: 'p1',
      author: 'x',
      body: 'parent',
      score: 0,
      createdUtc: 0,
      replies: [{ kind: 'more', id: 'm1', childIds: ['a', 'b'], count: 2 }],
    },
  ];
  const rows = flattenVisibleComments(withMore, new Set(['p1']));
  const more = rows.find((row) => row.id === 'more:m1');
  assert.deepEqual(more?.content, { type: 'more', count: 2, childIds: ['a', 'b'] });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `node --import tsx --test src/comments/flatten.test.ts`
Expected: FAIL — `src/comments/flatten.ts` does not exist yet.

- [ ] **Step 3: Write `src/comments/flatten.ts`**

```ts
// src/comments/flatten.ts
import type { RedditThing } from '../reddit/types';

export type CommentRowContent =
  | { type: 'comment'; author: string; body: string; score: number; continuesBelow: boolean }
  | { type: 'collapsedReplies'; replyCount: number }
  | { type: 'more'; count: number; childIds: string[] };

export type CommentRow = {
  id: string;
  depth: number;
  isLastSibling: boolean;
  ancestorContinues: boolean[];
  content: CommentRowContent;
};

export function flattenVisibleComments(thread: RedditThing[], expandedIds: ReadonlySet<string>): CommentRow[] {
  const rows: CommentRow[] = [];
  walk(thread, 0, [], expandedIds, rows);
  return rows;
}

function walk(
  things: RedditThing[],
  depth: number,
  ancestorContinues: boolean[],
  expandedIds: ReadonlySet<string>,
  rows: CommentRow[]
): void {
  things.forEach((thing, index) => {
    const isLastSibling = index === things.length - 1;

    if (thing.kind === 'more') {
      rows.push({
        id: `more:${thing.id}`,
        depth,
        isLastSibling,
        ancestorContinues,
        content: { type: 'more', count: thing.count, childIds: thing.childIds },
      });
      return;
    }

    rows.push({
      id: thing.id,
      depth,
      isLastSibling,
      ancestorContinues,
      content: {
        type: 'comment',
        author: thing.author,
        body: thing.body,
        score: thing.score,
        continuesBelow: thing.replies.length > 0,
      },
    });

    if (thing.replies.length === 0) return;

    const childAncestors = [...ancestorContinues, !isLastSibling];
    if (expandedIds.has(thing.id)) {
      walk(thing.replies, depth + 1, childAncestors, expandedIds, rows);
    } else {
      rows.push({
        id: `collapsed:${thing.id}`,
        depth: depth + 1,
        isLastSibling: true,
        ancestorContinues: childAncestors,
        content: { type: 'collapsedReplies', replyCount: countLoadedReplies(thing.replies) },
      });
    }
  });
}

function countLoadedReplies(replies: RedditThing[]): number {
  return replies.reduce((total, reply) => (reply.kind === 'more' ? total + reply.count : total + 1), 0);
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `node --import tsx --test src/comments/flatten.test.ts`
Expected: PASS, 7 tests.

- [ ] **Step 5: Write the failing tests for `render.ts`** (reproduces the exact ASCII mockup from the design spec)

```ts
// src/comments/render.test.ts
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { branchPrefix, continuationPrefix } from './render';
import { flattenVisibleComments } from './flatten';
import type { RedditThing } from '../reddit/types';

function fixture(): RedditThing[] {
  return [
    {
      kind: 'comment',
      id: 'alice',
      author: 'alice',
      body: 'This show really peaked at episode 200, no argument.',
      score: 128,
      createdUtc: 0,
      replies: [
        { kind: 'comment', id: 'a1', author: 'x', body: '1', score: 0, createdUtc: 0, replies: [] },
        { kind: 'comment', id: 'a2', author: 'x', body: '2', score: 0, createdUtc: 0, replies: [] },
        { kind: 'comment', id: 'a3', author: 'x', body: '3', score: 0, createdUtc: 0, replies: [] },
      ],
    },
    {
      kind: 'comment',
      id: 'bob',
      author: 'bob',
      body: 'Wait until you see what happens after the eclipse arc',
      score: 54,
      createdUtc: 0,
      replies: [
        {
          kind: 'comment',
          id: 'carol',
          author: 'carol',
          body: 'Right?? I was not ready',
          score: 12,
          createdUtc: 0,
          replies: [{ kind: 'comment', id: 'c1', author: 'x', body: '1', score: 0, createdUtc: 0, replies: [] }],
        },
        {
          kind: 'comment',
          id: 'dave',
          author: 'dave',
          body: 'same here honestly',
          score: 3,
          createdUtc: 0,
          replies: [],
        },
      ],
    },
    {
      kind: 'comment',
      id: 'erin',
      author: 'erin',
      body: 'Golden Age movies did it justice at least',
      score: 7,
      createdUtc: 0,
      replies: [],
    },
  ];
}

test('branchPrefix matches the mockup for alice, bob, carol, dave, erin', () => {
  const rows = flattenVisibleComments(fixture(), new Set(['bob']));
  const byId = new Map(rows.map((row) => [row.id, row]));

  const alice = byId.get('alice');
  const aliceCollapsed = byId.get('collapsed:alice');
  const bob = byId.get('bob');
  const carol = byId.get('carol');
  const carolCollapsed = byId.get('collapsed:carol');
  const dave = byId.get('dave');
  const erin = byId.get('erin');
  assert.ok(alice && aliceCollapsed && bob && carol && carolCollapsed && dave && erin);

  assert.equal(branchPrefix(alice), '├─ ');
  assert.equal(branchPrefix(aliceCollapsed), '└─ ');
  assert.equal(branchPrefix(bob), '├─ ');
  assert.equal(branchPrefix(carol), '│  ├─ ');
  assert.equal(branchPrefix(carolCollapsed), '│  │  └─ ');
  assert.equal(branchPrefix(dave), '│  └─ ');
  assert.equal(branchPrefix(erin), '└─ ');
});

test('continuationPrefix matches the mockup body-line indentation', () => {
  const rows = flattenVisibleComments(fixture(), new Set(['bob']));
  const byId = new Map(rows.map((row) => [row.id, row]));

  const alice = byId.get('alice');
  const bob = byId.get('bob');
  const carol = byId.get('carol');
  const dave = byId.get('dave');
  assert.ok(alice?.content.type === 'comment' && bob?.content.type === 'comment');
  assert.ok(carol?.content.type === 'comment' && dave?.content.type === 'comment');

  assert.equal(continuationPrefix(alice, alice.content.continuesBelow), '│  ');
  assert.equal(continuationPrefix(bob, bob.content.continuesBelow), '│  ');
  assert.equal(continuationPrefix(carol, carol.content.continuesBelow), '│  │  ');
  assert.equal(continuationPrefix(dave, dave.content.continuesBelow), '│     ');
});
```

- [ ] **Step 6: Run tests to verify they fail**

Run: `node --import tsx --test src/comments/render.test.ts`
Expected: FAIL — `src/comments/render.ts` does not exist yet.

- [ ] **Step 7: Write `src/comments/render.ts`**

```ts
// src/comments/render.ts
import type { CommentRow } from './flatten';

export function branchPrefix(row: Pick<CommentRow, 'isLastSibling' | 'ancestorContinues'>): string {
  return ancestorColumns(row.ancestorContinues) + (row.isLastSibling ? '└─ ' : '├─ ');
}

export function continuationPrefix(row: Pick<CommentRow, 'ancestorContinues'>, continuesBelow: boolean): string {
  return ancestorColumns(row.ancestorContinues) + (continuesBelow ? '│  ' : '   ');
}

function ancestorColumns(ancestorContinues: readonly boolean[]): string {
  return ancestorContinues.map((continues) => (continues ? '│  ' : '   ')).join('');
}
```

- [ ] **Step 8: Run tests to verify they pass**

Run: `node --import tsx --test src/comments/render.test.ts`
Expected: PASS, 2 tests.

- [ ] **Step 9: Type-check and commit**

```bash
npm run type-check
git add src/comments/flatten.ts src/comments/flatten.test.ts src/comments/render.ts src/comments/render.test.ts
git commit -m "Add comment-tree flattening and tree-branch rendering"
```

---

### Task 7: Reddit API client

**Files:**
- Create: `src/reddit/client.ts`
- Test: `src/reddit/client.test.ts`

**Interfaces:**
- Consumes: `loadToken` from `../token` (Task 2); `mapListing`, `mapPost`, `mapComment`, `mapSubreddit` from `./mappers` (Task 4); `asRecord` from `./parse` (Task 3); `Listing`, `RedditPost`, `RedditThing`, `RedditSubreddit` from `./types` (Task 4).
- Produces: `FeedSort` type (`'hot' | 'top' | 'new' | 'controversial'`), `sortParams(sort): Record<string,string>`, `buildUrl(path, params): string` (both pure, tested), and the network-touching endpoint functions: `getHomeFeed`, `getSubredditFeed`, `searchSubreddits`, `getJoinedSubreddits`, `searchPosts`, `getThread`, `loadMoreChildren` — consumed by every screen (Tasks 11–16).

- [ ] **Step 1: Write the failing tests for the pure helpers**

```ts
// src/reddit/client.test.ts
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { sortParams, buildUrl } from './client';

test('sortParams adds t=day for top and controversial, nothing for hot/new', () => {
  assert.deepEqual(sortParams('top'), { t: 'day' });
  assert.deepEqual(sortParams('controversial'), { t: 'day' });
  assert.deepEqual(sortParams('hot'), {});
  assert.deepEqual(sortParams('new'), {});
});

test('buildUrl appends query params onto the base URL', () => {
  const url = buildUrl('/r/berserk/hot', { limit: '25' });
  assert.equal(url, 'https://oauth.reddit.com/r/berserk/hot?limit=25');
});

test('buildUrl omits the query string entirely when there are no params', () => {
  const url = buildUrl('/subreddits/mine/subscriber', {});
  assert.equal(url, 'https://oauth.reddit.com/subreddits/mine/subscriber');
});

test('buildUrl handles multiple params in insertion order', () => {
  const url = buildUrl('/search', { q: 'berserk', sort: 'relevance' });
  assert.equal(url, 'https://oauth.reddit.com/search?q=berserk&sort=relevance');
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `node --import tsx --test src/reddit/client.test.ts`
Expected: FAIL — `src/reddit/client.ts` does not exist yet.

- [ ] **Step 3: Write the implementation**

```ts
// src/reddit/client.ts
import { loadToken } from '../token';
import { asRecord } from './parse';
import { mapListing, mapPost, mapComment, mapSubreddit } from './mappers';
import type { Listing, RedditPost, RedditThing, RedditSubreddit } from './types';

const BASE_URL = 'https://oauth.reddit.com';
const USER_AGENT = 'iudex-cli/0.1 (terminal Reddit browser)';

export type FeedSort = 'hot' | 'top' | 'new' | 'controversial';

export function sortParams(sort: FeedSort): Record<string, string> {
  return sort === 'top' || sort === 'controversial' ? { t: 'day' } : {};
}

export function buildUrl(path: string, params: Record<string, string>): string {
  const entries = Object.entries(params);
  if (entries.length === 0) return BASE_URL + path;
  const query = entries.map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(value)}`).join('&');
  return `${BASE_URL}${path}?${query}`;
}

async function redditGet(path: string, params: Record<string, string>): Promise<unknown> {
  const token = loadToken(Date.now());
  const response = await fetch(buildUrl(path, params), {
    headers: {
      Authorization: `bearer ${token.accessToken}`,
      'User-Agent': USER_AGENT,
    },
  });
  if (!response.ok) {
    throw new Error(`Reddit API error: ${response.status} ${response.statusText}`);
  }
  return response.json();
}

function afterParam(after: string | null): Record<string, string> {
  return after === null ? {} : { after };
}

export async function getHomeFeed(sort: FeedSort, after: string | null): Promise<Listing<RedditPost>> {
  const raw = await redditGet(`/${sort}`, { ...sortParams(sort), ...afterParam(after) });
  return mapListing(raw, mapPost);
}

export async function getSubredditFeed(
  subreddit: string,
  sort: FeedSort,
  after: string | null
): Promise<Listing<RedditPost>> {
  const raw = await redditGet(`/r/${subreddit}/${sort}`, { ...sortParams(sort), ...afterParam(after) });
  return mapListing(raw, mapPost);
}

export async function searchSubreddits(query: string, after: string | null): Promise<Listing<RedditSubreddit>> {
  const raw = await redditGet('/subreddits/search', { q: query, ...afterParam(after) });
  return mapListing(raw, mapSubreddit);
}

export async function getJoinedSubreddits(after: string | null): Promise<Listing<RedditSubreddit>> {
  const raw = await redditGet('/subreddits/mine/subscriber', { ...afterParam(after) });
  return mapListing(raw, mapSubreddit);
}

export async function searchPosts(query: string, after: string | null): Promise<Listing<RedditPost>> {
  const raw = await redditGet('/search', { q: query, sort: 'relevance', ...afterParam(after) });
  return mapListing(raw, mapPost);
}

export async function getThread(subreddit: string, postId: string): Promise<{ post: RedditPost; comments: RedditThing[] }> {
  const raw = await redditGet(`/r/${subreddit}/comments/${postId}`, {});
  if (!Array.isArray(raw) || raw.length < 2) {
    throw new Error('Unexpected thread response shape');
  }
  const postListing = mapListing(raw[0], mapPost);
  const commentListing = mapListing(raw[1], mapComment);
  const post = postListing.children[0];
  if (post === undefined) {
    throw new Error('Thread response contained no post');
  }
  return { post, comments: commentListing.children };
}

export async function loadMoreChildren(linkId: string, childIds: string[]): Promise<RedditThing[]> {
  const raw = await redditGet('/api/morechildren', {
    link_id: linkId,
    children: childIds.join(','),
    api_type: 'json',
  });
  const things = asRecord(asRecord(asRecord(raw).json).data).things;
  return Array.isArray(things) ? things.map(mapComment) : [];
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `node --import tsx --test src/reddit/client.test.ts`
Expected: PASS, 4 tests.

> **Note:** `redditGet` and the endpoint functions above call `loadToken`/`fetch` for real and are not unit tested — they're exercised end-to-end (against your real Reddit account) once the screens that call them exist, starting with Task 11. This matches the design spec's testing philosophy: pure logic gets automated tests, I/O gets exercised by actually running the app.

- [ ] **Step 5: Type-check and commit**

```bash
npm run type-check
git add src/reddit/client.ts src/reddit/client.test.ts
git commit -m "Add Reddit API client"
```

---

### Task 8: Navigation stack and list-selection hook

**Files:**
- Create: `src/nav/stackReducer.ts`, `src/nav/stack.tsx`, `src/hooks/selectionReducer.ts`, `src/hooks/useListNav.ts`
- Test: `src/nav/stackReducer.test.ts`, `src/hooks/selectionReducer.test.ts`

**Interfaces:**
- Produces: `stackReducer<F>(stack: F[], action: StackAction<F>): F[]` (generic, tested); `Frame` type (the full 6-screen union: `MainMenu`, `Feed`, `SubredditSearch`, `JoinedSubreddits`, `GlobalSearch`, `Thread`); `NavProvider`, `useNav(): { frame: Frame; push: (frame: Frame) => void; pop: () => void }`; `selectionReducer(state, action): SelectionState` (tested); `useListNav<T>({ items, onActivate, onReachEnd? }): { selectedIndex: number }`. Consumed by `App.tsx` (Task 9) and every screen (Tasks 9, 11–16).
- Not independently runnable yet — no screens exist to mount `NavProvider`/`useListNav` against. Verified via unit tests + `npm run type-check`; wired into a running app starting Task 9.

- [ ] **Step 1: Write the failing tests for `stackReducer`**

```ts
// src/nav/stackReducer.test.ts
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
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `node --import tsx --test src/nav/stackReducer.test.ts`
Expected: FAIL — `src/nav/stackReducer.ts` does not exist yet.

- [ ] **Step 3: Write `src/nav/stackReducer.ts`**

```ts
// src/nav/stackReducer.ts
export type StackAction<F> = { type: 'push'; frame: F } | { type: 'pop' };

export function stackReducer<F>(stack: F[], action: StackAction<F>): F[] {
  if (action.type === 'push') return [...stack, action.frame];
  if (stack.length <= 1) return stack;
  return stack.slice(0, -1);
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `node --import tsx --test src/nav/stackReducer.test.ts`
Expected: PASS, 3 tests.

- [ ] **Step 5: Write the failing tests for `selectionReducer`**

```ts
// src/hooks/selectionReducer.test.ts
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
```

- [ ] **Step 6: Run tests to verify they fail**

Run: `node --import tsx --test src/hooks/selectionReducer.test.ts`
Expected: FAIL — `src/hooks/selectionReducer.ts` does not exist yet.

- [ ] **Step 7: Write `src/hooks/selectionReducer.ts`**

```ts
// src/hooks/selectionReducer.ts
export type SelectionState = {
  index: number;
};

export type SelectionAction = { type: 'up' } | { type: 'down'; itemCount: number };

export function selectionReducer(state: SelectionState, action: SelectionAction): SelectionState {
  if (action.type === 'up') {
    return { index: Math.max(0, state.index - 1) };
  }
  if (action.itemCount === 0) {
    return { index: 0 };
  }
  return { index: Math.min(action.itemCount - 1, state.index + 1) };
}
```

- [ ] **Step 8: Run tests to verify they pass**

Run: `node --import tsx --test src/hooks/selectionReducer.test.ts`
Expected: PASS, 5 tests.

- [ ] **Step 9: Write `src/hooks/useListNav.ts`**

```ts
// src/hooks/useListNav.ts
import { useReducer, useEffect } from 'react';
import { useInput } from 'ink';
import { selectionReducer } from './selectionReducer';

export type UseListNavOptions<T> = {
  items: T[];
  onActivate: (item: T, index: number) => void;
  onReachEnd?: () => void;
};

export type UseListNavResult = {
  selectedIndex: number;
};

export function useListNav<T>({ items, onActivate, onReachEnd }: UseListNavOptions<T>): UseListNavResult {
  const [state, dispatch] = useReducer(selectionReducer, { index: 0 });

  useInput((_input, key) => {
    if (key.upArrow) {
      dispatch({ type: 'up' });
    } else if (key.downArrow) {
      dispatch({ type: 'down', itemCount: items.length });
    } else if (key.return) {
      const item = items[state.index];
      if (item !== undefined) onActivate(item, state.index);
    }
  });

  useEffect(() => {
    if (onReachEnd !== undefined && items.length > 0 && state.index >= items.length - 1) {
      onReachEnd();
    }
  }, [state.index, items.length, onReachEnd]);

  return { selectedIndex: state.index };
}
```

- [ ] **Step 10: Write `src/nav/stack.tsx`** (the full 6-screen `Frame` union is defined here upfront — the design spec already enumerates all six screens, so this isn't premature)

```tsx
// src/nav/stack.tsx
import React, { createContext, useContext, useReducer, useRef } from 'react';
import { useInput, useApp } from 'ink';
import { stackReducer } from './stackReducer';
import type { StackAction } from './stackReducer';

export type Frame =
  | { screen: 'MainMenu' }
  | { screen: 'Feed'; subreddit: string | null }
  | { screen: 'SubredditSearch' }
  | { screen: 'JoinedSubreddits' }
  | { screen: 'GlobalSearch' }
  | { screen: 'Thread'; subreddit: string; postId: string };

export type NavContextValue = {
  frame: Frame;
  push: (frame: Frame) => void;
  pop: () => void;
};

const NavContext = createContext<NavContextValue | null>(null);

const ROOT_FRAME: Frame = { screen: 'MainMenu' };

export function NavProvider({ children }: { children: React.ReactNode }): React.ReactElement {
  const [stack, dispatch] = useReducer(
    (state: Frame[], action: StackAction<Frame>) => stackReducer(state, action),
    [ROOT_FRAME]
  );
  const { exit } = useApp();
  const lastCtrlCAt = useRef(0);

  useInput((input, key) => {
    if (key.ctrl && input === 'c') {
      const now = Date.now();
      if (now - lastCtrlCAt.current < 1000) {
        exit();
      } else {
        lastCtrlCAt.current = now;
      }
      return;
    }
    if (key.backspace || key.delete) {
      dispatch({ type: 'pop' });
    }
  });

  const currentFrame = stack[stack.length - 1];
  if (currentFrame === undefined) throw new Error('unreachable: stack is never empty');

  const value: NavContextValue = {
    frame: currentFrame,
    push: (frame) => dispatch({ type: 'push', frame }),
    pop: () => dispatch({ type: 'pop' }),
  };

  return <NavContext.Provider value={value}>{children}</NavContext.Provider>;
}

export function useNav(): NavContextValue {
  const context = useContext(NavContext);
  if (context === null) throw new Error('useNav must be used within NavProvider');
  return context;
}
```

- [ ] **Step 11: Type-check and commit**

```bash
npm run type-check
git add src/nav/stackReducer.ts src/nav/stackReducer.test.ts src/nav/stack.tsx src/hooks/selectionReducer.ts src/hooks/selectionReducer.test.ts src/hooks/useListNav.ts
git commit -m "Add navigation stack and shared list-selection hook"
```

---

### Task 9: App root, MainMenu screen, and CLI entry point

**Files:**
- Create: `src/App.tsx`, `src/screens/MainMenu.tsx`
- Modify: `src/cli.tsx`

**Interfaces:**
- Consumes: `NavProvider`, `useNav`, `Frame` from `../nav/stack` (Task 8); `useListNav` from `../hooks/useListNav` (Task 8); `loadToken` from `./token` (Task 2).
- Produces: `App` (root component), `MainMenu` (screen). `App`'s switch has a temporary `default` branch rendering "Coming soon" for the 5 screens not yet built (`Feed`, `SubredditSearch`, `JoinedSubreddits`, `GlobalSearch`, `Thread`) — each later screen task (11–13, 15, 16) replaces its case; the final screen task (16) removes the `default` and makes the switch exhaustive.

This is the first task with a real interactive manual-verification checkpoint.

- [ ] **Step 1: Write `src/screens/MainMenu.tsx`**

```tsx
// src/screens/MainMenu.tsx
import React from 'react';
import { Box, Text } from 'ink';
import { useNav } from '../nav/stack';
import { useListNav } from '../hooks/useListNav';

type MenuItem = {
  label: string;
  onSelect: () => void;
};

export function MainMenu(): React.ReactElement {
  const { push } = useNav();

  const items: MenuItem[] = [
    { label: 'Home Feed', onSelect: () => push({ screen: 'Feed', subreddit: null }) },
    { label: 'Search Subreddits', onSelect: () => push({ screen: 'SubredditSearch' }) },
    { label: 'Joined Subreddits', onSelect: () => push({ screen: 'JoinedSubreddits' }) },
    { label: 'Global Search', onSelect: () => push({ screen: 'GlobalSearch' }) },
  ];

  const { selectedIndex } = useListNav({ items, onActivate: (item) => item.onSelect() });

  return (
    <Box flexDirection="column">
      <Text bold>iudex-cli — Reddit Browser</Text>
      <Box marginTop={1} flexDirection="column">
        {items.map((item, index) => (
          <Text key={item.label} color={index === selectedIndex ? 'green' : undefined} bold={index === selectedIndex}>
            {item.label}
          </Text>
        ))}
      </Box>
    </Box>
  );
}
```

- [ ] **Step 2: Write `src/App.tsx`**

```tsx
// src/App.tsx
import React from 'react';
import { Text } from 'ink';
import { NavProvider, useNav } from './nav/stack';
import { MainMenu } from './screens/MainMenu';

export function App(): React.ReactElement {
  return (
    <NavProvider>
      <ScreenSwitch />
    </NavProvider>
  );
}

function ScreenSwitch(): React.ReactElement {
  const { frame } = useNav();
  switch (frame.screen) {
    case 'MainMenu':
      return <MainMenu />;
    default:
      return <Text>Coming soon: {frame.screen} (press Backspace to go back)</Text>;
  }
}
```

- [ ] **Step 3: Finalize `src/cli.tsx`**

```tsx
#!/usr/bin/env node
// src/cli.tsx
import React from 'react';
import { render } from 'ink';
import { loadToken } from './token';
import { App } from './App';

function main(): void {
  try {
    loadToken(Date.now());
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error loading token';
    process.stderr.write(`${message}\n`);
    process.exitCode = 1;
    return;
  }
  render(<App />);
}

main();
```

- [ ] **Step 4: Type-check, lint**

```bash
npm run type-check
npm run lint
```
Expected: both exit 0.

- [ ] **Step 5: Manually verify by running the app**

Run: `npm start`
Expected:
- The screen shows "iudex-cli — Reddit Browser" with 4 menu items, the first one (`Home Feed`) highlighted in green+bold.
- Pressing ↓ moves the green highlight down through the 4 items; ↑ moves it back up; it clamps at the top/bottom.
- Pressing Enter on any item shows `Coming soon: Feed (press Backspace to go back)` (or `SubredditSearch`/`JoinedSubreddits`/`GlobalSearch` depending which you picked).
- Pressing Backspace from that "Coming soon" screen returns to MainMenu; pressing Backspace again at MainMenu does nothing (it's the root).
- Pressing Ctrl+C once does nothing; pressing it twice quickly exits the process.

Press Ctrl+C twice to exit when done.

- [ ] **Step 6: Commit**

```bash
git add src/App.tsx src/screens/MainMenu.tsx src/cli.tsx
git commit -m "Add App root, MainMenu screen, and finalize CLI entry point"
```

---

### Task 10: Shared list-rendering components

**Files:**
- Create: `src/components/ImageTag.tsx`, `src/components/PostList.tsx`, `src/components/SubredditList.tsx`

**Interfaces:**
- Consumes: `useListNav` from `../hooks/useListNav` (Task 8); `RedditPost`, `RedditSubreddit` from `../reddit/types` (Task 4).
- Produces: `ImageTag` (the yellow-bg/black-text "with image" badge — constant styling, never affected by selection); `PostList` (`{ posts, onSelect, onReachEnd, emptyMessage }`); `SubredditList` (`{ subreddits, onSelect, onReachEnd, emptyMessage }`). Consumed by `FeedScreen`/`GlobalSearchScreen` (Tasks 11, 16) and `SubredditSearchScreen`/`JoinedSubredditsScreen` (Tasks 12, 13) respectively.
- Not independently runnable — no screen uses them yet. Verified via `npm run type-check`/`npm run lint`; manual verification deferred to the screens that consume them.

- [ ] **Step 1: Write `src/components/ImageTag.tsx`**

```tsx
// src/components/ImageTag.tsx
import React from 'react';
import { Text } from 'ink';

export function ImageTag(): React.ReactElement {
  return (
    <Text backgroundColor="yellow" color="black">
      {' with image '}
    </Text>
  );
}
```

- [ ] **Step 2: Write `src/components/PostList.tsx`**

```tsx
// src/components/PostList.tsx
import React from 'react';
import { Box, Text } from 'ink';
import { useListNav } from '../hooks/useListNav';
import { ImageTag } from './ImageTag';
import type { RedditPost } from '../reddit/types';

export type PostListProps = {
  posts: RedditPost[];
  onSelect: (post: RedditPost) => void;
  onReachEnd: () => void;
  emptyMessage: string;
};

export function PostList({ posts, onSelect, onReachEnd, emptyMessage }: PostListProps): React.ReactElement {
  const { selectedIndex } = useListNav({ items: posts, onActivate: onSelect, onReachEnd });

  if (posts.length === 0) {
    return <Text>{emptyMessage}</Text>;
  }

  return (
    <Box flexDirection="column">
      {posts.map((post, index) => {
        const selected = index === selectedIndex;
        return (
          <Box key={post.id} flexDirection="column" marginBottom={1}>
            <Text color={selected ? 'green' : 'blue'} bold={selected}>
              {post.title}
            </Text>
            {post.hasImage ? <ImageTag /> : null}
            <Text color={selected ? 'green' : undefined} dimColor={!selected} bold={selected}>
              {`r/${post.subreddit} · u/${post.author} · ${post.score} pts · ${post.numComments} comments`}
            </Text>
          </Box>
        );
      })}
    </Box>
  );
}
```

- [ ] **Step 3: Write `src/components/SubredditList.tsx`**

```tsx
// src/components/SubredditList.tsx
import React from 'react';
import { Box, Text } from 'ink';
import { useListNav } from '../hooks/useListNav';
import type { RedditSubreddit } from '../reddit/types';

export type SubredditListProps = {
  subreddits: RedditSubreddit[];
  onSelect: (subreddit: RedditSubreddit) => void;
  onReachEnd: () => void;
  emptyMessage: string;
};

export function SubredditList({
  subreddits,
  onSelect,
  onReachEnd,
  emptyMessage,
}: SubredditListProps): React.ReactElement {
  const { selectedIndex } = useListNav({ items: subreddits, onActivate: onSelect, onReachEnd });

  if (subreddits.length === 0) {
    return <Text>{emptyMessage}</Text>;
  }

  return (
    <Box flexDirection="column">
      {subreddits.map((subreddit, index) => {
        const selected = index === selectedIndex;
        return (
          <Box key={subreddit.name} flexDirection="column" marginBottom={1}>
            <Text color={selected ? 'green' : 'blue'} bold={selected}>
              {`r/${subreddit.name}`}
            </Text>
            <Text color={selected ? 'green' : undefined} dimColor={!selected} bold={selected}>
              {`${subreddit.subscribers.toLocaleString()} subscribers · ${subreddit.title}`}
            </Text>
          </Box>
        );
      })}
    </Box>
  );
}
```

- [ ] **Step 4: Type-check and lint**

```bash
npm run type-check
npm run lint
```
Expected: both exit 0.

- [ ] **Step 5: Commit**

```bash
git add src/components/ImageTag.tsx src/components/PostList.tsx src/components/SubredditList.tsx
git commit -m "Add shared PostList/SubredditList/ImageTag components"
```

---

### Task 11: Feed screen (Home + subreddit feeds)

**Files:**
- Create: `src/screens/FeedScreen.tsx`
- Modify: `src/App.tsx`

**Interfaces:**
- Consumes: `useNav` from `../nav/stack` (Task 8); `PostList` from `../components/PostList` (Task 10); `getHomeFeed`, `getSubredditFeed`, `FeedSort` from `../reddit/client` (Task 7); `RedditPost` from `../reddit/types` (Task 4).
- Produces: `FeedScreen({ subreddit: string | null })` — this single component serves both the Home Feed and any Subreddit Feed (per the design spec, they share identical behavior). Wired into `App.tsx`'s `'Feed'` case, replacing the "Coming soon" fallback for that one case.

- [ ] **Step 1: Write `src/screens/FeedScreen.tsx`**

```tsx
// src/screens/FeedScreen.tsx
import React, { useEffect, useState } from 'react';
import { Box, Text, useInput } from 'ink';
import { useNav } from '../nav/stack';
import { PostList } from '../components/PostList';
import { getHomeFeed, getSubredditFeed } from '../reddit/client';
import type { FeedSort } from '../reddit/client';
import type { RedditPost } from '../reddit/types';

const SORTS: FeedSort[] = ['hot', 'top', 'new', 'controversial'];

export type FeedScreenProps = {
  subreddit: string | null;
};

function fetchPage(subreddit: string | null, sort: FeedSort, after: string | null) {
  return subreddit === null ? getHomeFeed(sort, after) : getSubredditFeed(subreddit, sort, after);
}

export function FeedScreen({ subreddit }: FeedScreenProps): React.ReactElement {
  const { push } = useNav();
  const [sortIndex, setSortIndex] = useState(0);
  const [posts, setPosts] = useState<RedditPost[]>([]);
  const [after, setAfter] = useState<string | null>(null);
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');

  const sort = SORTS[sortIndex] ?? 'hot';

  useEffect(() => {
    let cancelled = false;
    setStatus('loading');
    async function run(): Promise<void> {
      try {
        const listing = await fetchPage(subreddit, sort, null);
        if (cancelled) return;
        setPosts(listing.children);
        setAfter(listing.after);
        setStatus('ready');
      } catch {
        if (!cancelled) setStatus('error');
      }
    }
    void run();
    return () => {
      cancelled = true;
    };
  }, [subreddit, sort]);

  useInput((input) => {
    if (input === 's') {
      setSortIndex((index) => (index + 1) % SORTS.length);
    }
  });

  const loadMore = (): void => {
    if (after === null) return;
    async function run(): Promise<void> {
      const listing = await fetchPage(subreddit, sort, after);
      setPosts((previous) => [...previous, ...listing.children]);
      setAfter(listing.after);
    }
    void run();
  };

  return (
    <Box flexDirection="column">
      <Text bold>
        {subreddit === null ? 'Home Feed' : `r/${subreddit}`} — sort: {sort} (press s to cycle)
      </Text>
      {status === 'error' ? <Text color="red">Failed to load. Press Backspace and try again.</Text> : null}
      {status === 'loading' ? (
        <Text>Loading...</Text>
      ) : (
        <PostList
          posts={posts}
          onSelect={(post) => push({ screen: 'Thread', subreddit: post.subreddit, postId: post.id })}
          onReachEnd={loadMore}
          emptyMessage="No posts found."
        />
      )}
    </Box>
  );
}
```

- [ ] **Step 2: Wire `FeedScreen` into `src/App.tsx`**

```tsx
// src/App.tsx
import React from 'react';
import { Text } from 'ink';
import { NavProvider, useNav } from './nav/stack';
import { MainMenu } from './screens/MainMenu';
import { FeedScreen } from './screens/FeedScreen';

export function App(): React.ReactElement {
  return (
    <NavProvider>
      <ScreenSwitch />
    </NavProvider>
  );
}

function ScreenSwitch(): React.ReactElement {
  const { frame } = useNav();
  switch (frame.screen) {
    case 'MainMenu':
      return <MainMenu />;
    case 'Feed':
      return <FeedScreen subreddit={frame.subreddit} />;
    default:
      return <Text>Coming soon: {frame.screen} (press Backspace to go back)</Text>;
  }
}
```

- [ ] **Step 3: Type-check and lint**

```bash
npm run type-check
npm run lint
```
Expected: both exit 0.

- [ ] **Step 4: Manually verify by running the app**

Run: `npm start`, select "Home Feed".
Expected:
- Real posts from your Reddit account's home feed appear, titles in blue, the first one highlighted green.
- Any post with attached image/gallery media shows the yellow/black "with image" tag below its title.
- Pressing `s` cycles the header's sort label hot → top → new → controversial → hot, and the list re-fetches each time.
- Scrolling ↓ past the last loaded post fetches and appends more posts automatically.
- Pressing Enter on a post falls through to "Coming soon: Thread" (expected — Thread isn't built until Task 15).
- Backspace returns to MainMenu.

Ctrl+C twice to exit.

- [ ] **Step 5: Commit**

```bash
git add src/screens/FeedScreen.tsx src/App.tsx
git commit -m "Add Feed screen (shared by Home Feed and subreddit feeds)"
```

---

### Task 12: Subreddit search screen

**Files:**
- Create: `src/screens/SubredditSearchScreen.tsx`
- Modify: `src/App.tsx`

**Interfaces:**
- Consumes: `useNav` (Task 8); `SubredditList` (Task 10); `searchSubreddits` from `../reddit/client` (Task 7); `RedditSubreddit` (Task 4); `TextInput` from `ink-text-input`.
- Produces: `SubredditSearchScreen`. Wired into `App.tsx`'s `'SubredditSearch'` case.

- [ ] **Step 1: Write `src/screens/SubredditSearchScreen.tsx`**

```tsx
// src/screens/SubredditSearchScreen.tsx
import React, { useState } from 'react';
import { Box, Text } from 'ink';
import TextInput from 'ink-text-input';
import { useNav } from '../nav/stack';
import { SubredditList } from '../components/SubredditList';
import { searchSubreddits } from '../reddit/client';
import type { RedditSubreddit } from '../reddit/types';

export function SubredditSearchScreen(): React.ReactElement {
  const { push } = useNav();
  const [query, setQuery] = useState('');
  const [submittedQuery, setSubmittedQuery] = useState<string | null>(null);
  const [subreddits, setSubreddits] = useState<RedditSubreddit[]>([]);
  const [after, setAfter] = useState<string | null>(null);
  const [status, setStatus] = useState<'idle' | 'loading' | 'ready' | 'error'>('idle');

  const runSearch = (searchQuery: string, pageAfter: string | null): void => {
    setStatus('loading');
    async function run(): Promise<void> {
      try {
        const listing = await searchSubreddits(searchQuery, pageAfter);
        setSubreddits((previous) => (pageAfter === null ? listing.children : [...previous, ...listing.children]));
        setAfter(listing.after);
        setStatus('ready');
      } catch {
        setStatus('error');
      }
    }
    void run();
  };

  const handleSubmit = (value: string): void => {
    setSubmittedQuery(value);
    setSubreddits([]);
    setAfter(null);
    runSearch(value, null);
  };

  return (
    <Box flexDirection="column">
      <Text bold>Search Subreddits</Text>
      {submittedQuery === null ? (
        <Box>
          <Text>Query: </Text>
          <TextInput value={query} onChange={setQuery} onSubmit={handleSubmit} />
        </Box>
      ) : (
        <Box flexDirection="column">
          <Text>{`Results for "${submittedQuery}"`}</Text>
          {status === 'error' ? <Text color="red">Search failed. Press Backspace and try again.</Text> : null}
          {status === 'loading' && subreddits.length === 0 ? (
            <Text>Loading...</Text>
          ) : (
            <SubredditList
              subreddits={subreddits}
              onSelect={(subreddit) => push({ screen: 'Feed', subreddit: subreddit.name })}
              onReachEnd={() => runSearch(submittedQuery, after)}
              emptyMessage="No subreddits found."
            />
          )}
        </Box>
      )}
    </Box>
  );
}
```

- [ ] **Step 2: Wire into `src/App.tsx`**

```tsx
// src/App.tsx
import React from 'react';
import { Text } from 'ink';
import { NavProvider, useNav } from './nav/stack';
import { MainMenu } from './screens/MainMenu';
import { FeedScreen } from './screens/FeedScreen';
import { SubredditSearchScreen } from './screens/SubredditSearchScreen';

export function App(): React.ReactElement {
  return (
    <NavProvider>
      <ScreenSwitch />
    </NavProvider>
  );
}

function ScreenSwitch(): React.ReactElement {
  const { frame } = useNav();
  switch (frame.screen) {
    case 'MainMenu':
      return <MainMenu />;
    case 'Feed':
      return <FeedScreen subreddit={frame.subreddit} />;
    case 'SubredditSearch':
      return <SubredditSearchScreen />;
    default:
      return <Text>Coming soon: {frame.screen} (press Backspace to go back)</Text>;
  }
}
```

- [ ] **Step 3: Type-check and lint**

```bash
npm run type-check
npm run lint
```
Expected: both exit 0.

- [ ] **Step 4: Manually verify by running the app**

Run: `npm start` → "Search Subreddits" → type e.g. `berserk` → Enter.
Expected:
- Results list of matching subreddits appears, names in blue, first one highlighted green, subscriber counts shown.
- Selecting one (Enter) navigates into its Feed screen (Task 11's `FeedScreen`, now scoped to that subreddit) — confirming SubredditFeed works end-to-end via the shared component.
- Scrolling past the last result auto-loads more.
- Backspace from the results returns to the query input; Backspace from the query input returns to MainMenu.

Ctrl+C twice to exit.

- [ ] **Step 5: Commit**

```bash
git add src/screens/SubredditSearchScreen.tsx src/App.tsx
git commit -m "Add Subreddit Search screen"
```

---

### Task 13: Joined subreddits screen

**Files:**
- Create: `src/screens/JoinedSubredditsScreen.tsx`
- Modify: `src/App.tsx`

**Interfaces:**
- Consumes: `useNav` (Task 8); `SubredditList` (Task 10); `getJoinedSubreddits` from `../reddit/client` (Task 7); `RedditSubreddit` (Task 4).
- Produces: `JoinedSubredditsScreen`. Wired into `App.tsx`'s `'JoinedSubreddits'` case.

- [ ] **Step 1: Write `src/screens/JoinedSubredditsScreen.tsx`**

```tsx
// src/screens/JoinedSubredditsScreen.tsx
import React, { useEffect, useState } from 'react';
import { Box, Text } from 'ink';
import { useNav } from '../nav/stack';
import { SubredditList } from '../components/SubredditList';
import { getJoinedSubreddits } from '../reddit/client';
import type { RedditSubreddit } from '../reddit/types';

export function JoinedSubredditsScreen(): React.ReactElement {
  const { push } = useNav();
  const [subreddits, setSubreddits] = useState<RedditSubreddit[]>([]);
  const [after, setAfter] = useState<string | null>(null);
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');

  useEffect(() => {
    let cancelled = false;
    async function run(): Promise<void> {
      try {
        const listing = await getJoinedSubreddits(null);
        if (cancelled) return;
        setSubreddits(listing.children);
        setAfter(listing.after);
        setStatus('ready');
      } catch {
        if (!cancelled) setStatus('error');
      }
    }
    void run();
    return () => {
      cancelled = true;
    };
  }, []);

  const loadMore = (): void => {
    if (after === null) return;
    async function run(): Promise<void> {
      const listing = await getJoinedSubreddits(after);
      setSubreddits((previous) => [...previous, ...listing.children]);
      setAfter(listing.after);
    }
    void run();
  };

  return (
    <Box flexDirection="column">
      <Text bold>Joined Subreddits</Text>
      {status === 'error' ? <Text color="red">Failed to load. Press Backspace and try again.</Text> : null}
      {status === 'loading' ? (
        <Text>Loading...</Text>
      ) : (
        <SubredditList
          subreddits={subreddits}
          onSelect={(subreddit) => push({ screen: 'Feed', subreddit: subreddit.name })}
          onReachEnd={loadMore}
          emptyMessage="You haven't joined any subreddits."
        />
      )}
    </Box>
  );
}
```

- [ ] **Step 2: Wire into `src/App.tsx`**

```tsx
// src/App.tsx
import React from 'react';
import { Text } from 'ink';
import { NavProvider, useNav } from './nav/stack';
import { MainMenu } from './screens/MainMenu';
import { FeedScreen } from './screens/FeedScreen';
import { SubredditSearchScreen } from './screens/SubredditSearchScreen';
import { JoinedSubredditsScreen } from './screens/JoinedSubredditsScreen';

export function App(): React.ReactElement {
  return (
    <NavProvider>
      <ScreenSwitch />
    </NavProvider>
  );
}

function ScreenSwitch(): React.ReactElement {
  const { frame } = useNav();
  switch (frame.screen) {
    case 'MainMenu':
      return <MainMenu />;
    case 'Feed':
      return <FeedScreen subreddit={frame.subreddit} />;
    case 'SubredditSearch':
      return <SubredditSearchScreen />;
    case 'JoinedSubreddits':
      return <JoinedSubredditsScreen />;
    default:
      return <Text>Coming soon: {frame.screen} (press Backspace to go back)</Text>;
  }
}
```

- [ ] **Step 3: Type-check and lint**

```bash
npm run type-check
npm run lint
```
Expected: both exit 0.

- [ ] **Step 4: Manually verify by running the app**

Run: `npm start` → "Joined Subreddits".
Expected: your real subscribed subreddits list appears; selecting one opens its Feed screen. Backspace returns to MainMenu.

Ctrl+C twice to exit.

- [ ] **Step 5: Commit**

```bash
git add src/screens/JoinedSubredditsScreen.tsx src/App.tsx
git commit -m "Add Joined Subreddits screen"
```

---

### Task 14: Comment tree component

**Files:**
- Create: `src/components/CommentTree.tsx`

**Interfaces:**
- Consumes: `flattenVisibleComments`, `CommentRow` from `../comments/flatten` (Task 6); `branchPrefix`, `continuationPrefix` from `../comments/render` (Task 6); `usernameColor` from `../colors` (Task 5); `useListNav` from `../hooks/useListNav` (Task 8); `RedditThing` from `../reddit/types` (Task 4).
- Produces: `CommentTree({ comments, onExpandMore })`. Consumed by `ThreadScreen` (Task 15). Not independently runnable — no screen mounts it yet; verified via `npm run type-check`/`npm run lint`, manual verification deferred to Task 15.

- [ ] **Step 1: Write `src/components/CommentTree.tsx`**

```tsx
// src/components/CommentTree.tsx
import React, { useState } from 'react';
import { Box, Text } from 'ink';
import { flattenVisibleComments } from '../comments/flatten';
import { branchPrefix, continuationPrefix } from '../comments/render';
import { usernameColor } from '../colors';
import { useListNav } from '../hooks/useListNav';
import type { CommentRow } from '../comments/flatten';
import type { RedditThing } from '../reddit/types';

export type CommentTreeProps = {
  comments: RedditThing[];
  onExpandMore: (row: CommentRow) => void;
};

export function CommentTree({ comments, onExpandMore }: CommentTreeProps): React.ReactElement {
  const [expandedIds, setExpandedIds] = useState<ReadonlySet<string>>(new Set());
  const rows = flattenVisibleComments(comments, expandedIds);

  const { selectedIndex } = useListNav<CommentRow>({
    items: rows,
    onActivate: (row) => {
      if (row.content.type === 'collapsedReplies') {
        const sourceId = row.id.slice('collapsed:'.length);
        setExpandedIds((previous) => new Set([...previous, sourceId]));
      } else if (row.content.type === 'more') {
        onExpandMore(row);
      }
    },
  });

  if (rows.length === 0) {
    return <Text>No comments yet.</Text>;
  }

  return (
    <Box flexDirection="column">
      {rows.map((row, index) => (
        <CommentRowView key={row.id} row={row} selected={index === selectedIndex} />
      ))}
    </Box>
  );
}

function CommentRowView({ row, selected }: { row: CommentRow; selected: boolean }): React.ReactElement {
  const prefix = branchPrefix(row);
  const rowColor = selected ? 'green' : undefined;

  if (row.content.type === 'collapsedReplies') {
    return (
      <Text color={rowColor} bold={selected}>
        {`${prefix}${row.content.replyCount} replies ▸`}
      </Text>
    );
  }

  if (row.content.type === 'more') {
    return (
      <Text color={rowColor} bold={selected}>
        {`${prefix}${row.content.count} more replies ▸`}
      </Text>
    );
  }

  const bodyPrefix = continuationPrefix(row, row.content.continuesBelow);
  const authorColor = selected ? 'green' : usernameColor(row.content.author);

  return (
    <Box flexDirection="column" marginBottom={row.depth === 0 ? 1 : 0}>
      <Box>
        <Text color={rowColor} bold={selected}>
          {prefix}
        </Text>
        <Text color={authorColor} bold={selected}>
          {`u/${row.content.author}`}
        </Text>
        <Text color={rowColor} bold={selected}>
          {` (${row.content.score})`}
        </Text>
      </Box>
      <Text color={rowColor} bold={selected}>
        {bodyPrefix}
        {row.content.body}
      </Text>
    </Box>
  );
}
```

> Note on spacing: the design spec calls for one blank line between top-level comment blocks, with replies staying tight underneath their parent. `marginBottom={row.depth === 0 ? 1 : 0}` on the `comment` variant achieves exactly that — only depth-0 rows get the trailing blank line.

- [ ] **Step 2: Type-check and lint**

```bash
npm run type-check
npm run lint
```
Expected: both exit 0.

- [ ] **Step 3: Commit**

```bash
git add src/components/CommentTree.tsx
git commit -m "Add CommentTree component"
```

---

### Task 15: Thread screen

**Files:**
- Create: `src/screens/ThreadScreen.tsx`
- Modify: `src/App.tsx`

**Interfaces:**
- Consumes: `CommentTree` from `../components/CommentTree` (Task 14); `getThread`, `loadMoreChildren` from `../reddit/client` (Task 7); `RedditPost`, `RedditThing` from `../reddit/types` (Task 4); `CommentRow` from `../comments/flatten` (Task 6); `ImageTag` from `../components/ImageTag` (Task 10).
- Produces: `ThreadScreen({ subreddit, postId })`. Wired into `App.tsx`'s `'Thread'` case.

- [ ] **Step 1: Write `src/screens/ThreadScreen.tsx`**

```tsx
// src/screens/ThreadScreen.tsx
import React, { useEffect, useState } from 'react';
import { Box, Text } from 'ink';
import { CommentTree } from '../components/CommentTree';
import { ImageTag } from '../components/ImageTag';
import { getThread, loadMoreChildren } from '../reddit/client';
import type { RedditPost, RedditThing } from '../reddit/types';
import type { CommentRow } from '../comments/flatten';

export type ThreadScreenProps = {
  subreddit: string;
  postId: string;
};

function replaceMoreStub(things: RedditThing[], stubId: string, replacement: RedditThing[]): RedditThing[] {
  return things.flatMap((thing) => {
    if (thing.kind === 'more' && thing.id === stubId) return replacement;
    if (thing.kind === 'comment') {
      return [{ ...thing, replies: replaceMoreStub(thing.replies, stubId, replacement) }];
    }
    return [thing];
  });
}

export function ThreadScreen({ subreddit, postId }: ThreadScreenProps): React.ReactElement {
  const [post, setPost] = useState<RedditPost | null>(null);
  const [comments, setComments] = useState<RedditThing[]>([]);
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');

  useEffect(() => {
    let cancelled = false;
    async function run(): Promise<void> {
      try {
        const thread = await getThread(subreddit, postId);
        if (cancelled) return;
        setPost(thread.post);
        setComments(thread.comments);
        setStatus('ready');
      } catch {
        if (!cancelled) setStatus('error');
      }
    }
    void run();
    return () => {
      cancelled = true;
    };
  }, [subreddit, postId]);

  const handleExpandMore = (row: CommentRow): void => {
    if (row.content.type !== 'more' || post === null) return;
    const stubId = row.id.slice('more:'.length);
    const childIds = row.content.childIds;
    async function run(): Promise<void> {
      const fetched = await loadMoreChildren(`t3_${post.id}`, childIds);
      setComments((previous) => replaceMoreStub(previous, stubId, fetched));
    }
    void run();
  };

  if (status === 'loading') return <Text>Loading...</Text>;
  if (status === 'error' || post === null) {
    return <Text color="red">Failed to load thread. Press Backspace and try again.</Text>;
  }

  return (
    <Box flexDirection="column">
      <Text color="blue" bold>
        {post.title}
      </Text>
      {post.hasImage ? <ImageTag /> : null}
      <Text dimColor>{`r/${post.subreddit} · u/${post.author} · ${post.score} pts`}</Text>
      {post.selftext.length > 0 ? <Text>{post.selftext}</Text> : null}
      <Box marginTop={1}>
        <Text bold>Comments</Text>
      </Box>
      <CommentTree comments={comments} onExpandMore={handleExpandMore} />
    </Box>
  );
}
```

- [ ] **Step 2: Wire into `src/App.tsx`**

```tsx
// src/App.tsx
import React from 'react';
import { Text } from 'ink';
import { NavProvider, useNav } from './nav/stack';
import { MainMenu } from './screens/MainMenu';
import { FeedScreen } from './screens/FeedScreen';
import { SubredditSearchScreen } from './screens/SubredditSearchScreen';
import { JoinedSubredditsScreen } from './screens/JoinedSubredditsScreen';
import { ThreadScreen } from './screens/ThreadScreen';

export function App(): React.ReactElement {
  return (
    <NavProvider>
      <ScreenSwitch />
    </NavProvider>
  );
}

function ScreenSwitch(): React.ReactElement {
  const { frame } = useNav();
  switch (frame.screen) {
    case 'MainMenu':
      return <MainMenu />;
    case 'Feed':
      return <FeedScreen subreddit={frame.subreddit} />;
    case 'SubredditSearch':
      return <SubredditSearchScreen />;
    case 'JoinedSubreddits':
      return <JoinedSubredditsScreen />;
    case 'Thread':
      return <ThreadScreen subreddit={frame.subreddit} postId={frame.postId} />;
    default:
      return <Text>Coming soon: {frame.screen} (press Backspace to go back)</Text>;
  }
}
```

- [ ] **Step 3: Type-check and lint**

```bash
npm run type-check
npm run lint
```
Expected: both exit 0.

- [ ] **Step 4: Manually verify by running the app**

Run: `npm start` → "Home Feed" → Enter on any post.
Expected:
- Post title in blue, "with image" tag below it if the post has media, meta line, selftext if present.
- Comment tree renders below with tree-branch characters (`├─`/`└─`/`│`), one blank line between top-level comments, replies tight under their parent.
- Top-level comments show full text immediately; any with replies show a `▸ N replies` placeholder row underneath.
- ↑/↓ moves the green cursor through comments AND their placeholder rows; usernames show distinct non-green colors when not selected, turn green when selected.
- Enter on a `▸ N replies` row expands it in place; Enter again collapses it back.
- If a comment has a "N more replies ▸" row (Reddit's `more` stub), Enter on it fetches and reveals the real replies.
- If any comment contains `[has_image 🖼️]`, it appears inline in the body text (find a thread with an image-in-comment to confirm, or trust Task 4's unit test coverage for this specific substitution if none is readily available).
- Backspace returns to the Feed screen.

Ctrl+C twice to exit.

- [ ] **Step 5: Commit**

```bash
git add src/screens/ThreadScreen.tsx src/App.tsx
git commit -m "Add Thread screen"
```

---

### Task 16: Global search screen (final screen — makes the switch exhaustive)

**Files:**
- Create: `src/screens/GlobalSearchScreen.tsx`
- Modify: `src/App.tsx`

**Interfaces:**
- Consumes: `useNav` (Task 8); `PostList` (Task 10); `searchPosts` from `../reddit/client` (Task 7); `RedditPost` (Task 4); `TextInput` from `ink-text-input`.
- Produces: `GlobalSearchScreen`. This is the last screen — `App.tsx`'s switch drops the `default` fallback and becomes fully exhaustive (a `never` check catches any future unhandled `Frame` variant at compile time).

- [ ] **Step 1: Write `src/screens/GlobalSearchScreen.tsx`**

```tsx
// src/screens/GlobalSearchScreen.tsx
import React, { useState } from 'react';
import { Box, Text } from 'ink';
import TextInput from 'ink-text-input';
import { useNav } from '../nav/stack';
import { PostList } from '../components/PostList';
import { searchPosts } from '../reddit/client';
import type { RedditPost } from '../reddit/types';

export function GlobalSearchScreen(): React.ReactElement {
  const { push } = useNav();
  const [query, setQuery] = useState('');
  const [submittedQuery, setSubmittedQuery] = useState<string | null>(null);
  const [posts, setPosts] = useState<RedditPost[]>([]);
  const [after, setAfter] = useState<string | null>(null);
  const [status, setStatus] = useState<'idle' | 'loading' | 'ready' | 'error'>('idle');

  const runSearch = (searchQuery: string, pageAfter: string | null): void => {
    setStatus('loading');
    async function run(): Promise<void> {
      try {
        const listing = await searchPosts(searchQuery, pageAfter);
        setPosts((previous) => (pageAfter === null ? listing.children : [...previous, ...listing.children]));
        setAfter(listing.after);
        setStatus('ready');
      } catch {
        setStatus('error');
      }
    }
    void run();
  };

  const handleSubmit = (value: string): void => {
    setSubmittedQuery(value);
    setPosts([]);
    setAfter(null);
    runSearch(value, null);
  };

  return (
    <Box flexDirection="column">
      <Text bold>Global Search</Text>
      {submittedQuery === null ? (
        <Box>
          <Text>Query: </Text>
          <TextInput value={query} onChange={setQuery} onSubmit={handleSubmit} />
        </Box>
      ) : (
        <Box flexDirection="column">
          <Text>{`Results for "${submittedQuery}"`}</Text>
          {status === 'error' ? <Text color="red">Search failed. Press Backspace and try again.</Text> : null}
          {status === 'loading' && posts.length === 0 ? (
            <Text>Loading...</Text>
          ) : (
            <PostList
              posts={posts}
              onSelect={(post) => push({ screen: 'Thread', subreddit: post.subreddit, postId: post.id })}
              onReachEnd={() => runSearch(submittedQuery, after)}
              emptyMessage="No posts found."
            />
          )}
        </Box>
      )}
    </Box>
  );
}
```

- [ ] **Step 2: Wire into `src/App.tsx` and make the switch exhaustive**

```tsx
// src/App.tsx
import React from 'react';
import { NavProvider, useNav } from './nav/stack';
import { MainMenu } from './screens/MainMenu';
import { FeedScreen } from './screens/FeedScreen';
import { SubredditSearchScreen } from './screens/SubredditSearchScreen';
import { JoinedSubredditsScreen } from './screens/JoinedSubredditsScreen';
import { GlobalSearchScreen } from './screens/GlobalSearchScreen';
import { ThreadScreen } from './screens/ThreadScreen';

export function App(): React.ReactElement {
  return (
    <NavProvider>
      <ScreenSwitch />
    </NavProvider>
  );
}

function ScreenSwitch(): React.ReactElement {
  const { frame } = useNav();
  switch (frame.screen) {
    case 'MainMenu':
      return <MainMenu />;
    case 'Feed':
      return <FeedScreen subreddit={frame.subreddit} />;
    case 'SubredditSearch':
      return <SubredditSearchScreen />;
    case 'JoinedSubreddits':
      return <JoinedSubredditsScreen />;
    case 'GlobalSearch':
      return <GlobalSearchScreen />;
    case 'Thread':
      return <ThreadScreen subreddit={frame.subreddit} postId={frame.postId} />;
    default: {
      const exhaustiveCheck: never = frame;
      throw new Error(`Unhandled screen: ${JSON.stringify(exhaustiveCheck)}`);
    }
  }
}
```

- [ ] **Step 3: Type-check and lint**

```bash
npm run type-check
npm run lint
```
Expected: both exit 0. (If the exhaustiveness check errors, it means a `Frame` variant is missing a case above — there shouldn't be one at this point, all six exist.)

- [ ] **Step 4: Run the full test suite**

```bash
npm test
```
Expected: PASS, all tests across every task (roughly 40+ across token/parse/mappers/colors/flatten/render/client/stackReducer/selectionReducer).

- [ ] **Step 5: Manually verify the complete app end to end**

Run: `npm start` and walk the entire spec:
- MainMenu → Home Feed → cycle sort with `s` → Enter a post → Thread (title blue, image tag if applicable, comment tree with branches/colors/expand) → Backspace → Backspace → MainMenu.
- MainMenu → Search Subreddits → type a query → Enter → select a result → its Feed → Enter a post → Thread → Backspace back out to MainMenu.
- MainMenu → Joined Subreddits → select one → its Feed.
- MainMenu → Global Search → type a query → Enter → select a result → Thread.
- Throughout: green selection highlight, blue titles, per-user comment colors, yellow/black image tags, auto-load-more on scroll, Ctrl+C-twice-to-exit.

- [ ] **Step 6: Commit**

```bash
git add src/screens/GlobalSearchScreen.tsx src/App.tsx
git commit -m "Add Global Search screen; App's screen switch is now fully exhaustive"
```

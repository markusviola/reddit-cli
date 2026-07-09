# Reddit TUI Browser — Design

## Overview

Repurpose this repo (currently a Devvit "hello world" web-app scaffold with
no commits yet) into a standalone, read-only, keyboard-driven terminal
Reddit browser. Auth reuses the same `~/.devvit/token` file the Devvit CLI's
`login` command already manages — no separate OAuth app registration.

## Goals

- Browse Reddit entirely from the terminal: home feed, subreddit feeds,
  subreddit search, joined-subreddit list, global post search, thread +
  paginated/expandable comment tree.
- Fully keyboard-driven: arrow keys to navigate/scroll, Enter to
  activate/expand, Backspace to go back a screen, Ctrl+C twice to exit.
- Read-only. No voting, commenting, posting, or account mutation of any kind.

## Non-Goals

- Voting/commenting/posting.
- Image/media rendering (link/image posts show a `[image link]` placeholder).
- Multi-account switching.
- Offline caching or a persistent config file.
- Any automated retry/backoff/rate-limit framework beyond a status-line
  warning if we get close to a limit.

## Project Structure

Removed (Devvit web-app scaffolding, not needed for a terminal CLI):
- `devvit.json`
- `src/client/`
- `src/server/routes/{api,forms,menu,triggers}.ts`, `src/server/core/post.ts`,
  `src/shared/api.ts`
- Deps: `@devvit/web`, `@hono/node-server`, `hono`, `react-dom`, Tailwind, Vite
- npm scripts: `build`, `deploy`, `launch`

`AGENTS.md` gets rewritten for the new project — drops Devvit-specific
rules, keeps the generic TS style prefs (named exports, type aliases over
interfaces, never cast types).

Added:
```
src/
  token.ts          # load + validate ~/.devvit/token, expiry check
  reddit/
    client.ts       # fetch wrapper against oauth.reddit.com
    types.ts        # Post, Comment, Subreddit, Listing<T> shapes we use
  nav/
    stack.tsx        # navigation stack context (push/pop), global keybindings
  screens/
    MainMenu.tsx
    HomeFeed.tsx
    SubredditFeed.tsx
    SubredditSearch.tsx
    JoinedSubreddits.tsx
    GlobalSearch.tsx
    Thread.tsx
  components/
    PostList.tsx      # shared scrollable/selectable list w/ auto-pagination
    CommentTree.tsx    # recursive comment renderer
  cli.tsx             # Ink render() entry point
```
`package.json` is rewritten: `ink` + small `ink-*` helpers as deps, `bin`
entry (optional, not required for MVP), `start`/`dev` scripts, existing
`login` script (`devvit login`) kept as-is — it's the token refresh
mechanism.

## Architecture

**Chosen approach:** custom lightweight fetch client for the Reddit API +
a simple stack-based navigation state in Ink (React for CLIs), over two
alternatives considered:
- `snoowrap` (full Reddit API wrapper) — rejected because it wants to own
  the OAuth lifecycle (refresh token + client secret) itself, which
  conflicts with Devvit owning and rotating the token file.
- A state-machine router (e.g. xstate) for navigation — rejected as
  overhead for what's a small, mostly-linear drill-down of ~7 screens.

Minimal dependencies, full control over token handling, and the API
surface needed (7 endpoints) is small enough that hand-rolling it is less
code than adapting a library built for a different auth model.

## Auth & Token Handling

`src/token.ts` reads `~/.devvit/token`, parses
`{ accessToken, refreshToken, expiresAt, scope, tokenType }`, and checks
`expiresAt` against the current time at startup (and periodically during
long sessions). If expired, the CLI exits immediately with:
`Token expired — run: npm run login`
rather than letting API requests fail with an opaque 401.

## Reddit API Client

`src/reddit/client.ts` exposes `redditGet<T>(path, params)`: sets
`Authorization: bearer <accessToken>` and a descriptive `User-Agent`
(required by Reddit's API rules) against `https://oauth.reddit.com`.
Endpoints used:
- `GET /` (`sort=hot|top|new|controversial`) — home feed
- `GET /r/{subreddit}/{sort}` — subreddit feed
- `GET /subreddits/search?q=` — subreddit search
- `GET /subreddits/mine/subscriber` — joined list
- `GET /search?q=&sort=` — global post search
- `GET /r/{subreddit}/comments/{id}` — thread + comments
- `GET /api/morechildren` — expand a `▸ N replies` placeholder beyond what
  the initial payload included

No retry/backoff framework, no request queue — one in-flight request per
screen action is enough for a personal read-only browser.

## Navigation

`src/nav/stack.tsx` is a React context holding an array of
`{ screen, params }` frames.
- `push(screen, params)` drills into a new screen.
- `Backspace` pops one frame.
- `Ctrl+C` twice within ~1s exits the app entirely (a single press is
  ignored, so it can't be hit by accident mid-scroll).
- The root frame is always `MainMenu`.

## Screens

- **MainMenu** — Home Feed / Search Subreddits / Joined Subreddits / Global
  Search. Enter drills into the chosen one.
- **HomeFeed** — personal aggregated feed (equivalent to reddit.com/ when
  logged in). `s` cycles hot → top → new → controversial → hot, re-fetching
  in place. `top`/`controversial` default to Reddit's `t=day` timeframe —
  no separate timeframe control (out of scope, per Non-Goals). Enter on a
  post → **Thread**.
- **SubredditSearch** — text input for a query, results list of matching
  subreddits. Enter on one → **SubredditFeed**.
- **JoinedSubreddits** — subscribed-subreddit list. Enter on one →
  **SubredditFeed**.
- **SubredditFeed** — same list/sort/Enter behavior as HomeFeed, scoped to
  one subreddit.
- **GlobalSearch** — text input, results list of posts across all
  subreddits (not restricted to one subreddit). Enter on one → **Thread**.
- **Thread** — post body (no image rendering — `[image link]` placeholder
  for link/image posts) + `CommentTree` below it, same ↑/↓/Enter
  convention.

All list-bearing screens (feed, subreddit search, joined list, global
search, comment tree) share one `PostList`/`useListNav` primitive so the
green-highlight/auto-pagination/Enter behavior is written once, not
reimplemented per screen.

## Pagination

Auto-load-more: scrolling past the last visible item in any list (feed,
search results, comments) fetches and appends the next page automatically.
No explicit "next page" keypress anywhere.

## Global Selection Convention

Every selectable list in the app — home/subreddit feed, subreddit search
results, joined-subreddit list, global search results, and comment-tree
nodes — shares one rule: the currently focused row renders in **green**
(bold), moved with ↑/↓. Implemented once via a shared `useListNav` hook +
`Highlight`/`SelectableRow` component, reused everywhere rather than
reinvented per screen.

**Enter is the one universal "activate" key** across the whole app:
- On a feed/list row → opens that post/subreddit.
- On a comment/reply row with a collapsed `▸ N replies` child set →
  expands it in place (children become new navigable rows, themselves
  still recursively collapsed).
- Enter again on an already-expanded comment collapses its children back
  (toggle).
- On a comment with no replies → no-op.

## Color Scheme

- **Post titles** render in blue — everywhere a title appears: feed/search
  list rows and the Thread screen's post header.
- **Usernames** render in a color deterministically derived from a hash of
  the username, drawn from a fixed palette that excludes green (green is
  reserved for selection, so no user's color can be confused for "this row
  is selected").
- **Selection overrides both:** when a row is the focused cursor, its
  entire text — title, username, everything — renders green (bold),
  temporarily overriding the row's normal blue/per-user colors. Colors
  revert the moment the cursor moves off that row.

## Comment Tree

**Initial state:** top-level comments are expanded (full text shown)
immediately; their replies are collapsed behind a `▸ N replies`
placeholder. This applies recursively — a reply's own replies are
likewise collapsed until expanded.

**Tree-branch rendering:** classic tree-drawing characters based on depth
and sibling position (same visual language as the `tree` command). `│`
continues a still-open ancestor branch, `├─` marks a sibling with more
below it at that depth, `└─` marks the last sibling at that depth, `▸`
marks a collapsed subtree.

**Spacing:** one blank line separates each top-level comment block from
the next; replies within a thread stay tight underneath their parent (no
blank line between a comment and its nested replies).

Example:
```
├─ u/alice (128) 2h
│  This show really peaked at episode 200, no argument.
│  └─ 3 replies ▸

├─ u/bob (54) 1h
│  Wait until you see what happens after the eclipse arc
│  ├─ u/carol (12) 45m
│  │  Right?? I was not ready
│  │  └─ 1 reply ▸
│  └─ u/dave (3) 30m
│     same here honestly

└─ u/erin (7) 10m
   Golden Age movies did it justice at least
```

**Navigation:** ↑/↓ moves the green cursor through the *flattened visible*
comment tree (top-level comments + whatever nested replies are currently
expanded, in depth-first order).

## Error Handling

Network/API errors surface as an inline status-line message on the
current screen (not a crash), with a retry-on-`r` hint. Expired token is
caught at startup (see Auth section). Empty results (e.g. a search with no
matches) render a plain "No results" row instead of an empty screen.

## Testing

Unit tests for the token-expiry check and the comment-tree
flattening/tree-branch-rendering logic (pure functions, easy to test in
isolation). No automated tests for Ink rendering itself — that's
exploratory/manual (drive the actual CLI to verify).

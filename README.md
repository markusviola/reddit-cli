# reddit-cli

A standalone, read-only, keyboard-driven terminal browser for Reddit,
built with [Ink](https://github.com/vadimdemedes/ink) (React for CLIs).
No voting, commenting, posting, or any account-mutating action — ever.

## Requirements

- Node.js `>=22.2.0`
- A Reddit account (for OAuth login via the Devvit CLI)

## Setup

1. `npm install`
2. `npm run login` — opens a browser to authenticate via Reddit OAuth
   (through the Devvit CLI). The token is stored at `~/.devvit/token` and
   used directly by this app. Re-run this command whenever the token
   expires (the app will tell you if `npm start` fails on an expired
   token).
3. `npm start`

## Usage

Launching the app (`npm start`) drops you straight into the **Home
Feed** — your personalized front-page feed. Press `t` to cycle sort
order: `hot` → `top` → `new` → `controversial`.

A footer nav bar is always visible at the bottom of the screen, on
every screen, with four destinations:

```
Home Threads (h) | Global Search (g) | Search Subreddits (s) | Joined Subreddits (j)
```

Press the bare letter shown in parentheses (`h`, `g`, `s`, or `j` — no
modifier key) from anywhere in the app to jump straight to that
screen. This always starts a fresh instance of that screen and resets
your navigation history back to just that one screen — it's a jump to
a top-level destination, not a "push" you can back out of with
Backspace. These keys are only suppressed while a search query text
box has focus (so typing a query containing one of those letters
doesn't trigger navigation); everywhere else, including while browsing
a feed or a thread, they work immediately.

- **Search Subreddits** — type a query, press Enter, then pick a
  subreddit from the results to open its feed.
- **Joined Subreddits** — the subreddits your account is subscribed to;
  pick one to open its feed.
- **Global Search** — type a query, press Enter, then pick a post from
  the results to open it directly.

From any feed, pressing Enter on a post opens its **Thread** screen: the
post body (with a `[image 📷]` tag if it has media), then the full
comment tree below it. Within a comment tree:

- Each comment shows its author and vote count, e.g. `u/someone (42 pts)`.
- A `N replies ▸` row is a collapsed set of already-fetched replies —
  Enter expands it in place; Enter again collapses it back.
- A `N more replies ▸` row is a real Reddit "load more" stub — Enter
  fetches those comments from Reddit and reveals them.
- Comments with an inline image are shown as `[has_image 🖼️]` in the
  body text (media itself is never rendered, per the read-only design).
- Usernames are colored deterministically per-user; whichever row is
  currently selected renders green + bold regardless of its own color.

Lists auto-load the next page as you scroll to the bottom — there's no
explicit "next page" key.

Backspace pops back one screen at a time (e.g. Thread → Feed). It's a
no-op when there's nowhere left to pop back to — either at the Home
Feed itself, or right after jumping to a screen via the footer nav bar
(which resets your navigation history, so there's nothing behind it).
On a search screen, Backspace behaves contextually: while typing a
query it edits the text rather than navigating away; from a results
view it returns you to a fresh query input; returning to a search
screen from a selected result restores that same results list, not an
empty query.

## Commands

- `npm start`: Launch the CLI
- `npm run login`: Re-authenticate when the token expires
- `npm run type-check`: Type-check the project
- `npm run lint`: Lint the project
- `npm test`: Run unit tests

## Controls

- ↑ / ↓ — move selection
- Enter — open / expand / submit
- Backspace — go back (context-sensitive on search screens, see above)
- Ctrl+C twice within ~1s — quit (a single press is ignored)
- `t` (in a feed) — cycle sort: hot → top → new → controversial
- `h` / `g` / `s` / `j` — footer nav bar: jump to Home Threads / Global
  Search / Search Subreddits / Joined Subreddits from anywhere (inert
  while a search query box has focus)
- Enter (on an image tag) — open that image full-screen
- ← / → (in the image viewer) — page through a gallery of images
- Backspace / Delete / Esc (in the image viewer) — close and return

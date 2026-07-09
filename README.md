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

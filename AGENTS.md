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

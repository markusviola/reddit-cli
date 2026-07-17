export type ImageProtocol = 'iterm' | 'kitty' | 'sixels' | 'symbols';

export type TerminalEnv = {
  TERM?: string | undefined;
  TERM_PROGRAM?: string | undefined;
  KITTY_WINDOW_ID?: string | undefined;
  WEZTERM_PANE?: string | undefined;
};

// Picks the chafa --format for the current terminal. chafa can only
// auto-detect when writing to a TTY, and we capture its output, so we
// choose the protocol ourselves and fall back to ANSI-art symbols.
export function detectImageProtocol(env: TerminalEnv): ImageProtocol {
  const term = (env.TERM ?? '').toLowerCase();
  const program = (env.TERM_PROGRAM ?? '').toLowerCase();

  if (env.KITTY_WINDOW_ID !== undefined || term.includes('kitty')) return 'kitty';
  if (program === 'iterm.app' || program === 'wezterm' || env.WEZTERM_PANE !== undefined) return 'iterm';
  if (program === 'mintty' || term.includes('sixel') || term.includes('mlterm')) return 'sixels';
  return 'symbols';
}

// True for protocols whose output is a single escape sequence with no
// embedded newlines, so rendered row count can't be counted from the
// string and must be reserved from the requested cell size.
export function isGraphicsProtocol(protocol: ImageProtocol): boolean {
  return protocol !== 'symbols';
}

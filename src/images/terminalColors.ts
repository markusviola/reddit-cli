export type Rgb = { r: number; g: number; b: number };

export type TerminalColors = { foreground: Rgb; background: Rgb };

/** Fallback theme when the terminal never answers the OSC query. */
export const DEFAULT_FOREGROUND: Rgb = { r: 255, g: 255, b: 255 };

/** Fallback theme when the terminal never answers the OSC query. */
export const DEFAULT_BACKGROUND: Rgb = { r: 0, g: 0, b: 0 };

/** OSC 10 (foreground) and OSC 11 (background) color queries. */
export const OSC_QUERY = '\x1b]10;?\x07\x1b]11;?\x07';

/** How long to wait for the terminal to answer before falling back. */
const QUERY_TIMEOUT_MS = 200;

// Matches an OSC 10/11 color report: ESC ] (10|11) ; rgb: R/G/B
// terminated by BEL or ST, with 1-4 hex digits per channel.
// eslint-disable-next-line no-control-regex
const OSC_COLOR = /\x1b\](10|11);rgb:([0-9a-fA-F]{1,4})\/([0-9a-fA-F]{1,4})\/([0-9a-fA-F]{1,4})(?:\x07|\x1b\\)/g;

/** Scales a variable-width hex channel to an 8-bit value. */
function scaleChannel(hex: string): number {
  const max = (1 << (hex.length * 4)) - 1;
  return Math.round((parseInt(hex, 16) / max) * 255);
}

// Extracts foreground (OSC 10) and background (OSC 11) colors from a
// raw terminal response. Missing or malformed reports yield null so the
// caller can fall back to defaults.
export function parseOscColors(raw: string): { foreground: Rgb | null; background: Rgb | null } {
  let foreground: Rgb | null = null;
  let background: Rgb | null = null;
  OSC_COLOR.lastIndex = 0;
  for (let match = OSC_COLOR.exec(raw); match !== null; match = OSC_COLOR.exec(raw)) {
    const color: Rgb = { r: scaleChannel(match[2]!), g: scaleChannel(match[3]!), b: scaleChannel(match[4]!) };
    if (match[1] === '10') foreground = color;
    else background = color;
  }
  return { foreground, background };
}

// Accumulates raw stdin bytes during a color query, parses any complete
// OSC 10/11 reports, and reports the leftover (non-OSC) bytes so the
// caller's keypress loop never loses a real keystroke.
export class ColorProbe {
  private pending = '';
  foreground: Rgb | null = null;
  background: Rgb | null = null;

  /** Invoked once both colors have been reported. */
  onComplete: (() => void) | null = null;

  /** True once both colors have been reported. */
  get complete(): boolean {
    return this.foreground !== null && this.background !== null;
  }

  // Feeds a chunk, consuming complete OSC color reports and holding any
  // trailing incomplete OSC sequence; returns bytes that are not part of
  // a color report (e.g. a keypress that arrived mid-query).
  feed(chunk: string): string {
    this.pending += chunk;
    const { foreground, background } = parseOscColors(this.pending);
    if (foreground !== null) this.foreground = foreground;
    if (background !== null) this.background = background;
    if (this.complete && this.onComplete !== null) this.onComplete();

    let rest = '';
    let index = 0;
    OSC_COLOR.lastIndex = 0;
    for (let match = OSC_COLOR.exec(this.pending); match !== null; match = OSC_COLOR.exec(this.pending)) {
      rest += this.pending.slice(index, match.index);
      index = match.index + match[0].length;
    }
    const tail = this.pending.slice(index);
    const cut = tail.indexOf('\x1b]');
    if (cut === -1) {
      this.pending = '';
      return rest + tail;
    }
    this.pending = tail.slice(cut);
    return rest + tail.slice(0, cut);
  }
}

export type ColorQueryIo = {
  write: (data: string) => void;
  register: (probe: ColorProbe | null) => void;
};

let cached: TerminalColors | null = null;

// Queries the terminal's real foreground/background once per process and
// caches the result. Shares the caller's existing raw-stdin listener via
// `register`; falls back to white-on-black on timeout or a bad response.
export function detectTerminalColors(io: ColorQueryIo): Promise<TerminalColors> {
  if (cached !== null) return Promise.resolve(cached);
  return new Promise<TerminalColors>((resolve) => {
    const probe = new ColorProbe();
    let settled = false;
    const finish = (): void => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      io.register(null);
      cached = {
        foreground: probe.foreground ?? DEFAULT_FOREGROUND,
        background: probe.background ?? DEFAULT_BACKGROUND,
      };
      resolve(cached);
    };
    const timer = setTimeout(finish, QUERY_TIMEOUT_MS);
    probe.onComplete = finish;
    io.register(probe);
    io.write(OSC_QUERY);
  });
}

/** Resets the cached detection; used only by tests. */
export function resetTerminalColorsCache(): void {
  cached = null;
}

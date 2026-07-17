import { renderImage } from './chafa';
import { computeImageCellSize, IMAGE_MARGIN_ROWS } from './sizing';
import { detectTerminalColors } from './terminalColors';
import type { ImageProtocol } from './protocol';
import type { ColorProbe, TerminalColors } from './terminalColors';
import type { ImageAttachment } from '../reddit/types';

/** Clears the whole screen and parks the cursor at the top-left. */
const CLEAR_AND_HOME = '\x1B[2J\x1B[H';

/** Terminal size assumed when stdout reports no dimensions. */
const FALLBACK_TERMINAL = { columns: 80, rows: 24 };

/** How long a lone ESC waits before being read as the Escape key. */
const ESC_FLUSH_MS = 50;

export type ViewerKey = 'prev' | 'next' | 'close' | 'ignore';

// Parses one keypress off the front of the raw byte buffer. Returns the
// key plus bytes consumed, or null when an escape sequence is still
// arriving split across data chunks and needs more bytes to decode.
export function parseKey(buffer: string): { key: ViewerKey; consumed: number } | null {
  const first = buffer.charCodeAt(0);
  if (first === 0x1b) {
    if (buffer.length === 1) return null;
    const introducer = buffer[1];
    if (introducer === '[' || introducer === 'O') {
      if (buffer.length < 3) return null;
      const final = buffer[2];
      if (final === 'C') return { key: 'next', consumed: 3 };
      if (final === 'D') return { key: 'prev', consumed: 3 };
      return { key: 'ignore', consumed: 3 };
    }
    return { key: 'close', consumed: 2 };
  }
  if (first === 0x7f || first === 0x08 || first === 0x03) return { key: 'close', consumed: 1 };
  return { key: 'ignore', consumed: 1 };
}

/** Live terminal size read straight from stdout (outside Ink's tree). */
function terminalSize(stdout: NodeJS.WriteStream): { columns: number; rows: number } {
  return {
    columns: stdout.columns ?? FALLBACK_TERMINAL.columns,
    rows: stdout.rows ?? FALLBACK_TERMINAL.rows,
  };
}

// Clears the screen and draws one image centered with a top margin,
// sizing it with the shared cell-size math. Render failures print a
// short message instead of corrupting the screen.
async function drawImage(
  stdout: NodeJS.WriteStream,
  attachment: ImageAttachment,
  index: number,
  protocol: ImageProtocol,
  colors: TerminalColors
): Promise<void> {
  stdout.write(CLEAR_AND_HOME);
  const image = attachment.images[index];
  if (image === undefined) return;
  const term = terminalSize(stdout);
  const cell = computeImageCellSize({ width: image.width, height: image.height }, term);
  let body: string;
  try {
    body = await renderImage(image.url, cell, protocol, colors);
  } catch {
    body = 'failed to render image';
  }
  const leftPad = Math.max(0, Math.floor((term.columns - cell.cols) / 2));
  const pad = ' '.repeat(leftPad);
  const centered = leftPad > 0 ? body.split('\n').map((line) => pad + line).join('\n') : body;
  stdout.write('\n'.repeat(IMAGE_MARGIN_ROWS));
  stdout.write(centered);
}

// Full-screen image viewer driven by raw stdin, meant to run inside
// Ink's suspendTerminal so its output bypasses Ink's text wrapping.
// Left/Right page a gallery in place; Backspace/Delete/Esc return.
export async function runStandaloneImageViewer(attachment: ImageAttachment, protocol: ImageProtocol): Promise<void> {
  const count = attachment.images.length;
  if (count === 0) return;

  const stdin = process.stdin;
  const stdout = process.stdout;
  const isTty = Boolean(stdin.isTTY);
  const previousRaw = isTty ? stdin.isRaw : false;

  let buffer = '';
  const queue: ViewerKey[] = [];
  let pendingResolve: ((key: ViewerKey) => void) | null = null;
  let escTimer: ReturnType<typeof setTimeout> | null = null;
  let colorProbe: ColorProbe | null = null;

  function emit(): void {
    if (pendingResolve !== null && queue.length > 0) {
      const resolve = pendingResolve;
      pendingResolve = null;
      resolve(queue.shift() as ViewerKey);
    }
  }

  function drain(): void {
    while (buffer.length > 0) {
      const parsed = parseKey(buffer);
      if (parsed === null) {
        if (buffer === '\x1b' && escTimer === null) {
          escTimer = setTimeout(() => {
            escTimer = null;
            if (buffer === '\x1b') {
              buffer = '';
              queue.push('close');
              emit();
            }
          }, ESC_FLUSH_MS);
        }
        return;
      }
      buffer = buffer.slice(parsed.consumed);
      queue.push(parsed.key);
    }
    emit();
  }

  function onData(data: Buffer | string): void {
    if (escTimer !== null) {
      clearTimeout(escTimer);
      escTimer = null;
    }
    let text = typeof data === 'string' ? data : data.toString('latin1');
    if (colorProbe !== null) text = colorProbe.feed(text);
    if (text.length === 0) return;
    buffer += text;
    drain();
  }

  function nextKey(): Promise<ViewerKey> {
    if (queue.length > 0) return Promise.resolve(queue.shift() as ViewerKey);
    return new Promise<ViewerKey>((resolve) => {
      pendingResolve = resolve;
    });
  }

  if (isTty) {
    try {
      stdin.setRawMode(true);
    } catch {
      // Non-fatal: without raw mode navigation is degraded, not broken.
    }
  }
  stdin.on('data', onData);
  stdin.resume();
  // Ink's suspendTerminal unrefs stdin before handing off the terminal
  // (nothing else here keeps the event loop alive), so without this the
  // process exits the instant the image finishes drawing, before any
  // keypress can arrive.
  stdin.ref();

  try {
    const colors = await detectTerminalColors({
      write: (chunk) => stdout.write(chunk),
      register: (probe) => {
        colorProbe = probe;
      },
    });
    let index = 0;
    await drawImage(stdout, attachment, index, protocol, colors);
    for (;;) {
      const key = await nextKey();
      if (key === 'close') break;
      if (count > 1 && (key === 'prev' || key === 'next')) {
        index = (index + (key === 'next' ? 1 : -1) + count) % count;
        await drawImage(stdout, attachment, index, protocol, colors);
      }
    }
  } finally {
    if (escTimer !== null) clearTimeout(escTimer);
    stdin.off('data', onData);
    stdin.unref();
    if (isTty) {
      try {
        stdin.setRawMode(previousRaw);
      } catch {
        // Ink re-asserts its own raw mode when the suspension ends.
      }
    }
    stdout.write(CLEAR_AND_HOME);
  }
}

import { spawn } from 'node:child_process';
import { ditherImage } from './dither';
import { isGraphicsProtocol } from './protocol';
import type { ImageProtocol } from './protocol';
import type { CellSize } from './sizing';
import type { TerminalColors } from './terminalColors';

// The image is pre-quantized to a real 2-color Bayer dither before it
// reaches chafa, so chafa must transport those exact colors without any
// per-cell re-quantization or re-dithering of its own.
const BASE_ARGS = ['-c', 'full', '--dither', 'none'];

let availabilityPromise: Promise<boolean> | null = null;
let chafaAvailable = false;
const bytesCache = new Map<string, Promise<Buffer>>();
const renderCache = new Map<string, string>();

// Detects chafa once at startup and caches the result. Never rejects;
// a missing or broken chafa resolves to false.
export function detectChafa(): Promise<boolean> {
  if (availabilityPromise === null) {
    availabilityPromise = new Promise<boolean>((resolve) => {
      try {
        const child = spawn('chafa', ['--version'], { stdio: 'ignore' });
        child.on('error', () => resolve(false));
        child.on('close', (code) => resolve(code === 0));
      } catch {
        resolve(false);
      }
    });
  }
  return availabilityPromise;
}

/** Synchronous view of the cached detection, if it has resolved. */
export function isChafaKnownAvailable(): boolean {
  return chafaAvailable;
}

void detectChafa().then((available) => {
  chafaAvailable = available;
});

// Drops every cached escape-sequence render (called on terminal
// resize); keeps the fetched image bytes so we never re-download.
export function invalidateRenderCache(): void {
  renderCache.clear();
}

function fetchBytes(url: string): Promise<Buffer> {
  const cached = bytesCache.get(url);
  if (cached !== undefined) return cached;
  const promise = fetch(url)
    .then((response) => {
      if (!response.ok) throw new Error(`image fetch failed: ${response.status}`);
      return response.arrayBuffer();
    })
    .then((buffer) => Buffer.from(buffer))
    .catch((error) => {
      bytesCache.delete(url);
      throw error;
    });
  bytesCache.set(url, promise);
  return promise;
}

function colorKey(colors: TerminalColors): string {
  const { foreground: f, background: b } = colors;
  return `${f.r},${f.g},${f.b}/${b.r},${b.g},${b.b}`;
}

function renderKey(url: string, size: CellSize, protocol: ImageProtocol, colors: TerminalColors): string {
  return `${url}@${size.cols}x${size.rows}@${protocol}@${colorKey(colors)}`;
}

// Renders an image to a terminal escape sequence at the given cell
// size, caching the output in memory and never writing to disk. The
// bytes are pre-dithered to a 2-color image, then piped to chafa via
// stdin for protocol encoding only.
export async function renderImage(
  url: string,
  size: CellSize,
  protocol: ImageProtocol,
  colors: TerminalColors
): Promise<string> {
  const key = renderKey(url, size, protocol, colors);
  const cached = renderCache.get(key);
  if (cached !== undefined) return cached;
  const bytes = await fetchBytes(url);
  const encoded = isGraphicsProtocol(protocol)
    ? await ditherImage(bytes, size, protocol, colors.foreground, colors.background)
    : bytes;
  const output = await runChafa(encoded, size, protocol);
  renderCache.set(key, output);
  return output;
}

function runChafa(bytes: Buffer, size: CellSize, protocol: ImageProtocol): Promise<string> {
  // --stretch fills the exact cols x rows we computed; without it chafa
  // re-derives its own aspect-fit inside that box using its own cell-aspect
  // assumption, which double-corrects against our own math and distorts it.
  const args = [...BASE_ARGS, '--format', protocol, '--size', `${size.cols}x${size.rows}`, '--stretch', '-'];
  return new Promise<string>((resolve, reject) => {
    const child = spawn('chafa', args, { stdio: ['pipe', 'pipe', 'ignore'] });
    let output = '';
    child.stdout.setEncoding('utf8');
    child.stdout.on('data', (chunk: string) => {
      output += chunk;
    });
    child.on('error', reject);
    child.on('close', (code) => {
      if (code === 0) resolve(output);
      else reject(new Error(`chafa exited with code ${code ?? 'null'}`));
    });
    child.stdin.on('error', () => undefined);
    child.stdin.end(bytes);
  });
}

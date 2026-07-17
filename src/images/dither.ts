import sharp from 'sharp';
import type { ImageProtocol } from './protocol';
import type { CellSize } from './sizing';
import type { Rgb } from './terminalColors';

/** Pixel width chafa renders per character cell (iterm/kitty/sixels). */
export const CELL_PIXEL_WIDTH = 10;

/** Pixel height chafa renders per character cell (iterm/kitty/sixels). */
export const CELL_PIXEL_HEIGHT = 20;

// 4x4 Bayer ordered-dither matrix (values 0..15). The normalized cell
// value gives the luminance threshold at each pixel position.
const BAYER_4X4 = [
  [0, 8, 2, 10],
  [12, 4, 14, 6],
  [3, 11, 1, 9],
  [15, 7, 13, 5],
];

/** Rec. 601 relative luminance of an 8-bit RGB color (0..255). */
export function luminance(color: Rgb): number {
  return 0.299 * color.r + 0.587 * color.g + 0.114 * color.b;
}

/** Bayer threshold in 0..255 for a pixel at (x, y). */
export function bayerThreshold(x: number, y: number): number {
  const cell = BAYER_4X4[y & 3]![x & 3]!;
  return ((cell + 0.5) / 16) * 255;
}

// Maps every luminance pixel to one of two exact RGB colors using a
// 4x4 ordered (Bayer) dither. A pixel brighter than its Bayer
// threshold becomes `high`, otherwise `low`; the result is a genuine
// 1-bit image encoded as 3-channel RGB bytes.
export function ditherToTwoColor(
  luma: Uint8Array | number[],
  width: number,
  height: number,
  high: Rgb,
  low: Rgb
): Uint8Array {
  const out = new Uint8Array(width * height * 3);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const value = luma[y * width + x] ?? 0;
      const color = value > bayerThreshold(x, y) ? high : low;
      const o = (y * width + x) * 3;
      out[o] = color.r;
      out[o + 1] = color.g;
      out[o + 2] = color.b;
    }
  }
  return out;
}

// Per-cell pixel size chafa renders for a protocol. Empirically
// confirmed identical (10x20) for iterm, kitty, and sixels.
export function cellPixelSize(protocol: ImageProtocol): { width: number; height: number } {
  switch (protocol) {
    case 'iterm':
    case 'kitty':
    case 'sixels':
    case 'symbols':
      return { width: CELL_PIXEL_WIDTH, height: CELL_PIXEL_HEIGHT };
  }
}

// Decodes image bytes, resizes to the exact pixel grid the cell size
// needs (matching chafa's --stretch), reduces to a true 2-color Bayer
// dither between the terminal's colors, and re-encodes as a PNG that
// chafa transports without any further color decisions.
export async function ditherImage(
  bytes: Buffer,
  size: CellSize,
  protocol: ImageProtocol,
  foreground: Rgb,
  background: Rgb
): Promise<Buffer> {
  const cell = cellPixelSize(protocol);
  const width = Math.max(1, size.cols * cell.width);
  const height = Math.max(1, size.rows * cell.height);
  const [high, low] =
    luminance(foreground) >= luminance(background) ? [foreground, background] : [background, foreground];

  const { data, info } = await sharp(bytes)
    .resize(width, height, { fit: 'fill' })
    .removeAlpha()
    .grayscale()
    .raw()
    .toBuffer({ resolveWithObject: true });

  const channels = info.channels;
  const luma = new Uint8Array(width * height);
  for (let i = 0; i < luma.length; i++) luma[i] = data[i * channels] ?? 0;

  const rgb = ditherToTwoColor(luma, width, height, high, low);
  return sharp(Buffer.from(rgb.buffer, rgb.byteOffset, rgb.byteLength), {
    raw: { width, height, channels: 3 },
  })
    .png()
    .toBuffer();
}

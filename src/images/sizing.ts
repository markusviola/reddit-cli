export type PixelSize = { width: number; height: number };

export type TerminalSize = { columns: number; rows: number };

export type CellSize = { cols: number; rows: number };

export type SizingOptions = {
  cellAspect?: number;
  cellPixelWidth?: number;
};

/** Terminal character cell height:width ratio (cells are ~twice as tall). */
const DEFAULT_CELL_ASPECT = 0.5;

/** Assumed pixel width of one character cell (no portable API exposes it). */
const DEFAULT_CELL_PIXEL_WIDTH = 10;

/** Fallback aspect when the image reports no pixel dimensions. */
const FALLBACK_PIXEL: PixelSize = { width: 16, height: 9 };

// Computes the character-cell rectangle a chafa-rendered image should
// occupy: target width is two thirds of the terminal, never upscaled
// past the image's native cell width, and shrunk if its height would
// exceed two thirds of the terminal.
export function computeImageCellSize(image: PixelSize, terminal: TerminalSize, options: SizingOptions = {}): CellSize {
  const cellAspect = options.cellAspect ?? DEFAULT_CELL_ASPECT;
  const cellPixelWidth = options.cellPixelWidth ?? DEFAULT_CELL_PIXEL_WIDTH;
  const pixels = image.width > 0 && image.height > 0 ? image : FALLBACK_PIXEL;

  const targetWidth = Math.max(1, Math.floor((terminal.columns * 2) / 3));
  const nativeCols = Math.max(1, Math.round(pixels.width / cellPixelWidth));
  let cols = Math.min(nativeCols, targetWidth);
  let rows = rowsForCols(cols, pixels, cellAspect);

  const maxRows = Math.max(1, Math.floor((terminal.rows * 2) / 3));
  if (rows > maxRows) {
    cols = Math.max(1, Math.floor((cols * maxRows) / rows));
    rows = rowsForCols(cols, pixels, cellAspect);
  }
  return { cols, rows: Math.min(rows, maxRows) };
}

function rowsForCols(cols: number, pixels: PixelSize, cellAspect: number): number {
  return Math.max(1, Math.round((cols * pixels.height * cellAspect) / pixels.width));
}

/** Blank rows reserved above and below a rendered image block. */
export const IMAGE_MARGIN_ROWS = 2;

/** Top + bottom rows of the highlight outline drawn around an image. */
export const IMAGE_BORDER_ROWS = 2;

// Total terminal rows an open image occupies for windowing: margins,
// the outline, the image itself, and a carousel counter for galleries.
export function reservedRowsForImage(cellSize: CellSize, isGallery: boolean): number {
  return cellSize.rows + IMAGE_MARGIN_ROWS * 2 + IMAGE_BORDER_ROWS + (isGallery ? 1 : 0);
}

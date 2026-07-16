import { estimateWrappedLines } from './textMetrics';

// Splits text into paragraphs, further splitting any paragraph that
// wraps past maxLines into consecutive, in-order, <=maxLines pieces.
export function chunkText(text: string, columns: number, maxLines: number): string[] {
  const paragraphs = text
    .split(/\n{2,}/)
    .map((paragraph) => paragraph.trim())
    .filter((paragraph) => paragraph.length > 0);

  const chunks: string[] = [];
  for (const paragraph of paragraphs) {
    if (estimateWrappedLines(paragraph, columns) <= maxLines) {
      chunks.push(paragraph);
    } else {
      chunks.push(...splitByLineLimit(paragraph, columns, maxLines));
    }
  }
  return chunks;
}

function splitByLineLimit(paragraph: string, columns: number, maxLines: number): string[] {
  const words = paragraph.split(' ');
  const chunks: string[] = [];
  let current: string[] = [];

  for (const word of words) {
    const candidate = [...current, word].join(' ');
    if (current.length > 0 && estimateWrappedLines(candidate, columns) > maxLines) {
      chunks.push(current.join(' '));
      current = [word];
    } else {
      current.push(word);
    }
  }
  if (current.length > 0) chunks.push(current.join(' '));
  return chunks;
}

import stringWidth from 'string-width';

// Estimates rendered line count for wrapped terminal text.
export function estimateWrappedLines(text: string, width: number): number {
  const safeWidth = Math.max(1, width);
  return text.split('\n').reduce((total, line) => total + wrapLineCount(line, safeWidth), 0);
}

// Greedy word-wrap matching wrap-ansi(hard:true): wraps at
// spaces, hard-breaks an overlong word by column width.
// Cuts text down to fit within maxLines when wrapped, appending an
// ellipsis. Keeps whole words, in order, never reordering or
// splitting a word — the returned string (ellipsis included) always
// itself fits within maxLines.
export function truncateToLines(text: string, width: number, maxLines: number): string {
  if (estimateWrappedLines(text, width) <= maxLines) return text;

  const words = text.split(' ');
  let kept = '';
  for (const word of words) {
    const candidate = kept.length === 0 ? word : `${kept} ${word}`;
    if (estimateWrappedLines(`${candidate}…`, width) > maxLines) break;
    kept = candidate;
  }
  return `${kept}…`;
}

function wrapLineCount(line: string, width: number): number {
  let lines = 1;
  let current = 0;

  for (const word of line.split(' ')) {
    const wordLength = stringWidth(word);
    const fitsAfterSpace = current > 0 && current + 1 + wordLength <= width;

    if (fitsAfterSpace) {
      current += 1 + wordLength;
      continue;
    }
    if (current > 0) {
      lines += 1;
    }
    if (wordLength <= width) {
      current = wordLength;
      continue;
    }
    lines += Math.ceil(wordLength / width) - 1;
    current = wordLength % width === 0 ? width : wordLength % width;
  }

  return lines;
}

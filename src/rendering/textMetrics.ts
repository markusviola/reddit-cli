import stringWidth from 'string-width';

// Estimates rendered line count for wrapped terminal text.
export function estimateWrappedLines(text: string, width: number): number {
  const safeWidth = Math.max(1, width);
  return text.split('\n').reduce((total, line) => total + wrapLineCount(line, safeWidth), 0);
}

// Greedy word-wrap matching wrap-ansi(hard:true): wraps at
// spaces, hard-breaks an overlong word by column width.
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

import React from 'react';
import { Box, Text } from 'ink';
import { estimateWrappedLines } from '../rendering/textMetrics';

const FOOTER_TEXT = 'Home Threads (h) | Global Search (g) | Search Subreddits (s) | Joined Subreddits (j)';

const BORDER_ROWS = 2;
const BORDER_COLUMNS = 2;

/** Real rendered height of the footer at a given terminal width. */
export function computeFooterHeight(columns: number): number {
  const innerWidth = Math.max(1, columns - BORDER_COLUMNS);
  return estimateWrappedLines(FOOTER_TEXT, innerWidth) + BORDER_ROWS;
}

export function Footer(): React.ReactElement {
  return (
    <Box borderStyle="single" borderColor="#014D4D" width="100%">
      <Text>{FOOTER_TEXT}</Text>
    </Box>
  );
}

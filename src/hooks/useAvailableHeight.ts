import { useWindowSize } from 'ink';
import { computeFooterHeight } from '../components/Footer';

export type UseAvailableHeightResult = {
  columns: number;
  availableHeight: number;
};

// Rows left below a header and above the always-present footer, sized
// synchronously (no post-render measurement) to avoid an oversized
// frame. Reserves one extra row of margin against text-wrapping
// estimation slop.
const SAFETY_MARGIN_ROWS = 1;

export function useAvailableHeight(computeHeaderLines: (columns: number) => number): UseAvailableHeightResult {
  const { rows, columns } = useWindowSize();
  return {
    columns,
    availableHeight: Math.max(1, rows - computeHeaderLines(columns) - computeFooterHeight(columns) - SAFETY_MARGIN_ROWS),
  };
}

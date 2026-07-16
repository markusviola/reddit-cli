import { useWindowSize } from 'ink';

export type UseAvailableHeightResult = {
  columns: number;
  availableHeight: number;
};

// Rows left below a header, sized synchronously (no
// post-render measurement) to avoid an oversized frame.
export function useAvailableHeight(computeHeaderLines: (columns: number) => number): UseAvailableHeightResult {
  const { rows, columns } = useWindowSize();
  return { columns, availableHeight: Math.max(1, rows - computeHeaderLines(columns)) };
}

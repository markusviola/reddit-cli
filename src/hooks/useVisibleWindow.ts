import { useState } from 'react';
import { advanceVisibleWindowWithIndicators, INITIAL_VISIBLE_WINDOW } from './windowing';
import type { VisibleWindow, VisibleWindowWithIndicators } from './windowing';

// Persists the sticky window across renders so it only jumps when
// the selection would otherwise go off-screen (see windowing.ts).
export function useVisibleWindow(
  itemCount: number,
  selectedIndex: number,
  itemHeights: number[],
  availableHeight: number
): VisibleWindowWithIndicators {
  const [previous, setPrevious] = useState<VisibleWindow>(INITIAL_VISIBLE_WINDOW);
  const next = advanceVisibleWindowWithIndicators(previous, itemCount, selectedIndex, itemHeights, availableHeight);
  if (next.start !== previous.start || next.end !== previous.end) {
    setPrevious({ start: next.start, end: next.end });
  }
  return next;
}

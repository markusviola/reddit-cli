export type VisibleWindow = { start: number; end: number };

export type VisibleWindowWithIndicators = VisibleWindow & {
  hasAbove: boolean;
  hasBelow: boolean;
};

export const INITIAL_VISIBLE_WINDOW: VisibleWindow = { start: 0, end: 0 };

type HeightAt = (index: number) => number;

// Sticky: stays put while the selection is already inside it. Only
// jumps when the selection would otherwise go off-screen, landing the
// selection on whichever edge (top/bottom) it crossed.
export function advanceVisibleWindow(
  previous: VisibleWindow,
  itemCount: number,
  selectedIndex: number,
  itemHeights: number[],
  availableHeight: number
): VisibleWindow {
  if (itemCount === 0) return { start: 0, end: 0 };
  const clampedIndex = Math.min(Math.max(selectedIndex, 0), itemCount - 1);
  const heightAt: HeightAt = (index) => itemHeights[index] ?? 1;

  const isInitialized = previous.end > previous.start;
  if (!isInitialized) {
    return growForward(clampedIndex, itemCount, heightAt, availableHeight);
  }

  const start = Math.min(previous.start, itemCount - 1);
  const end = Math.max(start + 1, Math.min(previous.end, itemCount));

  if (clampedIndex >= end) {
    return growForward(clampedIndex, itemCount, heightAt, availableHeight);
  }
  if (clampedIndex < start) {
    return growBackward(clampedIndex, heightAt, availableHeight);
  }
  return shrinkToFit(start, end, clampedIndex, heightAt, availableHeight);
}

// Same as advanceVisibleWindow, reserving room for "N more
// above/below" indicator lines when needed.
export function advanceVisibleWindowWithIndicators(
  previous: VisibleWindow,
  itemCount: number,
  selectedIndex: number,
  itemHeights: number[],
  availableHeight: number
): VisibleWindowWithIndicators {
  const firstPass = advanceVisibleWindow(previous, itemCount, selectedIndex, itemHeights, availableHeight);
  const indicatorLines = (firstPass.start > 0 ? 1 : 0) + (firstPass.end < itemCount ? 1 : 0);
  if (indicatorLines === 0) {
    return { ...firstPass, hasAbove: false, hasBelow: false };
  }
  const reducedHeight = Math.max(1, availableHeight - indicatorLines);
  const secondPass = advanceVisibleWindow(previous, itemCount, selectedIndex, itemHeights, reducedHeight);
  return {
    start: secondPass.start,
    end: secondPass.end,
    hasAbove: secondPass.start > 0,
    hasBelow: secondPass.end < itemCount,
  };
}

// Anchors the selection as the window's top edge, filling downward.
function growForward(anchorIndex: number, itemCount: number, heightAt: HeightAt, availableHeight: number): VisibleWindow {
  let end = anchorIndex + 1;
  let used = heightAt(anchorIndex);
  while (end < itemCount && used + heightAt(end) <= availableHeight) {
    used += heightAt(end);
    end += 1;
  }
  return { start: anchorIndex, end };
}

// Anchors the selection as the window's bottom edge, filling upward.
function growBackward(anchorIndex: number, heightAt: HeightAt, availableHeight: number): VisibleWindow {
  let start = anchorIndex;
  let used = heightAt(anchorIndex);
  while (start > 0 && used + heightAt(start - 1) <= availableHeight) {
    start -= 1;
    used += heightAt(start);
  }
  return { start, end: anchorIndex + 1 };
}

// Trims from whichever edge is farther from the selection until the
// window fits its budget again (item heights or terminal size changed).
function shrinkToFit(
  start: number,
  end: number,
  selectedIndex: number,
  heightAt: HeightAt,
  availableHeight: number
): VisibleWindow {
  let total = sumHeights(start, end, heightAt);
  while (total > availableHeight && end - start > 1) {
    const distanceFromStart = selectedIndex - start;
    const distanceFromEnd = end - 1 - selectedIndex;
    if (distanceFromEnd > distanceFromStart) {
      end -= 1;
      total -= heightAt(end);
    } else {
      total -= heightAt(start);
      start += 1;
    }
  }
  return { start, end };
}

function sumHeights(start: number, end: number, heightAt: HeightAt): number {
  let total = 0;
  for (let index = start; index < end; index += 1) {
    total += heightAt(index);
  }
  return total;
}

export type VisibleWindow = { start: number; end: number };

export type VisibleWindowWithIndicators = VisibleWindow & {
  hasAbove: boolean;
  hasBelow: boolean;
};

// Grows outward from selection until height budget fills.
export function computeVisibleWindow(
  itemCount: number,
  selectedIndex: number,
  itemHeights: number[],
  availableHeight: number
): VisibleWindow {
  if (itemCount === 0) return { start: 0, end: 0 };
  const clampedIndex = Math.min(Math.max(selectedIndex, 0), itemCount - 1);
  const heightAt = (index: number): number => itemHeights[index] ?? 1;

  let start = clampedIndex;
  let end = clampedIndex + 1;
  let used = heightAt(clampedIndex);
  let growUp = true;

  while (used < availableHeight && (start > 0 || end < itemCount)) {
    if (growUp && start > 0) {
      start -= 1;
      used += heightAt(start);
    } else if (end < itemCount) {
      used += heightAt(end);
      end += 1;
    } else if (start > 0) {
      start -= 1;
      used += heightAt(start);
    } else {
      break;
    }
    growUp = !growUp;
  }

  return { start, end };
}

// Same as computeVisibleWindow, reserving room for "N more
// above/below" indicator lines when needed.
export function computeVisibleWindowWithIndicators(
  itemCount: number,
  selectedIndex: number,
  itemHeights: number[],
  availableHeight: number
): VisibleWindowWithIndicators {
  const firstPass = computeVisibleWindow(itemCount, selectedIndex, itemHeights, availableHeight);
  const indicatorLines = (firstPass.start > 0 ? 1 : 0) + (firstPass.end < itemCount ? 1 : 0);
  if (indicatorLines === 0) {
    return { ...firstPass, hasAbove: false, hasBelow: false };
  }
  const reducedHeight = Math.max(1, availableHeight - indicatorLines);
  const secondPass = computeVisibleWindow(itemCount, selectedIndex, itemHeights, reducedHeight);
  return {
    start: secondPass.start,
    end: secondPass.end,
    hasAbove: secondPass.start > 0,
    hasBelow: secondPass.end < itemCount,
  };
}

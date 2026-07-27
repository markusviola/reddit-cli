const MINUTE = 60;
const HOUR = MINUTE * 60;
const DAY = HOUR * 24;
const MONTH = DAY * 30;
const YEAR = DAY * 365;

const UNITS: { seconds: number; label: string }[] = [
  { seconds: YEAR, label: 'yr' },
  { seconds: MONTH, label: 'mo' },
  { seconds: DAY, label: 'd' },
  { seconds: HOUR, label: 'hr' },
  { seconds: MINUTE, label: 'min' },
];

/** Formats a UTC timestamp as `<n><unit> ago`, e.g. `3hr ago`. */
export function formatRelativeTime(createdUtc: number, nowSeconds: number): string {
  const elapsed = Math.max(0, nowSeconds - createdUtc);
  for (const unit of UNITS) {
    const count = Math.floor(elapsed / unit.seconds);
    if (count >= 1) return `${count}${unit.label} ago`;
  }
  return 'just now';
}

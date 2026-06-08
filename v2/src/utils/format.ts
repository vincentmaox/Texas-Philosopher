/** Format chips amount with comma separators */
export function formatChips(n: number): string {
  return n.toLocaleString('zh-CN');
}

/** Format as big blinds */
export function formatBB(n: number, bb: number): string {
  const val = n / bb;
  return val >= 0 ? `+${val.toFixed(1)} BB` : `${val.toFixed(1)} BB`;
}

/** Format percentage */
export function formatPercent(n: number): string {
  return `${Math.round(n * 100)}%`;
}

/** Format time in minutes */
export function formatTime(minutes: number): string {
  if (minutes < 60) return `${minutes}分钟`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m > 0 ? `${h}小时${m}分钟` : `${h}小时`;
}

/** Short position name */
export function formatPosition(pos: string): string {
  return pos;
}

// (replace your file with this content)
export const HOURS: number[] = Array.from({ length: 24 }).map((_, i) => i);
export const MINUTES: string[] = ["00", "15", "30", "45"];

export function yToTime(y: number): string {
  // y is in 0..(24*48-1) grid where each step = 30s? (you used 48 steps per hour)
  const hour = Math.floor(y / 48);
  const rem = y % 48;
  const minuteIndex = Math.floor(rem / 12); // 0..3
  const minute = MINUTES[minuteIndex] ?? "00";
  return `${hour.toString().padStart(2, "0")}:${minute}`;
}

export function timeToY(time: string): number {
  const [hStr, mStr] = time.split(":");
  const h = Number(hStr) || 0;
  const m = Number(mStr) || 0;

  // typed mapping — ensures TS knows all values are numbers
  const minuteToStep: Record<number, number> = {
    0: 0,
    15: 12,
    30: 24,
    45: 36,
  };

  // fallback to 0 if unknown minute
  const step = minuteToStep[m] ?? 0;
  return h * 48 + step;
}

export function snapToGrid(y: number): number {
  return Math.round(y / 12) * 12;
}

import type { Granularity } from "../api/dashboard";

/** ISO yyyy-mm-dd, using local calendar month/day (no UTC shift). */
function toISODate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/** Trailing window ending at the start of next month, sized per granularity:
 *  12 months, 8 quarters (24 months), or 5 years. */
export function defaultTrendRange(granularity: Granularity): { start: string; end: string } {
  const now = new Date();
  const end = new Date(now.getFullYear(), now.getMonth() + 1, 1);
  let start: Date;
  if (granularity === "month") start = new Date(end.getFullYear(), end.getMonth() - 12, 1);
  else if (granularity === "quarter") start = new Date(end.getFullYear(), end.getMonth() - 24, 1);
  else start = new Date(end.getFullYear() - 5, end.getMonth(), 1);
  return { start: toISODate(start), end: toISODate(end) };
}

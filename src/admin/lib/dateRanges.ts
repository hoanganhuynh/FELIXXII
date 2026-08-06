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
  if (granularity === "day") {
    const end = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1); // tomorrow (exclusive)
    const start = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 29); // 30 days window
    return { start: toISODate(start), end: toISODate(end) };
  }
  const end = new Date(now.getFullYear(), now.getMonth() + 1, 1);
  let start: Date;
  if (granularity === "month") start = new Date(end.getFullYear(), end.getMonth() - 12, 1);
  else if (granularity === "quarter") start = new Date(end.getFullYear(), end.getMonth() - 24, 1);
  else start = new Date(end.getFullYear() - 5, end.getMonth(), 1);
  return { start: toISODate(start), end: toISODate(end) };
}

export function dashboardTrendRange(timeFilter: string): { granularity: Granularity; start: string; end: string } {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const tomorrow = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);

  if (timeFilter === "today") {
    return { granularity: "day", start: toISODate(today), end: toISODate(tomorrow) };
  }
  if (timeFilter === "yesterday") {
    const yesterday = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1);
    return { granularity: "day", start: toISODate(yesterday), end: toISODate(today) };
  }
  if (timeFilter === "7d") {
    const start = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 6);
    return { granularity: "day", start: toISODate(start), end: toISODate(tomorrow) };
  }
  if (timeFilter === "month") {
    const start = new Date(now.getFullYear(), now.getMonth(), 1);
    return { granularity: "day", start: toISODate(start), end: toISODate(tomorrow) };
  }
  if (timeFilter === "quarter") {
    const quarterStartMonth = Math.floor(now.getMonth() / 3) * 3;
    const start = new Date(now.getFullYear(), quarterStartMonth, 1);
    return { granularity: "month", start: toISODate(start), end: toISODate(tomorrow) };
  }
  if (timeFilter === "year") {
    const start = new Date(now.getFullYear(), 0, 1);
    return { granularity: "month", start: toISODate(start), end: toISODate(tomorrow) };
  }

  const fallback = defaultTrendRange("month");
  return { granularity: "month", ...fallback };
}

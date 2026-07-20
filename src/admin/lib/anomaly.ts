import type { TrendPoint } from "../api/dashboard";

export type AnomalyMetric = "revenue" | "orders" | "return_rate";

const RATE_METRICS = new Set<AnomalyMetric>(["return_rate"]);

/** Flags a bucket as anomalous when it deviates from the trailing
 *  3-bucket average by more than 25% (revenue/orders) or 2 percentage
 *  points (rate metrics like return_rate). Needs at least 1 prior
 *  bucket to compare against; returns null otherwise or when in-range. */
export function detectAnomaly(series: TrendPoint[], index: number): { metric: AnomalyMetric; direction: "up" | "down" } | null {
  if (index === 0) return null;
  const lookback = series.slice(Math.max(0, index - 3), index);
  if (lookback.length === 0) return null;

  const metrics: AnomalyMetric[] = ["revenue", "orders", "return_rate"];
  for (const metric of metrics) {
    const avg = lookback.reduce((sum, p) => sum + Number(p[metric]), 0) / lookback.length;
    const current = Number(series[index][metric]);
    if (RATE_METRICS.has(metric)) {
      if (Math.abs(current - avg) > 2) {
        return { metric, direction: current > avg ? "up" : "down" };
      }
    } else if (avg > 0 && Math.abs(current - avg) / avg > 0.25) {
      return { metric, direction: current > avg ? "up" : "down" };
    }
  }
  return null;
}

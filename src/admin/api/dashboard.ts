import { supabase } from "../../lib/supabase";

export interface DashboardStats {
  revenue: number;
  orders: number;
  aov: number;
  units: number;
  return_rate: number;
  conversion: number;
  by_category: { id: string; label: string; value: number }[];
  by_collection: { id: string; label: string; value: number }[];
  top: { id: string; name: string; style_code: string; images: string[]; revenue: number; units_sold: number }[];
  top_returned: { id: string; name: string; style_code: string; images: string[]; returned_qty: number }[];
  stock_outs: {
    id: string; name: string; style_code: string; images: string[];
    sku_count: number; units_sold: number; oos_count: number; low_count: number;
  }[];
  oos_skus: number;
  vip_count: number;
  vip_ltv: number;
  total_ltv: number;
  avg_ltv: number;
  repeat_rate_by_year: { year: number; rate: number }[];
  return_reasons: { reason: string; count: number; pct: number }[];
  // Smart analytics
  dead_stock: {
    id: string; name: string; style_code: string; images: string[];
    units_sold: number; views: number; price: number; category: string;
    total_stock: number; days_live: number; score: number;
    alert: "critical" | "warning" | "low_conversion" | "watch";
  }[];
  reorder_urgency: {
    id: string; name: string; style_code: string; images: string[];
    category: string; units_sold: number; total_stock: number;
    units_per_day: number; days_until_oos: number | null;
    urgency: "critical" | "warning" | "normal";
  }[];
  rpv_by_category: {
    id: string; label: string; revenue: number; views: number; units_sold: number; rpv: number;
  }[];
  return_revenue_by_cat: {
    id: string; label: string; paid_revenue: number; return_value: number; return_pct: number;
  }[];
  channel_perf: {
    channel: string; orders: number; revenue: number; aov: number;
  }[];
}

export const EMPTY_STATS: DashboardStats = {
  revenue: 0, orders: 0, aov: 0, units: 0, return_rate: 0, conversion: 0,
  by_category: [], by_collection: [], top: [], top_returned: [], stock_outs: [],
  oos_skus: 0, vip_count: 0, vip_ltv: 0, total_ltv: 0,
  avg_ltv: 0, repeat_rate_by_year: [], return_reasons: [],
  dead_stock: [], reorder_urgency: [], rpv_by_category: [],
  return_revenue_by_cat: [], channel_perf: [],
};


/** Every dashboard tile in ONE round trip — all aggregation happens in Postgres. */
export async function getDashboardStats(): Promise<DashboardStats> {
  const { data, error } = await supabase.rpc("dashboard_stats");
  if (error) throw error;
  return data as unknown as DashboardStats;
}

export type Granularity = "day" | "month" | "quarter" | "year";

export interface TrendPoint {
  bucket_start: string;
  bucket_label: string;
  revenue: number;
  orders: number;
  aov: number;
  return_rate: number;
  top_category_label: string | null;
}

export interface TrendDetailPoint {
  bucket_label: string;
  revenue: number;
  orders: number;
}

export async function getDashboardTrend(
  granularity: Granularity, rangeStart: string, rangeEnd: string
): Promise<TrendPoint[]> {
  const { data, error } = await supabase.rpc("dashboard_trend", {
    granularity, range_start: rangeStart, range_end: rangeEnd,
  });
  if (error) throw error;
  return (data ?? []) as unknown as TrendPoint[];
}

export async function getDashboardTrendDetail(
  bucketStart: string, bucketGranularity: Granularity
): Promise<TrendDetailPoint[]> {
  const { data, error } = await supabase.rpc("dashboard_trend_detail", {
    bucket_start: bucketStart, bucket_granularity: bucketGranularity,
  });
  if (error) throw error;
  return (data ?? []) as unknown as TrendDetailPoint[];
}

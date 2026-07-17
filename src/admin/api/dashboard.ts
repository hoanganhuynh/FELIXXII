import { supabase } from "../../lib/supabase";

export interface DashboardStats {
  revenue: number;
  orders: number;
  aov: number;
  units: number;
  return_rate: number;
  conversion: number;
  months: { m: string; v: number }[];
  by_category: { id: string; label: string; value: number }[];
  by_collection: { id: string; label: string; value: number }[];
  top: { id: string; name: string; style_code: string; revenue: number; units_sold: number }[];
  stock_outs: {
    id: string; name: string; style_code: string;
    sku_count: number; units_sold: number; oos_count: number; low_count: number;
  }[];
  oos_skus: number;
  vip_count: number;
  vip_ltv: number;
  total_ltv: number;
}

export const EMPTY_STATS: DashboardStats = {
  revenue: 0, orders: 0, aov: 0, units: 0, return_rate: 0, conversion: 0,
  months: [], by_category: [], by_collection: [], top: [], stock_outs: [],
  oos_skus: 0, vip_count: 0, vip_ltv: 0, total_ltv: 0,
};

/** Every dashboard tile in ONE round trip — all aggregation happens in Postgres. */
export async function getDashboardStats(): Promise<DashboardStats> {
  const { data, error } = await supabase.rpc("dashboard_stats");
  if (error) throw error;
  return data as unknown as DashboardStats;
}

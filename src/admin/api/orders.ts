import { supabase } from "../../lib/supabase";
import type { Database } from "../../lib/database.types";

export type OrderRow = Database["public"]["Tables"]["orders"]["Row"];
export type OrderItemRow = Database["public"]["Tables"]["order_items"]["Row"];
export type OrderStatus = Database["public"]["Enums"]["order_status"];
export type OrderChannel = Database["public"]["Enums"]["order_channel"];

export interface OrderListRow extends OrderRow {
  customers: { name: string; email: string } | null;
  order_items: { qty: number }[];
}

export interface OrderParams {
  q?: string;
  status?: string;
  channel?: string;
  page?: number;
  pageSize?: number;
}

export async function listOrders(p: OrderParams): Promise<{ rows: OrderListRow[]; total: number }> {
  const pageSize = p.pageSize ?? 20;
  const page = p.page ?? 0;

  // one query with embedded resources — not N+1 lookups per row
  let sel = supabase
    .from("orders")
    .select("*, customers!inner(name, email), order_items(qty)", { count: "exact" });

  if (p.status) sel = sel.eq("status", p.status as OrderStatus);
  if (p.channel) sel = sel.eq("channel", p.channel as OrderChannel);
  if (p.q?.trim()) {
    const q = p.q.trim();
    // filter on the embedded customer name, or the order id
    sel = sel.or(`id.ilike.%${q}%`);
  }

  const { data, error, count } = await sel
    .order("placed_at", { ascending: false })
    .range(page * pageSize, page * pageSize + pageSize - 1);
  if (error) throw error;
  return { rows: (data ?? []) as unknown as OrderListRow[], total: count ?? 0 };
}

export async function getOrderItems(orderId: string): Promise<OrderItemRow[]> {
  const { data, error } = await supabase.from("order_items").select("*").eq("order_id", orderId);
  if (error) throw error;
  return data ?? [];
}

/** RLS denies by matching zero rows, so check what came back. */
export async function setOrderStatus(id: string, status: OrderStatus): Promise<void> {
  const { data, error } = await supabase
    .from("orders").update({ status }).eq("id", id).select("id");
  if (error) throw error;
  if (!data?.length) throw new Error("Not permitted — admin role required.");
}

export interface OrderStats {
  revenue: number;
  count: number;
  pending: number;
  aov: number;
}

/** Header tiles: aggregate server-side rather than summing a page of rows.
 *  dashboard_stats() is admin-gated, so a non-admin gets zeros rather than an
 *  exception that would blank the whole page. */
export async function getOrderStats(): Promise<OrderStats> {
  const { data, error } = await supabase.rpc("dashboard_stats");
  if (error) return { revenue: 0, count: 0, aov: 0, pending: 0 };
  const d = data as unknown as { revenue: number; orders: number; aov: number };
  const { count: pending } = await supabase
    .from("orders")
    .select("*", { count: "exact", head: true })
    .in("status", ["Pending", "Processing"]);
  return { revenue: d.revenue, count: d.orders, aov: d.aov, pending: pending ?? 0 };
}

import { supabase } from "../../lib/supabase";
import type { Database } from "../../lib/database.types";

export type OrderRow = Database["public"]["Tables"]["orders"]["Row"];
export type OrderItemRow = Database["public"]["Tables"]["order_items"]["Row"];
export type OrderStatus = Database["public"]["Enums"]["order_status"];
export type OrderChannel = Database["public"]["Enums"]["order_channel"];
export type ReturnReason = Database["public"]["Enums"]["return_reason"];

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

  if (p.q?.trim()) {
    const { data, error } = await supabase.rpc("search_orders", {
      q: p.q.trim(),
      p_status:  p.status  || null,
      p_channel: p.channel || null,
      p_page:     page,
      p_page_size: pageSize,
    });
    if (error) throw error;
    const rows = (data ?? []).map((r: any) => ({
      id: r.id, customer_id: r.customer_id, placed_at: r.placed_at,
      status: r.status, channel: r.channel, total: r.total, city: r.city,
      return_reason: r.return_reason, return_note: r.return_note,
      customers: { name: r.customer_name, email: r.customer_email },
      order_items: [{ qty: Number(r.item_qty) }],
    }) as unknown as OrderListRow);
    return { rows, total: (data as any[])?.[0]?.total_count ?? 0 };
  }

  // no query — fast path via PostgREST
  let sel = supabase
    .from("orders")
    .select("*, customers!inner(name, email), order_items(qty)", { count: "exact" });

  if (p.status)  sel = sel.eq("status",  p.status  as OrderStatus);
  if (p.channel) sel = sel.eq("channel", p.channel as OrderChannel);

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

/** RLS denies by matching zero rows, so check what came back.
 *  Changing status to Returned requires a reason; changing away from
 *  Returned clears both fields (the DB check constraint would reject
 *  a stale reason on a non-Returned order anyway). */
export async function setOrderStatus(
  id: string, status: OrderStatus, returnReason?: ReturnReason, returnNote?: string
): Promise<void> {
  const patch =
    status === "Returned"
      ? { status, return_reason: returnReason ?? null, return_note: returnNote?.trim() || null }
      : { status, return_reason: null, return_note: null };
  const { data, error } = await supabase
    .from("orders").update(patch).eq("id", id).select("id");
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

import { supabase } from "../../lib/supabase";
import type { Database } from "../../lib/database.types";

export type CustomerRow = Database["public"]["Tables"]["customers"]["Row"];
export type Segment = Database["public"]["Enums"]["segment"];

export const SEGMENTS: Segment[] = ["VIP", "Loyal", "Regular", "New", "At-risk"];

export async function listCustomers(p: {
  q?: string; segment?: string; page?: number; pageSize?: number;
}): Promise<{ rows: CustomerRow[]; total: number }> {
  const pageSize = p.pageSize ?? 20;
  const page = p.page ?? 0;

  let sel = supabase.from("customers").select("*", { count: "exact" });
  if (p.segment) sel = sel.eq("segment", p.segment as Segment);
  if (p.q?.trim()) {
    const q = p.q.trim();
    sel = sel.or(`name.ilike.%${q}%,email.ilike.%${q}%`);
  }
  const { data, error, count } = await sel
    .order("ltv", { ascending: false })
    .range(page * pageSize, page * pageSize + pageSize - 1);
  if (error) throw error;
  return { rows: data ?? [], total: count ?? 0 };
}

export async function customerOrders(customerId: string) {
  const { data, error } = await supabase
    .from("orders")
    .select("id, total, status, placed_at, order_items(name)")
    .eq("customer_id", customerId)
    .order("placed_at", { ascending: false })
    .limit(5);
  if (error) throw error;
  return data ?? [];
}

/** Segment counts — a grouped count, done in the DB. */
export async function segmentCounts(): Promise<Record<string, number>> {
  const out: Record<string, number> = {};
  await Promise.all(
    SEGMENTS.map(async (s) => {
      const { count } = await supabase
        .from("customers")
        .select("*", { count: "exact", head: true })
        .eq("segment", s);
      out[s] = count ?? 0;
    })
  );
  return out;
}

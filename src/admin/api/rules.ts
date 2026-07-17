import { supabase } from "../../lib/supabase";
import type { Database } from "../../lib/database.types";

export type BodyType = Database["public"]["Enums"]["body_type"];
export type SizeRuleRow = Database["public"]["Tables"]["size_rules"]["Row"];
export type RuleMetaRow = Database["public"]["Tables"]["body_rule_meta"]["Row"];

const SIZE_ORDER = ["XS", "S", "M", "L", "XL", "2XL", "Custom"];

export interface BodyRule extends RuleMetaRow {
  chart: SizeRuleRow[];
}

export async function listRules(): Promise<BodyRule[]> {
  const [{ data: meta, error: e1 }, { data: rows, error: e2 }] = await Promise.all([
    supabase.from("body_rule_meta").select("*"),
    supabase.from("size_rules").select("*"),
  ]);
  if (e1) throw e1;
  if (e2) throw e2;

  return (meta ?? []).map((m) => ({
    ...m,
    chart: (rows ?? [])
      .filter((r) => r.body_type === m.body_type)
      .sort((a, b) => SIZE_ORDER.indexOf(a.size) - SIZE_ORDER.indexOf(b.size)),
  }));
}

/** Upsert the whole chart for one body type in a single round trip. */
export async function saveRule(bodyType: BodyType, chart: SizeRuleRow[]): Promise<void> {
  const { data, error } = await supabase
    .from("size_rules")
    .upsert(
      chart.map((r) => ({ ...r, body_type: bodyType })),
      { onConflict: "body_type,size" }
    )
    .select("size");
  if (error) throw error;
  if (!data?.length) throw new Error("Not permitted — admin role required.");
}

export async function styleCountByBodyType(bodyType: BodyType): Promise<number> {
  const { count } = await supabase
    .from("styles")
    .select("*", { count: "exact", head: true })
    .eq("body_type", bodyType);
  return count ?? 0;
}

/* ---- collections CRUD ---- */
export type CollectionRow = Database["public"]["Tables"]["collections"]["Row"];

export interface CollectionStats extends CollectionRow {
  styles: number;
  skus: number;
  revenue: number;
  units: number;
}

export async function collectionStats(): Promise<CollectionStats[]> {
  const { data: cols, error } = await supabase.from("collections").select("*").order("sort");
  if (error) throw error;

  // style_list already carries the per-style aggregates; roll them up per collection
  const { data: styles } = await supabase
    .from("style_list")
    .select("collection_id, sku_count, revenue, units_sold");

  return (cols ?? []).map((c) => {
    const mine = (styles ?? []).filter((s) => s.collection_id === c.id);
    return {
      ...c,
      styles: mine.length,
      skus: mine.reduce((n, s) => n + (s.sku_count ?? 0), 0),
      revenue: mine.reduce((n, s) => n + (s.revenue ?? 0), 0),
      units: mine.reduce((n, s) => n + (s.units_sold ?? 0), 0),
    };
  });
}

export async function upsertCollection(row: Database["public"]["Tables"]["collections"]["Insert"]): Promise<void> {
  const { data, error } = await supabase.from("collections").upsert(row).select("id");
  if (error) throw error;
  if (!data?.length) throw new Error("Not permitted — admin role required.");
}

export async function deleteCollection(id: string): Promise<void> {
  const { data, error } = await supabase.from("collections").delete().eq("id", id).select("id");
  if (error) throw error;
  if (!data?.length) throw new Error("Not permitted, or the collection still has styles.");
}

export async function categoryStats() {
  const { data: cats, error } = await supabase.from("categories").select("*").order("sort");
  if (error) throw error;
  const { data: styles } = await supabase.from("style_list").select("category_id, sku_count, revenue");
  return (cats ?? []).map((c) => {
    const mine = (styles ?? []).filter((s) => s.category_id === c.id);
    return {
      ...c,
      styles: mine.length,
      skus: mine.reduce((n, s) => n + (s.sku_count ?? 0), 0),
      revenue: mine.reduce((n, s) => n + (s.revenue ?? 0), 0),
    };
  });
}

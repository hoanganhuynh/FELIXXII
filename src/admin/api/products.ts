import { supabase } from "../../lib/supabase";
import type { Database } from "../../lib/database.types";

export type StyleRow = Database["public"]["Views"]["style_list"]["Row"];
export type VariantRow = Database["public"]["Tables"]["variants"]["Row"];
export type StyleInsert = Database["public"]["Tables"]["styles"]["Insert"];
export type StyleUpdate = Database["public"]["Tables"]["styles"]["Update"];
export type VariantInsert = Database["public"]["Tables"]["variants"]["Insert"];
export type StyleStatus = Database["public"]["Enums"]["style_status"];
export type BodyType = Database["public"]["Enums"]["body_type"];

export interface ColorSwatch {
  name: string;
  hex: string;
}
/** the view aggregates colours as jsonb; narrow it once, here */
export const colorsOf = (s: StyleRow): ColorSwatch[] =>
  Array.isArray(s.colors) ? (s.colors as unknown as ColorSwatch[]) : [];

export interface ListParams {
  q?: string;
  category?: string;
  collection?: string;
  status?: string;
  stock?: "" | "low" | "out";
  sort?: "new" | "best" | "asc" | "desc";
  page?: number;
  pageSize?: number;
}

/** Paginated style list. Filtering/sorting/counting all happen in Postgres —
 *  the client never sees the 7k variants behind these aggregates. */
export async function listStyles(p: ListParams): Promise<{ rows: StyleRow[]; total: number }> {
  const pageSize = p.pageSize ?? 25;
  const page = p.page ?? 0;

  let sel = supabase.from("style_list").select("*", { count: "exact" });

  if (p.category) sel = sel.eq("category_id", p.category);
  if (p.collection) sel = sel.eq("collection_id", p.collection);
  if (p.status) sel = sel.eq("status", p.status as StyleStatus);
  if (p.stock === "out") sel = sel.eq("total_stock", 0);
  if (p.stock === "low") sel = sel.lt("total_stock", 12);

  if (p.q?.trim()) {
    // Each word must appear in at least one field; all words must match (AND of ORs).
    // "lua do" → finds styles where "lua" hits name/code/material AND "do" also hits.
    for (const word of p.q.trim().split(/\s+/)) {
      sel = sel.or(`style_code.ilike.%${word}%,name.ilike.%${word}%,material.ilike.%${word}%`);
    }
  }

  switch (p.sort) {
    case "best": sel = sel.order("units_sold", { ascending: false }); break;
    case "asc":  sel = sel.order("price", { ascending: true }); break;
    case "desc": sel = sel.order("price", { ascending: false }); break;
    default:     sel = sel.order("created_at", { ascending: false });
  }
  sel = sel.order("style_code", { ascending: true }); // stable tiebreak

  const { data, error, count } = await sel.range(page * pageSize, page * pageSize + pageSize - 1);
  if (error) throw error;
  return { rows: data ?? [], total: count ?? 0 };
}

export interface SkuHit {
  sku: string;
  style_id: string;
  style_name: string;
  style_code: string;
  color_name: string;
  color_hex: string;
  size: string;
  stock: number;
  barcode: string | null;
  price: number;
  score: number;
}

/** Ranked SKU search — the Postgres stand-in for the Elasticsearch query. */
export async function searchSkus(q: string, limit = 200): Promise<SkuHit[]> {
  if (!q.trim()) return [];
  const { data, error } = await supabase.rpc("search_skus", {
    q,
    only_active: false, // admin sees drafts too
    in_stock_only: false,
    max_rows: limit,
  });
  if (error) throw error;
  return (data ?? []) as SkuHit[];
}

export async function getStyle(id: string) {
  const { data, error } = await supabase.from("style_list").select("*").eq("id", id).single();
  if (error) throw error;
  return data;
}

export async function getVariants(styleId: string): Promise<VariantRow[]> {
  const { data, error } = await supabase
    .from("variants")
    .select("*")
    .eq("style_id", styleId)
    .order("color_name")
    .order("size");
  if (error) throw error;
  return data ?? [];
}

export interface BulkPatch {
  attribute: "status" | "collection" | "category" | "pricePct" | "priceSet";
  value: string | number;
}

/** One RPC, one statement — not N round trips. Returns rows actually changed. */
export async function bulkUpdateStyles(ids: string[], patch: BulkPatch): Promise<number> {
  const { data, error } = await supabase.rpc("bulk_update_styles", {
    ids,
    attribute: patch.attribute,
    value: String(patch.value),
  });
  if (error) throw error;
  return data ?? 0;
}

/** RLS blocks writes by matching ZERO rows — it does not raise. So we ask for
 *  the affected rows back and treat an empty result as "denied". */
export async function deleteStyle(id: string): Promise<void> {
  const { data, error } = await supabase.from("styles").delete().eq("id", id).select("id");
  if (error) throw error;
  if (!data?.length) throw new Error("Not permitted — admin role required.");
}

export async function duplicateStyle(id: string): Promise<void> {
  const src = await getStyle(id);
  const { data: variants } = await supabase.from("variants").select("*").eq("style_id", id);

  // next free serial in this category
  const { data: maxRow } = await supabase
    .from("styles")
    .select("serial")
    .eq("category_id", src.category_id!)
    .order("serial", { ascending: false })
    .limit(1)
    .single();
  const serial = (maxRow?.serial ?? 0) + 1;
  const prefix = src.style_code!.split("-").slice(0, 2).join("-");
  const newCode = `${prefix}-${String(serial).padStart(4, "0")}`;

  const { data: created, error } = await supabase
    .from("styles")
    .insert({
      style_code: newCode,
      serial,
      name: `${src.name} (copy)`,
      category_id: src.category_id!,
      collection_id: src.collection_id!,
      silhouette: src.silhouette,
      occasion: src.occasion,
      price: src.price!,
      material: src.material,
      body_type: src.body_type,
      status: "draft",
      images: src.images ?? [],
    })
    .select("id")
    .single();
  if (error) throw error;

  if (variants?.length) {
    const rows = variants.map((v) => ({
      sku: v.sku.replace(src.style_code!, newCode),
      style_id: created.id,
      color_name: v.color_name,
      color_hex: v.color_hex,
      size: v.size,
      stock: 0,
      reserved: 0,
      barcode: null, // barcodes are unique — a copy must not reuse them
      price_override: v.price_override,
    }));
    const { error: vErr } = await supabase.from("variants").insert(rows);
    if (vErr) throw vErr;
  }
}

export async function updateStyle(id: string, patch: StyleUpdate): Promise<void> {
  const { data, error } = await supabase.from("styles").update(patch).eq("id", id).select("id");
  if (error) throw error;
  if (!data?.length) throw new Error("Not permitted — admin role required.");
}

export async function createStyle(row: StyleInsert): Promise<string> {
  const { data, error } = await supabase.from("styles").insert(row).select("id").single();
  if (error) throw error;
  return data.id;
}

export async function replaceVariants(styleId: string, rows: VariantInsert[]): Promise<void> {
  const { error: dErr } = await supabase.from("variants").delete().eq("style_id", styleId);
  if (dErr) throw dErr;
  if (!rows.length) return;
  const { error } = await supabase.from("variants").insert(rows);
  if (error) throw error;
}

/* ---- taxonomy ---- */
export async function listCategories() {
  const { data, error } = await supabase.from("categories").select("*").order("sort");
  if (error) throw error;
  return data ?? [];
}
export async function listCollections() {
  const { data, error } = await supabase.from("collections").select("*").order("sort");
  if (error) throw error;
  return data ?? [];
}

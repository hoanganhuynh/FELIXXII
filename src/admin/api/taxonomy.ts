import { supabase } from "../../lib/supabase";
import type { Database } from "../../lib/database.types";

export type SourceRow = Database["public"]["Tables"]["sources"]["Row"];
export type GarmentTypeRow = Database["public"]["Tables"]["garment_types"]["Row"];
export type ColorRow = Database["public"]["Tables"]["colors"]["Row"];
export type CategoryRow = Database["public"]["Tables"]["categories"]["Row"];

/* ---- categories ("Danh mục") ---- */
export async function listCategoriesTaxonomy(): Promise<CategoryRow[]> {
  const { data, error } = await supabase.from("categories").select("*").order("sort");
  if (error) throw error;
  return data ?? [];
}

/** `sku_prefix` is a legacy NOT NULL/unique column from the old SKU scheme
 *  (unused by the current name-based SKU generator) — derived from the
 *  already-unique `id` so the simplified admin form never has to ask for it. */
export async function upsertCategory(row: { id: string; label: string; sort: number }): Promise<void> {
  const sku_prefix = row.id.replace(/[^a-zA-Z0-9]/g, "").toUpperCase().slice(0, 12) || row.id.toUpperCase();
  const { data, error } = await supabase.from("categories").upsert({ ...row, sku_prefix }).select("id");
  if (error) throw error;
  if (!data?.length) throw new Error("Not permitted — admin role required.");
}

export async function deleteCategory(id: string): Promise<void> {
  const { data, error } = await supabase.from("categories").delete().eq("id", id).select("id");
  if (error) throw error;
  if (!data?.length) throw new Error("Not permitted, or the category is still in use.");
}

/* ---- sources ("Nguồn hàng") ---- */
export async function listSources(): Promise<SourceRow[]> {
  const { data, error } = await supabase.from("sources").select("*").order("sort");
  if (error) throw error;
  return data ?? [];
}

export async function upsertSource(row: Database["public"]["Tables"]["sources"]["Insert"]): Promise<void> {
  const { data, error } = await supabase.from("sources").upsert(row).select("id");
  if (error) throw error;
  if (!data?.length) throw new Error("Not permitted — admin role required.");
}

export async function deleteSource(id: string): Promise<void> {
  const { data, error } = await supabase.from("sources").delete().eq("id", id).select("id");
  if (error) throw error;
  if (!data?.length) throw new Error("Not permitted, or the source is still in use.");
}

/* ---- garment types ("Phân loại") ---- */
export async function listGarmentTypes(): Promise<GarmentTypeRow[]> {
  const { data, error } = await supabase.from("garment_types").select("*").order("sort");
  if (error) throw error;
  return data ?? [];
}

export async function upsertGarmentType(row: Database["public"]["Tables"]["garment_types"]["Insert"]): Promise<void> {
  const { data, error } = await supabase.from("garment_types").upsert(row).select("id");
  if (error) throw error;
  if (!data?.length) throw new Error("Not permitted — admin role required.");
}

export async function deleteGarmentType(id: string): Promise<void> {
  const { data, error } = await supabase.from("garment_types").delete().eq("id", id).select("id");
  if (error) throw error;
  if (!data?.length) throw new Error("Not permitted, or the garment type is still in use.");
}

/* ---- colors ---- */
export async function listColors(): Promise<ColorRow[]> {
  const { data, error } = await supabase.from("colors").select("*").order("sort");
  if (error) throw error;
  return data ?? [];
}

export async function upsertColor(row: Database["public"]["Tables"]["colors"]["Insert"]): Promise<void> {
  const { data, error } = await supabase.from("colors").upsert(row).select("id");
  if (error) throw error;
  if (!data?.length) throw new Error("Not permitted — admin role required.");
}

export async function deleteColor(id: string): Promise<void> {
  const { data, error } = await supabase.from("colors").delete().eq("id", id).select("id");
  if (error) throw error;
  if (!data?.length) throw new Error("Not permitted, or the color is still in use.");
}

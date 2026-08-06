import { supabase } from "../../lib/supabase";

export interface Promotion {
  id: string;
  sort_order: number;
  active: boolean;
  image_url: string;
  link_url: string;
  title: string;
  created_at: string;
  product_style_ids: string[];
}

const TABLE = "promotions" as const;
const COLS = "id, sort_order, active, image_url, link_url, title, created_at";

type PromotionRow = Omit<Promotion, "product_style_ids">;

async function withProductLinks(rows: PromotionRow[]): Promise<Promotion[]> {
  if (!rows.length) return [];
  const ids = rows.map((row) => row.id);
  const { data, error } = await supabase
    .from("promotion_products")
    .select("promotion_id, style_id")
    .in("promotion_id", ids)
    .order("sort_order");
  if (error) throw error;

  const byPromotion = new Map<string, string[]>();
  (data ?? []).forEach((link) => {
    const list = byPromotion.get(link.promotion_id) ?? [];
    list.push(link.style_id);
    byPromotion.set(link.promotion_id, list);
  });

  return rows.map((row) => ({ ...row, product_style_ids: byPromotion.get(row.id) ?? [] }));
}

async function replaceProductLinks(promotionId: string, styleIds: string[]): Promise<void> {
  const uniqueIds = [...new Set(styleIds.filter(Boolean))];
  const { error: deleteError } = await supabase
    .from("promotion_products")
    .delete()
    .eq("promotion_id", promotionId);
  if (deleteError) throw deleteError;

  if (!uniqueIds.length) return;
  const { error } = await supabase.from("promotion_products").insert(
    uniqueIds.map((style_id, index) => ({
      promotion_id: promotionId,
      style_id,
      sort_order: index + 1,
    }))
  );
  if (error) throw error;
}

export async function listAllPromotions(): Promise<Promotion[]> {
  const { data, error } = await supabase.from(TABLE).select(COLS).order("sort_order");
  if (error) throw error;
  return withProductLinks((data ?? []) as PromotionRow[]);
}

export async function listActivePromotions(): Promise<Promotion[]> {
  const { data, error } = await supabase.from(TABLE).select(COLS).eq("active", true).order("sort_order");
  if (error) throw error;
  return withProductLinks((data ?? []) as PromotionRow[]);
}

export async function createPromotion(p: Omit<Promotion, "id" | "created_at" | "sort_order">): Promise<void> {
  const { product_style_ids, ...payload } = p;
  const { data: maxRow } = await supabase
    .from(TABLE).select("sort_order").order("sort_order", { ascending: false }).limit(1).single();
  const nextOrder = ((maxRow as { sort_order?: number } | null)?.sort_order ?? 0) + 1;
  const { data, error } = await supabase.from(TABLE).insert({ ...payload, sort_order: nextOrder }).select("id").single();
  if (error) throw error;
  await replaceProductLinks(data.id, product_style_ids);
}

export async function updatePromotion(id: string, patch: Partial<Omit<Promotion, "id" | "created_at">>): Promise<void> {
  const { product_style_ids, ...payload } = patch;
  const { error } = await supabase.from(TABLE).update(payload).eq("id", id);
  if (error) throw error;
  if (product_style_ids) await replaceProductLinks(id, product_style_ids);
}

export async function deletePromotion(id: string): Promise<void> {
  const { error } = await supabase.from(TABLE).delete().eq("id", id);
  if (error) throw error;
}

export async function swapPromotionOrder(idA: string, orderA: number, idB: string, orderB: number): Promise<void> {
  await Promise.all([
    supabase.from(TABLE).update({ sort_order: orderB }).eq("id", idA),
    supabase.from(TABLE).update({ sort_order: orderA }).eq("id", idB),
  ]);
}

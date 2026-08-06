import { supabase } from "../../lib/supabase";

export interface Promotion {
  id: string;
  sort_order: number;
  active: boolean;
  image_url: string;
  link_url: string;
  title: string;
  created_at: string;
}

const TABLE = "promotions" as const;
const COLS = "id, sort_order, active, image_url, link_url, title, created_at";

export async function listAllPromotions(): Promise<Promotion[]> {
  const { data, error } = await supabase.from(TABLE).select(COLS).order("sort_order");
  if (error) throw error;
  return (data ?? []) as Promotion[];
}

export async function listActivePromotions(): Promise<Promotion[]> {
  const { data, error } = await supabase.from(TABLE).select(COLS).eq("active", true).order("sort_order");
  if (error) throw error;
  return (data ?? []) as Promotion[];
}

export async function createPromotion(p: Omit<Promotion, "id" | "created_at" | "sort_order">): Promise<void> {
  const { data: maxRow } = await supabase
    .from(TABLE).select("sort_order").order("sort_order", { ascending: false }).limit(1).single();
  const nextOrder = ((maxRow as { sort_order?: number } | null)?.sort_order ?? 0) + 1;
  const { error } = await supabase.from(TABLE).insert({ ...p, sort_order: nextOrder });
  if (error) throw error;
}

export async function updatePromotion(id: string, patch: Partial<Omit<Promotion, "id" | "created_at">>): Promise<void> {
  const { error } = await supabase.from(TABLE).update(patch).eq("id", id);
  if (error) throw error;
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

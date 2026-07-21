import { supabase } from "../../lib/supabase";

export interface HeroBanner {
  id: string;
  sort_order: number;
  active: boolean;
  image_url: string;
  collection_tag: string;
  heading: string;
  subheading: string;
  cta1_label: string;
  cta1_url: string;
  cta2_label: string;
  cta2_url: string;
  created_at: string;
}

const TABLE = "hero_banners" as const;
const COLS = "id, sort_order, active, image_url, collection_tag, heading, subheading, cta1_label, cta1_url, cta2_label, cta2_url, created_at";

export async function listAllBanners(): Promise<HeroBanner[]> {
  const { data, error } = await supabase
    .from(TABLE)
    .select(COLS)
    .order("sort_order");
  if (error) throw error;
  return (data ?? []) as HeroBanner[];
}

export async function createBanner(b: Omit<HeroBanner, "id" | "created_at" | "sort_order">): Promise<void> {
  const { data: maxRow } = await supabase
    .from(TABLE)
    .select("sort_order")
    .order("sort_order", { ascending: false })
    .limit(1)
    .single();
  const nextOrder = ((maxRow as any)?.sort_order ?? 0) + 1;
  const { error } = await supabase.from(TABLE).insert({ ...b, sort_order: nextOrder });
  if (error) throw error;
}

export async function updateBanner(id: string, patch: Partial<Omit<HeroBanner, "id" | "created_at">>): Promise<void> {
  const { error } = await supabase.from(TABLE).update(patch).eq("id", id);
  if (error) throw error;
}

export async function deleteBanner(id: string): Promise<void> {
  const { error } = await supabase.from(TABLE).delete().eq("id", id);
  if (error) throw error;
}

export async function swapBannerOrder(idA: string, orderA: number, idB: string, orderB: number): Promise<void> {
  await Promise.all([
    supabase.from(TABLE).update({ sort_order: orderB }).eq("id", idA),
    supabase.from(TABLE).update({ sort_order: orderA }).eq("id", idB),
  ]);
}

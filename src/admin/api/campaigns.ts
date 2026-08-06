import { supabase } from "../../lib/supabase";
import type { Database } from "../../lib/database.types";

export type CampaignRow = Database["public"]["Tables"]["campaigns"]["Row"];
export type CampaignInsert = Database["public"]["Tables"]["campaigns"]["Insert"];
export type CampaignType = Database["public"]["Enums"]["campaign_type"];
export type CampaignScope = Database["public"]["Enums"]["campaign_scope"];
export type DiscountKind = Database["public"]["Enums"]["discount_kind"];

const TABLE = "campaigns" as const;

export async function listAllCampaigns(): Promise<CampaignRow[]> {
  const { data, error } = await supabase.from(TABLE).select("*").order("created_at", { ascending: false });
  if (error) throw error;
  return data ?? [];
}

/** Public, RLS-filtered to active + within date range — used by the storefront cart. */
export async function listActiveCampaigns(): Promise<CampaignRow[]> {
  const { data, error } = await supabase.from(TABLE).select("*");
  if (error) throw error;
  return data ?? [];
}

export async function createCampaign(c: Omit<CampaignInsert, "id" | "created_at">): Promise<void> {
  const { data, error } = await supabase.from(TABLE).insert(c).select("id").single();
  if (error) throw error;
  if (!data?.id) throw new Error("Campaign was not created. Please check admin permissions.");
}

export async function updateCampaign(id: string, patch: Partial<Omit<CampaignRow, "id" | "created_at">>): Promise<void> {
  const { data, error } = await supabase.from(TABLE).update(patch).eq("id", id).select("id");
  if (error) throw error;
  if (!data?.length) throw new Error("Campaign was not updated. Please check admin permissions.");
}

export async function deleteCampaign(id: string): Promise<void> {
  const { data, error } = await supabase.from(TABLE).delete().eq("id", id).select("id");
  if (error) throw error;
  if (!data?.length) throw new Error("Campaign was not deleted. Please check admin permissions.");
}

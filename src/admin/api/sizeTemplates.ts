import { supabase } from "../../lib/supabase";
import type { Database } from "../../lib/database.types";

export type SizeTemplateRow = Database["public"]["Tables"]["size_templates"]["Row"];

export interface SizeChartDataRow {
  size: string;
  measurements: { min: number; max: number }[];
}

export interface SizeTemplateData {
  columns: string[];
  rows: SizeChartDataRow[];
}

export async function listSizeTemplates(): Promise<SizeTemplateRow[]> {
  const { data, error } = await supabase
    .from("size_templates")
    .select("*")
    .order("created_at");
  if (error) throw error;
  return data ?? [];
}

export async function saveSizeTemplate(
  id: string | null,
  name: string,
  data: SizeTemplateData,
  is_default: boolean
): Promise<void> {
  const payload = {
    name,
    data: data as any,
    is_default,
  };

  let savedId = id;
  if (id) {
    const { error } = await supabase.from("size_templates").update(payload).eq("id", id);
    if (error) throw error;
  } else {
    const { data, error } = await supabase.from("size_templates").insert(payload).select("id").single();
    if (error) throw error;
    savedId = data.id;
  }

  // If this one is set as default, unset others
  if (is_default && savedId) {
    await supabase.from("size_templates").update({ is_default: false }).neq("id", savedId);
  }
}

export async function deleteSizeTemplate(id: string): Promise<void> {
  const { error } = await supabase.from("size_templates").delete().eq("id", id);
  if (error) throw error;
}

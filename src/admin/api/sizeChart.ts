import { supabase } from "../../lib/supabase";

export interface SizeChartRow {
  id: string;
  size: string;
  bust_min: number;
  bust_max: number;
  waist_min: number;
  waist_max: number;
  hip_min: number;
  hip_max: number;
  sort_order: number;
}

export async function listSizeChart(): Promise<SizeChartRow[]> {
  const { data, error } = await supabase
    .from("size_chart" as any)
    .select("id, size, bust_min, bust_max, waist_min, waist_max, hip_min, hip_max, sort_order")
    .order("sort_order");
  if (error) throw error;
  return (data ?? []) as unknown as SizeChartRow[];
}

export async function updateSizeChartRow(
  id: string,
  patch: Partial<Omit<SizeChartRow, "id" | "sort_order">>,
): Promise<void> {
  const { error } = await supabase.from("size_chart" as any).update(patch as any).eq("id", id);
  if (error) throw error;
}

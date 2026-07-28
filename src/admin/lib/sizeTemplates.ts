const STORAGE_KEY = "felixxii-size-templates";

export interface SizeChartRow {
  size: string;
  bust_min: number; bust_max: number;
  waist_min: number; waist_max: number;
  hip_min: number; hip_max: number;
}

export interface SizeTemplate {
  id: string;
  name: string;
  chart: SizeChartRow[];
  createdAt: string;
}

export const loadTemplates = (): SizeTemplate[] => {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "[]"); } catch { return []; }
};

export const saveTemplate = (name: string, chart: SizeChartRow[]): SizeTemplate => {
  const all = loadTemplates();
  const t: SizeTemplate = { id: crypto.randomUUID(), name, chart, createdAt: new Date().toISOString() };
  localStorage.setItem(STORAGE_KEY, JSON.stringify([...all, t]));
  return t;
};

export const deleteTemplate = (id: string) => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(loadTemplates().filter((t) => t.id !== id)));
};

/** Default measurements for common sizes — used when no template is loaded */
export const DEFAULT_CHART: Record<string, Omit<SizeChartRow, "size">> = {
  XS: { bust_min: 76, bust_max: 80, waist_min: 58, waist_max: 62, hip_min: 82, hip_max: 86 },
  S:  { bust_min: 81, bust_max: 85, waist_min: 63, waist_max: 67, hip_min: 87, hip_max: 91 },
  M:  { bust_min: 86, bust_max: 90, waist_min: 68, waist_max: 72, hip_min: 92, hip_max: 96 },
  L:  { bust_min: 91, bust_max: 96, waist_min: 73, waist_max: 78, hip_min: 97, hip_max: 102 },
  XL: { bust_min: 97, bust_max: 103, waist_min: 79, waist_max: 85, hip_min: 103, hip_max: 109 },
  "2XL": { bust_min: 104, bust_max: 110, waist_min: 86, waist_max: 92, hip_min: 110, hip_max: 116 },
  Custom: { bust_min: 0, bust_max: 0, waist_min: 0, waist_max: 0, hip_min: 0, hip_max: 0 },
};

export const blankChart = (sizes: string[]): SizeChartRow[] =>
  sizes.map((sz) => ({ size: sz, ...(DEFAULT_CHART[sz] ?? DEFAULT_CHART.Custom) }));

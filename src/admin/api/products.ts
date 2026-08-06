import { supabase } from "../../lib/supabase";
import type { Database } from "../../lib/database.types";
import { newStyleCode } from "../lib/slug";

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

  if (p.q?.trim()) {
    // RPC uses search_vector (built with f_unaccent) + pg_trgm fallback,
    // so "lua" matches "Lụa", "dam do" matches "Đầm Đỏ", etc.
    const { data, error } = await supabase.rpc("search_styles", {
      q:            p.q.trim(),
      p_category:   p.category   ?? undefined,
      p_collection: p.collection ?? undefined,
      p_status:     p.status     ?? undefined,
      p_stock:      (p.stock as "out" | "low" | undefined) ?? undefined,
      p_sort:       p.sort       ?? "new",
      p_page:       page,
      p_page_size:  pageSize,
    });
    if (error) throw error;
    const rows = (data ?? []).map(({ total_count: _, ...row }: any) => row as StyleRow);
    return { rows, total: (data as any[])?.[0]?.total_count ?? 0 };
  }

  // no query — fast PostgREST path, no extra JOIN needed
  let sel = supabase.from("style_list").select("*", { count: "exact" });

  if (p.category)   sel = sel.eq("category_id",   p.category);
  if (p.collection) sel = sel.eq("collection_id",  p.collection);
  if (p.status)     sel = sel.eq("status",         p.status as StyleStatus);
  if (p.stock === "out") sel = sel.eq("total_stock", 0);
  if (p.stock === "low") sel = sel.lt("total_stock", 12);

  switch (p.sort) {
    case "best": sel = sel.order("units_sold", { ascending: false }); break;
    case "asc":  sel = sel.order("price",      { ascending: true  }); break;
    case "desc": sel = sel.order("price",      { ascending: false }); break;
    default:     sel = sel.order("created_at", { ascending: false });
  }
  sel = sel.order("style_code", { ascending: true });

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

  // next free serial in this category (kept for internal bookkeeping / legacy uniqueness)
  const { data: maxRow } = await supabase
    .from("styles")
    .select("serial")
    .eq("category_id", src.category_id!)
    .order("serial", { ascending: false })
    .limit(1)
    .single();
  const serial = (maxRow?.serial ?? 0) + 1;
  const newCode = await nextStyleCode(`${src.name} copy`);

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
      source_id: src.source_id,
      garment_type_id: src.garment_type_id,
      description: src.description,
      image_product_view: src.image_product_view,
      image_model_view: src.image_model_view,
      images_detail: src.images_detail ?? [],
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
      in_stock: false,
      barcode: null, // barcodes are unique — a copy must not reuse them
      price_override: v.price_override,
      image_product_view: v.image_product_view,
      image_model_view: v.image_model_view,
      images_detail: v.images_detail,
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

export async function saveCategory(id: string, patch: { label: string; sku_prefix: string }) {
  const { error } = await supabase.from("categories").update(patch).eq("id", id);
  if (error) throw error;
}
export async function listCollections() {
  const { data, error } = await supabase.from("collections").select("*").order("sort");
  if (error) throw error;
  return data ?? [];
}

/* ============================================================
   New Product flow — one SKU (Tên sản phẩm = style + colour + size)
   at a time, instead of the old colour×size grid.
   ============================================================ */

export interface StyleNameHit {
  id: string;
  name: string;
  style_code: string;
  source_id: string | null;
  garment_type_id: string | null;
  category_id: string;
  collection_id: string | null;
  silhouette: string | null;
  body_type: BodyType | null;
  status: StyleStatus;
  price: number;
  material: string | null;
  description: string | null;
  image_product_view: string | null;
  image_model_view: string | null;
  images_detail: string[];
  size_template_id?: string | null;
}

/** typeahead for the "Loại sản phẩm" combobox — search existing styles by name */
export async function listStyleNames(q: string, limit = 15): Promise<StyleNameHit[]> {
  const query = q.trim();
  if (!query) return [];

  let sel = supabase
    .from("styles")
    .select("id, name, style_code, source_id, garment_type_id, category_id, collection_id, silhouette, body_type, status, price, material, description, image_product_view, image_model_view, images_detail, size_template_id")
    .not("style_code", "ilike", "FX-%")
    .order("name")
    .limit(limit);
  sel = sel.ilike("name", `%${query}%`);
  const { data, error } = await sel;
  if (error) throw error;
  return (data ?? []) as StyleNameHit[];
}

/** collision-safe style code for a brand-new "Loại sản phẩm" name */
export async function nextStyleCode(name: string): Promise<string> {
  const base = newStyleCode(name, []).replace(/\d+$/, ""); // just the letters, for the prefix scan
  const { data, error } = await supabase
    .from("styles")
    .select("style_code")
    .ilike("style_code", `${base}%`);
  if (error) throw error;
  return newStyleCode(name, (data ?? []).map((r) => r.style_code));
}

export async function getStyleRaw(id: string): Promise<StyleNameHit & { serial: number }> {
  const { data, error } = await supabase
    .from("styles")
    .select("id, name, style_code, serial, source_id, garment_type_id, category_id, collection_id, silhouette, body_type, status, price, material, description, image_product_view, image_model_view, images_detail, size_template_id")
    .eq("id", id)
    .single();
  if (error) throw error;
  return data as StyleNameHit & { serial: number };
}

export async function getVariantBySku(sku: string): Promise<VariantRow> {
  const { data, error } = await supabase.from("variants").select("*").eq("sku", sku).single();
  if (error) throw error;
  return data;
}

function isMissingVariantImageColumn(error: unknown) {
  const message = error && typeof error === "object" && "message" in error
    ? String((error as { message?: unknown }).message ?? "")
    : String(error);
  return (
    message.includes("variants.image_product_view") ||
    message.includes("variants.image_model_view") ||
    message.includes("variants.images_detail") ||
    message.includes("'image_product_view' column") ||
    message.includes("'image_model_view' column") ||
    message.includes("'images_detail' column") ||
    message.includes("image_product_view") ||
    message.includes("image_model_view") ||
    message.includes("images_detail")
  );
}

function errorMessage(error: unknown) {
  return error && typeof error === "object" && "message" in error
    ? String((error as { message?: unknown }).message ?? "")
    : String(error);
}

function isForeignKeyConflict(error: unknown) {
  const e = error as { code?: unknown; status?: unknown } | null;
  const message = errorMessage(error);
  return (
    e?.code === "23503" ||
    e?.status === 409 ||
    message.includes("order_items_sku_fkey") ||
    message.includes("violates foreign key constraint")
  );
}

function variantImageMigrationError() {
  return new Error(
    "DB chưa có cột ảnh theo màu/size cho variants. Hãy chạy migration 20260814000000_variant_color_images.sql rồi tạo lại sản phẩm để ảnh từng màu không bị lấy nhầm.",
  );
}

/** insert ONE variant (a single SKU) — the new one-at-a-time flow, vs. replaceVariants' grid */
export async function addVariant(row: VariantInsert): Promise<void> {
  const { error } = await supabase.from("variants").insert(row);
  if (!error) return;
  if (isMissingVariantImageColumn(error)) throw variantImageMigrationError();
  throw error;
}

export type VariantUpdate = Database["public"]["Tables"]["variants"]["Update"];

export async function updateVariant(sku: string, patch: VariantUpdate): Promise<void> {
  const { data, error } = await supabase.from("variants").update(patch).eq("sku", sku).select("sku");
  if (error) {
    if (isMissingVariantImageColumn(error)) throw variantImageMigrationError();
    throw error;
  }
  if (!data?.length) throw new Error("Not permitted — admin role required.");
}

export async function updateColorVariantPrice(styleId: string, colorName: string, price: number): Promise<number> {
  const { data, error } = await supabase
    .from("variants")
    .update({ price_override: price })
    .eq("style_id", styleId)
    .eq("color_name", colorName)
    .select("sku");
  if (error) throw error;
  return data?.length ?? 0;
}

export async function deleteVariant(sku: string): Promise<void> {
  const { data, error } = await supabase.from("variants").delete().eq("sku", sku).select("sku, style_id");
  if (error) {
    if (isForeignKeyConflict(error)) {
      const archived = await archiveVariant(sku);
      if (!archived) throw new Error("Not Found / Permission Denied");
      return;
    }
    throw error;
  }
  if (!data?.length) throw new Error("Not Found / Permission Denied");
}

export async function bulkUpdateVariants(skus: string[], in_stock: boolean): Promise<number> {
  const { data, error } = await supabase.from("variants").update({ in_stock, stock: in_stock ? 1 : 0 }).in("sku", skus).select("sku");
  if (error) throw error;
  return data?.length ?? 0;
}

export async function bulkDeleteVariants(skus: string[]): Promise<number> {
  const { data, error } = await supabase.from("variants").delete().in("sku", skus).select("sku");
  if (error) {
    if (isForeignKeyConflict(error)) return bulkArchiveVariants(skus);
    throw error;
  }
  return data?.length ?? 0;
}

async function archiveVariant(sku: string): Promise<number> {
  const { data, error } = await supabase
    .from("variants")
    .update({ in_stock: false, stock: 0 })
    .eq("sku", sku)
    .select("sku, style_id");
  if (error) throw error;
  const row = data?.[0];
  if (row?.style_id) await archiveStyleIfNoSellableVariants(row.style_id);
  return data?.length ?? 0;
}

async function bulkArchiveVariants(skus: string[]): Promise<number> {
  const { data, error } = await supabase
    .from("variants")
    .update({ in_stock: false, stock: 0 })
    .in("sku", skus)
    .select("sku, style_id");
  if (error) throw error;

  const styleIds = [...new Set((data ?? []).map((row) => row.style_id).filter(Boolean))];
  await Promise.all(styleIds.map((styleId) => archiveStyleIfNoSellableVariants(styleId)));
  return data?.length ?? 0;
}

async function archiveStyleIfNoSellableVariants(styleId: string) {
  const { count, error } = await supabase
    .from("variants")
    .select("sku", { count: "exact", head: true })
    .eq("style_id", styleId)
    .eq("in_stock", true);
  if (error) throw error;
  if ((count ?? 0) > 0) return;
  await updateStyle(styleId, { status: "archived" });
}

export async function bulkUpdateStyleProperties(styleIds: string[], field: "collection_id" | "source_id" | "garment_type_id", value: string | null): Promise<number> {
  const patch: Pick<Database["public"]["Tables"]["styles"]["Update"], typeof field> = { [field]: value };
  const { data, error } = await supabase.from("styles").update(patch).in("id", styleIds).select("id");
  if (error) throw error;
  return data?.length ?? 0;
}

/** the flat "1 product = 1 color = 1 SKU" list row */
export interface ProductRow {
  sku: string;
  style_id: string;
  style_name: string;
  style_code: string;
  color_name: string;
  color_hex: string;
  size: string;
  price: number;
  in_stock: boolean;
  source_id: string | null;
  garment_type_id: string | null;
  status: StyleStatus;
  image: string | null;
}

export interface ProductListParams {
  q?: string;
  source?: string;
  garmentType?: string;
  category?: string;
  collection?: string;
  status?: string;
  stock?: "" | "in" | "out";
  page?: number;
  pageSize?: number;
}

/** Paginated, one-row-per-SKU product list — the "1 product = 1 color = 1 SKU" view. */
export async function listProductRows(p: ProductListParams): Promise<{ rows: ProductRow[]; total: number }> {
  const pageSize = p.pageSize ?? 25;
  const page = p.page ?? 0;

  if (p.q?.trim()) {
    // reuse the existing trigram-ranked SKU search, then enrich + filter client-side
    const hits = await searchSkus(p.q.trim(), 300);
    const styleIds = [...new Set(hits.map((h) => h.style_id))];
    const skus = hits.map((h) => h.sku);
    const [{ data: styles }, { data: variants }] = await Promise.all([
      supabase
        .from("styles")
        .select("id, source_id, garment_type_id, status, images, image_product_view")
        .in("id", styleIds.length ? styleIds : ["00000000-0000-0000-0000-000000000000"]),
      supabase
        .from("variants")
        .select("sku, image_product_view")
        .in("sku", skus.length ? skus : [""]),
    ]);
    const byId = new Map((styles ?? []).map((s) => [s.id, s]));
    const variantImageBySku = new Map((variants ?? []).map((v) => [v.sku, v.image_product_view]));

    let rows: ProductRow[] = hits.map((h) => {
      const s = byId.get(h.style_id);
      return {
        sku: h.sku, style_id: h.style_id, style_name: h.style_name, style_code: h.style_code,
        color_name: h.color_name, color_hex: h.color_hex, size: h.size, price: h.price,
        in_stock: h.stock > 0,
        source_id: s?.source_id ?? null, garment_type_id: s?.garment_type_id ?? null,
        status: (s?.status as StyleStatus) ?? "draft",
        image: variantImageBySku.get(h.sku) ?? s?.image_product_view ?? (Array.isArray(s?.images) ? (s?.images[0] as string) : null) ?? null,
      };
    });
    if (p.source) rows = rows.filter((r) => r.source_id === p.source);
    if (p.garmentType) rows = rows.filter((r) => r.garment_type_id === p.garmentType);
    if (p.status) rows = rows.filter((r) => r.status === p.status);
    if (p.stock === "in") rows = rows.filter((r) => r.in_stock);
    if (p.stock === "out") rows = rows.filter((r) => !r.in_stock);

    const total = rows.length;
    rows = rows.slice(page * pageSize, page * pageSize + pageSize);
    return { rows, total };
  }

  const runVariantQuery = async (includeVariantImage: boolean) => {
    const columns = includeVariantImage
      ? "image_product_view, sku, style_id, color_name, color_hex, size, price_override, in_stock, styles!inner(name, style_code, source_id, garment_type_id, category_id, collection_id, status, price, image_product_view, images, created_at)"
      : "sku, style_id, color_name, color_hex, size, price_override, in_stock, styles!inner(name, style_code, source_id, garment_type_id, category_id, collection_id, status, price, image_product_view, images, created_at)";
    let sel = supabase
      .from("variants")
      .select(columns, { count: "exact" });

    if (p.source)      sel = sel.eq("styles.source_id", p.source);
    if (p.garmentType) sel = sel.eq("styles.garment_type_id", p.garmentType);
    if (p.category)    sel = sel.eq("styles.category_id", p.category);
    if (p.collection)  sel = sel.eq("styles.collection_id", p.collection);
    if (p.status)      sel = sel.eq("styles.status", p.status as StyleStatus);
    if (p.stock === "in")  sel = sel.eq("in_stock", true);
    if (p.stock === "out") sel = sel.eq("in_stock", false);

    return sel
      .order("created_at", { referencedTable: "styles", ascending: false })
      .order("sku")
      .range(page * pageSize, page * pageSize + pageSize - 1);
  };

  let result = await runVariantQuery(true);
  let hasVariantImages = true;
  if (result.error && isMissingVariantImageColumn(result.error)) {
    result = await runVariantQuery(false);
    hasVariantImages = false;
  }
  const { data, error, count } = result;
  if (error) throw error;

  const rows: ProductRow[] = ((data ?? []) as unknown as Array<VariantRow & {
    image_product_view?: string | null;
    styles: {
      name: string; style_code: string; source_id: string | null; garment_type_id: string | null;
      status: StyleStatus; price: number; image_product_view: string | null; images: string[] | null;
    };
  }>).map((v) => {
    const row = v as typeof v & { image_product_view?: string | null };
    const s = v.styles as unknown as {
      name: string; style_code: string; source_id: string | null; garment_type_id: string | null;
      status: StyleStatus; price: number; image_product_view: string | null; images: string[] | null;
    };
    return {
      sku: v.sku, style_id: v.style_id, style_name: s.name, style_code: s.style_code,
      color_name: v.color_name, color_hex: v.color_hex, size: v.size,
      price: v.price_override ?? s.price, in_stock: v.in_stock,
      source_id: s.source_id, garment_type_id: s.garment_type_id, status: s.status,
      image: (hasVariantImages ? row.image_product_view : null) ?? s.image_product_view ?? (Array.isArray(s.images) ? s.images[0] : null) ?? null,
    };
  });
  return { rows, total: count ?? 0 };
}

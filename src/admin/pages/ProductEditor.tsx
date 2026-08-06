import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { supabase } from "../../lib/supabase";
import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom";
import {
  getStyleRaw, getVariants, getVariantBySku, updateStyle, createStyle,
  addVariant, updateVariant, updateColorVariantPrice, listStyleNames, nextStyleCode,
  listCategories, listCollections, type StyleNameHit,
} from "../api/products";
import { listSources, listGarmentTypes, listColors, upsertColor } from "../api/taxonomy";
import { listSizeTemplates, type SizeTemplateRow, type SizeTemplateData } from "../api/sizeTemplates";
import { compressImage } from "../../lib/image";
import { useAsync, useDebounced } from "../lib/useAsync";
import { useAuth } from "../../store/auth";
import { useUnsavedGuard } from "../lib/unsavedGuard";
import { Card, Btn, Dot } from "../components/ui";
import { vnd } from "../lib/format";
import { barcode } from "../data/sku";
import { SIZES, newSkuCode, stripDiacritics } from "../lib/slug";
import { type CategoryId } from "../../data/catalog";
import type { StyleStatus } from "../api/products";

const emptyStyle = (): StyleNameHit => ({
  id: "", name: "", style_code: "", source_id: null, garment_type_id: null,
  category_id: "dam-da-hoi", collection_id: null, silhouette: "a-line",
  body_type: "hourglass", status: "draft", price: 2_500_000, material: "",
  description: "", image_product_view: null, image_model_view: null, images_detail: [],
  size_template_id: null,
});

const withoutImages = (style: StyleNameHit): StyleNameHit => ({
  ...style,
  image_product_view: null,
  image_model_view: null,
  images_detail: [],
});

const IMAGE_ACCEPT = "image/jpeg,image/png,image/webp,image/avif";
const IMAGE_HELP_TEXT = "Hỗ trợ JPG, PNG, WebP, AVIF · tối đa 2MB";
const MAX_IMAGE_BYTES = 2 * 1024 * 1024;
const ALLOWED_IMAGE_TYPES = new Set(IMAGE_ACCEPT.split(","));
const describeError = (error: unknown) => {
  if (error instanceof Error) return error.message;
  if (error && typeof error === "object") {
    const message = (error as { message?: unknown }).message;
    if (typeof message === "string" && message.trim()) return message;
    try {
      return JSON.stringify(error);
    } catch {
      return String(error);
    }
  }
  return String(error);
};
const STATUS_RADIO_STYLES: Record<StyleStatus, { accent: string; selected: string }> = {
  active: {
    accent: "accent-emerald-600",
    selected: "border-emerald-200 bg-emerald-50 text-emerald-700",
  },
  draft: {
    accent: "accent-ink",
    selected: "border-ink bg-[var(--color-tile)] text-ink",
  },
  archived: {
    accent: "accent-orange-500",
    selected: "border-orange-200 bg-orange-50 text-orange-700",
  },
};

export default function ProductEditor() {
  const { t } = useTranslation();
  const { id, sku } = useParams();
  const [searchParams] = useSearchParams();
  const preselectStyle = searchParams.get("style");
  const navigate = useNavigate();
  const { isAdmin, ready } = useAuth();

  const mode: "editVariant" | "editStyle" | "create" = sku ? "editVariant" : id ? "editStyle" : "create";

  const sources = useAsync(() => listSources(), [], []);
  const garmentTypes = useAsync(() => listGarmentTypes(), [], []);
  const colorsList = useAsync(() => listColors(), [], []);
  const cats = useAsync(() => listCategories(), [], []);
  const cols = useAsync(() => listCollections(), [], []);
  const sizeTemplates = useAsync(() => listSizeTemplates(), [], []);

  const loadedVariant = useAsync(() => (sku ? getVariantBySku(sku) : Promise.resolve(null)), [sku], null);
  const loadedStyleForVariant = useAsync(
    () => (loadedVariant.data ? getStyleRaw(loadedVariant.data.style_id) : Promise.resolve(null)),
    [loadedVariant.data?.style_id],
    null
  );
  const loadedStyle = useAsync(() => (id ? getStyleRaw(id) : Promise.resolve(null)), [id], null);
  const styleVariants = useAsync(() => (id ? getVariants(id) : Promise.resolve([])), [id], []);
  const [pickedStyleId, setPickedStyleId] = useState<string | null>(null);
  const existingVariants = useAsync(
    () => (mode === "create" && pickedStyleId ? getVariants(pickedStyleId) : Promise.resolve([])),
    [mode, pickedStyleId],
    []
  );
  const preselected = useAsync(
    () => (preselectStyle ? getStyleRaw(preselectStyle) : Promise.resolve(null)),
    [preselectStyle],
    null
  );

  const [style, setStyle] = useState<StyleNameHit>(emptyStyle());
  const [colorName, setColorName] = useState("Black");
  const [size, setSize] = useState("M");
  const [price, setPrice] = useState(2_500_000);
  const [inStock, setInStock] = useState(true);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [hydrated, setHydrated] = useState(false);

  // create mode: one product colour can ship in several sizes; each size becomes its own SKU
  const [variantRows, setVariantRows] = useState<{ size: string }[]>([{ size: "M" }]);
  const [addingColor, setAddingColor] = useState(false);
  const [newColorName, setNewColorName] = useState("");
  const [newColorHex, setNewColorHex] = useState("#000000");
  const [addColorErr, setAddColorErr] = useState<string | null>(null);

  // combobox state (create mode only)
  const [styleQuery, setStyleQuery] = useState("");
  const dQuery = useDebounced(styleQuery, 200);
  const [comboOpen, setComboOpen] = useState(false);
  const matches = useAsync(() => (mode === "create" ? listStyleNames(dQuery) : Promise.resolve([])), [mode, dQuery], []);
  const [previewCode, setPreviewCode] = useState("");

  // hydrate for editVariant
  useEffect(() => {
    if (mode !== "editVariant" || hydrated) return;
    const v = loadedVariant.data;
    const s = loadedStyleForVariant.data;
    if (!v || !s) return;
    setStyle({
      ...s,
      image_product_view: v.image_product_view ?? s.image_product_view,
      image_model_view: v.image_model_view ?? s.image_model_view,
      images_detail: v.images_detail?.length ? v.images_detail : s.images_detail,
    });
    setColorName(v.color_name);
    setSize(v.size);
    setPrice(v.price_override ?? s.price);
    setInStock(v.in_stock);
    setHydrated(true);
  }, [mode, loadedVariant.data, loadedStyleForVariant.data, hydrated]);

  // hydrate for editStyle
  useEffect(() => {
    if (mode !== "editStyle" || hydrated) return;
    const s = loadedStyle.data;
    if (!s) return;
    setStyle(s);
    setPrice(s.price);
    setHydrated(true);
  }, [mode, loadedStyle.data, hydrated]);

  // hydrate for create + ?style= preselect
  useEffect(() => {
    if (mode !== "create" || pickedStyleId || !preselected.data) return;
    const s = preselected.data;
    setStyle(withoutImages(s));
    setStyleQuery(s.name);
    setPickedStyleId(s.id);
    setPrice(s.price);
  }, [mode, preselected.data, hydrated]);

  // A product must always belong to one size template; use the default chart
  // when a new or legacy row has no template assigned yet.
  useEffect(() => {
    if (style.size_template_id !== null || !sizeTemplates.data.length) return;
    const fallback = sizeTemplates.data.find((t) => t.is_default) ?? sizeTemplates.data[0];
    setStyle((s) => ({ ...s, size_template_id: fallback.id }));
  }, [sizeTemplates.data, style.size_template_id]);

  const pickStyle = (hit: StyleNameHit) => {
    setStyle(withoutImages(hit));
    setStyleQuery(hit.name);
    setPickedStyleId(hit.id);
    setPrice(hit.price);
    setComboOpen(false);
  };

  const clearPicked = () => {
    setPickedStyleId(null);
    setStyle(emptyStyle());
  };

  // multi-size builder (create mode) — one row = one SKU under the selected colour
  const addVariantRow = () => {
    const used = new Set(variantRows.map((r) => r.size));
    const next = { size: SIZES.find((sz) => !used.has(sz)) ?? SIZES[0] };
    setVariantRows((rows) => [...rows, next]);
  };
  const removeVariantRow = (i: number) => setVariantRows((rows) => rows.filter((_, j) => j !== i));
  const updateVariantRow = (i: number, patch: Partial<{ size: string }>) =>
    setVariantRows((rows) => rows.map((r, j) => (j === i ? { ...r, ...patch } : r)));

  const handleAddColor = async () => {
    setAddColorErr(null);
    const name = newColorName.trim();
    if (!name) return;
    const id = stripDiacritics(name).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
    try {
      await upsertColor({ id, name, hex: newColorHex, sort: colorsList.data.length });
      await colorsList.reload();
      setColorName(name);
      setNewColorName("");
      setNewColorHex("#000000");
      setAddingColor(false);
    } catch (e) {
      setAddColorErr(e instanceof Error ? e.message : String(e));
    }
  };

  const openAddColor = () => {
    setAddColorErr(null);
    setNewColorName("");
    setNewColorHex("#000000");
    setAddingColor(true);
  };

  // live style_code preview when creating a brand-new style
  useEffect(() => {
    if (mode !== "create" || pickedStyleId || !styleQuery.trim()) { setPreviewCode(""); return; }
    let cancelled = false;
    nextStyleCode(styleQuery.trim()).then((code) => { if (!cancelled) setPreviewCode(code); });
    return () => { cancelled = true; };
  }, [mode, pickedStyleId, styleQuery]);

  const styleCode = mode === "create" ? (pickedStyleId ? style.style_code : previewCode) : style.style_code;
  const skuPreview = styleCode ? newSkuCode(styleCode, colorName, size) : "";
  const displayName = mode === "create" ? styleQuery.trim() : style.name;

  const [fileInputRef1, fileInputRef2, fileInputRefDetail] = [useRef<HTMLInputElement>(null), useRef<HTMLInputElement>(null), useRef<HTMLInputElement>(null)];
  const [uploading, setUploading] = useState<"" | "product" | "model" | "detail">("");

  const uploadFile = async (rawFile: File): Promise<string> => {
    if (!ALLOWED_IMAGE_TYPES.has(rawFile.type)) {
      throw new Error("Chỉ hỗ trợ ảnh JPG, PNG, WebP hoặc AVIF.");
    }
    if (rawFile.size > MAX_IMAGE_BYTES) {
      throw new Error("Ảnh tải lên tối đa 2MB.");
    }
    const file = await compressImage(rawFile, 1200, 0.85); // Compress to webp, max width 1200
    const ext = file.name.split(".").pop();
    const filename = `${Date.now()}_${Math.random().toString(36).substring(7)}.${ext}`;
    const { error } = await supabase.storage.from("product-images").upload(filename, file);
    if (error) throw error;
    return supabase.storage.from("product-images").getPublicUrl(filename).data.publicUrl;
  };

  const handleSlotUpload = async (e: React.ChangeEvent<HTMLInputElement>, slot: "product" | "model") => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(slot);
    try {
      const url = await uploadFile(file);
      setStyle((s) => slot === "product" ? { ...s, image_product_view: url } : { ...s, image_model_view: url });
    } catch (err) {
      alert("Upload failed: " + (err instanceof Error ? err.message : String(err)));
    } finally {
      setUploading("");
      e.target.value = "";
    }
  };

  const handleDetailUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading("detail");
    try {
      const url = await uploadFile(file);
      setStyle((s) => ({ ...s, images_detail: [...s.images_detail, url] }));
    } catch (err) {
      alert("Upload failed: " + (err instanceof Error ? err.message : String(err)));
    } finally {
      setUploading("");
      e.target.value = "";
    }
  };

  const sharedFieldsPatch = (statusOverride?: StyleStatus, opts: { includeImages?: boolean } = {}) => {
    const includeImages = opts.includeImages ?? true;
    return {
      name: displayName,
      source_id: style.source_id,
      garment_type_id: style.garment_type_id,
      category_id: style.category_id,
      collection_id: style.collection_id,
      silhouette: style.silhouette,
      body_type: style.body_type,
      size_template_id: style.size_template_id,
      status: statusOverride ?? style.status,
      material: style.material,
      description: style.description,
      price: mode === "create" && !pickedStyleId ? price : style.price,
      ...(includeImages ? {
        image_product_view: style.image_product_view,
        image_model_view: style.image_model_view,
        images_detail: style.images_detail,
        images: [style.image_product_view, style.image_model_view, ...style.images_detail].filter(Boolean) as string[],
      } : {}),
    };
  };

  /** Returns whether the save actually went through (and navigated). The
   *  unsaved-changes guard relies on this: a validation failure must NOT be
   *  treated the same as a successful save, or it'd silently discard the
   *  form's dirty state (and the row that blocked it) without telling the user. */
  const save = async (opts?: { statusOverride?: StyleStatus; redirectTo?: string }): Promise<boolean> => {
    const redirectTo = opts?.redirectTo ?? "/admin/products";
    setErr(null);
    if (!displayName) { setErr(t("editor.name_required")); return false; }
    if (mode === "create" && variantRows.length === 0) { setErr(t("editor.pick_required")); return false; }
    setBusy(true);
    try {
      if (mode === "editStyle" && id) {
        await updateStyle(id, sharedFieldsPatch(opts?.statusOverride));
        navigate(redirectTo);
        return true;
      }

      if (mode === "editVariant" && sku) {
        const styleId = loadedVariant.data!.style_id;
        await updateStyle(styleId, sharedFieldsPatch(opts?.statusOverride, { includeImages: false }));

        const colorChanged = colorName !== loadedVariant.data!.color_name;
        const sizeChanged = size !== loadedVariant.data!.size;
        const patch: Parameters<typeof updateVariant>[1] = {
          price_override: price,
          in_stock: inStock,
          stock: inStock ? Math.max(loadedVariant.data!.stock, 1) : 0,
          image_product_view: style.image_product_view,
          image_model_view: style.image_model_view,
          images_detail: style.images_detail,
        };
        if (colorChanged || sizeChanged) {
          const nextSku = newSkuCode(style.style_code, colorName, size);
          if (styleVariants.data.some(v => v.sku === nextSku)) {
            setErr(`Sản phẩm với Màu ${colorName} và Size ${size} đã tồn tại! Vui lòng chọn phân loại khác.`);
            setBusy(false);
            return false;
          }

          const hex = colorsList.data.find((p) => p.name === colorName)?.hex ?? loadedVariant.data!.color_hex;
          patch.sku = nextSku;
          patch.color_name = colorName;
          patch.color_hex = hex;
          patch.size = size;
        }
        await updateVariant(sku, patch);
        await updateColorVariantPrice(styleId, colorName, price);
        navigate(redirectTo);
        return true;
      }

      // create mode — one style, one or more colour/size rows (each its own SKU)
      const seen = new Set<string>();
      for (const row of variantRows) {
        if (seen.has(row.size)) { setErr(`Trùng lặp size: ${row.size}`); setBusy(false); return false; }
        seen.add(row.size);
      }
      let code0 = styleCode;
      if (!pickedStyleId) code0 = await nextStyleCode(displayName);
      for (const row of variantRows) {
        const candidateSku = newSkuCode(code0, colorName, row.size);
        if (existingVariants.data.some((v) => v.sku === candidateSku)) {
          setErr(`Đã tồn tại: ${colorName} – ${row.size}`);
          setBusy(false);
          return false;
        }
      }

      let styleId = pickedStyleId;
      const code = code0;
      if (!styleId) {
        const { data: maxRow } = await supabase
          .from("styles").select("serial").eq("category_id", style.category_id)
          .order("serial", { ascending: false }).limit(1).single();
        const serial = (maxRow?.serial ?? 0) + 1;
        styleId = await createStyle({
          style_code: code, serial, occasion: style.category_id === "dam-bridal" ? "bridal" : "event",
          ...sharedFieldsPatch(opts?.statusOverride),
        });
      }

      const { data: maxRow2 } = await supabase.from("styles").select("serial").eq("id", styleId).single();
      const hex = colorsList.data.find((p) => p.name === colorName)?.hex ?? "#000";
      const colorIdx = colorsList.data.findIndex((p) => p.name === colorName);
      for (const row of variantRows) {
        const finalSku = newSkuCode(code, colorName, row.size);
        const sizeIdx = SIZES.indexOf(row.size);
        await addVariant({
          sku: finalSku, style_id: styleId, color_name: colorName, color_hex: hex, size: row.size,
          stock: inStock ? 1 : 0, reserved: 0, in_stock: inStock,
          barcode: barcode(style.category_id as CategoryId, maxRow2?.serial ?? 0, colorIdx, sizeIdx),
          price_override: price,
          image_product_view: style.image_product_view,
          image_model_view: style.image_model_view,
          images_detail: style.images_detail,
        });
      }
      navigate(redirectTo);
      return true;
    } catch (e) {
      setErr(describeError(e));
      return false;
    } finally {
      setBusy(false);
    }
  };

  const loading = (mode === "editVariant" && (loadedVariant.loading || loadedStyleForVariant.loading))
    || (mode === "editStyle" && loadedStyle.loading);

  // unsaved-changes guard — only meaningful while creating a brand-new product
  const isDirty = mode === "create" && (
    styleQuery.trim().length > 0 ||
    !!style.material?.trim() ||
    !!style.description?.trim() ||
    !!style.image_product_view ||
    !!style.image_model_view ||
    style.images_detail.length > 0
  );
  const armGuard = useUnsavedGuard((s) => s.arm);
  const disarmGuard = useUnsavedGuard((s) => s.disarm);
  const requestLeave = useUnsavedGuard((s) => s.requestLeave);

  // `save` closes over variantRows/style/etc., which change on every keystroke —
  // keep a ref so the guard (armed once, called much later) always saves current state
  const saveRef = useRef(save);
  saveRef.current = save;

  useEffect(() => {
    if (isDirty) armGuard(async (to) => {
      const ok = await saveRef.current({ statusOverride: "draft", redirectTo: to });
      if (!ok) throw new Error("save blocked");
    });
    else disarmGuard();
    return () => { disarmGuard(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isDirty]);

  useEffect(() => {
    if (!isDirty) return;
    const handler = (e: BeforeUnloadEvent) => { e.preventDefault(); e.returnValue = ""; };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [isDirty]);

  if (loading) return <p className="py-16 text-center text-xs text-ink-soft">{t("common.loading")}</p>;

  return (
    <div>
      <div className="mb-5 flex items-center justify-between">
        <div>
          <Link
            to="/admin/products"
            onClick={(e) => { if (!requestLeave("/admin/products")) e.preventDefault(); }}
            className="text-xs text-ink-soft link-underline"
          >{t("editor.back")}</Link>
          <h1 className="mt-1 font-serif text-3xl">
            {mode === "create" ? t("editor.new_style") : mode === "editStyle" ? (style.name || t("editor.edit_style")) : (skuPreview || sku)}
          </h1>
        </div>
        <div className="flex gap-2">
          <Btn variant="ghost" onClick={() => { if (requestLeave("/admin/products")) navigate("/admin/products"); }}>{t("common.cancel")}</Btn>
          <Btn onClick={() => save()} disabled={busy || (ready && !isAdmin)}>
            {busy ? t("common.saving") : mode === "create" ? t("editor.create") : t("editor.save")}
          </Btn>
        </div>
      </div>

      {ready && !isAdmin && (
        <p className="mb-4 rounded-md border border-amber-200 bg-amber-50 px-4 py-2.5 text-xs text-amber-800">
          {t("common.read_only_hint")}
        </p>
      )}
      {err && <p className="mb-4 rounded-md bg-[var(--color-accent-soft)] px-4 py-2.5 text-xs text-[var(--color-accent)]">{err}</p>}

      <div className="grid gap-4 lg:grid-cols-[1.6fr_1fr]">
        <div className="space-y-4">
          {/* Product: source, type, classification */}
          <Card title={t("editor.product_type")}>
            <div className="p-5">
              {mode === "create" ? (
                <div className="relative">
                  <input
                    value={styleQuery}
                    onChange={(e) => { setStyleQuery(e.target.value); if (pickedStyleId) clearPicked(); setComboOpen(true); }}
                    onFocus={() => setComboOpen(true)}
                    onBlur={() => setTimeout(() => setComboOpen(false), 150)}
                    placeholder={t("editor.product_type_ph")}
                    className="input"
                  />
                  {comboOpen && matches.data.length > 0 && (
                    <div className="absolute z-20 mt-1 max-h-56 w-full overflow-y-auto rounded-md border edge bg-[var(--color-bg)] shadow-lg">
                      {matches.data.map((h) => (
                        <button key={h.id} onMouseDown={() => pickStyle(h)} className="block w-full px-3 py-2 text-left text-sm hover:bg-[var(--color-tile)]">
                          <span className="font-serif">{h.name}</span>
                          <span className="ml-2 font-mono text-[11px] text-ink-soft">{h.style_code}</span>
                        </button>
                      ))}
                    </div>
                  )}
                  <p className="mt-2 text-[12px] text-ink-soft">
                    {pickedStyleId ? t("editor.product_type_existing") : t("editor.product_type_new", { code: previewCode || "…" })}
                  </p>
                </div>
              ) : mode === "editStyle" ? (
                <input
                  value={style.name}
                  onChange={(e) => setStyle((s) => ({ ...s, name: e.target.value }))}
                  className="input font-serif text-lg"
                />
              ) : (
                <p className="font-serif text-lg">{style.name}</p>
              )}
            </div>
            <div className="grid gap-4 border-t edge p-5 sm:grid-cols-2">
              <Field label={t("editor.source")}>
                <select value={style.source_id ?? ""} onChange={(e) => setStyle((s) => ({ ...s, source_id: e.target.value || null }))} className="input">
                  <option value="">{t("editor.source_ph")}</option>
                  {sources.data.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}
                </select>
              </Field>
              <Field label={t("editor.garment_type")}>
                <select value={style.garment_type_id ?? ""} onChange={(e) => setStyle((s) => ({ ...s, garment_type_id: e.target.value || null }))} className="input">
                  <option value="">{t("editor.garment_type_ph")}</option>
                  {garmentTypes.data.map((g) => <option key={g.id} value={g.id}>{g.label}</option>)}
                </select>
              </Field>
              <Field label={t("prod.category")}>
                <select value={style.category_id} onChange={(e) => setStyle((s) => ({ ...s, category_id: e.target.value as CategoryId }))} className="input">
                  {cats.data.map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}
                </select>
              </Field>
              <Field label="Collection">
                <select value={style.collection_id ?? ""} onChange={(e) => setStyle((s) => ({ ...s, collection_id: e.target.value || null }))} className="input">
                  <option value="">— {t("editor.collection_none")}</option>
                  {cols.data.map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}
                </select>
              </Field>
            </div>
          </Card>

          {mode !== "editStyle" && (
            <Card title={t("editor.name")}>
              <div className="border-b edge p-5">
                <SizeTemplateRadioGroup
                  label="Chọn Bảng Size mẫu"
                  name="size-template-create"
                  value={style.size_template_id ?? null}
                  templates={sizeTemplates.data}
                  onChange={(sizeTemplateId) => setStyle((s) => ({ ...s, size_template_id: sizeTemplateId }))}
                />

                {style.size_template_id && (() => {
                  const tpl = sizeTemplates.data.find(t => t.id === style.size_template_id);
                  if (!tpl) return null;
                  // tpl.data can be an old, differently-shaped record (pre-dating the
                  // {columns, rows} format) — never trust it blindly, or one bad
                  // template silently blanks the whole New Product page.
                  const raw = tpl.data as unknown as Partial<SizeTemplateData> | null;
                  const columns = Array.isArray(raw?.columns) ? raw.columns : [];
                  const rows = Array.isArray(raw?.rows) ? raw.rows : [];
                  if (!columns.length || !rows.length) return null;
                  return (
                    <div className="mt-4 overflow-x-auto rounded-md border edge">
                      <table className="w-full text-sm">
                        <thead className="bg-[var(--color-bg-subtle)]">
                          <tr className="border-b edge text-left text-xs text-ink-soft">
                            <th className="px-4 py-2">Size</th>
                            {columns.map((col, i) => (
                              <th key={i} className="px-4 py-2">{col}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {rows.map((row, i) => (
                            <tr key={i} className="border-b edge last:border-0">
                              <td className="px-4 py-2 font-serif text-base">{row.size}</td>
                              {columns.map((_, colIndex) => {
                                const m = row.measurements?.[colIndex] ?? { min: 0, max: 0 };
                                return (
                                  <td key={colIndex} className="px-4 py-2">{m.min} – {m.max}</td>
                                );
                              })}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  );
                })()}
              </div>

              {mode === "create" ? (
                <div className="space-y-2 p-5">
                  <ColorRadioGroup
                    label="Màu"
                    name="create-color"
                    value={colorName}
                    colors={colorsList.data}
                    onChange={setColorName}
                    action={
                      <button
                        type="button"
                        onClick={openAddColor}
                        className="text-[12px] text-ink-soft link-underline hover:text-ink"
                      >
                        + {t("editor.add_color")}
                      </button>
                    }
                  />
                  <div className="grid grid-cols-[6rem_10rem_1.5rem] items-center gap-2 px-0 pt-3 text-[11px] uppercase tracking-[0.12em] text-ink-soft">
                    <span>Size</span>
                    <span>SKU</span>
                    <span className="text-right">Xóa</span>
                  </div>
                  {variantRows.map((row, i) => {
                    const rowSku = styleCode ? newSkuCode(styleCode, colorName, row.size) : "";
                    const dup = variantRows.some((r, j) => j !== i && r.size === row.size);
                    return (
                      <div key={i} className="grid grid-cols-[6rem_10rem_1.5rem] items-center gap-2">
                        <select value={row.size} onChange={(e) => updateVariantRow(i, { size: e.target.value })} className="input shrink-0">
                          {SIZES.map((sz) => <option key={sz} value={sz}>{sz}</option>)}
                        </select>
                        <span className={`shrink-0 truncate font-mono text-[11px] ${dup ? "text-[var(--color-accent)]" : "text-ink-soft"}`}>
                          {dup ? t("editor.duplicate_row") : rowSku}
                        </span>
                        <button
                          type="button"
                          onClick={() => removeVariantRow(i)}
                          disabled={variantRows.length === 1}
                          aria-label={t("editor.remove_row")}
                          className="flex justify-end text-ink-soft transition-colors hover:text-[var(--color-accent)] disabled:opacity-30"
                        >
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M18 6L6 18M6 6l12 12" /></svg>
                        </button>
                      </div>
                    );
                  })}
                  <button type="button" onClick={addVariantRow} className="mt-1 text-[12px] link-underline text-ink-soft hover:text-ink">
                    + {t("editor.add_row")}
                  </button>
                </div>
              ) : (
                <div className="space-y-2 p-5">
                  <div className="flex items-center gap-2">
                    <ColorPicker value={colorName} colors={colorsList.data} onChange={setColorName} />
                    <button
                      type="button"
                      onClick={openAddColor}
                      className="shrink-0 text-[12px] text-ink-soft link-underline hover:text-ink"
                    >
                      + {t("editor.add_color")}
                    </button>
                    <select value={size} onChange={(e) => setSize(e.target.value)} className="input w-24 shrink-0">
                      {SIZES.map((sz) => <option key={sz} value={sz}>{sz}</option>)}
                    </select>
                    <span className="w-40 shrink-0 truncate font-mono text-[11px] text-ink-soft">{skuPreview}</span>
                  </div>
                  <div className="flex items-center justify-between gap-4 border-t edge pt-3">
                    <p className="truncate font-serif text-base">{displayName || "—"} – {colorName} – {size}</p>
                  </div>
                </div>
              )}
            </Card>
          )}

          <Card title={t("editor.price")}>
            <div className="grid gap-4 p-5 sm:grid-cols-2">
              <Field label={t("editor.price")}>
                <PriceInput
                  value={mode === "editStyle" ? style.price : price}
                  onChange={(nextPrice) => mode === "editStyle"
                    ? setStyle((s) => ({ ...s, price: nextPrice }))
                    : setPrice(nextPrice)}
                />
              </Field>
              {mode === "editVariant" && (
                <Field label={t("editor.status_stock")}>
                  <button
                    onClick={() => setInStock((v) => !v)}
                    className={`flex h-9 w-full items-center gap-2 rounded-md border px-3 text-sm transition-colors ${inStock ? "border-emerald-300 bg-emerald-50 text-emerald-700" : "edge text-ink-soft"}`}
                  >
                    <span className={`h-2 w-2 rounded-full ${inStock ? "bg-emerald-500" : "bg-[var(--color-line)]"}`} />
                    {inStock ? t("editor.in_stock") : t("editor.out_of_stock")}
                  </button>
                </Field>
              )}
              <Field label={t("editor.material")}>
                <input value={style.material ?? ""} onChange={(e) => setStyle((s) => ({ ...s, material: e.target.value }))} placeholder={t("editor.material_ph")} className="input" />
              </Field>
              <Field label={t("editor.description")} className="sm:col-span-2">
                <textarea value={style.description ?? ""} onChange={(e) => setStyle((s) => ({ ...s, description: e.target.value }))} rows={3} className="input" />
              </Field>
            </div>
          </Card>

          {mode === "editStyle" && (
            <Card title="Bảng Size">
              <div className="p-5">
                <SizeTemplateRadioGroup
                  label="Chọn Bảng Size mẫu"
                  name="size-template-edit-style"
                  value={style.size_template_id ?? null}
                  templates={sizeTemplates.data}
                  onChange={(sizeTemplateId) => setStyle((s) => ({ ...s, size_template_id: sizeTemplateId }))}
                />

                {style.size_template_id && (() => {
                   const tpl = sizeTemplates.data.find(t => t.id === style.size_template_id);
                   if (!tpl) return null;
                   const data = (tpl.data as unknown as SizeTemplateData) || { columns: [], rows: [] };
                   return (
                     <div className="mt-4 overflow-x-auto rounded-md border edge">
                        <table className="w-full text-sm">
                          <thead className="bg-[var(--color-bg-subtle)]">
                            <tr className="border-b edge text-left text-xs text-ink-soft">
                              <th className="px-4 py-2">Size</th>
                              {data.columns.map((col, i) => (
                                <th key={i} className="px-4 py-2">{col}</th>
                              ))}
                            </tr>
                          </thead>
                          <tbody>
                            {data.rows.map((row, i) => (
                              <tr key={i} className="border-b edge last:border-0">
                                <td className="px-4 py-2 font-serif text-base">{row.size}</td>
                                {data.columns.map((_, colIndex) => {
                                  const m = row.measurements[colIndex] || { min: 0, max: 0 };
                                  return (
                                    <td key={colIndex} className="px-4 py-2">{m.min} – {m.max}</td>
                                  );
                                })}
                              </tr>
                            ))}
                          </tbody>
                        </table>
                     </div>
                   );
                })()}
              </div>
            </Card>
          )}

          {mode === "editStyle" && (
            <Card title={t("editor.variants", { count: styleVariants.data.length })} action={
              <Link to={`/admin/products/new?style=${id}`} className="text-[12px] text-ink-soft link-underline">{t("editor.add_sku")}</Link>
            }>
              <div className="max-h-96 overflow-y-auto">
                <table className="w-full text-sm">
                  <thead className="sticky top-0 bg-[var(--color-bg)]">
                    <tr className="border-b edge text-left text-[12px] tracking-[0.1em] text-ink-soft">
                      <th className="px-4 py-2">{t("prod.col_sku")}</th><th className="px-2 py-2">{t("prod.col_color")}</th><th className="px-2 py-2">{t("prod.col_size")}</th>
                      <th className="px-2 py-2 text-right">{t("editor.price")}</th><th className="px-2 py-2">{t("editor.status_stock")}</th><th className="px-2 py-2" />
                    </tr>
                  </thead>
                  <tbody>
                    {styleVariants.data.map((v) => (
                      <tr key={v.sku} className="border-b edge last:border-0">
                        <td className="px-4 py-1.5 font-mono text-[12px]">{v.sku}</td>
                        <td className="px-2 py-1.5"><span className="flex items-center gap-1.5 text-xs"><Dot hex={v.color_hex} />{v.color_name}</span></td>
                        <td className="px-2 py-1.5 text-xs">{v.size}</td>
                        <td className="px-2 py-1.5 text-right text-xs tabular-nums">{vnd(v.price_override ?? style.price)}</td>
                        <td className="px-2 py-1.5 text-xs">{v.in_stock ? t("editor.in_stock") : t("editor.out_of_stock")}</td>
                        <td className="px-2 py-1.5 text-right">
                          <Link to={`/admin/products/sku/${v.sku}`} className="inline-flex items-center gap-1 text-[12px] text-ink-soft hover:text-ink transition-colors justify-end w-full">
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>
                            {t("common.edit")}
                          </Link>
                        </td>
                      </tr>
                    ))}
                    {!styleVariants.data.length && <tr><td colSpan={6} className="py-6 text-center text-xs text-ink-soft">{t("editor.pick_hint")}</td></tr>}
                  </tbody>
                </table>
              </div>
            </Card>
          )}
        </div>

        <div className="space-y-4">
          <Card title={t("editor.status")}>
            <div className="flex flex-wrap gap-4 p-5">
              {(["active", "draft", "archived"] as StyleStatus[]).map((s) => {
                const selected = style.status === s;
                const statusStyle = STATUS_RADIO_STYLES[s];
                return (
                  <label
                    key={s}
                    className={`flex cursor-pointer items-center gap-2 rounded-full border px-3 py-2 text-sm transition-colors ${
                      selected ? statusStyle.selected : "edge text-ink hover:border-ink"
                    }`}
                  >
                    <input
                      type="radio"
                      name="status"
                      checked={selected}
                      onChange={() => setStyle((st) => ({ ...st, status: s }))}
                      className={`h-4 w-4 ${statusStyle.accent}`}
                    />
                    {t(`status.${s}`)}
                  </label>
                );
              })}
            </div>
          </Card>

          <Card title={t("editor.images")}>
            <div className="grid gap-5 p-5">
              <ImageSlot label={t("editor.image_product_view")} url={style.image_product_view}
                busy={uploading === "product"} inputRef={fileInputRef1}
                onUpload={(e) => handleSlotUpload(e, "product")}
                onClear={() => setStyle((s) => ({ ...s, image_product_view: null }))} />
              <ImageSlot label={t("editor.image_model_view")} url={style.image_model_view}
                busy={uploading === "model"} inputRef={fileInputRef2}
                onUpload={(e) => handleSlotUpload(e, "model")}
                onClear={() => setStyle((s) => ({ ...s, image_model_view: null }))} />
            </div>
            <div className="border-t edge p-5">
              <p className="text-[12px] tracking-[0.1em] text-ink-soft">{t("editor.image_detail")}</p>
              {style.images_detail.length > 0 && (
                <div className="mt-2 grid grid-cols-4 gap-2">
                  {style.images_detail.map((url, i) => (
                    <div key={`${url}-${i}`} className="group relative aspect-square overflow-hidden rounded-md border edge bg-[var(--color-tile)]">
                      <img src={url} alt="" className="h-full w-full object-cover object-top" />
                      <button
                        onClick={() => setStyle((s) => ({ ...s, images_detail: s.images_detail.filter((_, j) => j !== i) }))}
                        className="absolute right-1 top-1 flex h-5 w-5 items-center justify-center rounded bg-black/60 text-white opacity-0 transition-opacity group-hover:opacity-100 hover:bg-red-600"
                      ><svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M18 6L6 18M6 6l12 12" /></svg></button>
                    </div>
                  ))}
                </div>
              )}
              <p className="mt-1 text-[11px] leading-relaxed text-ink-soft">{IMAGE_HELP_TEXT}</p>
              <input type="file" accept={IMAGE_ACCEPT} className="hidden" ref={fileInputRefDetail} onChange={handleDetailUpload} />
              <Btn variant="ghost" onClick={() => fileInputRefDetail.current?.click()} disabled={uploading === "detail"} className="mt-2">
                {uploading === "detail" ? t("common.loading") : t("editor.add")}
              </Btn>
            </div>
          </Card>
          {(mode === "editStyle" || mode === "editVariant") && (
            <p className="rounded-md bg-[var(--color-tile)] px-4 py-3 text-[12px] leading-relaxed text-ink-soft">
              {t("editor.shared_fields_hint", { name: style.name })}
            </p>
          )}
        </div>
      </div>

      {addingColor && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/30" onClick={() => setAddingColor(false)} />
          <div className="relative z-10 w-full max-w-sm rounded-lg bg-[var(--color-bg)] p-6 shadow-2xl">
            <h2 className="font-serif text-xl">{t("editor.new_color_title")}</h2>
            <div className="mt-5 space-y-4">
              <Field label={t("editor.new_color_name")}>
                <input value={newColorName} onChange={(e) => setNewColorName(e.target.value)} placeholder="e.g. Dusty Rose" className="input" />
              </Field>
              <Field label={t("editor.new_color_hex")}>
                <div className="flex items-center gap-3">
                  <input type="color" value={newColorHex} onChange={(e) => setNewColorHex(e.target.value)} className="h-9 w-12 shrink-0 cursor-pointer rounded border edge bg-transparent p-0.5" />
                  <input value={newColorHex} onChange={(e) => setNewColorHex(e.target.value)} placeholder="#c9a2a2" className="input flex-1 font-mono" />
                </div>
              </Field>
            </div>
            {addColorErr && <p className="mt-3 text-xs text-[var(--color-accent)]">{addColorErr}</p>}
            <div className="mt-6 flex justify-end gap-2">
              <Btn variant="ghost" onClick={() => setAddingColor(false)}>{t("common.cancel")}</Btn>
              <Btn onClick={handleAddColor} disabled={!newColorName.trim() || !/^#[0-9a-fA-F]{6}$/.test(newColorHex)}>
                {t("common.save")}
              </Btn>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function ImageSlot({ label, url, busy, inputRef, onUpload, onClear }: {
  label: string; url: string | null; busy: boolean;
  inputRef: React.RefObject<HTMLInputElement | null>;
  onUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onClear: () => void;
}) {
  return (
    <div>
      <p className="text-[12px] tracking-[0.1em] text-ink-soft">{label}</p>
      <p className="mt-1 text-[11px] leading-relaxed text-ink-soft">{IMAGE_HELP_TEXT}</p>
      <div className="mt-2 flex items-center gap-3">
        <div className="relative h-32 w-24 shrink-0 overflow-hidden rounded-md border edge bg-[var(--color-tile)]">
          {url && <img src={url} alt="" className="h-full w-full object-cover object-top" />}
        </div>
        <input type="file" accept={IMAGE_ACCEPT} className="hidden" ref={inputRef} onChange={onUpload} />
        <div className="flex gap-2">
          <Btn variant="ghost" onClick={() => inputRef.current?.click()} disabled={busy}>
            {busy ? "…" : url ? "Thay đổi" : "Tải lên"}
          </Btn>
          {url && <Btn variant="ghost" onClick={onClear}>Xóa</Btn>}
        </div>
      </div>
    </div>
  );
}

function Field({ label, children, className = "" }: { label: string; children: React.ReactNode; className?: string }) {
  return (
    <label className={`block ${className}`}>
      <span className="text-[12px] tracking-[0.1em] text-ink-soft">{label.toUpperCase()}</span>
      <div className="mt-1">{children}</div>
    </label>
  );
}

function formatPriceInput(value: number) {
  if (!Number.isFinite(value)) return "";
  return Math.trunc(value).toLocaleString("vi-VN");
}

function parsePriceInput(value: string) {
  const digits = value.replace(/\D/g, "");
  return digits ? Number(digits) : 0;
}

function PriceInput({ value, onChange }: { value: number; onChange: (value: number) => void }) {
  const [draft, setDraft] = useState(formatPriceInput(value));

  useEffect(() => {
    setDraft(formatPriceInput(value));
  }, [value]);

  return (
    <input
      type="text"
      inputMode="numeric"
      value={draft}
      onChange={(e) => {
        const nextPrice = parsePriceInput(e.target.value);
        setDraft(e.target.value.trim() === "" ? "" : formatPriceInput(nextPrice));
        onChange(nextPrice);
      }}
      onBlur={() => setDraft(formatPriceInput(value))}
      className="input tabular-nums"
    />
  );
}

function SizeTemplateRadioGroup({ label, name, value, templates, onChange }: {
  label: string;
  name: string;
  value: string | null;
  templates: SizeTemplateRow[];
  onChange: (sizeTemplateId: string) => void;
}) {
  return (
    <div>
      <p className="text-[12px] tracking-[0.1em] text-ink-soft">{label.toUpperCase()}</p>
      <div className="mt-2 flex flex-wrap gap-4" role="radiogroup" aria-label={label}>
        {templates.map((template) => (
          <label
            key={template.id}
            className="flex cursor-pointer items-center gap-2 text-sm"
          >
            <input
              type="radio"
              name={name}
              checked={value === template.id}
              onChange={() => onChange(template.id)}
              className="h-4 w-4 accent-ink"
            />
            <span>{template.name}</span>
          </label>
        ))}
      </div>
    </div>
  );
}

function ColorRadioGroup({ label, name, value, colors, onChange, action }: {
  label: string;
  name: string;
  value: string;
  colors: { id: string; name: string; hex: string }[];
  onChange: (name: string) => void;
  action?: React.ReactNode;
}) {
  return (
    <div>
      <div className="flex items-center justify-between gap-3">
        <p className="text-[12px] tracking-[0.1em] text-ink-soft">{label.toUpperCase()}</p>
        {action}
      </div>
      <div className="mt-3 flex flex-wrap gap-3" role="radiogroup" aria-label={label}>
        {colors.map((color) => {
          const active = value === color.name;
          return (
            <label
              key={color.id}
              className={`inline-flex h-10 cursor-pointer items-center gap-2 rounded-full border px-3.5 text-sm transition-colors ${
                active ? "border-ink bg-white/50 text-ink" : "edge text-ink hover:border-ink"
              }`}
            >
              <input
                type="radio"
                name={name}
                checked={active}
                onChange={() => onChange(color.name)}
                className="sr-only"
              />
              <span
                className="h-6 w-6 rounded-full ring-1 ring-black/10"
                style={{ background: color.hex }}
              />
              <span>{color.name}</span>
            </label>
          );
        })}
      </div>
    </div>
  );
}

/** A native <select> can't render a colour swatch inside its options, so a
 *  colour-by-name-only dropdown is hard to scan — this is a small custom
 *  listbox that shows the swatch dot next to each name, in the trigger too. */
function ColorPicker({ value, colors, onChange }: {
  value: string;
  colors: { id: string; name: string; hex: string }[];
  onChange: (name: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  const current = colors.find((c) => c.name === value);

  return (
    <div ref={ref} className="relative flex-1">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="input flex items-center gap-2 text-left"
      >
        {current && <Dot hex={current.hex} />}
        <span className="flex-1 truncate">{value}</span>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className={`shrink-0 text-ink-soft transition-transform ${open ? "rotate-180" : ""}`}>
          <path d="M6 9l6 6 6-6" />
        </svg>
      </button>
      {open && (
        <div className="absolute z-20 mt-1 max-h-56 w-full overflow-y-auto rounded-md border edge bg-[var(--color-bg)] shadow-lg">
          {colors.map((c) => (
            <button
              type="button"
              key={c.id}
              onClick={() => { onChange(c.name); setOpen(false); }}
              className={`flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-[var(--color-tile)] ${c.name === value ? "bg-[var(--color-tile)]" : ""}`}
            >
              <Dot hex={c.hex} /> {c.name}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

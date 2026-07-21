import { useEffect, useMemo, useState, useRef } from "react";
import { useTranslation } from "react-i18next";
import { supabase } from "../../lib/supabase";
import { Link, useNavigate, useParams } from "react-router-dom";
import {
  getStyle, getVariants, updateStyle, createStyle, replaceVariants,
  listCategories, listCollections, type VariantInsert,
} from "../api/products";
import { listRules } from "../api/rules";
import { useAsync } from "../lib/useAsync";
import { useAuth } from "../../store/auth";
import { Card, Btn, Dot, Badge } from "../components/ui";
import { vnd, compactVnd } from "../lib/format";
import { skuCode, styleCode, barcode, CATEGORY_CODE } from "../data/sku";
import { PALETTE, SILHOUETTES, type CategoryId, type Silhouette } from "../../data/catalog";
import type { StyleStatus, BodyType } from "../api/products";

const SIZES = ["XS", "S", "M", "L", "XL", "2XL", "Custom"];

const PRODUCT_LIBRARY = [
  "/product-image-demo/600332183_1201900768787121_2051984339437065533_n.jpg",
  "/product-image-demo/602970875_1205145441795987_18715939281272587_n.jpg",
  "/product-image-demo/604302658_1207684788208719_2584822847566233407_n.jpg",
  "/product-image-demo/604770326_1209992451311286_3317825646691052207_n.jpg",
  "/product-image-demo/605730417_1207684818208716_3284772005674759256_n.jpg",
  "/product-image-demo/605744430_1209992551311276_4297429810533013933_n.jpg",
  "/product-image-demo/605854033_1212322447744953_8385914445294101481_n.jpg",
  "/product-image-demo/606001228_1212295194414345_7959480619862527801_n.jpg",
  "/product-image-demo/606038369_1209992494644615_3834472852269240134_n.jpg",
  "/product-image-demo/607653555_1212322397744958_1993799492838073038_n.jpg",
  "/product-image-demo/608051236_1212295184414346_1759387043234619556_n.jpg",
  "/product-image-demo/608204946_1212322411078290_5493282969479296625_n.jpg",
  "/product-image-demo/608511618_1212295214414343_8768514877154959894_n.jpg",
  "/product-image-demo/667405324_1300229082287622_3951756945889064705_n.jpg",
  "/product-image-demo/667453997_1300228645620999_7198445231715406264_n.jpg",
  "/product-image-demo/668139748_1300226622287868_3536109004282702876_n.jpg",
];

export default function ProductEditor() {
  const { t } = useTranslation();
  const { id } = useParams();
  const navigate = useNavigate();
  const isEdit = !!id;
  const { isAdmin, ready } = useAuth();

  const cats = useAsync(() => listCategories(), [], []);
  const cols = useAsync(() => listCollections(), [], []);
  const rules = useAsync(() => listRules(), [], []);
  const existing = useAsync(() => (id ? getStyle(id) : Promise.resolve(null)), [id], null);
  const existingVariants = useAsync(() => (id ? getVariants(id) : Promise.resolve([])), [id], []);

  const [name, setName] = useState("");
  const [category, setCategory] = useState<CategoryId>("dam-da-hoi");
  const [collection, setCollection] = useState("");
  const [silhouette, setSilhouette] = useState<Silhouette>("a-line");
  const [price, setPrice] = useState(2_500_000);
  const [material, setMaterial] = useState("");
  const [status, setStatus] = useState<StyleStatus>("draft");
  const [bodyType, setBodyType] = useState<BodyType>("hourglass");
  const [colorNames, setColorNames] = useState<string[]>(["Black"]);
  const [sizes, setSizes] = useState<string[]>(["S", "M", "L"]);
  const [images, setImages] = useState<string[]>([]);
  const [imageInput, setImageInput] = useState("");
  const [libraryOpen, setLibraryOpen] = useState(false);
  const [serial, setSerial] = useState(9000);
  const [busy, setBusy] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const ext = file.name.split('.').pop();
      const filename = `${Date.now()}_${Math.random().toString(36).substring(7)}.${ext}`;
      const { error } = await supabase.storage.from("product-images").upload(filename, file);
      if (error) throw error;
      const { data: { publicUrl } } = supabase.storage.from("product-images").getPublicUrl(filename);
      setImages((p) => [...p, publicUrl]);
    } catch (err) {
      alert("Upload failed: " + (err instanceof Error ? err.message : String(err)));
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };
  const [err, setErr] = useState<string | null>(null);
  const [hydrated, setHydrated] = useState(false);

  // hydrate the form once the row arrives
  useEffect(() => {
    const s = existing.data;
    if (!s || hydrated) return;
    setName(s.name ?? "");
    setCategory(s.category_id as CategoryId);
    setCollection(s.collection_id ?? "");
    setSilhouette((s.silhouette as Silhouette) ?? "a-line");
    setPrice(s.price ?? 0);
    setMaterial(s.material ?? "");
    setStatus((s.status as StyleStatus) ?? "draft");
    setBodyType((s.body_type as BodyType) ?? "hourglass");
    setSerial(s.serial ?? 9000);
    setImages(Array.isArray(s.images) ? (s.images as string[]) : []);
    setHydrated(true);
  }, [existing.data, hydrated]);

  useEffect(() => {
    if (!existingVariants.data.length || !hydrated) return;
    setColorNames([...new Set(existingVariants.data.map((v) => v.color_name))]);
    setSizes([...new Set(existingVariants.data.map((v) => v.size))]
      .sort((a, b) => SIZES.indexOf(a) - SIZES.indexOf(b)));
  }, [existingVariants.data, hydrated]);

  useEffect(() => {
    if (!collection && cols.data.length) setCollection(cols.data[0].id);
  }, [cols.data, collection]);

  const code = styleCode(category, serial);

  /** colour × size grid, preserving stock for variants that already exist */
  const variantsPreview = useMemo(() => {
    const rows: (VariantInsert & { color_hex: string })[] = [];
    colorNames.forEach((cn, ci) => {
      const hex = Object.values(PALETTE).find((p) => p.name === cn)?.hex ?? "#000";
      sizes.forEach((sz, si) => {
        const prev = existingVariants.data.find((v) => v.color_name === cn && v.size === sz);
        rows.push({
          sku: skuCode(category, serial, cn, sz),
          style_id: id ?? "",
          color_name: cn,
          color_hex: hex,
          size: sz,
          stock: prev?.stock ?? 0,
          reserved: prev?.reserved ?? 0,
          barcode: prev?.barcode ?? barcode(category, serial, ci, si),
          price_override: prev?.price_override ?? null,
        });
      });
    });
    return rows;
  }, [colorNames, sizes, category, serial, existingVariants.data, id]);

  const rule = rules.data.find((r) => r.body_type === bodyType);

  const toggle = (arr: string[], v: string, set: (a: string[]) => void) =>
    set(arr.includes(v) ? arr.filter((x) => x !== v) : [...arr, v]);

  const save = async () => {
    setErr(null);
    if (!name.trim()) { setErr(t("editor.name_required")); return; }
    if (!variantsPreview.length) { setErr(t("editor.pick_required")); return; }
    setBusy(true);
    try {
      let styleId = id;
      if (isEdit && styleId) {
        await updateStyle(styleId, {
          name, category_id: category, collection_id: collection, silhouette,
          price, material, status, body_type: bodyType, images,
        });
      } else {
        styleId = await createStyle({
          style_code: code, serial, name,
          category_id: category, collection_id: collection, silhouette,
          occasion: category === "dam-bridal" ? "bridal" : "event",
          price, material, status, body_type: bodyType, images,
        });
      }
      await replaceVariants(styleId, variantsPreview.map((v) => ({ ...v, style_id: styleId! })));
      navigate("/admin/products");
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  };

  if (existing.loading) return <p className="py-16 text-center text-xs text-ink-soft">{t("common.loading")}</p>;

  return (
    <div>
      <div className="mb-5 flex items-center justify-between">
        <div>
          <Link to="/admin/products" className="text-xs text-ink-soft link-underline">{t("editor.back")}</Link>
          <h1 className="mt-1 font-serif text-3xl">{isEdit ? name || t("editor.edit_style") : t("editor.new_style")}</h1>
        </div>
        <div className="flex gap-2">
          <Btn variant="ghost" onClick={() => navigate("/admin/products")}>{t("common.cancel")}</Btn>
          <Btn onClick={save} disabled={busy || (ready && !isAdmin)}>
            {busy ? t("common.saving") : isEdit ? t("editor.save") : t("editor.create")}
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
          <Card title={t("editor.details")}>
            <div className="grid gap-4 p-5 sm:grid-cols-2">
              <Field label={t("editor.name")} className="sm:col-span-2">
                <input value={name} onChange={(e) => setName(e.target.value)} placeholder={t("editor.name_ph")} className="input" />
              </Field>
              <Field label={t("prod.category")}>
                <select value={category} onChange={(e) => setCategory(e.target.value as CategoryId)} className="input">
                  {cats.data.map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}
                </select>
              </Field>
              <Field label={t("prod.collection")}>
                <select value={collection} onChange={(e) => setCollection(e.target.value)} className="input">
                  {cols.data.map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}
                </select>
              </Field>
              <Field label={t("editor.silhouette")}>
                <select value={silhouette} onChange={(e) => setSilhouette(e.target.value as Silhouette)} className="input">
                  {SILHOUETTES.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}
                </select>
              </Field>
              <Field label={t("editor.price")}>
                <input type="number" value={price} onChange={(e) => setPrice(Number(e.target.value))} className="input tabular-nums" />
              </Field>
              <Field label={t("editor.material")} className="sm:col-span-2">
                <input value={material} onChange={(e) => setMaterial(e.target.value)} placeholder={t("editor.material_ph")} className="input" />
              </Field>
              <Field label={t("editor.status")}>
                <select value={status} onChange={(e) => setStatus(e.target.value as StyleStatus)} className="input">
                  {(["active", "draft", "archived"] as StyleStatus[]).map((s) => <option key={s} value={s}>{t(`status.${s}`)}</option>)}
                </select>
              </Field>
            </div>
          </Card>

          <Card title={t("editor.images")}>
            <div className="p-5">
              {images.length > 0 && (
                <div className="grid grid-cols-3 gap-2 mb-4">
                  {images.map((url, i) => (
                    <div key={`${url}-${i}`} className="group relative aspect-square overflow-hidden rounded-md border edge bg-[var(--color-tile)]">
                      <img src={url} alt="" className="h-full w-full object-cover object-top" />
                      {i === 0 && (
                        <span className="absolute left-1.5 top-1.5 rounded bg-ink px-1.5 py-0.5 text-[9px] tracking-wider text-white">
                          {t("editor.cover")}
                        </span>
                      )}
                      <div className="absolute right-1 top-1 flex flex-col gap-0.5 opacity-0 transition-opacity group-hover:opacity-100">
                        {i > 0 && (
                          <button
                            onClick={() => setImages((prev) => { const a = [...prev]; [a[i - 1], a[i]] = [a[i], a[i - 1]]; return a; })}
                            className="flex h-5 w-5 items-center justify-center rounded bg-black/60 text-white hover:bg-black/80"
                          ><svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M18 15l-6-6-6 6" /></svg></button>
                        )}
                        {i < images.length - 1 && (
                          <button
                            onClick={() => setImages((prev) => { const a = [...prev]; [a[i], a[i + 1]] = [a[i + 1], a[i]]; return a; })}
                            className="flex h-5 w-5 items-center justify-center rounded bg-black/60 text-white hover:bg-black/80"
                          ><svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M6 9l6 6 6-6" /></svg></button>
                        )}
                        <button
                          onClick={() => setImages((prev) => prev.filter((_, j) => j !== i))}
                          className="flex h-5 w-5 items-center justify-center rounded bg-black/60 text-white hover:bg-red-600"
                        ><svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M18 6L6 18M6 6l12 12" /></svg></button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
              {images.length === 0 && (
                <p className="mb-4 text-center text-[11px] text-ink-soft">{t("editor.no_images")}</p>
              )}

              {/* URL input and File Upload */}
              <div className="flex gap-2">
                <input
                  value={imageInput}
                  onChange={(e) => setImageInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && imageInput.trim()) {
                      setImages((p) => [...p, imageInput.trim()]);
                      setImageInput("");
                    }
                  }}
                  placeholder={t("editor.image_url_ph")}
                  className="input flex-1 text-xs"
                />
                <Btn
                  onClick={() => { if (imageInput.trim()) { setImages((p) => [...p, imageInput.trim()]); setImageInput(""); } }}
                  disabled={!imageInput.trim() || uploading}
                >
                  {t("editor.add")}
                </Btn>
                <input type="file" accept="image/*" className="hidden" ref={fileInputRef} onChange={handleUpload} />
                <Btn variant="ghost" onClick={() => fileInputRef.current?.click()} disabled={uploading}>
                  {uploading ? t("common.loading") : t("Upload from Device")}
                </Btn>
              </div>

              {/* Library picker */}
              <button
                onClick={() => setLibraryOpen((v) => !v)}
                className="mt-3 flex items-center gap-1.5 text-[11px] text-ink-soft link-underline"
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg>
                {t("editor.browse_library")}
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className={`transition-transform ${libraryOpen ? "rotate-180" : ""}`}><path d="M6 9l6 6 6-6" /></svg>
              </button>

              {libraryOpen && (
                <div className="mt-2 grid grid-cols-4 gap-1.5">
                  {PRODUCT_LIBRARY.map((url) => {
                    const already = images.includes(url);
                    return (
                      <button
                        key={url}
                        onClick={() => { if (!already) setImages((p) => [...p, url]); }}
                        disabled={already}
                        className={`group relative aspect-square overflow-hidden rounded border transition-colors ${already ? "border-ink opacity-40" : "edge hover:border-ink"}`}
                      >
                        <img src={url} alt="" className="h-full w-full object-cover object-top" />
                        {already && (
                          <div className="absolute inset-0 flex items-center justify-center bg-black/30">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5"><path d="M20 6L9 17l-5-5" /></svg>
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>
              )}

              <p className="mt-3 text-[10px] text-ink-soft">{t("editor.images_hint")}</p>
            </div>
          </Card>

          <Card title={t("editor.colors")}>
            <div className="flex flex-wrap gap-2.5 p-5">
              {Object.values(PALETTE).map((c) => {
                const on = colorNames.includes(c.name);
                return (
                  <button key={c.name} onClick={() => toggle(colorNames, c.name, setColorNames)}
                    className={`flex items-center gap-2 rounded-full border py-1.5 pl-1.5 pr-3 text-xs transition-colors ${on ? "border-ink bg-[var(--color-tile)]" : "edge"}`}>
                    <Dot hex={c.hex} /> {c.name}
                  </button>
                );
              })}
            </div>
          </Card>

          <Card title={t("editor.sizes")}>
            <div className="flex flex-wrap gap-2 p-5">
              {SIZES.map((sz) => {
                const on = sizes.includes(sz);
                return (
                  <button key={sz} onClick={() => toggle(sizes, sz, setSizes)}
                    className={`h-8 min-w-[44px] rounded-md border px-3 text-xs transition-colors ${on ? "border-ink bg-ink text-white" : "edge"}`}>
                    {sz}
                  </button>
                );
              })}
            </div>
          </Card>

          <Card title={t("editor.variants", { count: variantsPreview.length })}>
            <div className="max-h-80 overflow-y-auto">
              <table className="w-full text-sm">
                <thead className="sticky top-0 bg-[var(--color-bg)]">
                  <tr className="border-b edge text-left text-[10px] tracking-[0.1em] text-ink-soft">
                    <th className="px-4 py-2">{t("prod.col_sku")}</th><th className="px-2 py-2">{t("prod.col_color")}</th><th className="px-2 py-2">{t("prod.col_size")}</th><th className="px-2 py-2 text-right">{t("prod.col_stock")}</th>
                  </tr>
                </thead>
                <tbody>
                  {variantsPreview.map((v) => (
                    <tr key={v.sku} className="border-b edge last:border-0">
                      <td className="px-4 py-1.5 font-mono text-[11px]">{v.sku}</td>
                      <td className="px-2 py-1.5"><span className="flex items-center gap-1.5 text-xs"><Dot hex={v.color_hex} />{v.color_name}</span></td>
                      <td className="px-2 py-1.5 text-xs">{v.size}</td>
                      <td className="px-2 py-1.5 text-right text-xs tabular-nums">{v.stock}</td>
                    </tr>
                  ))}
                  {!variantsPreview.length && <tr><td colSpan={4} className="py-6 text-center text-xs text-ink-soft">{t("editor.pick_hint")}</td></tr>}
                </tbody>
              </table>
            </div>
          </Card>
        </div>

        <div className="space-y-4">
          <Card title={t("editor.sku_coding")}>
            <div className="p-5">
              <p className="font-mono text-lg">{code}</p>
              <p className="mt-1 text-[11px] text-ink-soft">{t("editor.style_code_hint")}</p>
              <p className="mt-3 font-mono text-sm">{skuCode(category, serial, colorNames[0] ?? "Black", sizes[0] ?? "M")}</p>
              <dl className="mt-4 space-y-1.5 text-[11px] text-ink-soft">
                <Row k="FX" v={t("editor.brand")} />
                <Row k={CATEGORY_CODE[category]} v={cats.data.find((c) => c.id === category)?.label ?? category} />
                <Row k={String(serial).padStart(4, "0")} v={t("editor.serial")} />
                <Row k="KK" v={t("editor.colour_code")} />
                <Row k="ZZ" v={t("editor.size_code")} />
              </dl>
              <Link to="/admin/reference" className="mt-4 inline-block text-[11px] text-ink-soft link-underline">{t("editor.full_spec")}</Link>
            </div>
          </Card>

          <Card title={t("editor.fit_rule")}>
            <div className="p-5">
              <div className="flex flex-wrap gap-1.5">
                {rules.data.map((b) => (
                  <button key={b.body_type} onClick={() => setBodyType(b.body_type)}
                    className={`rounded-full border px-3 py-1 text-[11px] transition-colors ${bodyType === b.body_type ? "border-ink bg-ink text-white" : "edge"}`}>
                    {t(`body.${b.body_type}`)}
                  </button>
                ))}
              </div>
              {rule && (
                <div className="mt-4 rounded-md bg-[var(--color-tile)] p-3">
                  <p className="text-xs">{rule.guidance}</p>
                  <p className="mt-1.5 text-[11px] text-ink-soft">{rule.ease_note}</p>
                  <Link to="/admin/size-rules" className="mt-2 inline-block text-[10px] text-ink-soft link-underline">{t("editor.edit_chart")}</Link>
                </div>
              )}
            </div>
          </Card>

          {isEdit && existing.data && (
            <Card title={t("editor.performance")}>
              {(() => {
                const d = existing.data;
                const units = d.units_sold ?? 0;
                const rev = d.revenue ?? 0;
                const views = d.views ?? 0;
                const returns = d.returns ?? 0;
                const convRate = views > 0 ? ((units / views) * 100).toFixed(1) + "%" : "—";
                const returnRate = units > 0 ? ((returns / (units + returns)) * 100).toFixed(1) + "%" : "—";
                return (
                  <div className="grid grid-cols-2 gap-px overflow-hidden bg-[var(--color-line)] text-center">
                    <Metric k={t("editor.units_sold")} v={units.toLocaleString()} />
                    <Metric k={t("editor.revenue")} v={compactVnd(rev)} hint={vnd(rev)} />
                    <Metric k={t("editor.conversion")} v={convRate} hint={`${views.toLocaleString()} ${t("editor.views_label")}`} />
                    <Metric k={t("editor.return_rate")} v={returnRate} hint={`${returns} ${t("editor.returns_label")}`} />
                  </div>
                );
              })()}
              <div className="p-4"><Badge label={t(`status.${existing.data.status}`)}>{existing.data.status!}</Badge></div>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}

function Field({ label, children, className = "" }: { label: string; children: React.ReactNode; className?: string }) {
  return (
    <label className={`block ${className}`}>
      <span className="text-[10px] tracking-[0.1em] text-ink-soft">{label.toUpperCase()}</span>
      <div className="mt-1">{children}</div>
    </label>
  );
}
function Row({ k, v }: { k: string; v: string }) {
  return <div className="flex justify-between"><span className="font-mono text-ink">{k}</span><span>{v}</span></div>;
}
function Metric({ k, v, hint }: { k: string; v: string; hint?: string }) {
  return (
    <div className="bg-white/50 px-3 py-3">
      <p className="text-[10px] tracking-[0.1em] text-ink-soft">{k.toUpperCase()}</p>
      <p className="mt-1 text-sm tabular-nums">{v}</p>
      {hint && <p className="mt-0.5 text-[10px] text-ink-soft/70 tabular-nums">{hint}</p>}
    </div>
  );
}

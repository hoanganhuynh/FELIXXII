import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { Link, useNavigate, useParams } from "react-router-dom";
import {
  getStyle, getVariants, updateStyle, createStyle, replaceVariants,
  listCategories, listCollections, type VariantInsert,
} from "../api/products";
import { listRules } from "../api/rules";
import { useAsync } from "../lib/useAsync";
import { useAuth } from "../../store/auth";
import { Card, Btn, Dot, Badge } from "../components/ui";
import { vnd } from "../lib/format";
import { skuCode, styleCode, barcode, CATEGORY_CODE } from "../data/sku";
import { PALETTE, SILHOUETTES, type CategoryId, type Silhouette } from "../../data/catalog";
import type { StyleStatus, BodyType } from "../api/products";

const SIZES = ["XS", "S", "M", "L", "XL", "2XL", "Custom"];

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
  const [serial, setSerial] = useState(9000);
  const [busy, setBusy] = useState(false);
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
          price, material, status, body_type: bodyType,
        });
      } else {
        styleId = await createStyle({
          style_code: code, serial, name,
          category_id: category, collection_id: collection, silhouette,
          occasion: category === "dam-bridal" ? "bridal" : "event",
          price, material, status, body_type: bodyType,
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
              <div className="grid grid-cols-2 gap-px overflow-hidden bg-[var(--color-line)] text-center">
                <Metric k={t("editor.units_sold")} v={(existing.data.units_sold ?? 0).toLocaleString()} />
                <Metric k={t("editor.revenue")} v={vnd(existing.data.revenue ?? 0)} />
                <Metric k={t("editor.views")} v={(existing.data.views ?? 0).toLocaleString()} />
                <Metric k={t("editor.returns")} v={String(existing.data.returns ?? 0)} />
              </div>
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
function Metric({ k, v }: { k: string; v: string }) {
  return <div className="bg-white/50 px-3 py-3"><p className="text-[10px] tracking-[0.1em] text-ink-soft">{k.toUpperCase()}</p><p className="mt-1 text-sm tabular-nums">{v}</p></div>;
}

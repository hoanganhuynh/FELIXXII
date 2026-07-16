import { useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useAdmin } from "../store/adminData";
import { Card, Btn, Dot, Badge } from "../components/ui";
import { vnd } from "../lib/format";
import { skuCode, styleCode, CATEGORY_CODE } from "../data/sku";
import {
  PALETTE, CATEGORIES, COLLECTIONS, SILHOUETTES, categoryLabel,
  type CategoryId, type CollectionId, type Silhouette,
} from "../../data/catalog";
import type { Style, Variant, StyleStatus, BodyType } from "../data/generate";

const SIZES = ["XS", "S", "M", "L", "XL", "2XL", "Custom"];
const BODY_TYPES: { id: BodyType; label: string }[] = [
  { id: "hourglass", label: "Hourglass" },
  { id: "pear", label: "Pear" },
  { id: "apple", label: "Apple" },
  { id: "rectangle", label: "Rectangle" },
  { id: "inverted-triangle", label: "Inverted triangle" },
];

export default function ProductEditor() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { styles, rules, addStyle, updateStyle } = useAdmin();
  const existing = id ? styles.find((s) => s.id === id) : undefined;
  const isEdit = !!existing;

  const [name, setName] = useState(existing?.name ?? "");
  const [category, setCategory] = useState<CategoryId>(existing?.category ?? "dam-da-hoi");
  const [collection, setCollection] = useState<CollectionId>(existing?.collection ?? COLLECTIONS[0].id);
  const [silhouette, setSilhouette] = useState<Silhouette>(existing?.silhouette ?? "a-line");
  const [price, setPrice] = useState<number>(existing?.price ?? 2_500_000);
  const [material, setMaterial] = useState(existing?.material ?? "");
  const [status, setStatus] = useState<StyleStatus>(existing?.status ?? "draft");
  const [bodyType, setBodyType] = useState<BodyType>(existing?.bodyType ?? "hourglass");
  const [colorNames, setColorNames] = useState<string[]>(existing?.colors.map((c) => c.name) ?? ["Black"]);
  const [sizes, setSizes] = useState<string[]>(existing?.sizes ?? ["S", "M", "L"]);

  const serial = existing?.serial ?? 9000; // preview serial for new styles
  const code = styleCode(category, serial);

  // build variant preview grid (colour × size)
  const variantsPreview = useMemo(() => {
    const rows: Variant[] = [];
    colorNames.forEach((cn) => {
      const hex = Object.values(PALETTE).find((p) => p.name === cn)?.hex ?? "#000";
      sizes.forEach((sz) => {
        const found = existing?.variants.find((v) => v.colorName === cn && v.size === sz);
        rows.push({
          sku: skuCode(category, serial, cn, sz),
          colorName: cn,
          colorHex: hex,
          size: sz,
          stock: found?.stock ?? 0,
          reserved: found?.reserved ?? 0,
          barcode: found?.barcode ?? "—",
        });
      });
    });
    return rows;
  }, [colorNames, sizes, category, serial, existing]);

  const rule = rules.find((r) => r.bodyType === bodyType);

  const toggle = (arr: string[], v: string, set: (a: string[]) => void) =>
    set(arr.includes(v) ? arr.filter((x) => x !== v) : [...arr, v]);

  const save = () => {
    if (!name.trim()) { alert("Name is required."); return; }
    const colors = colorNames.map((cn) => Object.values(PALETTE).find((p) => p.name === cn)!);
    if (isEdit && existing) {
      updateStyle(existing.id, { name, category, collection, silhouette, price, material, status, bodyType, colors, sizes, variants: variantsPreview });
    } else {
      const s: Style = {
        id: `sty-new-${Date.now()}`,
        styleCode: code, serial, name, category, collection, silhouette,
        occasion: category === "dam-bridal" ? "bridal" : "event",
        price, material, bodyType, status, colors, sizes, variants: variantsPreview,
        createdAt: new Date().toISOString().slice(0, 10),
        unitsSold: 0, revenue: 0, views: 0, returns: 0,
      };
      addStyle(s);
    }
    navigate("/admin/products");
  };

  return (
    <div>
      <div className="mb-5 flex items-center justify-between">
        <div>
          <Link to="/admin/products" className="text-xs text-ink-soft link-underline">← Products</Link>
          <h1 className="mt-1 font-serif text-3xl">{isEdit ? name || "Edit style" : "New style"}</h1>
        </div>
        <div className="flex gap-2">
          <Btn variant="ghost" onClick={() => navigate("/admin/products")}>Cancel</Btn>
          <Btn onClick={save}>{isEdit ? "Save changes" : "Create style"}</Btn>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-[1.6fr_1fr]">
        {/* left: form */}
        <div className="space-y-4">
          <Card title="Details">
            <div className="grid gap-4 p-5 sm:grid-cols-2">
              <Field label="Style name" className="sm:col-span-2">
                <input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Lụa Đêm Couture" className="input" />
              </Field>
              <Field label="Category">
                <select value={category} onChange={(e) => setCategory(e.target.value as CategoryId)} className="input">
                  {CATEGORIES.map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}
                </select>
              </Field>
              <Field label="Collection">
                <select value={collection} onChange={(e) => setCollection(e.target.value as CollectionId)} className="input">
                  {COLLECTIONS.map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}
                </select>
              </Field>
              <Field label="Silhouette">
                <select value={silhouette} onChange={(e) => setSilhouette(e.target.value as Silhouette)} className="input">
                  {SILHOUETTES.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}
                </select>
              </Field>
              <Field label="Base price (₫)">
                <input type="number" value={price} onChange={(e) => setPrice(Number(e.target.value))} className="input tabular-nums" />
              </Field>
              <Field label="Material" className="sm:col-span-2">
                <input value={material} onChange={(e) => setMaterial(e.target.value)} placeholder="e.g. Silk satin blend, chiffon lining" className="input" />
              </Field>
              <Field label="Status">
                <select value={status} onChange={(e) => setStatus(e.target.value as StyleStatus)} className="input">
                  {(["active", "draft", "archived"] as StyleStatus[]).map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
              </Field>
            </div>
          </Card>

          <Card title="Colors">
            <div className="flex flex-wrap gap-2.5 p-5">
              {Object.values(PALETTE).map((c) => {
                const on = colorNames.includes(c.name);
                return (
                  <button key={c.name} title={c.name} onClick={() => toggle(colorNames, c.name, setColorNames)}
                    className={`flex items-center gap-2 rounded-full border py-1.5 pl-1.5 pr-3 text-xs transition-colors ${on ? "border-ink bg-[var(--color-tile)]" : "edge"}`}>
                    <Dot hex={c.hex} /> {c.name}
                  </button>
                );
              })}
            </div>
          </Card>

          <Card title="Sizes">
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

          <Card title={`Variants · ${variantsPreview.length} SKUs`}>
            <div className="max-h-80 overflow-y-auto">
              <table className="w-full text-sm">
                <thead className="sticky top-0 bg-[var(--color-bg)]">
                  <tr className="border-b edge text-left text-[10px] tracking-[0.1em] text-ink-soft">
                    <th className="px-4 py-2">SKU</th><th className="px-2 py-2">COLOR</th><th className="px-2 py-2">SIZE</th><th className="px-2 py-2 text-right">STOCK</th>
                  </tr>
                </thead>
                <tbody>
                  {variantsPreview.map((v) => (
                    <tr key={v.sku} className="border-b edge last:border-0">
                      <td className="px-4 py-1.5 font-mono text-[11px]">{v.sku}</td>
                      <td className="px-2 py-1.5"><span className="flex items-center gap-1.5 text-xs"><Dot hex={v.colorHex} />{v.colorName}</span></td>
                      <td className="px-2 py-1.5 text-xs">{v.size}</td>
                      <td className="px-2 py-1.5 text-right tabular-nums text-xs">{v.stock}</td>
                    </tr>
                  ))}
                  {!variantsPreview.length && <tr><td colSpan={4} className="py-6 text-center text-xs text-ink-soft">Pick colors and sizes to generate SKUs.</td></tr>}
                </tbody>
              </table>
            </div>
          </Card>
        </div>

        {/* right: SKU preview + fit */}
        <div className="space-y-4">
          <Card title="SKU coding">
            <div className="p-5">
              <p className="font-mono text-lg">{code}</p>
              <p className="mt-1 text-[11px] text-ink-soft">Style code · variant example below</p>
              <p className="mt-3 font-mono text-sm">{skuCode(category, serial, colorNames[0] ?? "Black", sizes[0] ?? "M")}</p>
              <dl className="mt-4 space-y-1.5 text-[11px] text-ink-soft">
                <Row k="FX" v="Brand" />
                <Row k={CATEGORY_CODE[category]} v={categoryLabel(category)} />
                <Row k={String(serial).padStart(4, "0")} v="Style serial" />
                <Row k="KK" v="Colour code" />
                <Row k="ZZ" v="Size code" />
              </dl>
              <Link to="/admin/reference" className="mt-4 inline-block text-[11px] text-ink-soft link-underline">Full SKU & search spec →</Link>
            </div>
          </Card>

          <Card title="Body-fit rule">
            <div className="p-5">
              <div className="flex flex-wrap gap-1.5">
                {BODY_TYPES.map((b) => (
                  <button key={b.id} onClick={() => setBodyType(b.id)} className={`rounded-full border px-3 py-1 text-[11px] transition-colors ${bodyType === b.id ? "border-ink bg-ink text-white" : "edge"}`}>{b.label}</button>
                ))}
              </div>
              {rule && (
                <div className="mt-4 rounded-md bg-[var(--color-tile)] p-3">
                  <p className="text-xs">{rule.guidance}</p>
                  <p className="mt-1.5 text-[11px] text-ink-soft">{rule.easeNote}</p>
                  <Link to="/admin/size-rules" className="mt-2 inline-block text-[10px] text-ink-soft link-underline">Edit size chart →</Link>
                </div>
              )}
            </div>
          </Card>

          {isEdit && existing && (
            <Card title="Performance">
              <div className="grid grid-cols-2 gap-px overflow-hidden rounded-b-lg bg-[var(--color-line)] text-center">
                <Metric k="Units sold" v={existing.unitsSold.toLocaleString()} />
                <Metric k="Revenue" v={vnd(existing.revenue)} />
                <Metric k="Views" v={existing.views.toLocaleString()} />
                <Metric k="Returns" v={String(existing.returns)} />
              </div>
              <div className="p-4"><Badge>{existing.status}</Badge></div>
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

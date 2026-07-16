import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useAdmin, totalStock, type BulkPatch } from "../store/adminData";
import { searchStyles, searchSkus } from "../lib/search";
import { Badge, Dot, Btn } from "../components/ui";
import { vnd, compact } from "../lib/format";
import {
  CATEGORIES, COLLECTIONS, categoryLabel,
  type CategoryId, type CollectionId,
} from "../../data/catalog";
import type { StyleStatus } from "../data/generate";

const PAGE = 25;
const STATUSES: StyleStatus[] = ["active", "draft", "archived"];

export default function AdminProducts() {
  const { styles, bulkUpdate, deleteStyle, duplicateStyle } = useAdmin();

  const [view, setView] = useState<"styles" | "skus">("styles");
  const [q, setQ] = useState("");
  const [cat, setCat] = useState<CategoryId | "">("");
  const [col, setCol] = useState<CollectionId | "">("");
  const [status, setStatus] = useState<StyleStatus | "">("");
  const [stockFilter, setStockFilter] = useState<"" | "low" | "out">("");
  const [page, setPage] = useState(0);
  const [sel, setSel] = useState<Set<string>>(new Set());
  const [bulkOpen, setBulkOpen] = useState(false);

  /* ---- filtered styles ---- */
  const filtered = useMemo(() => {
    let list = q.trim() ? searchStyles(styles, q) : styles;
    if (cat) list = list.filter((s) => s.category === cat);
    if (col) list = list.filter((s) => s.collection === col);
    if (status) list = list.filter((s) => s.status === status);
    if (stockFilter === "low") list = list.filter((s) => totalStock(s) < 12);
    if (stockFilter === "out") list = list.filter((s) => totalStock(s) === 0);
    return list;
  }, [styles, q, cat, col, status, stockFilter]);

  const pageCount = Math.ceil(filtered.length / PAGE);
  const pageItems = filtered.slice(page * PAGE, page * PAGE + PAGE);

  /* ---- SKU search hits ---- */
  const skuHits = useMemo(() => (view === "skus" ? searchSkus(styles, q || "FX", 300) : []), [view, styles, q]);

  const resetPage = () => setPage(0);
  const allSelected = pageItems.length > 0 && pageItems.every((s) => sel.has(s.id));
  const toggleAll = () => {
    const next = new Set(sel);
    if (allSelected) pageItems.forEach((s) => next.delete(s.id));
    else pageItems.forEach((s) => next.add(s.id));
    setSel(next);
  };
  const toggle = (id: string) => {
    const next = new Set(sel);
    next.has(id) ? next.delete(id) : next.add(id);
    setSel(next);
  };

  return (
    <div>
      <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-serif text-3xl">Products</h1>
          <p className="mt-1 text-xs text-ink-soft">{filtered.length.toLocaleString()} styles · {styles.reduce((n, s) => n + s.variants.length, 0).toLocaleString()} SKUs</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex rounded-md border edge p-0.5 text-[11px]">
            {(["styles", "skus"] as const).map((v) => (
              <button key={v} onClick={() => setView(v)} className={`rounded px-3 py-1.5 tracking-[0.06em] transition-colors ${view === v ? "bg-ink text-white" : "text-ink-soft"}`}>
                {v.toUpperCase()}
              </button>
            ))}
          </div>
          <Link to="/admin/products/new" className="h-9 rounded-md bg-ink px-4 text-[11px] leading-9 tracking-[0.08em] text-white transition-opacity hover:opacity-85">+ NEW</Link>
        </div>
      </div>

      {/* search + filters */}
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[240px]">
          <svg className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-soft" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><circle cx="11" cy="11" r="7" /><path d="M21 21l-4.3-4.3" /></svg>
          <input
            value={q}
            onChange={(e) => { setQ(e.target.value); resetPage(); }}
            placeholder={view === "skus" ? "Search SKU, barcode, name…  e.g. FX-EV-0142-NV-M" : "Search style, code, name…"}
            className="h-9 w-full rounded-md border edge bg-white/50 pl-9 pr-3 text-sm focus:border-ink focus:outline-none"
          />
        </div>
        {view === "styles" && (
          <>
            <Select value={cat} onChange={(v) => { setCat(v as CategoryId | ""); resetPage(); }} placeholder="Category" options={CATEGORIES.map((c) => [c.id, c.label])} />
            <Select value={col} onChange={(v) => { setCol(v as CollectionId | ""); resetPage(); }} placeholder="Collection" options={COLLECTIONS.map((c) => [c.id, c.season])} />
            <Select value={status} onChange={(v) => { setStatus(v as StyleStatus | ""); resetPage(); }} placeholder="Status" options={STATUSES.map((s) => [s, s])} />
            <Select value={stockFilter} onChange={(v) => { setStockFilter(v as "" | "low" | "out"); resetPage(); }} placeholder="Stock" options={[["low", "Low (<12)"], ["out", "Out of stock"]]} />
          </>
        )}
      </div>

      {/* bulk bar */}
      {view === "styles" && sel.size > 0 && (
        <div className="mb-3 flex items-center justify-between rounded-md bg-ink px-4 py-2.5 text-white">
          <span className="text-xs">{sel.size} selected</span>
          <div className="flex items-center gap-2">
            <button onClick={() => setBulkOpen(true)} className="rounded bg-white/15 px-3 py-1.5 text-[11px] tracking-[0.06em] hover:bg-white/25">BULK EDIT</button>
            <button onClick={() => setSel(new Set())} className="text-[11px] text-white/60 hover:text-white">Clear</button>
          </div>
        </div>
      )}

      {/* ---- STYLES TABLE ---- */}
      {view === "styles" && (
        <div className="overflow-x-auto rounded-lg border edge bg-white/40">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b edge text-left text-[10px] tracking-[0.1em] text-ink-soft">
                <th className="w-10 px-3 py-2.5"><input type="checkbox" checked={allSelected} onChange={toggleAll} className="accent-[var(--color-accent)]" /></th>
                <th className="px-2 py-2.5">STYLE</th>
                <th className="px-2 py-2.5">CODE</th>
                <th className="px-2 py-2.5">CATEGORY</th>
                <th className="px-2 py-2.5">COLORS</th>
                <th className="px-2 py-2.5 text-right">PRICE</th>
                <th className="px-2 py-2.5 text-right">STOCK</th>
                <th className="px-2 py-2.5 text-right">SOLD</th>
                <th className="px-2 py-2.5">STATUS</th>
                <th className="px-2 py-2.5" />
              </tr>
            </thead>
            <tbody>
              {pageItems.map((s) => {
                const stock = totalStock(s);
                return (
                  <tr key={s.id} className="border-b edge last:border-0 hover:bg-[var(--color-tile)]/50">
                    <td className="px-3 py-2.5"><input type="checkbox" checked={sel.has(s.id)} onChange={() => toggle(s.id)} className="accent-[var(--color-accent)]" /></td>
                    <td className="px-2 py-2.5">
                      <Link to={`/admin/products/${s.id}`} className="font-serif text-[15px] link-underline">{s.name}</Link>
                      <p className="text-[10px] text-ink-soft">{s.variants.length} SKUs · {s.silhouette}</p>
                    </td>
                    <td className="px-2 py-2.5 font-mono text-[11px] text-ink-soft">{s.styleCode}</td>
                    <td className="px-2 py-2.5 text-xs">{categoryLabel(s.category)}</td>
                    <td className="px-2 py-2.5"><div className="flex gap-1">{s.colors.slice(0, 4).map((c) => <Dot key={c.name} hex={c.hex} title={c.name} />)}</div></td>
                    <td className="px-2 py-2.5 text-right tabular-nums text-xs">{vnd(s.price)}</td>
                    <td className={`px-2 py-2.5 text-right tabular-nums text-xs ${stock < 12 ? "text-[var(--color-accent)]" : ""}`}>{stock}</td>
                    <td className="px-2 py-2.5 text-right tabular-nums text-xs text-ink-soft">{compact(s.unitsSold)}</td>
                    <td className="px-2 py-2.5"><Badge>{s.status}</Badge></td>
                    <td className="px-2 py-2.5 text-right">
                      <div className="flex items-center justify-end gap-1.5 text-ink-soft">
                        <button title="Duplicate" onClick={() => duplicateStyle(s.id)} className="hover:text-ink">
                          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4"><rect x="9" y="9" width="11" height="11" rx="2" /><path d="M5 15V5a2 2 0 012-2h10" /></svg>
                        </button>
                        <button title="Delete" onClick={() => { if (confirm(`Delete "${s.name}"?`)) deleteStyle(s.id); }} className="hover:text-[var(--color-accent)]">
                          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4"><path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13" /></svg>
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {!pageItems.length && <tr><td colSpan={10} className="py-10 text-center text-xs text-ink-soft">No styles match your filters.</td></tr>}
            </tbody>
          </table>
        </div>
      )}

      {/* ---- SKU TABLE ---- */}
      {view === "skus" && (
        <div className="overflow-x-auto rounded-lg border edge bg-white/40">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b edge text-left text-[10px] tracking-[0.1em] text-ink-soft">
                <th className="px-3 py-2.5">SKU</th>
                <th className="px-2 py-2.5">STYLE</th>
                <th className="px-2 py-2.5">COLOR</th>
                <th className="px-2 py-2.5">SIZE</th>
                <th className="px-2 py-2.5">BARCODE</th>
                <th className="px-2 py-2.5 text-right">PRICE</th>
                <th className="px-2 py-2.5 text-right">STOCK</th>
              </tr>
            </thead>
            <tbody>
              {skuHits.map(({ style, variant }) => (
                <tr key={variant.sku} className="border-b edge last:border-0 hover:bg-[var(--color-tile)]/50">
                  <td className="px-3 py-2 font-mono text-[12px]">{variant.sku}</td>
                  <td className="px-2 py-2"><Link to={`/admin/products/${style.id}`} className="link-underline">{style.name}</Link></td>
                  <td className="px-2 py-2"><span className="flex items-center gap-1.5 text-xs"><Dot hex={variant.colorHex} />{variant.colorName}</span></td>
                  <td className="px-2 py-2 text-xs">{variant.size}</td>
                  <td className="px-2 py-2 font-mono text-[11px] text-ink-soft">{variant.barcode}</td>
                  <td className="px-2 py-2 text-right tabular-nums text-xs">{vnd(variant.priceOverride ?? style.price)}</td>
                  <td className={`px-2 py-2 text-right tabular-nums text-xs ${variant.stock === 0 ? "text-[var(--color-accent)]" : ""}`}>{variant.stock}</td>
                </tr>
              ))}
              {!skuHits.length && <tr><td colSpan={7} className="py-10 text-center text-xs text-ink-soft">Type a SKU, barcode or name to search {styles.reduce((n, s) => n + s.variants.length, 0).toLocaleString()} SKUs.</td></tr>}
            </tbody>
          </table>
          {skuHits.length >= 300 && <p className="px-4 py-2 text-[10px] text-ink-soft">Showing top 300 ranked hits — refine your query.</p>}
        </div>
      )}

      {/* pagination */}
      {view === "styles" && pageCount > 1 && (
        <div className="mt-4 flex items-center justify-between text-xs text-ink-soft">
          <span>Page {page + 1} / {pageCount}</span>
          <div className="flex gap-2">
            <Btn variant="ghost" onClick={() => setPage((p) => Math.max(0, p - 1))} disabled={page === 0}>Prev</Btn>
            <Btn variant="ghost" onClick={() => setPage((p) => Math.min(pageCount - 1, p + 1))} disabled={page >= pageCount - 1}>Next</Btn>
          </div>
        </div>
      )}

      {bulkOpen && (
        <BulkModal
          count={sel.size}
          onClose={() => setBulkOpen(false)}
          onApply={(patch) => {
            const n = bulkUpdate([...sel], patch);
            setBulkOpen(false);
            setSel(new Set());
            alert(`${n} styles updated.`);
          }}
        />
      )}
    </div>
  );
}

function Select({ value, onChange, placeholder, options }: { value: string; onChange: (v: string) => void; placeholder: string; options: [string, string][] }) {
  return (
    <select value={value} onChange={(e) => onChange(e.target.value)} className="h-9 rounded-md border edge bg-white/50 px-2 text-xs focus:border-ink focus:outline-none">
      <option value="">{placeholder}</option>
      {options.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
    </select>
  );
}

/* ---- bulk edit modal: change ONE attribute, override across selection ---- */
function BulkModal({ count, onClose, onApply }: { count: number; onClose: () => void; onApply: (patch: BulkPatch) => void }) {
  const [attr, setAttr] = useState<BulkPatch["attribute"]>("status");
  const [value, setValue] = useState<string>("active");

  const onAttr = (a: BulkPatch["attribute"]) => {
    setAttr(a);
    if (a === "status") setValue("active");
    else if (a === "collection") setValue(COLLECTIONS[0].id);
    else if (a === "category") setValue(CATEGORIES[0].id);
    else setValue("");
  };

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/30" onClick={onClose} />
      <div className="relative z-10 w-full max-w-md rounded-lg bg-[var(--color-bg)] p-6 shadow-2xl">
        <h2 className="font-serif text-xl">Bulk edit</h2>
        <p className="mt-1 text-xs text-ink-soft">Overwrite one attribute across <b>{count}</b> selected styles.</p>

        <label className="mt-5 block">
          <span className="text-[10px] tracking-[0.1em] text-ink-soft">ATTRIBUTE</span>
          <select value={attr} onChange={(e) => onAttr(e.target.value as BulkPatch["attribute"])} className="mt-1 h-9 w-full rounded-md border edge bg-white/60 px-2 text-sm focus:outline-none">
            <option value="status">Status</option>
            <option value="collection">Collection</option>
            <option value="category">Category</option>
            <option value="pricePct">Price · adjust by %</option>
            <option value="priceSet">Price · set to (₫)</option>
          </select>
        </label>

        <label className="mt-4 block">
          <span className="text-[10px] tracking-[0.1em] text-ink-soft">NEW VALUE</span>
          {attr === "status" && (
            <select value={value} onChange={(e) => setValue(e.target.value)} className="mt-1 h-9 w-full rounded-md border edge bg-white/60 px-2 text-sm focus:outline-none">
              {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          )}
          {attr === "collection" && (
            <select value={value} onChange={(e) => setValue(e.target.value)} className="mt-1 h-9 w-full rounded-md border edge bg-white/60 px-2 text-sm focus:outline-none">
              {COLLECTIONS.map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}
            </select>
          )}
          {attr === "category" && (
            <select value={value} onChange={(e) => setValue(e.target.value)} className="mt-1 h-9 w-full rounded-md border edge bg-white/60 px-2 text-sm focus:outline-none">
              {CATEGORIES.map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}
            </select>
          )}
          {(attr === "pricePct" || attr === "priceSet") && (
            <input type="number" value={value} onChange={(e) => setValue(e.target.value)} placeholder={attr === "pricePct" ? "e.g. -10 for −10%" : "e.g. 3500000"} className="mt-1 h-9 w-full rounded-md border edge bg-white/60 px-3 text-sm tabular-nums focus:outline-none" />
          )}
        </label>

        <div className="mt-6 flex justify-end gap-2">
          <Btn variant="ghost" onClick={onClose}>Cancel</Btn>
          <Btn onClick={() => onApply({ attribute: attr, value })}>Apply to {count}</Btn>
        </div>
      </div>
    </div>
  );
}

import { useState } from "react";
import { Link } from "react-router-dom";
import {
  listStyles, searchSkus, bulkUpdateStyles, deleteStyle, duplicateStyle,
  listCategories, listCollections, colorsOf,
  type BulkPatch, type StyleRow,
} from "../api/products";
import { useAsync, useDebounced } from "../lib/useAsync";
import { Badge, Dot, Btn } from "../components/ui";
import { vnd, compact } from "../lib/format";
import ImportPanel from "./Import";

const PAGE = 25;
const STATUSES = ["active", "draft", "archived"] as const;
const SORTS = [
  { id: "new", label: "Newest" },
  { id: "best", label: "Bestseller" },
  { id: "asc", label: "Price ↑" },
  { id: "desc", label: "Price ↓" },
] as const;

export default function AdminProducts() {
  const [view, setView] = useState<"styles" | "skus">("styles");
  const [q, setQ] = useState("");
  const dq = useDebounced(q, 250); // don't hit the DB on every keystroke
  const [cat, setCat] = useState("");
  const [col, setCol] = useState("");
  const [status, setStatus] = useState("");
  const [stock, setStock] = useState<"" | "low" | "out">("");
  const [sort, setSort] = useState<"new" | "best" | "asc" | "desc">("new");
  const [page, setPage] = useState(0);
  const [sel, setSel] = useState<Set<string>>(new Set());
  const [bulkOpen, setBulkOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  const cats = useAsync(() => listCategories(), [], []);
  const cols = useAsync(() => listCollections(), [], []);

  const list = useAsync(
    () => listStyles({ q: dq, category: cat, collection: col, status, stock, sort, page, pageSize: PAGE }),
    [dq, cat, col, status, stock, sort, page],
    { rows: [] as StyleRow[], total: 0 }
  );

  const skus = useAsync(
    () => (view === "skus" ? searchSkus(dq, 300) : Promise.resolve([])),
    [view, dq],
    []
  );

  const pageCount = Math.ceil(list.data.total / PAGE);
  const rows = list.data.rows;
  const allSelected = rows.length > 0 && rows.every((s) => sel.has(s.id!));

  const reset = () => setPage(0);
  const toggleAll = () => {
    const next = new Set(sel);
    if (allSelected) rows.forEach((s) => next.delete(s.id!));
    else rows.forEach((s) => next.add(s.id!));
    setSel(next);
  };
  const toggle = (id: string) => {
    const next = new Set(sel);
    next.has(id) ? next.delete(id) : next.add(id);
    setSel(next);
  };

  const run = async (fn: () => Promise<unknown>, ok?: string) => {
    setBusy(true);
    try {
      await fn();
      list.reload();
      if (ok) alert(ok);
    } catch (e) {
      alert(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div>
      <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-serif text-3xl">Products</h1>
          <p className="mt-1 text-xs text-ink-soft">
            {list.loading ? "Loading…" : `${list.data.total.toLocaleString()} styles match`}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex rounded-md border edge p-0.5 text-[11px]">
            {(["styles", "skus"] as const).map((v) => (
              <button key={v} onClick={() => setView(v)} className={`rounded px-3 py-1.5 tracking-[0.06em] transition-colors ${view === v ? "bg-ink text-white" : "text-ink-soft"}`}>
                {v.toUpperCase()}
              </button>
            ))}
          </div>
          <Btn variant="ghost" onClick={() => setImportOpen(true)}>IMPORT</Btn>
          <Link to="/admin/products/new" className="h-9 rounded-md bg-ink px-4 text-[11px] leading-9 tracking-[0.08em] text-white transition-opacity hover:opacity-85">+ NEW</Link>
        </div>
      </div>

      {(list.error || skus.error) && (
        <p className="mb-3 rounded-md bg-[var(--color-accent-soft)] px-4 py-2.5 text-xs text-[var(--color-accent)]">
          {list.error ?? skus.error}
        </p>
      )}

      {/* search + filters */}
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <div className="relative min-w-[240px] flex-1">
          <svg className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-soft" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><circle cx="11" cy="11" r="7" /><path d="M21 21l-4.3-4.3" /></svg>
          <input
            value={q}
            onChange={(e) => { setQ(e.target.value); reset(); }}
            placeholder={view === "skus" ? "Search SKU, barcode, name…  e.g. FX-BR-0001-OL-M" : "Search style, code, material…"}
            className="h-9 w-full rounded-md border edge bg-white/50 pl-9 pr-3 text-sm focus:border-ink focus:outline-none"
          />
        </div>
        {view === "styles" && (
          <>
            <Sel value={cat} onChange={(v) => { setCat(v); reset(); }} ph="Category" opts={cats.data.map((c) => [c.id, c.label])} />
            <Sel value={col} onChange={(v) => { setCol(v); reset(); }} ph="Collection" opts={cols.data.map((c) => [c.id, c.season])} />
            <Sel value={status} onChange={(v) => { setStatus(v); reset(); }} ph="Status" opts={STATUSES.map((s) => [s, s])} />
            <Sel value={stock} onChange={(v) => { setStock(v as "" | "low" | "out"); reset(); }} ph="Stock" opts={[["low", "Low (<12)"], ["out", "Out of stock"]]} />
            <select value={sort} onChange={(e) => { setSort(e.target.value as typeof sort); reset(); }} className="h-9 rounded-md border edge bg-white/50 px-2 text-xs focus:outline-none">
              {SORTS.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}
            </select>
          </>
        )}
      </div>

      {view === "styles" && sel.size > 0 && (
        <div className="mb-3 flex items-center justify-between rounded-md bg-ink px-4 py-2.5 text-white">
          <span className="text-xs">{sel.size} selected</span>
          <div className="flex items-center gap-2">
            <button onClick={() => setBulkOpen(true)} className="rounded bg-white/15 px-3 py-1.5 text-[11px] tracking-[0.06em] hover:bg-white/25">BULK EDIT</button>
            <button onClick={() => setSel(new Set())} className="text-[11px] text-white/60 hover:text-white">Clear</button>
          </div>
        </div>
      )}

      {/* ---- STYLES ---- */}
      {view === "styles" && (
        <div className="overflow-x-auto rounded-lg border edge bg-white/40">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b edge text-left text-[10px] tracking-[0.1em] text-ink-soft">
                <th className="w-10 px-3 py-2.5"><input type="checkbox" checked={allSelected} onChange={toggleAll} className="accent-[var(--color-accent)]" /></th>
                <th className="px-2 py-2.5">STYLE</th><th className="px-2 py-2.5">CODE</th>
                <th className="px-2 py-2.5">COLORS</th>
                <th className="px-2 py-2.5 text-right">PRICE</th><th className="px-2 py-2.5 text-right">STOCK</th>
                <th className="px-2 py-2.5 text-right">SOLD</th><th className="px-2 py-2.5">STATUS</th><th className="px-2 py-2.5" />
              </tr>
            </thead>
            <tbody className={list.loading ? "opacity-40 transition-opacity" : ""}>
              {rows.map((s) => (
                <tr key={s.id} className="border-b edge last:border-0 hover:bg-[var(--color-tile)]/50">
                  <td className="px-3 py-2.5"><input type="checkbox" checked={sel.has(s.id!)} onChange={() => toggle(s.id!)} className="accent-[var(--color-accent)]" /></td>
                  <td className="px-2 py-2.5">
                    <Link to={`/admin/products/${s.id}`} className="font-serif text-[15px] link-underline">{s.name}</Link>
                    <p className="text-[10px] text-ink-soft">{s.sku_count} SKUs · {s.silhouette}</p>
                  </td>
                  <td className="px-2 py-2.5 font-mono text-[11px] text-ink-soft">{s.style_code}</td>
                  <td className="px-2 py-2.5"><div className="flex gap-1">{colorsOf(s).slice(0, 4).map((c) => <Dot key={c.name} hex={c.hex} title={c.name} />)}</div></td>
                  <td className="px-2 py-2.5 text-right text-xs tabular-nums">{vnd(s.price!)}</td>
                  <td className={`px-2 py-2.5 text-right text-xs tabular-nums ${(s.total_stock ?? 0) < 12 ? "text-[var(--color-accent)]" : ""}`}>{s.total_stock}</td>
                  <td className="px-2 py-2.5 text-right text-xs tabular-nums text-ink-soft">{compact(s.units_sold ?? 0)}</td>
                  <td className="px-2 py-2.5"><Badge>{s.status!}</Badge></td>
                  <td className="px-2 py-2.5 text-right">
                    <div className="flex items-center justify-end gap-1.5 text-ink-soft">
                      <button title="Duplicate" disabled={busy} onClick={() => run(() => duplicateStyle(s.id!), "Duplicated as draft.")} className="hover:text-ink disabled:opacity-30">
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4"><rect x="9" y="9" width="11" height="11" rx="2" /><path d="M5 15V5a2 2 0 012-2h10" /></svg>
                      </button>
                      <button title="Delete" disabled={busy} onClick={() => { if (confirm(`Delete "${s.name}"?`)) run(() => deleteStyle(s.id!)); }} className="hover:text-[var(--color-accent)] disabled:opacity-30">
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4"><path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13" /></svg>
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {!list.loading && !rows.length && <tr><td colSpan={9} className="py-10 text-center text-xs text-ink-soft">No styles match your filters.</td></tr>}
            </tbody>
          </table>
        </div>
      )}

      {/* ---- SKUS ---- */}
      {view === "skus" && (
        <div className="overflow-x-auto rounded-lg border edge bg-white/40">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b edge text-left text-[10px] tracking-[0.1em] text-ink-soft">
                <th className="px-3 py-2.5">SKU</th><th className="px-2 py-2.5">STYLE</th><th className="px-2 py-2.5">COLOR</th>
                <th className="px-2 py-2.5">SIZE</th><th className="px-2 py-2.5">BARCODE</th>
                <th className="px-2 py-2.5 text-right">PRICE</th><th className="px-2 py-2.5 text-right">STOCK</th>
                <th className="px-2 py-2.5 text-right">SCORE</th>
              </tr>
            </thead>
            <tbody className={skus.loading ? "opacity-40" : ""}>
              {skus.data.map((h) => (
                <tr key={h.sku} className="border-b edge last:border-0 hover:bg-[var(--color-tile)]/50">
                  <td className="px-3 py-2 font-mono text-[12px]">{h.sku}</td>
                  <td className="px-2 py-2"><Link to={`/admin/products/${h.style_id}`} className="link-underline">{h.style_name}</Link></td>
                  <td className="px-2 py-2"><span className="flex items-center gap-1.5 text-xs"><Dot hex={h.color_hex} />{h.color_name}</span></td>
                  <td className="px-2 py-2 text-xs">{h.size}</td>
                  <td className="px-2 py-2 font-mono text-[11px] text-ink-soft">{h.barcode}</td>
                  <td className="px-2 py-2 text-right text-xs tabular-nums">{vnd(h.price)}</td>
                  <td className={`px-2 py-2 text-right text-xs tabular-nums ${h.stock === 0 ? "text-[var(--color-accent)]" : ""}`}>{h.stock}</td>
                  <td className="px-2 py-2 text-right text-[10px] tabular-nums text-ink-soft">{h.score.toFixed(0)}</td>
                </tr>
              ))}
              {!skus.loading && !skus.data.length && (
                <tr><td colSpan={8} className="py-10 text-center text-xs text-ink-soft">Type a SKU, barcode or name — ranked by Postgres over all 7,007 SKUs.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}

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
          cats={cats.data.map((c) => [c.id, c.label])}
          cols={cols.data.map((c) => [c.id, c.label])}
          onClose={() => setBulkOpen(false)}
          onApply={async (patch) => {
            setBulkOpen(false);
            await run(async () => {
              const n = await bulkUpdateStyles([...sel], patch);
              setSel(new Set());
              if (n === 0) throw new Error("0 rows changed — admin role required.");
              alert(`${n} styles updated.`);
            });
          }}
        />
      )}

      {importOpen && (
        <ImportPanel onClose={() => { setImportOpen(false); list.reload(); }} />
      )}
    </div>
  );
}

function Sel({ value, onChange, ph, opts }: { value: string; onChange: (v: string) => void; ph: string; opts: [string, string][] }) {
  return (
    <select value={value} onChange={(e) => onChange(e.target.value)} className="h-9 rounded-md border edge bg-white/50 px-2 text-xs focus:border-ink focus:outline-none">
      <option value="">{ph}</option>
      {opts.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
    </select>
  );
}

function BulkModal({ count, cats, cols, onClose, onApply }: {
  count: number; cats: [string, string][]; cols: [string, string][];
  onClose: () => void; onApply: (p: BulkPatch) => void;
}) {
  const [attr, setAttr] = useState<BulkPatch["attribute"]>("status");
  const [value, setValue] = useState("active");

  const onAttr = (a: BulkPatch["attribute"]) => {
    setAttr(a);
    setValue(a === "status" ? "active" : a === "collection" ? cols[0]?.[0] ?? "" : a === "category" ? cats[0]?.[0] ?? "" : "");
  };

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/30" onClick={onClose} />
      <div className="relative z-10 w-full max-w-md rounded-lg bg-[var(--color-bg)] p-6 shadow-2xl">
        <h2 className="font-serif text-xl">Bulk edit</h2>
        <p className="mt-1 text-xs text-ink-soft">Overwrite one attribute across <b>{count}</b> selected styles.</p>

        <label className="mt-5 block">
          <span className="text-[10px] tracking-[0.1em] text-ink-soft">ATTRIBUTE</span>
          <select value={attr} onChange={(e) => onAttr(e.target.value as BulkPatch["attribute"])} className="input mt-1">
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
            <select value={value} onChange={(e) => setValue(e.target.value)} className="input mt-1">
              {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          )}
          {attr === "collection" && (
            <select value={value} onChange={(e) => setValue(e.target.value)} className="input mt-1">
              {cols.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </select>
          )}
          {attr === "category" && (
            <select value={value} onChange={(e) => setValue(e.target.value)} className="input mt-1">
              {cats.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </select>
          )}
          {(attr === "pricePct" || attr === "priceSet") && (
            <input type="number" value={value} onChange={(e) => setValue(e.target.value)} placeholder={attr === "pricePct" ? "e.g. -10 for −10%" : "e.g. 3500000"} className="input mt-1 tabular-nums" />
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

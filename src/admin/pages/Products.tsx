import { useState } from "react";
import { useTranslation } from "react-i18next";
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
const SORTS = ["new", "best", "asc", "desc"] as const;

export default function AdminProducts() {
  const { t } = useTranslation();
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
          <h1 className="font-serif text-3xl">{t("products")}</h1>
          <p className="mt-1 text-xs text-ink-soft">
            {list.loading ? t("common.loading") : t("prod.matched", { count: list.data.total.toLocaleString() })}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex rounded-md border edge p-0.5 text-[11px]">
            {(["styles", "skus"] as const).map((v) => (
              <button key={v} onClick={() => setView(v)} className={`rounded px-3 py-1.5 tracking-[0.06em] transition-colors ${view === v ? "bg-ink text-white" : "text-ink-soft"}`}>
                {v === "styles" ? t("prod.styles") : t("prod.skus")}
              </button>
            ))}
          </div>
          <Btn variant="ghost" onClick={() => setImportOpen(true)}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" className="mr-1.5 inline-block align-[-2px]"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3"/></svg>
            {t("prod.import")}
          </Btn>
          <Link to="/admin/products/new" className="inline-flex h-9 items-center gap-1.5 rounded-md bg-ink px-4 text-[11px] tracking-[0.08em] text-white transition-opacity hover:opacity-85">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"><path d="M12 5v14M5 12h14"/></svg>
            {t("prod.new")}
          </Link>
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
            placeholder={view === "skus" ? t("prod.search_sku") : t("prod.search_style")}
            className="h-9 w-full rounded-md border edge bg-white/50 pl-9 pr-3 text-sm focus:border-ink focus:outline-none"
          />
        </div>
        {view === "styles" && (
          <>
            <Sel value={cat} onChange={(v) => { setCat(v); reset(); }} ph={t("prod.category")} opts={cats.data.map((c) => [c.id, c.label])} />
            <Sel value={col} onChange={(v) => { setCol(v); reset(); }} ph={t("prod.collection")} opts={cols.data.map((c) => [c.id, c.season])} />
            <Sel value={status} onChange={(v) => { setStatus(v); reset(); }} ph={t("prod.status")} opts={STATUSES.map((s) => [s, t(`status.${s}`)])} />
            <Sel value={stock} onChange={(v) => { setStock(v as "" | "low" | "out"); reset(); }} ph={t("prod.stock")} opts={[["low", t("prod.stock_low")], ["out", t("prod.stock_out")]]} />
            <select value={sort} onChange={(e) => { setSort(e.target.value as typeof sort); reset(); }} className="h-9 rounded-md border edge bg-white/50 pl-3 pr-7 text-xs focus:outline-none">
              {SORTS.map((s) => <option key={s} value={s}>{t(`prod.sort_${s}`)}</option>)}
            </select>
          </>
        )}
      </div>

      {view === "styles" && sel.size > 0 && (
        <div className="mb-3 flex items-center justify-between rounded-md bg-ink px-4 py-2.5 text-white">
          <span className="text-xs">{t("prod.selected", { count: sel.size })}</span>
          <div className="flex items-center gap-2">
            <button onClick={() => setBulkOpen(true)} className="rounded bg-white/15 px-3 py-1.5 text-[11px] tracking-[0.06em] hover:bg-white/25">{t("prod.bulk_edit")}</button>
            <button onClick={() => setSel(new Set())} className="text-[11px] text-white/60 hover:text-white">{t("prod.clear")}</button>
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
                <th className="px-2 py-2.5">{t("prod.col_style")}</th><th className="px-2 py-2.5">{t("prod.col_code")}</th>
                <th className="px-2 py-2.5">{t("prod.col_colors")}</th>
                <th className="px-2 py-2.5 text-right">{t("prod.col_price")}</th><th className="px-2 py-2.5 text-right">{t("prod.col_stock")}</th>
                <th className="px-2 py-2.5 text-right">{t("prod.col_sold")}</th><th className="px-2 py-2.5">{t("prod.col_status")}</th><th className="px-2 py-2.5" />
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
                  <td className="px-2 py-2.5"><Badge label={t(`status.${s.status}`)}>{s.status!}</Badge></td>
                  <td className="px-2 py-2.5 text-right">
                    <div className="flex items-center justify-end gap-1.5 text-ink-soft">
                      <button title={t("common.duplicate")} disabled={busy} onClick={() => run(() => duplicateStyle(s.id!), t("prod.duplicated"))} className="hover:text-ink disabled:opacity-30">
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4"><rect x="9" y="9" width="11" height="11" rx="2" /><path d="M5 15V5a2 2 0 012-2h10" /></svg>
                      </button>
                      <button title={t("common.delete")} disabled={busy} onClick={() => { if (confirm(t("prod.confirm_delete", { name: s.name }))) run(() => deleteStyle(s.id!)); }} className="hover:text-[var(--color-accent)] disabled:opacity-30">
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4"><path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13" /></svg>
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {!list.loading && !rows.length && <tr><td colSpan={9} className="py-10 text-center text-xs text-ink-soft">{t("prod.no_match")}</td></tr>}
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
                <th className="px-3 py-2.5">{t("prod.col_sku")}</th><th className="px-2 py-2.5">{t("prod.col_style")}</th><th className="px-2 py-2.5">{t("prod.col_color")}</th>
                <th className="px-2 py-2.5">{t("prod.col_size")}</th><th className="px-2 py-2.5">{t("prod.col_barcode")}</th>
                <th className="px-2 py-2.5 text-right">{t("prod.col_price")}</th><th className="px-2 py-2.5 text-right">{t("prod.col_stock")}</th>
                <th className="px-2 py-2.5 text-right">{t("prod.col_score")}</th>
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
                <tr><td colSpan={8} className="py-10 text-center text-xs text-ink-soft">{t("prod.sku_hint")}</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {view === "styles" && pageCount > 1 && (
        <div className="mt-4 flex items-center justify-between text-xs text-ink-soft">
          <span>{t("common.page", { page: page + 1, total: pageCount })}</span>
          <div className="flex gap-2">
            <Btn variant="ghost" onClick={() => setPage((p) => Math.max(0, p - 1))} disabled={page === 0}>{t("common.prev")}</Btn>
            <Btn variant="ghost" onClick={() => setPage((p) => Math.min(pageCount - 1, p + 1))} disabled={page >= pageCount - 1}>{t("common.next")}</Btn>
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
              if (n === 0) throw new Error(t("prod.zero_changed"));
              alert(t("prod.updated", { count: n }));
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
    <select value={value} onChange={(e) => onChange(e.target.value)} className="h-9 rounded-md border edge bg-white/50 pl-3 pr-7 text-xs focus:border-ink focus:outline-none">
      <option value="">{ph}</option>
      {opts.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
    </select>
  );
}

function BulkModal({ count, cats, cols, onClose, onApply }: {
  count: number; cats: [string, string][]; cols: [string, string][];
  onClose: () => void; onApply: (p: BulkPatch) => void;
}) {
  const { t } = useTranslation();
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
        <h2 className="font-serif text-xl">{t("prod.bulk_title")}</h2>
        <p className="mt-1 text-xs text-ink-soft">{t("prod.bulk_body", { count })}</p>

        <label className="mt-5 block">
          <span className="text-[10px] tracking-[0.1em] text-ink-soft">{t("prod.attribute")}</span>
          <select value={attr} onChange={(e) => onAttr(e.target.value as BulkPatch["attribute"])} className="input mt-1">
            <option value="status">{t("prod.attr_status")}</option>
            <option value="collection">{t("prod.attr_collection")}</option>
            <option value="category">{t("prod.attr_category")}</option>
            <option value="pricePct">{t("prod.attr_price_pct")}</option>
            <option value="priceSet">{t("prod.attr_price_set")}</option>
          </select>
        </label>

        <label className="mt-4 block">
          <span className="text-[10px] tracking-[0.1em] text-ink-soft">{t("prod.new_value")}</span>
          {attr === "status" && (
            <select value={value} onChange={(e) => setValue(e.target.value)} className="input mt-1">
              {STATUSES.map((s) => <option key={s} value={s}>{t(`status.${s}`)}</option>)}
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
          <Btn variant="ghost" onClick={onClose}>{t("common.cancel")}</Btn>
          <Btn onClick={() => onApply({ attribute: attr, value })}>{t("prod.apply_to", { count })}</Btn>
        </div>
      </div>
    </div>
  );
}

import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import {
  listProductRows, updateVariant, deleteVariant, type ProductRow,
  bulkUpdateVariants, bulkDeleteVariants, bulkUpdateStyleProperties,
  listCollections
} from "../api/products";
import { listSources, listGarmentTypes } from "../api/taxonomy";
import { exportProductsToXlsx, importProductsFromXlsx, downloadSampleFile } from "../lib/importExport";
import { useAsync, useDebounced } from "../lib/useAsync";
import { Badge, Dot, Btn } from "../components/ui";
import { vnd } from "../lib/format";

const PAGE = 25;
const STATUSES = ["active", "draft", "archived"] as const;

export default function AdminProducts() {
  const { t } = useTranslation();
  const [q, setQ] = useState("");
  const dq = useDebounced(q, 250);
  const [source, setSource] = useState("");
  const [garmentType, setGarmentType] = useState("");
  const [status, setStatus] = useState("");
  const [stock, setStock] = useState<"" | "in" | "out">("");
  const [page, setPage] = useState(0);
  const [busy, setBusy] = useState<string | null>(null);
  const [importing, setImporting] = useState(false);
  const [importModalOpen, setImportModalOpen] = useState(false);

  const sources = useAsync(() => listSources(), [], []);
  const garmentTypes = useAsync(() => listGarmentTypes(), [], []);
  const cols = useAsync(() => listCollections(), [], []);

  const [bulkAction, setBulkAction] = useState<"delete" | "stock_in" | "stock_out" | "collection" | "source" | "garment_type" | null>(null);
  const [bulkValue, setBulkValue] = useState<string>("");

  const list = useAsync(
    () => listProductRows({ q: dq, source, garmentType, status, stock, page, pageSize: PAGE }),
    [dq, source, garmentType, status, stock, page],
    { rows: [] as ProductRow[], total: 0 }
  );

  const pageCount = Math.ceil(list.data.total / PAGE);
  const rows = list.data.rows;
  const reset = () => { setPage(0); setSelected(new Set()); };
  const [confirmDelete, setConfirmDelete] = useState<ProductRow | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const allSelected = rows.length > 0 && rows.every(r => selected.has(r.sku));
  const toggleAll = () => {
    if (allSelected) {
      setSelected(new Set());
    } else {
      const next = new Set(selected);
      rows.forEach(r => next.add(r.sku));
      setSelected(next);
    }
  };

  const toggleOne = (sku: string) => {
    const next = new Set(selected);
    if (next.has(sku)) next.delete(sku);
    else next.add(sku);
    setSelected(next);
  };

  const toggleStock = async (row: ProductRow) => {
    setBusy(row.sku);
    try {
      await updateVariant(row.sku, { in_stock: !row.in_stock, stock: row.in_stock ? 0 : 1 });
      list.reload();
    } catch (e) {
      alert(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(null);
    }
  };

  const remove = (row: ProductRow) => {
    setConfirmDelete(row);
  };

  const executeRemove = async () => {
    if (!confirmDelete) return;
    setBusy(confirmDelete.sku);
    try {
      await deleteVariant(confirmDelete.sku);
      list.reload();
    } catch (e) {
      alert(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(null);
      setConfirmDelete(null);
    }
  };

  const handleBulkSubmit = async () => {
    if (!bulkAction) return;
    setBusy("bulk");
    try {
      const skus = Array.from(selected);
      if (bulkAction === "delete") {
        await bulkDeleteVariants(skus);
      } else if (bulkAction === "stock_in" || bulkAction === "stock_out") {
        await bulkUpdateVariants(skus, bulkAction === "stock_in");
      } else {
        const styleIds = Array.from(new Set(skus.map(sku => rows.find(r => r.sku === sku)?.style_id).filter(Boolean))) as string[];
        const field = bulkAction === "collection" ? "collection_id" : bulkAction === "source" ? "source_id" : "garment_type_id";
        await bulkUpdateStyleProperties(styleIds, field, bulkValue || null);
      }
      setSelected(new Set());
      setBulkAction(null);
      setBulkValue("");
      list.reload();
    } catch (e) {
      alert(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(null);
    }
  };

  const handleExport = async () => {
    setBusy("export");
    try {
      await exportProductsToXlsx("xlsx");
    } catch (e) {
      alert(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(null);
    }
  };

  const handleImportFile = async (file: File) => {
    setImporting(true);
    setBusy("import");
    try {
      const count = await importProductsFromXlsx(file);
      alert(`Đã cập nhật/tạo mới ${count} sản phẩm thành công.`);
      setImportModalOpen(false);
      list.reload();
    } catch (err) {
      alert("Lỗi khi nhập file: " + (err instanceof Error ? err.message : String(err)));
    } finally {
      setImporting(false);
      setBusy(null);
    }
  };

  const handleImportInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleImportFile(file);
    e.target.value = "";
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file) handleImportFile(file);
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
          <button onClick={() => setImportModalOpen(true)} disabled={busy !== null} className="inline-flex h-9 items-center gap-1.5 rounded-md border edge bg-white px-3 text-[12px] font-medium transition-colors hover:bg-neutral-50 disabled:opacity-50">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3" /></svg>
            Nhập Excel
          </button>
          <button onClick={handleExport} disabled={busy === "export"} className="inline-flex h-9 items-center gap-1.5 rounded-md border edge bg-white px-3 text-[12px] font-medium transition-colors hover:bg-neutral-50 disabled:opacity-50">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5-5 5 5M12 9v12" /></svg>
            Xuất Excel
          </button>
          <Link to="/admin/products/new" className="inline-flex h-9 items-center gap-1.5 rounded-md bg-ink px-4 text-[12px] tracking-[0.08em] text-white transition-opacity hover:opacity-85">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"><path d="M12 5v14M5 12h14" /></svg>
            {t("prod.new")}
          </Link>
        </div>
      </div>

      {list.error && (
        <p className="mb-3 rounded-md bg-[var(--color-accent-soft)] px-4 py-2.5 text-xs text-[var(--color-accent)]">
          {list.error}
        </p>
      )}

      {selected.size > 0 && (
        <div className="mb-4 flex items-center justify-between rounded-md bg-[var(--color-tile-deep)] px-4 py-3">
          <span className="text-sm font-medium">{selected.size} sản phẩm được chọn</span>
          <div className="flex gap-2">
            <button onClick={() => setSelected(new Set())} className="text-xs text-ink-soft hover:text-ink">Bỏ chọn</button>
            <select value={bulkAction || ""} onChange={(e) => setBulkAction(e.target.value as any)} className="h-8 rounded-md border edge bg-white px-2 text-xs focus:border-ink focus:outline-none">
              <option value="">Thao tác...</option>
              <option value="stock_in">Đổi: Còn hàng</option>
              <option value="stock_out">Đổi: Hết hàng</option>
              <option value="collection">Gán Bộ sưu tập</option>
              <option value="source">Gán Nguồn hàng</option>
              <option value="garment_type">Gán Phân loại</option>
              <option value="delete">Xoá hàng loạt</option>
            </select>
          </div>
        </div>
      )}

      {/* search + filters */}
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <div className="relative min-w-[240px] flex-1">
          <svg className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-soft" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><circle cx="11" cy="11" r="7" /><path d="M21 21l-4.3-4.3" /></svg>
          <input
            value={q}
            onChange={(e) => { setQ(e.target.value); reset(); }}
            placeholder={t("prod.search_style")}
            className="h-9 w-full rounded-md border edge bg-white/50 pl-9 pr-3 text-sm focus:border-ink focus:outline-none"
          />
        </div>
        <Sel value={source} onChange={(v) => { setSource(v); reset(); }} ph={t("editor.source")} opts={sources.data.map((s) => [s.id, s.label])} />
        <Sel value={garmentType} onChange={(v) => { setGarmentType(v); reset(); }} ph={t("editor.garment_type")} opts={garmentTypes.data.map((g) => [g.id, g.label])} />
        <Sel value={status} onChange={(v) => { setStatus(v); reset(); }} ph={t("prod.status")} opts={STATUSES.map((s) => [s, t(`status.${s}`)])} />
        <Sel value={stock} onChange={(v) => { setStock(v as "" | "in" | "out"); reset(); }} ph={t("editor.status_stock")} opts={[["in", t("editor.in_stock")], ["out", t("editor.out_of_stock")]]} />
      </div>

      <div className="overflow-x-auto rounded-lg border edge bg-white/40">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b edge text-left text-[12px] tracking-[0.1em] text-ink-soft">
              <th className="w-10 px-4 py-2.5">
                <input type="checkbox" checked={allSelected} onChange={toggleAll} className="cursor-pointer rounded border-ink/20 text-ink focus:ring-ink" />
              </th>
              <th className="w-14 px-2 py-2.5"></th>
              <th className="px-2 py-2.5">{t("prod.col_name")}</th>
              <th className="px-2 py-2.5">{t("prod.col_sku")}</th>
              <th className="px-2 py-2.5">{t("editor.source")}</th>
              <th className="px-2 py-2.5">{t("editor.garment_type")}</th>
              <th className="px-2 py-2.5">{t("prod.col_status")}</th>
              <th className="px-2 py-2.5 text-right">{t("prod.col_price")}</th>
              <th className="px-2 py-2.5">{t("editor.status_stock")}</th>
              <th className="px-2 py-2.5" />
            </tr>
          </thead>
          <tbody className={list.loading ? "opacity-40 transition-opacity" : ""}>
            {rows.map((r) => (
              <tr key={r.sku} className="border-b edge last:border-0 hover:bg-[var(--color-tile)]/50">
                <td className="px-4 py-2.5">
                  <input type="checkbox" checked={selected.has(r.sku)} onChange={() => toggleOne(r.sku)} className="cursor-pointer rounded border-ink/20 text-ink focus:ring-ink" />
                </td>
                <td className="px-2 py-2.5">
                  {r.image ? (
                    <div className="h-10 w-10 overflow-hidden rounded bg-neutral-100 dark:bg-neutral-800">
                      <img src={r.image} alt="" className="h-full w-full object-cover object-top" />
                    </div>
                  ) : (
                    <div className="flex h-10 w-10 items-center justify-center rounded bg-neutral-100 dark:bg-neutral-800 text-ink-soft opacity-50">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="2" /><circle cx="8.5" cy="8.5" r="1.5" /><path d="M21 15l-5-5L5 21" /></svg>
                    </div>
                  )}
                </td>
                <td className="px-2 py-2.5">
                  <Link to={`/admin/products/${r.style_id}`} className="font-serif text-[15px] link-underline">{r.style_name}</Link>
                  <p className="flex items-center gap-1.5 text-[12px] text-ink-soft"><Dot hex={r.color_hex} />{r.color_name} · {r.size}</p>
                </td>
                <td className="px-2 py-2.5 font-mono text-[12px] text-ink-soft">{r.sku}</td>
                <td className="px-2 py-2.5 text-xs text-ink-soft">{sources.data.find((s) => s.id === r.source_id)?.label ?? "—"}</td>
                <td className="px-2 py-2.5 text-xs text-ink-soft">{garmentTypes.data.find((g) => g.id === r.garment_type_id)?.label ?? "—"}</td>
                <td className="px-2 py-2.5">
                  <Badge label={t(`status.${r.status}`)}>{r.status}</Badge>
                </td>
                <td className="px-2 py-2.5 text-right text-xs tabular-nums">{vnd(r.price)}</td>
                <td className="px-2 py-2.5">
                  <button
                    disabled={busy === r.sku}
                    onClick={() => toggleStock(r)}
                    className="flex items-center gap-2 disabled:opacity-40"
                  >
                    <span className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ${r.in_stock ? "bg-emerald-500" : "bg-[var(--color-line)]"}`}>
                      <span className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${r.in_stock ? "translate-x-4" : "translate-x-0"}`} />
                    </span>
                    <span className="text-[11px] text-ink-soft">{r.in_stock ? t("editor.in_stock") : t("editor.out_of_stock")}</span>
                  </button>
                </td>
                <td className="px-2 py-2.5 text-right">
                  <div className="flex items-center justify-end gap-4 text-ink-soft">
                    <Link to={`/admin/products/sku/${r.sku}`} className="inline-flex items-center gap-1.5 text-[12px] hover:text-ink transition-colors">
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>
                      {t("common.edit")}
                    </Link>
                    <button disabled={busy === r.sku} onClick={() => remove(r)} className="inline-flex items-center gap-1.5 text-[12px] text-[var(--color-accent)] hover:opacity-70 transition-colors disabled:opacity-30">
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
                      {t("common.delete")}
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {!list.loading && !rows.length && <tr><td colSpan={9} className="py-10 text-center text-xs text-ink-soft">{t("prod.no_match")}</td></tr>}
          </tbody>
        </table>
      </div>

      {pageCount > 1 && (
        <div className="mt-4 flex items-center justify-between text-xs text-ink-soft">
          <span>{t("common.page", { page: page + 1, total: pageCount })}</span>
          <div className="flex gap-2">
            <Btn variant="ghost" onClick={() => setPage((p) => Math.max(0, p - 1))} disabled={page === 0}>{t("common.prev")}</Btn>
            <Btn variant="ghost" onClick={() => setPage((p) => Math.min(pageCount - 1, p + 1))} disabled={page >= pageCount - 1}>{t("common.next")}</Btn>
          </div>
        </div>
      )}

      {confirmDelete && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/30" onClick={() => setConfirmDelete(null)} />
          <div className="relative z-10 w-full max-w-sm rounded-lg bg-[var(--color-bg)] p-6 shadow-2xl">
            <h2 className="font-serif text-xl">{t("common.delete")}</h2>
            <p className="mt-2 text-sm text-ink-soft">
              {t("prod.confirm_delete", { name: `${confirmDelete.style_name} – ${confirmDelete.color_name} – ${confirmDelete.size}` })}
            </p>
            <div className="mt-6 flex justify-end gap-3">
              <Btn variant="ghost" onClick={() => setConfirmDelete(null)}>{t("common.cancel")}</Btn>
              <Btn variant="danger" onClick={executeRemove} disabled={busy === confirmDelete.sku}>
                {busy === confirmDelete.sku ? "..." : t("common.delete")}
              </Btn>
            </div>
          </div>
        </div>
      )}

      {bulkAction && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/30" onClick={() => { setBulkAction(null); setBulkValue(""); }} />
          <div className="relative z-10 w-full max-w-sm rounded-lg bg-[var(--color-bg)] p-6 shadow-2xl">
            <h2 className="font-serif text-xl">Xác nhận thao tác</h2>
            {bulkAction === "delete" ? (
              <p className="mt-2 text-sm text-ink-soft">Bạn có chắc chắn muốn xoá {selected.size} sản phẩm này không?</p>
            ) : bulkAction === "stock_in" || bulkAction === "stock_out" ? (
              <p className="mt-2 text-sm text-ink-soft">Đổi trạng thái kho của {selected.size} sản phẩm thành <b>{bulkAction === "stock_in" ? "Còn hàng" : "Hết hàng"}</b>?</p>
            ) : (
              <div className="mt-4">
                <label className="mb-1 block text-xs text-ink-soft">Chọn giá trị mới (Áp dụng cho toàn bộ Style)</label>
                <select value={bulkValue} onChange={(e) => setBulkValue(e.target.value)} className="w-full input">
                  <option value="">— Trống —</option>
                  {bulkAction === "collection" && cols.data.map(c => <option key={c.id} value={c.id}>{c.label}</option>)}
                  {bulkAction === "source" && sources.data.map(s => <option key={s.id} value={s.id}>{s.label}</option>)}
                  {bulkAction === "garment_type" && garmentTypes.data.map(g => <option key={g.id} value={g.id}>{g.label}</option>)}
                </select>
              </div>
            )}
            <div className="mt-6 flex justify-end gap-3">
              <Btn variant="ghost" onClick={() => { setBulkAction(null); setBulkValue(""); }}>{t("common.cancel")}</Btn>
              <Btn variant={bulkAction === "delete" ? "danger" : "solid"} onClick={handleBulkSubmit} disabled={busy === "bulk"}>
                {busy === "bulk" ? "..." : t("common.confirm")}
              </Btn>
            </div>
          </div>
        </div>
      )}
      {importModalOpen && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/30" onClick={() => !importing && setImportModalOpen(false)} />
          <div className="relative z-10 w-full max-w-md rounded-lg bg-[var(--color-bg)] p-6 shadow-2xl">
            <h2 className="font-serif text-xl">Nhập Sản Phẩm</h2>
            <p className="mt-2 text-sm text-ink-soft">
              Hệ thống sẽ tự động tạo SKU và Style Code. Các sản phẩm có chung "Product Name" sẽ được gộp chung vào 1 Style.
            </p>
            
            <div 
              onDragOver={(e) => e.preventDefault()}
              onDrop={handleDrop}
              className={`mt-5 flex flex-col items-center justify-center rounded-lg border-2 border-dashed edge bg-white/50 p-8 text-center transition-colors ${importing ? "opacity-50" : "hover:bg-[var(--color-tile)]"}`}
            >
              <svg className="mb-3 text-ink-soft" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3" /></svg>
              <p className="text-sm font-medium">Kéo thả file .xlsx hoặc .csv vào đây</p>
              <p className="mt-1 text-xs text-ink-soft">hoặc</p>
              <input type="file" accept=".xlsx,.csv" className="hidden" id="import-upload" onChange={handleImportInputChange} disabled={importing} />
              <button 
                onClick={() => document.getElementById("import-upload")?.click()}
                disabled={importing}
                className="mt-3 rounded-md bg-ink px-4 py-2 text-xs text-white hover:opacity-85 disabled:opacity-50"
              >
                Chọn File
              </button>
            </div>

            {importing && (
              <div className="mt-4 rounded bg-amber-50 p-3 text-center text-xs text-amber-800">
                Đang xử lý dữ liệu... Vui lòng không đóng cửa sổ.
              </div>
            )}

            <div className="mt-6 flex items-center justify-between">
              <button onClick={downloadSampleFile} className="text-xs font-medium text-ink hover:underline">
                ↓ Tải File Mẫu
              </button>
              <Btn variant="ghost" onClick={() => setImportModalOpen(false)} disabled={importing}>
                Đóng
              </Btn>
            </div>
          </div>
        </div>
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

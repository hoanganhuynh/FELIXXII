import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Btn } from "./ui";

export interface TaxonomyRow {
  id: string;
  label: string;
  sort: number;
}

/** Generic CRUD list for small id/label/sort taxonomy tables (sources, garment types). */
export default function TaxonomyList({
  title,
  subtitle,
  rows,
  loading,
  readOnly,
  onSave,
  onDelete,
  newLabel,
}: {
  title: string;
  subtitle: string;
  rows: TaxonomyRow[];
  loading: boolean;
  readOnly: boolean;
  onSave: (row: TaxonomyRow, isNew: boolean) => Promise<void>;
  onDelete: (row: TaxonomyRow) => Promise<void>;
  newLabel: string;
}) {
  const { t } = useTranslation();
  const [editing, setEditing] = useState<{ row: TaxonomyRow; isNew: boolean } | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const save = async () => {
    if (!editing) return;
    setErr(null);
    setBusy(true);
    try {
      await onSave(editing.row, editing.isNew);
      setEditing(null);
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  };

  const remove = async (row: TaxonomyRow) => {
    if (!confirm(t("taxonomy.confirm_delete", { name: row.label }))) return;
    try {
      await onDelete(row);
    } catch (e) {
      alert(e instanceof Error ? e.message : String(e));
    }
  };

  return (
    <div>
      <div className="mb-5 flex items-end justify-between">
        <div>
          <h1 className="font-serif text-3xl">{title}</h1>
          <p className="mt-1 text-xs text-ink-soft">{subtitle}</p>
        </div>
        <Btn
          disabled={readOnly}
          onClick={() => setEditing({ row: { id: "", label: "", sort: rows.length }, isNew: true })}
        >
          {newLabel}
        </Btn>
      </div>

      {readOnly && (
        <p className="mb-4 rounded-md border border-amber-200 bg-amber-50 px-4 py-2.5 text-xs text-amber-800">
          {t("common.read_only_hint")}
        </p>
      )}
      {err && <p className="mb-4 rounded-md bg-[var(--color-accent-soft)] px-4 py-2.5 text-xs text-[var(--color-accent)]">{err}</p>}

      <div className="overflow-hidden rounded-lg border edge bg-white/40">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b edge text-left text-[12px] tracking-[0.1em] text-ink-soft">
              <th className="px-4 py-2.5">{t("taxonomy.col_label")}</th>
              <th className="px-2 py-2.5">{t("taxonomy.col_id")}</th>
              <th className="px-2 py-2.5" />
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr 
                key={r.id} 
                className={`border-b edge last:border-0 hover:bg-[var(--color-tile)]/50 ${!readOnly ? 'cursor-pointer' : ''}`}
                onClick={() => !readOnly && setEditing({ row: r, isNew: false })}
              >
                <td className="px-4 py-2.5 font-serif text-[15px]">{r.label}</td>
                <td className="px-2 py-2.5 font-mono text-[12px] text-ink-soft">{r.id}</td>
                <td className="px-2 py-2.5 text-right">
                  <div className="flex shrink-0 gap-4 justify-end">
                    <button disabled={readOnly} onClick={() => setEditing({ row: r, isNew: false })} className="inline-flex items-center gap-1.5 text-[12px] text-ink-soft hover:text-ink transition-colors disabled:opacity-40">
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>
                      {t("common.edit")}
                    </button>
                    <button disabled={readOnly} onClick={(e) => { e.stopPropagation(); remove(r); }} className="inline-flex items-center gap-1.5 text-[12px] text-[var(--color-accent)] hover:opacity-70 transition-colors disabled:opacity-40">
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
                      {t("common.delete")}
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {!loading && !rows.length && (
              <tr><td colSpan={3} className="py-8 text-center text-xs text-ink-soft">{t("taxonomy.no_rows")}</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {editing && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/30" onClick={() => setEditing(null)} />
          <div className="relative z-10 w-full max-w-md rounded-lg bg-[var(--color-bg)] p-6 shadow-2xl">
            <h2 className="font-serif text-xl">{editing.isNew ? newLabel : t("common.edit")}</h2>
            <div className="mt-5 space-y-4">
              <label className="block">
                <span className="text-[12px] tracking-[0.1em] text-ink-soft">{t("taxonomy.col_label")}</span>
                <input
                  value={editing.row.label}
                  onChange={(e) => setEditing({ ...editing, row: { ...editing.row, label: e.target.value } })}
                  className="input mt-1"
                />
              </label>
              {editing.isNew && (
                <label className="block">
                  <span className="text-[12px] tracking-[0.1em] text-ink-soft">{t("taxonomy.id_hint")}</span>
                  <input
                    value={editing.row.id}
                    onChange={(e) => setEditing({ ...editing, row: { ...editing.row, id: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "-") } })}
                    placeholder="e.g. bridal"
                    className="input mt-1"
                  />
                </label>
              )}
            </div>
            <div className="mt-6 flex justify-end gap-2">
              <Btn variant="ghost" onClick={() => setEditing(null)}>{t("common.cancel")}</Btn>
              <Btn onClick={save} disabled={busy || !editing.row.label || !editing.row.id}>
                {busy ? t("common.saving") : editing.isNew ? t("taxonomy.create") : t("common.save")}
              </Btn>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

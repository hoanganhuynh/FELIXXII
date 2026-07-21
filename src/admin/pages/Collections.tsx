import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import {
  collectionStats, categoryStats, upsertCollection, deleteCollection,
  type CollectionStats,
} from "../api/rules";
import { useAsync } from "../lib/useAsync";
import { useAuth } from "../../store/auth";
import { Card, Btn, Badge } from "../components/ui";
import { compactVnd, compact } from "../lib/format";

type Draft = { id: string; label: string; season: string; note: string; isNew: boolean };

export default function AdminCollections() {
  const { t } = useTranslation();
  const { isAdmin, ready } = useAuth();
  const cols = useAsync(() => collectionStats(), [], []);
  const cats = useAsync(() => categoryStats(), [], []);
  const [editing, setEditing] = useState<Draft | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const save = async (d: Draft) => {
    setErr(null);
    try {
      await upsertCollection({
        id: d.id || d.season.toLowerCase().replace(/\s+/g, "-"),
        label: d.label,
        season: d.season,
        note: d.note,
        sort: cols.data.length,
      });
      setEditing(null);
      cols.reload();
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e));
    }
  };

  const remove = async (c: CollectionStats) => {
    if (c.styles > 0) {
      alert(t("coll.still_has", { name: c.label, count: c.styles }));
      return;
    }
    if (!confirm(t("coll.confirm_delete", { name: c.label }))) return;
    try {
      await deleteCollection(c.id);
      cols.reload();
    } catch (e) {
      alert(e instanceof Error ? e.message : String(e));
    }
  };

  return (
    <div>
      <div className="mb-5 flex items-end justify-between">
        <div>
          <h1 className="font-serif text-3xl">{t("collections")}</h1>
          <p className="mt-1 text-xs text-ink-soft">{t("coll.subtitle")}</p>
        </div>
        <Btn
          disabled={ready && !isAdmin}
          onClick={() => setEditing({ id: "", label: "", season: "", note: "", isNew: true })}
        >
          {t("coll.new")}
        </Btn>
      </div>

      {ready && !isAdmin && (
        <p className="mb-4 rounded-md border border-amber-200 bg-amber-50 px-4 py-2.5 text-xs text-amber-800">
          {t("common.read_only_hint")}
        </p>
      )}
      {err && <p className="mb-4 rounded-md bg-[var(--color-accent-soft)] px-4 py-2.5 text-xs text-[var(--color-accent)]">{err}</p>}

      <div className="grid gap-4 lg:grid-cols-2">
        {cols.data.map((c) => (
          <Card key={c.id} title={c.season} action={
            <div className="flex gap-2">
              <button disabled={ready && !isAdmin} onClick={() => setEditing({ id: c.id, label: c.label, season: c.season, note: c.note ?? "", isNew: false })} className="text-[12px] text-ink-soft link-underline disabled:opacity-40">{t("common.edit")}</button>
              <button disabled={ready && !isAdmin} onClick={() => remove(c)} className="text-[12px] text-[var(--color-accent)] link-underline disabled:opacity-40">{t("common.delete")}</button>
            </div>
          }>
            <div className="p-5">
              <p className="font-serif text-xl">{c.label}</p>
              <p className="mt-1 text-xs text-ink-soft">{c.note}</p>
              <div className="mt-4 grid grid-cols-4 gap-3 border-t edge pt-4 text-center">
                <Cell k={t("coll.styles")} v={String(c.styles)} />
                <Cell k={t("coll.skus")} v={c.skus.toLocaleString()} />
                <Cell k={t("coll.units")} v={compact(c.units)} />
                <Cell k={t("coll.revenue")} v={compactVnd(c.revenue)} />
              </div>
              <Link to={`/admin/products?collection=${c.id}`} className="mt-4 inline-block text-[12px] text-ink-soft link-underline">{t("coll.view_styles")}</Link>
            </div>
          </Card>
        ))}
        {cols.loading && <p className="py-8 text-center text-xs text-ink-soft">{t("common.loading")}</p>}
      </div>

      <h2 className="mb-3 mt-8 font-serif text-xl">{t("coll.categories")}</h2>
      <div className="overflow-hidden rounded-lg border edge bg-white/40">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b edge text-left text-[12px] tracking-[0.1em] text-ink-soft">
              <th className="px-4 py-2.5">{t("coll.col_category")}</th><th className="px-2 py-2.5">{t("coll.col_prefix")}</th>
              <th className="px-2 py-2.5 text-right">{t("coll.col_styles")}</th><th className="px-2 py-2.5 text-right">{t("coll.col_skus")}</th><th className="px-2 py-2.5 text-right">{t("coll.col_revenue")}</th>
            </tr>
          </thead>
          <tbody>
            {cats.data.map((c) => (
              <tr key={c.id} className="border-b edge last:border-0 hover:bg-[var(--color-tile)]/50">
                <td className="px-4 py-2.5 font-serif text-[15px]">{c.label}</td>
                <td className="px-2 py-2.5"><Badge>{`FX-${c.sku_prefix}`}</Badge></td>
                <td className="px-2 py-2.5 text-right text-xs tabular-nums">{c.styles}</td>
                <td className="px-2 py-2.5 text-right text-xs tabular-nums">{c.skus.toLocaleString()}</td>
                <td className="px-2 py-2.5 text-right text-xs tabular-nums">{compactVnd(c.revenue)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="mt-2 text-[12px] text-ink-soft">
        {t("coll.tax_note")}
      </p>

      {editing && <EditModal d={editing} onClose={() => setEditing(null)} onSave={save} />}
    </div>
  );
}

function Cell({ k, v }: { k: string; v: string }) {
  return <div><p className="text-[12px] tracking-[0.08em] text-ink-soft">{k.toUpperCase()}</p><p className="mt-0.5 text-sm tabular-nums">{v}</p></div>;
}

function EditModal({ d, onClose, onSave }: { d: Draft; onClose: () => void; onSave: (d: Draft) => void }) {
  const { t } = useTranslation();
  const [f, setF] = useState(d);
  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/30" onClick={onClose} />
      <div className="relative z-10 w-full max-w-md rounded-lg bg-[var(--color-bg)] p-6 shadow-2xl">
        <h2 className="font-serif text-xl">{f.isNew ? t("coll.new_title") : t("coll.edit_title")}</h2>
        <div className="mt-5 space-y-4">
          <label className="block"><span className="text-[12px] tracking-[0.1em] text-ink-soft">{t("coll.f_name")}</span>
            <input value={f.label} onChange={(e) => setF({ ...f, label: e.target.value })} placeholder="Fall — Winter 2026" className="input mt-1" /></label>
          <label className="block"><span className="text-[12px] tracking-[0.1em] text-ink-soft">{t("coll.f_season")}</span>
            <input value={f.season} onChange={(e) => setF({ ...f, season: e.target.value })} placeholder="FW26" className="input mt-1" /></label>
          <label className="block"><span className="text-[12px] tracking-[0.1em] text-ink-soft">{t("coll.f_note")}</span>
            <input value={f.note} onChange={(e) => setF({ ...f, note: e.target.value })} placeholder="Velvet, draped silk, warm dark tones." className="input mt-1" /></label>
        </div>
        <div className="mt-6 flex justify-end gap-2">
          <Btn variant="ghost" onClick={onClose}>{t("common.cancel")}</Btn>
          <Btn onClick={() => onSave(f)} disabled={!f.label || !f.season}>{f.isNew ? t("coll.create") : t("common.save")}</Btn>
        </div>
      </div>
    </div>
  );
}

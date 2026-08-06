import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import {
  collectionStats, upsertCollection, deleteCollection,
  type CollectionStats,
} from "../api/rules";
import { useAsync } from "../lib/useAsync";
import { useAuth } from "../../store/auth";
import { Card, Btn } from "../components/ui";
import { compactVnd, compact } from "../lib/format";

type Draft = { id: string; label: string; season: string; note: string; isNew: boolean };

export default function AdminCollections() {
  const { t } = useTranslation();
  const { isAdmin, ready } = useAuth();
  const cols = useAsync(() => collectionStats(), [], []);
  const [editing, setEditing] = useState<Draft | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  const toggleExpanded = (id: string) =>
    setExpanded((s) => {
      const next = new Set(s);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });

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
            <div className="flex shrink-0 gap-4">
              <button disabled={ready && !isAdmin} onClick={() => setEditing({ id: c.id, label: c.label, season: c.season, note: c.note ?? "", isNew: false })} className="inline-flex items-center gap-1.5 text-[12px] text-ink-soft hover:text-ink transition-colors disabled:opacity-40">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>
                {t("common.edit")}
              </button>
              <button disabled={ready && !isAdmin} onClick={() => remove(c)} className="inline-flex items-center gap-1.5 text-[12px] text-[var(--color-accent)] hover:opacity-70 transition-colors disabled:opacity-40">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
                {t("common.delete")}
              </button>
            </div>
          }>
            <div className="p-5">
              <p className="font-serif text-xl">{c.label}</p>
              <p className="mt-1 text-xs text-ink-soft">{c.note}</p>

              <div className="mt-4 grid grid-cols-4 gap-3 border-t edge pt-4">
                <Cell k={t("coll.styles")} v={compact(c.styles)} />
                <Cell k={t("coll.skus")} v={compact(c.skus)} />
                <Cell k={t("coll.units")} v={compact(c.units)} />
                <Cell k={t("coll.revenue")} v={compactVnd(c.revenue)} />
              </div>

              {c.products.length > 0 && (
                <div className="mt-5 flex gap-3 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                  {c.products.slice(0, 6).map((p) => (
                    <Link
                      key={p.id}
                      to={`/admin/products/${p.id}`}
                      title={p.name}
                      className="block h-24 w-16 shrink-0 overflow-hidden rounded-md border edge bg-[var(--color-tile)]"
                    >
                      {p.image ? (
                        <img src={p.image} alt={p.name} className="h-full w-full object-cover object-top" />
                      ) : (
                        <div className="grid h-full w-full place-items-center text-ink-soft">
                          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
                            <rect x="3" y="3" width="18" height="18" rx="2" />
                            <circle cx="8.5" cy="8.5" r="1.5" />
                            <path d="M21 15l-5-5L5 21" />
                          </svg>
                        </div>
                      )}
                    </Link>
                  ))}
                </div>
              )}

              <button
                onClick={() => toggleExpanded(c.id)}
                className="mt-4 text-[12px] link-underline text-ink-soft hover:text-ink"
              >
                {expanded.has(c.id) ? t("coll.hide_styles") : t("coll.view_styles")}
              </button>

              {expanded.has(c.id) && (
                <div className="mt-3 space-y-1.5 border-t edge pt-3">
                  {c.products.length === 0 && (
                    <p className="text-xs text-ink-soft">{t("coll.no_products")}</p>
                  )}
                  {c.products.map((p) => (
                    <Link
                      key={p.id}
                      to={`/admin/products/${p.id}`}
                      className="block truncate text-[13px] text-ink link-underline hover:text-ink"
                    >
                      {p.name || p.id}
                    </Link>
                  ))}
                </div>
              )}
            </div>
          </Card>
        ))}
        {cols.loading && <p className="py-8 text-center text-xs text-ink-soft">{t("common.loading")}</p>}
      </div>

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

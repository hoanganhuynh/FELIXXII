import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useAuth } from "../../store/auth";
import { useAsync } from "../lib/useAsync";
import { Btn } from "../components/ui";
import { listColors, upsertColor, deleteColor, type ColorRow } from "../api/taxonomy";
import { stripDiacritics } from "../lib/slug";

type Draft = { id: string; name: string; hex: string; isNew: boolean };

const EMPTY: Draft = { id: "", name: "", hex: "#000000", isNew: true };

export default function Colors() {
  const { t } = useTranslation();
  const { isAdmin, ready } = useAuth();
  const { data: colors, loading, reload } = useAsync(listColors, [], []);
  const [editing, setEditing] = useState<Draft | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const readOnly = ready && !isAdmin;

  const save = async (d: Draft) => {
    setErr(null);
    try {
      const id = d.isNew ? stripDiacritics(d.name).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "") : d.id;
      await upsertColor({ id, name: d.name, hex: d.hex, sort: colors.length });
      setEditing(null);
      reload();
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e));
    }
  };

  const remove = async (c: ColorRow) => {
    if (!confirm(t("color.confirm_delete", { name: c.name }))) return;
    try { await deleteColor(c.id); reload(); }
    catch (e) { alert(e instanceof Error ? e.message : String(e)); }
  };

  return (
    <div>
      <div className="mb-5 flex items-end justify-between">
        <div>
          <h1 className="font-serif text-3xl">{t("color.title")}</h1>
          <p className="mt-1 text-xs text-ink-soft">{t("color.subtitle")}</p>
        </div>
        <Btn disabled={readOnly} onClick={() => setEditing(EMPTY)}>{t("color.new")}</Btn>
      </div>

      {readOnly && (
        <p className="mb-4 rounded-md border border-amber-200 bg-amber-50 px-4 py-2.5 text-xs text-amber-800">
          {t("common.read_only_hint")}
        </p>
      )}
      {err && <p className="mb-4 rounded-md bg-[var(--color-accent-soft)] px-4 py-2.5 text-xs text-[var(--color-accent)]">{err}</p>}

      {!loading && !colors.length ? (
        <div className="rounded-lg border edge bg-white/40 py-10 text-center text-xs text-ink-soft">{t("common.none")}</div>
      ) : (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
          {colors.map((c) => (
            <div key={c.id} className="group relative overflow-hidden rounded-lg border edge bg-white/40">
              <button
                type="button"
                disabled={readOnly}
                onClick={() => setEditing({ id: c.id, name: c.name, hex: c.hex, isNew: false })}
                className="block w-full text-left disabled:cursor-default"
              >
                <div className="aspect-square w-full" style={{ background: c.hex }} />
                <div className="p-3">
                  <p className="truncate font-serif text-[15px]">{c.name}</p>
                  <p className="mt-0.5 truncate font-mono text-[11px] text-ink-soft">{c.hex}</p>
                  <p className="truncate font-mono text-[11px] text-ink-soft/70">{c.id}</p>
                </div>
              </button>

              {!readOnly && (
                <div className="absolute right-2 top-2 flex gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                  <button
                    onClick={() => setEditing({ id: c.id, name: c.name, hex: c.hex, isNew: false })}
                    aria-label={t("common.edit")}
                    className="flex h-7 w-7 items-center justify-center rounded-full bg-white/90 text-ink shadow hover:bg-white"
                  >
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>
                  </button>
                  <button
                    onClick={() => remove(c)}
                    aria-label={t("common.delete")}
                    className="flex h-7 w-7 items-center justify-center rounded-full bg-white/90 text-[var(--color-accent)] shadow hover:bg-white"
                  >
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {editing && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/30" onClick={() => setEditing(null)} />
          <div className="relative z-10 w-full max-w-md rounded-lg bg-[var(--color-bg)] p-6 shadow-2xl">
            <h2 className="font-serif text-xl">{editing.isNew ? t("color.new_title") : t("color.edit_title")}</h2>
            <div className="mt-5 space-y-4">
              <label className="block">
                <span className="text-[12px] tracking-[0.1em] text-ink-soft">{t("color.f_name")}</span>
                <input value={editing.name} onChange={(e) => setEditing({ ...editing, name: e.target.value })} placeholder="e.g. Dusty Rose" className="input mt-1" />
              </label>
              <label className="block">
                <span className="text-[12px] tracking-[0.1em] text-ink-soft">{t("color.f_hex")}</span>
                <div className="mt-1 flex items-center gap-3">
                  <input type="color" value={editing.hex} onChange={(e) => setEditing({ ...editing, hex: e.target.value })} className="h-9 w-12 shrink-0 cursor-pointer rounded border edge bg-transparent p-0.5" />
                  <input value={editing.hex} onChange={(e) => setEditing({ ...editing, hex: e.target.value })} placeholder="#c9a2a2" className="input flex-1 font-mono" />
                </div>
              </label>
            </div>
            <div className="mt-6 flex justify-end gap-2">
              <Btn variant="ghost" onClick={() => setEditing(null)}>{t("common.cancel")}</Btn>
              <Btn onClick={() => save(editing)} disabled={!editing.name.trim() || !/^#[0-9a-fA-F]{6}$/.test(editing.hex)}>
                {editing.isNew ? t("color.create") : t("common.save")}
              </Btn>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

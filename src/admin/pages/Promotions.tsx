import { useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { supabase } from "../../lib/supabase";
import { useAuth } from "../../store/auth";
import { useAsync } from "../lib/useAsync";
import { Card, Btn } from "../components/ui";
import {
  listAllPromotions, createPromotion, updatePromotion, deletePromotion, swapPromotionOrder,
  type Promotion,
} from "../api/promotions";

type Draft = Omit<Promotion, "id" | "created_at" | "sort_order"> & { id?: string };

const EMPTY: Draft = { active: true, image_url: "", link_url: "", title: "" };

export default function Promotions() {
  const { t } = useTranslation();
  const { isAdmin, ready } = useAuth();
  const readOnly = ready && !isAdmin;
  const { data: promos, loading, reload } = useAsync(listAllPromotions, [], []);
  const [editing, setEditing] = useState<Draft | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const save = async (d: Draft) => {
    setErr(null);
    try {
      if (d.id) await updatePromotion(d.id, d);
      else await createPromotion(d);
      setEditing(null);
      reload();
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e));
    }
  };

  const remove = async (p: Promotion) => {
    if (!confirm(t("promo.confirm_delete"))) return;
    try { await deletePromotion(p.id); reload(); }
    catch (e) { setErr(e instanceof Error ? e.message : String(e)); }
  };

  const toggleActive = async (p: Promotion) => {
    try { await updatePromotion(p.id, { active: !p.active }); reload(); }
    catch (e) { setErr(e instanceof Error ? e.message : String(e)); }
  };

  const move = async (i: number, dir: -1 | 1) => {
    const a = promos[i];
    const b = promos[i + dir];
    try { await swapPromotionOrder(a.id, a.sort_order, b.id, b.sort_order); reload(); }
    catch (e) { setErr(e instanceof Error ? e.message : String(e)); }
  };

  return (
    <div>
      <div className="mb-5 flex items-end justify-between">
        <div>
          <h1 className="font-serif text-3xl">{t("promo.title")}</h1>
          <p className="mt-1 text-xs text-ink-soft">{t("promo.subtitle")}</p>
        </div>
        <Btn disabled={readOnly} onClick={() => setEditing(EMPTY)}>{t("promo.new")}</Btn>
      </div>

      {readOnly && (
        <p className="mb-4 rounded-md border border-amber-200 bg-amber-50 px-4 py-2.5 text-xs text-amber-800">
          {t("common.read_only_hint")}
        </p>
      )}
      {err && <p className="mb-4 rounded-md bg-[var(--color-accent-soft)] px-4 py-2.5 text-xs text-[var(--color-accent)]">{err}</p>}

      {loading && <p className="py-8 text-center text-xs text-ink-soft">{t("common.loading")}</p>}

      <div className="space-y-3">
        {promos.map((p, i) => (
          <div 
            key={p.id} 
            className={`flex items-center gap-4 overflow-hidden rounded-lg border edge hover:bg-white/60 transition-colors ${!readOnly ? 'cursor-pointer' : 'bg-white/40'}`}
            onClick={() => !readOnly && setEditing({ ...p })}
          >
            <div className="relative h-20 w-32 shrink-0 overflow-hidden bg-[var(--color-tile)]">
              {p.image_url ? (
                <img src={p.image_url} alt={p.title} className="h-full w-full object-cover object-top" />
              ) : (
                <div className="flex h-full items-center justify-center">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2" className="text-ink-soft/40"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9l4-4 4 4 4-6 6 8"/><circle cx="8" cy="8" r="1.5"/></svg>
                </div>
              )}
            </div>

            <div className="min-w-0 flex-1 py-4">
              <p className="truncate font-serif text-[15px]">{p.title || <span className="text-ink-soft italic">{t("promo.no_title")}</span>}</p>
              {p.link_url && <p className="mt-0.5 truncate text-[12px] text-ink-soft">{p.link_url}</p>}
            </div>

            <button
              disabled={readOnly}
              onClick={(e) => { e.stopPropagation(); toggleActive(p); }}
              className={`shrink-0 rounded-full px-2.5 py-1 text-[12px] font-medium transition-colors disabled:opacity-40 ${
                p.active ? "bg-emerald-50 text-emerald-700" : "bg-[var(--color-tile)] text-ink-soft"
              }`}
            >
              {p.active ? t("promo.active") : t("promo.inactive")}
            </button>

            <div className="flex shrink-0 flex-col gap-0.5 pr-1">
              <button
                disabled={readOnly || i === 0}
                onClick={(e) => { e.stopPropagation(); move(i, -1); }}
                className="flex h-6 w-6 items-center justify-center rounded text-ink-soft transition-colors hover:bg-[var(--color-tile)] hover:text-ink disabled:opacity-25"
              ><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M18 15l-6-6-6 6"/></svg></button>
              <button
                disabled={readOnly || i === promos.length - 1}
                onClick={(e) => { e.stopPropagation(); move(i, 1); }}
                className="flex h-6 w-6 items-center justify-center rounded text-ink-soft transition-colors hover:bg-[var(--color-tile)] hover:text-ink disabled:opacity-25"
              ><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M6 9l6 6 6-6"/></svg></button>
            </div>

            <div className="flex shrink-0 gap-4 pr-5">
              <button disabled={readOnly} onClick={() => setEditing({ ...p })} className="inline-flex items-center gap-1.5 text-[12px] text-ink-soft hover:text-ink transition-colors disabled:opacity-40">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>
                {t("common.edit")}
              </button>
              <button disabled={readOnly} onClick={(e) => { e.stopPropagation(); remove(p); }} className="inline-flex items-center gap-1.5 text-[12px] text-[var(--color-accent)] hover:opacity-70 transition-colors disabled:opacity-40">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
                {t("common.delete")}
              </button>
            </div>
          </div>
        ))}

        {!loading && !promos.length && (
          <Card title=""><p className="py-10 text-center text-xs text-ink-soft">{t("common.none")}</p></Card>
        )}
      </div>

      <p className="mt-4 text-[12px] text-ink-soft">{t("promo.hint")}</p>

      {editing !== null && <EditModal draft={editing} onClose={() => setEditing(null)} onSave={save} />}
    </div>
  );
}

function EditModal({ draft, onClose, onSave }: { draft: Draft; onClose: () => void; onSave: (d: Draft) => void }) {
  const { t } = useTranslation();
  const [f, setF] = useState(draft);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const isNew = !f.id;
  const set = (k: keyof Draft, v: string | boolean) => setF((p) => ({ ...p, [k]: v }));

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const ext = file.name.split(".").pop();
      const filename = `${Date.now()}_${Math.random().toString(36).substring(7)}.${ext}`;
      const { error } = await supabase.storage.from("product-images").upload(filename, file);
      if (error) throw error;
      const { data: { publicUrl } } = supabase.storage.from("product-images").getPublicUrl(filename);
      set("image_url", publicUrl);
    } catch (err) {
      alert("Upload failed: " + (err instanceof Error ? err.message : String(err)));
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  };

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/30" onClick={onClose} />
      <div className="relative z-10 flex w-full max-w-xl flex-col gap-0 overflow-hidden rounded-lg bg-[var(--color-bg)] shadow-2xl">
        <div className="relative h-36 w-full bg-neutral-900 overflow-hidden">
          {f.image_url ? (
            <img src={f.image_url} alt="" className="h-full w-full object-cover object-top opacity-80" />
          ) : (
            <div className="flex h-full items-center justify-center text-white/30 text-xs">{t("promo.preview")}</div>
          )}
        </div>

        <div className="p-6">
          <h2 className="mb-5 font-serif text-xl">{isNew ? t("promo.new_title") : t("promo.edit_title")}</h2>

          <div className="space-y-4">
            <Field label={t("promo.f_image")}>
              <div className="mt-1 flex gap-2">
                <input value={f.image_url} onChange={(e) => set("image_url", e.target.value)} placeholder="https://…" className="input flex-1" />
                <input type="file" accept="image/*" className="hidden" ref={fileRef} onChange={handleUpload} />
                <Btn variant="ghost" onClick={() => fileRef.current?.click()} disabled={uploading}>
                  {uploading ? t("common.loading") : t("promo.upload")}
                </Btn>
              </div>
            </Field>

            <Field label={t("promo.f_title")}>
              <input value={f.title} onChange={(e) => set("title", e.target.value)} placeholder={t("promo.optional")} className="input mt-1" />
            </Field>

            <Field label={t("promo.f_link")}>
              <input value={f.link_url} onChange={(e) => set("link_url", e.target.value)} placeholder="/shop?collection=…" className="input mt-1" />
            </Field>

            <label className="flex items-center gap-2 cursor-pointer select-none">
              <input type="checkbox" checked={f.active} onChange={(e) => set("active", e.target.checked)} className="h-4 w-4 rounded border edge accent-ink" />
              <span className="text-[12px]">{t("promo.f_active")}</span>
            </label>
          </div>

          <div className="mt-6 flex justify-end gap-2">
            <Btn variant="ghost" onClick={onClose}>{t("common.cancel")}</Btn>
            <Btn onClick={() => onSave(f)} disabled={!f.image_url}>{isNew ? t("promo.create") : t("common.save")}</Btn>
          </div>
        </div>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="text-[12px] tracking-[0.1em] text-ink-soft">{label}</span>
      {children}
    </label>
  );
}

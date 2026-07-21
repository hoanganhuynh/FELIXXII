import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useAuth } from "../../store/auth";
import { useAsync } from "../lib/useAsync";
import { Card, Btn, Badge } from "../components/ui";
import {
  listAllBanners, createBanner, updateBanner, deleteBanner, swapBannerOrder,
  type HeroBanner,
} from "../api/banners";

type Draft = Omit<HeroBanner, "id" | "created_at" | "sort_order"> & { id?: string };

const EMPTY: Draft = {
  active: true,
  image_url: "",
  collection_tag: "",
  heading: "",
  subheading: "",
  cta1_label: "",
  cta1_url: "",
  cta2_label: "",
  cta2_url: "",
};

export default function Banners() {
  const { t } = useTranslation();
  const { isAdmin, ready } = useAuth();
  const { data: banners, loading, reload } = useAsync(listAllBanners, [], []);
  const [editing, setEditing] = useState<Draft | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const save = async (d: Draft) => {
    setErr(null);
    try {
      if (d.id) {
        await updateBanner(d.id, d);
      } else {
        await createBanner(d);
      }
      setEditing(null);
      reload();
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e));
    }
  };

  const remove = async (b: HeroBanner) => {
    if (!confirm(t("ban.confirm_delete"))) return;
    try { await deleteBanner(b.id); reload(); }
    catch (e) { setErr(e instanceof Error ? e.message : String(e)); }
  };

  const toggleActive = async (b: HeroBanner) => {
    try { await updateBanner(b.id, { active: !b.active }); reload(); }
    catch (e) { setErr(e instanceof Error ? e.message : String(e)); }
  };

  const move = async (i: number, dir: -1 | 1) => {
    const a = banners[i];
    const b = banners[i + dir];
    try { await swapBannerOrder(a.id, a.sort_order, b.id, b.sort_order); reload(); }
    catch (e) { setErr(e instanceof Error ? e.message : String(e)); }
  };

  return (
    <div>
      <div className="mb-5 flex items-end justify-between">
        <div>
          <h1 className="font-serif text-3xl">{t("banners")}</h1>
          <p className="mt-1 text-xs text-ink-soft">{t("ban.subtitle")}</p>
        </div>
        <Btn disabled={ready && !isAdmin} onClick={() => setEditing(EMPTY)}>
          {t("ban.new")}
        </Btn>
      </div>

      {ready && !isAdmin && (
        <p className="mb-4 rounded-md border border-amber-200 bg-amber-50 px-4 py-2.5 text-xs text-amber-800">
          {t("common.read_only_hint")}
        </p>
      )}
      {err && (
        <p className="mb-4 rounded-md bg-[var(--color-accent-soft)] px-4 py-2.5 text-xs text-[var(--color-accent)]">
          {err}
        </p>
      )}

      {loading && <p className="py-8 text-center text-xs text-ink-soft">{t("common.loading")}</p>}

      <div className="space-y-3">
        {banners.map((b, i) => (
          <div key={b.id} className="flex items-center gap-4 overflow-hidden rounded-lg border edge bg-white/40">
            {/* thumbnail */}
            <div className="relative h-20 w-32 shrink-0 overflow-hidden bg-[var(--color-tile)]">
              {b.image_url && (
                <img src={b.image_url} alt={b.heading} className="h-full w-full object-cover object-top" />
              )}
              {!b.image_url && (
                <div className="flex h-full items-center justify-center">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2" className="text-ink-soft/40"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9l4-4 4 4 4-6 6 8"/><circle cx="8" cy="8" r="1.5"/></svg>
                </div>
              )}
            </div>

            {/* info */}
            <div className="min-w-0 flex-1 py-4">
              <p className="truncate font-serif text-[15px]">{b.heading || <span className="text-ink-soft italic">{t("ban.no_heading")}</span>}</p>
              <p className="mt-0.5 text-[10px] tracking-[0.08em] text-ink-soft">{b.collection_tag}</p>
              {b.cta1_label && (
                <p className="mt-1.5 text-[10px] text-ink-soft">
                  <span className="rounded border edge px-1.5 py-0.5">{b.cta1_label}</span>
                  {b.cta2_label && <span className="ml-1.5 rounded border edge px-1.5 py-0.5">{b.cta2_label}</span>}
                </p>
              )}
            </div>

            {/* active toggle */}
            <button
              disabled={ready && !isAdmin}
              onClick={() => toggleActive(b)}
              title={b.active ? t("ban.active") : t("ban.inactive")}
              className={`shrink-0 rounded-full px-2.5 py-1 text-[10px] font-medium transition-colors disabled:opacity-40 ${
                b.active ? "bg-emerald-50 text-emerald-700" : "bg-[var(--color-tile)] text-ink-soft"
              }`}
            >
              {b.active ? t("ban.active") : t("ban.inactive")}
            </button>

            {/* reorder */}
            <div className="flex shrink-0 flex-col gap-0.5 pr-1">
              <button
                disabled={(ready && !isAdmin) || i === 0}
                onClick={() => move(i, -1)}
                className="flex h-6 w-6 items-center justify-center rounded text-ink-soft transition-colors hover:bg-[var(--color-tile)] hover:text-ink disabled:opacity-25"
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M18 15l-6-6-6 6"/></svg>
              </button>
              <button
                disabled={(ready && !isAdmin) || i === banners.length - 1}
                onClick={() => move(i, 1)}
                className="flex h-6 w-6 items-center justify-center rounded text-ink-soft transition-colors hover:bg-[var(--color-tile)] hover:text-ink disabled:opacity-25"
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M6 9l6 6 6-6"/></svg>
              </button>
            </div>

            {/* actions */}
            <div className="flex shrink-0 gap-3 pr-5">
              <button
                disabled={ready && !isAdmin}
                onClick={() => setEditing({ ...b })}
                className="text-[10px] text-ink-soft link-underline disabled:opacity-40"
              >
                {t("common.edit")}
              </button>
              <button
                disabled={ready && !isAdmin}
                onClick={() => remove(b)}
                className="text-[10px] text-[var(--color-accent)] link-underline disabled:opacity-40"
              >
                {t("common.delete")}
              </button>
            </div>
          </div>
        ))}

        {!loading && !banners.length && (
          <Card title="">
            <p className="py-10 text-center text-xs text-ink-soft">{t("common.none")}</p>
          </Card>
        )}
      </div>

      <p className="mt-4 text-[11px] text-ink-soft">{t("ban.hint")}</p>

      {editing !== null && (
        <EditModal
          draft={editing}
          onClose={() => setEditing(null)}
          onSave={save}
        />
      )}
    </div>
  );
}

function EditModal({
  draft,
  onClose,
  onSave,
}: {
  draft: Draft;
  onClose: () => void;
  onSave: (d: Draft) => void;
}) {
  const { t } = useTranslation();
  const [f, setF] = useState(draft);
  const isNew = !f.id;
  const set = (k: keyof Draft, v: string | boolean) => setF((p) => ({ ...p, [k]: v }));

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/30" onClick={onClose} />
      <div className="relative z-10 flex w-full max-w-xl flex-col gap-0 overflow-hidden rounded-lg bg-[var(--color-bg)] shadow-2xl">
        {/* preview strip */}
        <div className="relative h-36 w-full bg-neutral-900 overflow-hidden">
          {f.image_url && (
            <img src={f.image_url} alt="" className="h-full w-full object-cover object-top opacity-80" />
          )}
          {!f.image_url && (
            <div className="flex h-full items-center justify-center text-white/30 text-xs">{t("ban.preview")}</div>
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent" />
          {f.collection_tag && (
            <p className="absolute bottom-8 left-5 text-[10px] tracking-[0.1em] text-white/70">{f.collection_tag}</p>
          )}
          {f.heading && (
            <p className="absolute bottom-4 left-5 font-serif text-white text-base leading-tight">{f.heading}</p>
          )}
        </div>

        <div className="p-6">
          <h2 className="mb-5 font-serif text-xl">{isNew ? t("ban.new_title") : t("ban.edit_title")}</h2>

          <div className="space-y-4">
            <Field label={t("ban.f_image")}>
              <input
                value={f.image_url} onChange={(e) => set("image_url", e.target.value)}
                placeholder="/hero-banner/filename.jpg"
                className="input mt-1"
              />
            </Field>

            <Field label={t("ban.f_collection_tag")}>
              <input
                value={f.collection_tag} onChange={(e) => set("collection_tag", e.target.value)}
                placeholder="Fall — Winter 2025 · FW25"
                className="input mt-1"
              />
            </Field>

            <Field label={t("ban.f_heading")}>
              <input
                value={f.heading} onChange={(e) => set("heading", e.target.value)}
                placeholder="Draped silk, deep tones…"
                className="input mt-1"
              />
            </Field>

            <Field label={t("ban.f_subheading")}>
              <input
                value={f.subheading} onChange={(e) => set("subheading", e.target.value)}
                placeholder={t("ban.optional")}
                className="input mt-1"
              />
            </Field>

            <div className="grid grid-cols-2 gap-3">
              <Field label={t("ban.f_cta1")}>
                <input value={f.cta1_label} onChange={(e) => set("cta1_label", e.target.value)} placeholder={t("ban.f_label")} className="input mt-1" />
                <input value={f.cta1_url}   onChange={(e) => set("cta1_url",   e.target.value)} placeholder="/shop?collection=…" className="input mt-1.5" />
              </Field>
              <Field label={t("ban.f_cta2")}>
                <input value={f.cta2_label} onChange={(e) => set("cta2_label", e.target.value)} placeholder={t("ban.f_label")} className="input mt-1" />
                <input value={f.cta2_url}   onChange={(e) => set("cta2_url",   e.target.value)} placeholder="/shop?cat=…" className="input mt-1.5" />
              </Field>
            </div>

            <label className="flex items-center gap-2 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={f.active}
                onChange={(e) => set("active", e.target.checked)}
                className="h-4 w-4 rounded border edge accent-ink"
              />
              <span className="text-[11px]">{t("ban.f_active")}</span>
            </label>
          </div>

          <div className="mt-6 flex justify-end gap-2">
            <Btn variant="ghost" onClick={onClose}>{t("common.cancel")}</Btn>
            <Btn onClick={() => onSave(f)} disabled={!f.image_url || !f.heading}>
              {isNew ? t("ban.create") : t("common.save")}
            </Btn>
          </div>
        </div>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="text-[10px] tracking-[0.1em] text-ink-soft">{label}</span>
      {children}
    </label>
  );
}

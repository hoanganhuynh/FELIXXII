import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useAuth } from "../../store/auth";
import { useAsync } from "../lib/useAsync";
import { Card, Btn } from "../components/ui";
import { listCategories, listStyleNames, type StyleNameHit } from "../api/products";
import { listGarmentTypes, listSources } from "../api/taxonomy";
import { useCampaigns } from "../../store/campaigns";
import {
  listAllCampaigns, createCampaign, updateCampaign, deleteCampaign,
  type CampaignRow, type CampaignType, type CampaignScope, type DiscountKind,
} from "../api/campaigns";

type Draft = Omit<CampaignRow, "id" | "created_at"> & { id?: string };

const EMPTY: Draft = {
  name: "", description: "", type: "invoice_discount", active: true,
  start_date: null, end_date: null,
  discount_kind: "percent", discount_value: null, min_subtotal: null,
  scope: "all", target_ids: [],
  buy_qty: null, get_qty: null,
  gift_style_id: null,
  valid_days: [], start_time: null, end_time: null, exclude_promotional_items: false,
};

const TYPES: CampaignType[] = ["invoice_discount", "item_discount", "buy_x_get_y", "free_gift"];

export default function Campaigns() {
  const { t } = useTranslation();
  const { isAdmin, ready } = useAuth();
  const readOnly = ready && !isAdmin;
  const { data: campaigns, loading, reload } = useAsync(listAllCampaigns, [], []);
  const [editing, setEditing] = useState<Draft | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const save = async (d: Draft) => {
    setErr(null);
    try {
      const { id, created_at: _createdAt, ...payload } = d as Draft & { created_at?: string };
      if (id) await updateCampaign(id, payload);
      else await createCampaign(payload);
      await useCampaigns.getState().fetch(true);
      setEditing(null);
      await reload();
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e));
      throw e;
    }
  };

  const remove = async (c: CampaignRow) => {
    if (!confirm(t("campaign.confirm_delete"))) return;
    try { await deleteCampaign(c.id); await useCampaigns.getState().fetch(true); reload(); }
    catch (e) { setErr(e instanceof Error ? e.message : String(e)); }
  };

  const toggleActive = async (c: CampaignRow) => {
    try { await updateCampaign(c.id, { active: !c.active }); await useCampaigns.getState().fetch(true); reload(); }
    catch (e) { setErr(e instanceof Error ? e.message : String(e)); }
  };

  return (
    <div>
      <div className="mb-5 flex items-end justify-between">
        <div>
          <h1 className="font-serif text-3xl">{t("campaign.title")}</h1>
          <p className="mt-1 text-xs text-ink-soft">{t("campaign.subtitle")}</p>
        </div>
        <Btn disabled={readOnly} onClick={() => setEditing(EMPTY)}>{t("campaign.new")}</Btn>
      </div>

      {readOnly && (
        <p className="mb-4 rounded-md border border-amber-200 bg-amber-50 px-4 py-2.5 text-xs text-amber-800">
          {t("common.read_only_hint")}
        </p>
      )}
      {err && <p className="mb-4 rounded-md bg-[var(--color-accent-soft)] px-4 py-2.5 text-xs text-[var(--color-accent)]">{err}</p>}

      {loading && <p className="py-8 text-center text-xs text-ink-soft">{t("common.loading")}</p>}

      <div className="space-y-3">
        {campaigns.map((c) => (
          <div 
            key={c.id} 
            className={`flex items-center gap-4 rounded-lg border edge bg-white/40 px-6 py-4 transition-colors ${!readOnly ? 'cursor-pointer hover:bg-[var(--color-tile)]' : ''}`}
            onClick={() => !readOnly && setEditing({ ...c })}
          >
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <p className="truncate font-serif text-[15px]">{c.name || <span className="text-ink-soft italic">{t("campaign.no_name")}</span>}</p>
                <span className="shrink-0 rounded-full bg-[var(--color-tile)] px-2 py-0.5 text-[11px] text-ink-soft">{t(`campaign.type_${c.type}`)}</span>
              </div>
              <p className="mt-0.5 text-[12px] text-ink-soft">
                {c.start_date || c.end_date
                  ? t("campaign.date_range", { start: c.start_date ?? "…", end: c.end_date ?? "…" })
                  : t("campaign.no_date_limit")}
              </p>
            </div>

            <button
              disabled={readOnly}
              onClick={(e) => { e.stopPropagation(); toggleActive(c); }}
              className={`shrink-0 rounded-full px-2.5 py-1 text-[12px] font-medium transition-colors disabled:opacity-40 ${
                c.active ? "bg-emerald-50 text-emerald-700" : "bg-[var(--color-tile)] text-ink-soft"
              }`}
            >
              {c.active ? t("campaign.active") : t("campaign.inactive")}
            </button>

            <div className="flex shrink-0 gap-4">
              <button disabled={readOnly} onClick={(e) => { e.stopPropagation(); setEditing({ ...c }); }} className="inline-flex items-center gap-1.5 text-[12px] text-ink-soft hover:text-ink transition-colors disabled:opacity-40">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>
                {t("common.edit")}
              </button>
              <button disabled={readOnly} onClick={(e) => { e.stopPropagation(); remove(c); }} className="inline-flex items-center gap-1.5 text-[12px] text-[var(--color-accent)] hover:opacity-70 transition-colors disabled:opacity-40">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
                {t("common.delete")}
              </button>
            </div>
          </div>
        ))}

        {!loading && !campaigns.length && (
          <Card title=""><p className="py-10 text-center text-xs text-ink-soft">{t("common.none")}</p></Card>
        )}
      </div>

      {editing !== null && <EditModal draft={editing} onClose={() => setEditing(null)} onSave={save} />}
    </div>
  );
}

function EditModal({ draft, onClose, onSave }: { draft: Draft; onClose: () => void; onSave: (d: Draft) => Promise<void> }) {
  const { t } = useTranslation();
  const [f, setF] = useState(draft);
  const [saving, setSaving] = useState(false);
  const isNew = !f.id;

  const cats = useAsync(() => listCategories(), [], []);
  const garmentTypes = useAsync(() => listGarmentTypes(), [], []);
  const sources = useAsync(() => listSources(), [], []);
  const [giftQuery, setGiftQuery] = useState("");
  const giftHits = useAsync(() => listStyleNames(giftQuery), [giftQuery], []);

  const set = <K extends keyof Draft>(k: K, v: Draft[K]) => setF((p) => ({ ...p, [k]: v }));

  const scopeOptions = f.scope === "category" ? cats.data
    : f.scope === "garment_type" ? garmentTypes.data
    : f.scope === "source" ? sources.data
    : [];

  const toggleTarget = (id: string) => {
    set("target_ids", f.target_ids.includes(id) ? f.target_ids.filter((x) => x !== id) : [...f.target_ids, id]);
  };

  const toggleDay = (day: number) => {
    const days = f.valid_days ?? [];
    set("valid_days", days.includes(day) ? days.filter((d) => d !== day) : [...days, day].sort());
  };

  const giftName = giftHits.data.find((h: StyleNameHit) => h.id === f.gift_style_id)?.name;

  const canSave = f.name.trim().length > 0
    && (f.type !== "buy_x_get_y" || ((f.buy_qty ?? 0) > 0 && (f.get_qty ?? 0) > 0))
    && (f.type !== "free_gift" || !!f.gift_style_id);

  const submit = async () => {
    if (!canSave || saving) return;
    setSaving(true);
    try {
      await onSave(f);
    } catch {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/30" onClick={onClose} />
      <div className="relative z-10 flex max-h-[90vh] w-full max-w-xl flex-col overflow-hidden rounded-lg bg-[var(--color-bg)] shadow-2xl">
        <div className="overflow-y-auto p-6">
          <h2 className="mb-5 font-serif text-xl">{isNew ? t("campaign.new_title") : t("campaign.edit_title")}</h2>

          <div className="space-y-4">
            <Field label={t("campaign.f_name")}>
              <input value={f.name} onChange={(e) => set("name", e.target.value)} className="input mt-1" />
            </Field>

            <Field label={t("campaign.f_description")}>
              <input value={f.description} onChange={(e) => set("description", e.target.value)} className="input mt-1" />
            </Field>

            <Field label={t("campaign.f_type")}>
              <select value={f.type} onChange={(e) => set("type", e.target.value as CampaignType)} className="input mt-1">
                {TYPES.map((ty) => <option key={ty} value={ty}>{t(`campaign.type_${ty}`)}</option>)}
              </select>
            </Field>

            <div className="grid grid-cols-2 gap-3">
              <Field label={t("campaign.f_start")}>
                <input type="date" value={f.start_date ?? ""} onChange={(e) => set("start_date", e.target.value || null)} className="input mt-1" />
              </Field>
              <Field label={t("campaign.f_end")}>
                <input type="date" value={f.end_date ?? ""} onChange={(e) => set("end_date", e.target.value || null)} className="input mt-1" />
              </Field>
            </div>
            <p className="text-[11px] text-ink-soft">{t("campaign.f_no_limit")}</p>

            <Field label={t("campaign.f_valid_days")}>
              <div className="mt-1 flex flex-wrap gap-4">
                {[2, 3, 4, 5, 6, 7, 1].map((d) => (
                  <label key={d} className="flex cursor-pointer select-none items-center gap-1.5">
                    <input
                      type="checkbox"
                      checked={(f.valid_days ?? []).includes(d)}
                      onChange={() => toggleDay(d)}
                      className="h-3.5 w-3.5 rounded border edge accent-ink"
                    />
                    <span className="text-[12px]">{t(`campaign.day_${d}`)}</span>
                  </label>
                ))}
              </div>
            </Field>

            <div className="grid grid-cols-2 gap-3">
              <Field label={t("campaign.f_start_time")}>
                <input type="time" value={f.start_time ?? ""} onChange={(e) => set("start_time", e.target.value || null)} className="input mt-1" />
              </Field>
              <Field label={t("campaign.f_end_time")}>
                <input type="time" value={f.end_time ?? ""} onChange={(e) => set("end_time", e.target.value || null)} className="input mt-1" />
              </Field>
            </div>

            {f.type === "invoice_discount" && (
              <div className="pt-2">
                <p className="text-[12px] tracking-[0.1em] text-ink-soft mb-2">{t("campaign.f_scope")}</p>
                <div className="flex items-center gap-6">
                  <label className="flex cursor-pointer select-none items-center gap-2">
                    <input
                      type="radio"
                      name="exclude_promo"
                      checked={f.exclude_promotional_items}
                      onChange={() => set("exclude_promotional_items", true)}
                      className="h-4 w-4 accent-ink"
                    />
                    <span className="text-[13px]">{t("campaign.f_exclude_promotional_items")}</span>
                  </label>
                  <label className="flex cursor-pointer select-none items-center gap-2">
                    <input
                      type="radio"
                      name="exclude_promo"
                      checked={!f.exclude_promotional_items}
                      onChange={() => set("exclude_promotional_items", false)}
                      className="h-4 w-4 accent-ink"
                    />
                    <span className="text-[13px]">{t("campaign.f_all_items")}</span>
                  </label>
                </div>
              </div>
            )}

            {(f.type === "invoice_discount" || f.type === "item_discount") && (
              <>
                <div className="pt-2">
                  <p className="text-[12px] tracking-[0.1em] text-ink-soft mb-2">{t("campaign.f_discount_kind")}</p>
                  <div className="flex items-center gap-4">
                    {(["percent", "amount", "fixed_price"] as DiscountKind[]).map((k) => (
                      <label key={k} className="flex cursor-pointer select-none items-center gap-1.5">
                        <input
                          type="radio"
                          name="discount_kind"
                          checked={f.discount_kind === k || (!f.discount_kind && k === "percent")}
                          onChange={() => set("discount_kind", k)}
                          className="h-4 w-4 accent-ink"
                        />
                        <span className="text-[13px]">{t(`campaign.kind_${k}`)}</span>
                      </label>
                    ))}
                    <div className="ml-2 w-32">
                      <input
                        type="number"
                        min={0}
                        value={f.discount_value ?? ""}
                        onChange={(e) => set("discount_value", e.target.value === "" ? null : Number(e.target.value))}
                        placeholder="0"
                        className="input h-8 text-sm"
                      />
                    </div>
                  </div>
                </div>
                {f.type === "invoice_discount" && (
                  <Field label={t("campaign.f_min_subtotal")}>
                    <input type="number" min={0} value={f.min_subtotal ?? ""} onChange={(e) => set("min_subtotal", e.target.value === "" ? null : Number(e.target.value))} className="input mt-1" />
                  </Field>
                )}
              </>
            )}

            {(f.type === "item_discount" || f.type === "buy_x_get_y") && (
              <>
                <div className="pt-4">
                  <p className="text-[12px] tracking-[0.1em] text-ink-soft mb-2">{t("campaign.f_target_type")}</p>
                  <div className="flex items-center gap-6">
                    <label className="flex cursor-pointer select-none items-center gap-2">
                      <input
                        type="radio"
                        checked={f.scope !== "style" && f.scope !== "all"}
                        onChange={() => { set("scope", "category"); set("target_ids", []); }}
                        className="h-4 w-4 accent-ink"
                      />
                      <span className="text-[13px]">{t("campaign.f_target_group")}</span>
                    </label>
                    <label className="flex cursor-pointer select-none items-center gap-2">
                      <input
                        type="radio"
                        checked={f.scope === "style"}
                        onChange={() => { set("scope", "style"); set("target_ids", []); }}
                        className="h-4 w-4 accent-ink"
                      />
                      <span className="text-[13px]">{t("campaign.f_target_item")}</span>
                    </label>
                    <label className="flex cursor-pointer select-none items-center gap-2 ml-auto">
                      <input
                        type="radio"
                        checked={f.scope === "all"}
                        onChange={() => { set("scope", "all"); set("target_ids", []); }}
                        className="h-4 w-4 accent-ink"
                      />
                      <span className="text-[13px]">{t("campaign.scope_all")}</span>
                    </label>
                  </div>
                </div>

                {f.scope !== "style" && f.scope !== "all" && (
                  <div className="mt-2 w-48">
                    <select value={f.scope} onChange={(e) => { set("scope", e.target.value as CampaignScope); set("target_ids", []); }} className="input">
                      <option value="category">{t("campaign.scope_category")}</option>
                      <option value="garment_type">{t("campaign.scope_garment_type")}</option>
                      <option value="source">{t("campaign.scope_source")}</option>
                    </select>
                  </div>
                )}

                {f.scope !== "all" && (
                  <div className="mt-4">
                    <p className="text-[12px] tracking-[0.1em] text-ink-soft mb-1">{t("campaign.f_target_ids")}</p>
                    <div className="mb-3 flex max-h-32 flex-wrap gap-2 overflow-y-auto rounded-md border edge p-2">
                      {scopeOptions.map((o) => (
                        <button
                          key={o.id}
                          type="button"
                          onClick={() => toggleTarget(o.id)}
                          className={`rounded-full px-3 py-1 text-[12px] transition-colors ${
                            f.target_ids.includes(o.id) ? "bg-ink text-white" : "bg-[var(--color-tile)] text-ink-soft"
                          }`}
                        >
                          {o.label}
                        </button>
                      ))}
                      {!scopeOptions.length && <span className="text-[12px] text-ink-soft">{t("common.none")}</span>}
                    </div>

                    {f.target_ids.length > 0 && (
                      <div className="rounded-md border edge overflow-hidden mt-3">
                        <table className="w-full text-left text-[13px]">
                          <thead className="bg-[var(--color-tile)] text-[11px] uppercase tracking-wider text-ink-soft">
                            <tr>
                              <th className="px-4 py-2">{t("campaign.f_table_code")}</th>
                              <th className="px-4 py-2">{t("campaign.f_table_name")}</th>
                              <th className="px-4 py-2 w-32">{t("campaign.f_table_discount")}</th>
                              <th className="px-4 py-2 w-10"></th>
                            </tr>
                          </thead>
                          <tbody className="divide-y edge">
                            {f.target_ids.map((id) => {
                              const opt = scopeOptions.find(o => o.id === id);
                              return (
                                <tr key={id} className="hover:bg-black/5">
                                  <td className="px-4 py-2 font-mono text-xs">{id.slice(0, 8)}</td>
                                  <td className="px-4 py-2">{opt?.label ?? id}</td>
                                  <td className="px-4 py-2">
                                    {f.discount_value ?? 0} {f.discount_kind === "percent" ? "%" : "₫"}
                                  </td>
                                  <td className="px-4 py-2 text-right">
                                    <button type="button" onClick={() => toggleTarget(id)} className="text-[var(--color-accent)] hover:opacity-70 font-bold">
                                      ✕
                                    </button>
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                )}
              </>
            )}

            {f.type === "buy_x_get_y" && (
              <div className="grid grid-cols-2 gap-3">
                <Field label={t("campaign.f_buy_qty")}>
                  <input type="number" min={1} value={f.buy_qty ?? ""} onChange={(e) => set("buy_qty", e.target.value === "" ? null : Number(e.target.value))} className="input mt-1" />
                </Field>
                <Field label={t("campaign.f_get_qty")}>
                  <input type="number" min={1} value={f.get_qty ?? ""} onChange={(e) => set("get_qty", e.target.value === "" ? null : Number(e.target.value))} className="input mt-1" />
                </Field>
              </div>
            )}

            {f.type === "free_gift" && (
              <>
                <Field label={t("campaign.f_min_subtotal")}>
                  <input type="number" min={0} value={f.min_subtotal ?? ""} onChange={(e) => set("min_subtotal", e.target.value === "" ? null : Number(e.target.value))} className="input mt-1" />
                </Field>
                <Field label={t("campaign.f_gift_style")}>
                  <input
                    value={f.gift_style_id ? (giftName ?? f.gift_style_id) : giftQuery}
                    onChange={(e) => { setGiftQuery(e.target.value); set("gift_style_id", null); }}
                    placeholder="…"
                    className="input mt-1"
                  />
                  {giftQuery && !f.gift_style_id && (
                    <div className="mt-1 max-h-32 overflow-y-auto rounded-md border edge">
                      {giftHits.data.map((h: StyleNameHit) => (
                        <button
                          key={h.id}
                          type="button"
                          onClick={() => { set("gift_style_id", h.id); setGiftQuery(""); }}
                          className="block w-full px-3 py-2 text-left text-[13px] hover:bg-[var(--color-tile)]"
                        >
                          {h.name}
                        </button>
                      ))}
                      {!giftHits.data.length && <p className="px-3 py-2 text-[12px] text-ink-soft">{t("common.none")}</p>}
                    </div>
                  )}
                </Field>
              </>
            )}

            <label className="flex items-center gap-2 cursor-pointer select-none">
              <input type="checkbox" checked={f.active} onChange={(e) => set("active", e.target.checked)} className="h-4 w-4 rounded border edge accent-ink" />
              <span className="text-[12px]">{t("campaign.f_active")}</span>
            </label>
          </div>
        </div>

        <div className="flex justify-end gap-2 border-t edge p-4">
          <Btn variant="ghost" onClick={onClose}>{t("common.cancel")}</Btn>
          <Btn onClick={submit} disabled={!canSave || saving}>
            {saving ? t("common.saving") : isNew ? t("campaign.create") : t("common.save")}
          </Btn>
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

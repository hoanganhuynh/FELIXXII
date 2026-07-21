import { useState } from "react";
import { useTranslation } from "react-i18next";
import { listCustomers, segmentCounts, customerOrders, SEGMENTS, type CustomerRow } from "../api/customers";
import { getDashboardStats, EMPTY_STATS } from "../api/dashboard";
import { useAsync, useDebounced } from "../lib/useAsync";
import { Badge, Btn } from "../components/ui";
import { vnd, compactVnd, fmtDate } from "../lib/format";
import { Donut, CHART_PALETTE } from "../components/charts";

const PAGE = 20;

export default function AdminCustomers() {
  const { t } = useTranslation();
  const [q, setQ] = useState("");
  const dq = useDebounced(q, 250);
  const [seg, setSeg] = useState("");
  const [page, setPage] = useState(0);
  const [open, setOpen] = useState<CustomerRow | null>(null);

  const list = useAsync(
    () => listCustomers({ q: dq, segment: seg, page, pageSize: PAGE }),
    [dq, seg, page],
    { rows: [] as CustomerRow[], total: 0 }
  );
  const counts = useAsync(() => segmentCounts(), [], {} as Record<string, number>);
  // admin-gated RPC — swallow the denial so the page still renders its table
  const stats = useAsync(() => getDashboardStats().catch(() => EMPTY_STATS), [], EMPTY_STATS);

  const segData = SEGMENTS.map((s, i) => ({ label: s, value: counts.data[s] ?? 0, color: CHART_PALETTE[i] }));
  const vipShare = stats.data.total_ltv ? (stats.data.vip_ltv / stats.data.total_ltv) * 100 : 0;
  const pageCount = Math.ceil(list.data.total / PAGE);

  return (
    <div>
      <div className="mb-5">
        <h1 className="font-serif text-3xl">{t("customers")}</h1>
        <p className="mt-1 text-xs text-ink-soft">
          {list.loading ? t("common.loading") : t("cust.summary", { count: list.data.total, ltv: compactVnd(stats.data.total_ltv) })}
        </p>
      </div>

      {list.error && (
        <p className="mb-3 rounded-md bg-[var(--color-accent-soft)] px-4 py-2.5 text-xs text-[var(--color-accent)]">
          {list.error} — {t("cust.rls_note")}
        </p>
      )}

      <div className="mb-4 grid gap-4 lg:grid-cols-[1fr_2fr]">
        <div className="rounded-lg border edge bg-white/40 p-5">
          <p className="text-[12px] tracking-[0.12em] text-ink-soft">{t("cust.segments")}</p>
          <div className="mt-4"><Donut segments={segData} size={130} /></div>
        </div>
        <div className="rounded-lg border edge bg-[var(--color-accent-soft)] p-5">
          <p className="font-serif text-base">{t("cust.who_next")}</p>
          <p className="mt-1.5 text-xs leading-relaxed text-ink-soft">
            {t("cust.who_vip", { count: stats.data.vip_count, pct: vipShare.toFixed(0) })}{" "}
            {t("cust.who_risk", { count: counts.data["At-risk"] ?? 0 })}
          </p>
        </div>
      </div>

      <div className="mb-4 flex flex-wrap gap-2">
        <input value={q} onChange={(e) => { setQ(e.target.value); setPage(0); }} placeholder={t("cust.search")} className="input max-w-xs flex-1" />
        <select value={seg} onChange={(e) => { setSeg(e.target.value); setPage(0); }} className="input w-auto">
          <option value="">{t("cust.all_segments")}</option>
          {SEGMENTS.map((s) => <option key={s} value={s}>{t(`segment.${s}`)}</option>)}
        </select>
      </div>

      <div className="overflow-x-auto rounded-lg border edge bg-white/40">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b edge text-left text-[12px] tracking-[0.1em] text-ink-soft">
              <th className="px-4 py-2.5">{t("cust.col_customer")}</th><th className="px-2 py-2.5">{t("cust.col_city")}</th><th className="px-2 py-2.5">{t("cust.col_body")}</th>
              <th className="px-2 py-2.5 text-right">{t("cust.col_orders")}</th><th className="px-2 py-2.5 text-right">{t("cust.col_ltv")}</th><th className="px-2 py-2.5">{t("cust.col_segment")}</th>
            </tr>
          </thead>
          <tbody className={list.loading ? "opacity-40" : ""}>
            {list.data.rows.map((c) => (
              <tr key={c.id} onClick={() => setOpen(c)} className="cursor-pointer border-b edge last:border-0 hover:bg-[var(--color-tile)]/50">
                <td className="px-4 py-2.5"><p className="font-serif text-[15px]">{c.name}</p><p className="text-[12px] text-ink-soft">{c.email}</p></td>
                <td className="px-2 py-2.5 text-xs text-ink-soft">{c.city}</td>
                <td className="px-2 py-2.5 text-xs text-ink-soft">{c.body_type ? t(`body.${c.body_type}`) : "—"}</td>
                <td className="px-2 py-2.5 text-right text-xs tabular-nums">{c.orders_count}</td>
                <td className="px-2 py-2.5 text-right text-xs tabular-nums">{compactVnd(c.ltv)}</td>
                <td className="px-2 py-2.5"><Badge label={t(`segment.${c.segment}`)}>{c.segment}</Badge></td>
              </tr>
            ))}
            {!list.loading && !list.data.rows.length && (
              <tr><td colSpan={6} className="py-10 text-center text-xs text-ink-soft">{t("cust.hidden")}</td></tr>
            )}
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

      {open && <CustomerDrawer c={open} onClose={() => setOpen(null)} />}
    </div>
  );
}

function CustomerDrawer({ c, onClose }: { c: CustomerRow; onClose: () => void }) {
  const { t } = useTranslation();
  const orders = useAsync(() => customerOrders(c.id), [c.id], []);
  return (
    <>
      <div className="fixed inset-0 z-[60] bg-black/25" onClick={onClose} />
      <aside className="fixed right-0 top-0 z-[70] h-full w-full max-w-md overflow-y-auto bg-[var(--color-bg)] p-6 shadow-2xl">
        <button onClick={onClose} aria-label={t("common.close")} className="absolute right-5 top-5 hover:opacity-60">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4"><path d="M6 6l12 12M18 6L6 18" /></svg>
        </button>
        <h2 className="font-serif text-2xl">{c.name}</h2>
        <p className="mt-1 text-xs text-ink-soft">{c.email} · {c.city}</p>
        <div className="mt-3"><Badge label={t(`segment.${c.segment}`)}>{c.segment}</Badge></div>

        <div className="mt-6 grid grid-cols-3 gap-3 border-y edge py-4 text-center">
          <div><p className="text-[12px] tracking-[0.1em] text-ink-soft">{t("cust.orders")}</p><p className="mt-1 font-serif text-lg tabular-nums">{c.orders_count}</p></div>
          <div><p className="text-[12px] tracking-[0.1em] text-ink-soft">{t("cust.ltv")}</p><p className="mt-1 font-serif text-lg tabular-nums">{compactVnd(c.ltv)}</p></div>
          <div><p className="text-[12px] tracking-[0.1em] text-ink-soft">{t("cust.aov")}</p><p className="mt-1 font-serif text-lg tabular-nums">{compactVnd(c.orders_count ? c.ltv / c.orders_count : 0)}</p></div>
        </div>

        <p className="mt-5 text-[12px] tracking-[0.12em] text-ink-soft">{t("cust.body_profile")}</p>
        <p className="mt-1 text-sm">{c.body_type ? t(`body.${c.body_type}`) : "—"}</p>
        {c.bust && <p className="mt-1 text-xs text-ink-soft">{c.bust} / {c.waist} / {c.hip} cm</p>}
        <p className="mt-1 text-xs text-ink-soft">{t("cust.body_note")}</p>

        <p className="mt-6 text-[12px] tracking-[0.12em] text-ink-soft">{t("cust.recent")}</p>
        <ul className="mt-2 divide-y divide-[var(--color-line)] border-y edge">
          {orders.data.map((o) => (
            <li key={o.id} className="flex items-center justify-between py-2.5 text-xs">
              <div>
                <p className="font-mono text-[12px] text-ink-soft">{o.id} · {fmtDate(o.placed_at)}</p>
                <p>{o.order_items.map((i) => i.name).join(", ")}</p>
              </div>
              <div className="text-right"><p className="tabular-nums">{vnd(o.total)}</p><Badge label={t(`status.${o.status}`)}>{o.status}</Badge></div>
            </li>
          ))}
          {!orders.loading && !orders.data.length && <li className="py-4 text-center text-xs text-ink-soft">{t("cust.no_orders")}</li>}
        </ul>
      </aside>
    </>
  );
}

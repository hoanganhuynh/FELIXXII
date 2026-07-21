import { useState } from "react";
import { useTranslation } from "react-i18next";
import {
  listOrders, getOrderItems, setOrderStatus, getOrderStats,
  type OrderListRow, type OrderStatus, type OrderChannel, type ReturnReason,
} from "../api/orders";
import { useAsync, useDebounced } from "../lib/useAsync";
import { Badge, Btn, Card } from "../components/ui";
import { vnd, compactVnd, fmtDate } from "../lib/format";

const STATUSES: OrderStatus[] = ["Pending", "Processing", "Shipped", "Delivered", "Returned", "Cancelled"];
const CHANNELS: OrderChannel[] = ["Web", "Boutique", "Instagram", "Wholesale"];
const RETURN_REASONS: ReturnReason[] = ["defect", "wrong_size", "changed_mind", "wrong_shipment", "other"];
const PAGE = 20;

export default function AdminOrders() {
  const { t } = useTranslation();
  const [q, setQ] = useState("");
  const dq = useDebounced(q, 250);
  const [status, setStatus] = useState("");
  const [channel, setChannel] = useState("");
  const [page, setPage] = useState(0);
  const [open, setOpen] = useState<OrderListRow | null>(null);

  const stats = useAsync(() => getOrderStats(), [], { revenue: 0, count: 0, pending: 0, aov: 0 });
  const list = useAsync(
    () => listOrders({ q: dq, status, channel, page, pageSize: PAGE }),
    [dq, status, channel, page],
    { rows: [] as OrderListRow[], total: 0 }
  );

  const pageCount = Math.ceil(list.data.total / PAGE);

  return (
    <div>
      <div className="mb-5">
        <h1 className="font-serif text-3xl">{t("orders")}</h1>
        <p className="mt-1 text-xs text-ink-soft">
          {list.loading ? t("common.loading") : t("ord.matched", { count: list.data.total, pending: stats.data.pending })}
        </p>
      </div>

      {list.error && <p className="mb-3 rounded-md bg-[var(--color-accent-soft)] px-4 py-2.5 text-xs text-[var(--color-accent)]">{list.error}</p>}

      <div className="mb-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Mini k={t("ord.net_revenue")} v={compactVnd(stats.data.revenue)} />
        <Mini k={t("ord.orders")} v={String(stats.data.count)} />
        <Mini k={t("ord.aov")} v={compactVnd(stats.data.aov)} />
        <Mini k={t("ord.to_fulfil")} v={String(stats.data.pending)} accent />
      </div>

      <div className="mb-4 flex flex-wrap gap-2">
        <input value={q} onChange={(e) => { setQ(e.target.value); setPage(0); }} placeholder={t("ord.search")} className="input max-w-xs flex-1" />
        <select value={status} onChange={(e) => { setStatus(e.target.value); setPage(0); }} className="input w-auto">
          <option value="">{t("ord.all_statuses")}</option>
          {STATUSES.map((s) => <option key={s} value={s}>{t(`status.${s}`)}</option>)}
        </select>
        <select value={channel} onChange={(e) => { setChannel(e.target.value); setPage(0); }} className="input w-auto">
          <option value="">{t("ord.all_channels")}</option>
          {CHANNELS.map((c) => <option key={c} value={c}>{t(`channel.${c}`)}</option>)}
        </select>
      </div>

      <div className="overflow-x-auto rounded-lg border edge bg-white/40">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b edge text-left text-[12px] tracking-[0.1em] text-ink-soft">
              <th className="px-4 py-2.5">{t("ord.col_order")}</th><th className="px-2 py-2.5">{t("ord.col_date")}</th><th className="px-2 py-2.5">{t("ord.col_customer")}</th>
              <th className="px-2 py-2.5">{t("ord.col_channel")}</th><th className="px-2 py-2.5 text-right">{t("ord.col_items")}</th>
              <th className="px-2 py-2.5 text-right">{t("ord.col_total")}</th><th className="px-2 py-2.5">{t("ord.col_status")}</th>
            </tr>
          </thead>
          <tbody className={list.loading ? "opacity-40" : ""}>
            {list.data.rows.map((o) => (
              <tr key={o.id} onClick={() => setOpen(o)} className="cursor-pointer border-b edge last:border-0 hover:bg-[var(--color-tile)]/50">
                <td className="px-4 py-2.5 font-mono text-[12px]">{o.id}</td>
                <td className="px-2 py-2.5 text-xs text-ink-soft">{fmtDate(o.placed_at)}</td>
                <td className="px-2 py-2.5 text-xs">{o.customers?.name}<span className="ml-1.5 text-ink-soft">· {o.city}</span></td>
                <td className="px-2 py-2.5 text-xs text-ink-soft">{t(`channel.${o.channel}`)}</td>
                <td className="px-2 py-2.5 text-right text-xs tabular-nums">{o.order_items.reduce((n, i) => n + i.qty, 0)}</td>
                <td className="px-2 py-2.5 text-right text-xs tabular-nums">{vnd(o.total)}</td>
                <td className="px-2 py-2.5"><Badge label={t(`status.${o.status}`)}>{o.status}</Badge></td>
              </tr>
            ))}
            {!list.loading && !list.data.rows.length && <tr><td colSpan={7} className="py-10 text-center text-xs text-ink-soft">{t("ord.no_match")}</td></tr>}
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

      {open && (
        <OrderDrawer
          order={open}
          onClose={() => setOpen(null)}
          onStatus={async (s, reason, note) => {
            try {
              await setOrderStatus(open.id, s, reason, note);
              setOpen({
                ...open, status: s,
                return_reason: s === "Returned" ? (reason ?? null) : null,
                return_note: s === "Returned" ? (note?.trim() || null) : null,
              });
              list.reload();
              stats.reload();
            } catch (e) {
              alert(e instanceof Error ? e.message : String(e));
            }
          }}
        />
      )}
    </div>
  );
}

function Mini({ k, v, accent }: { k: string; v: string; accent?: boolean }) {
  return (
    <div className={`rounded-lg border edge px-4 py-3 ${accent ? "bg-[var(--color-accent-soft)]" : "bg-white/40"}`}>
      <p className="text-[12px] tracking-[0.1em] text-ink-soft">{k.toUpperCase()}</p>
      <p className="mt-1 font-serif text-xl tabular-nums">{v}</p>
    </div>
  );
}

function OrderDrawer({ order, onClose, onStatus }: {
  order: OrderListRow; onClose: () => void;
  onStatus: (s: OrderStatus, reason?: ReturnReason, note?: string) => void;
}) {
  const { t } = useTranslation();
  const items = useAsync(() => getOrderItems(order.id), [order.id], []);
  const [pendingReturn, setPendingReturn] = useState(false);
  const [reason, setReason] = useState<ReturnReason | "">("");
  const [note, setNote] = useState("");
  return (
    <>
      <div className="fixed inset-0 z-[60] bg-black/25" onClick={onClose} />
      <aside className="fixed right-0 top-0 z-[70] h-full w-full max-w-md overflow-y-auto bg-[var(--color-bg)] shadow-2xl">
        <header className="flex items-start justify-between border-b edge px-6 py-5">
          <div>
            <p className="font-mono text-xs text-ink-soft">{order.id}</p>
            <h2 className="mt-1 font-serif text-xl">{order.customers?.name}</h2>
            <p className="mt-0.5 text-xs text-ink-soft">{fmtDate(order.placed_at)} · {t(`channel.${order.channel}`)} · {order.city}</p>
          </div>
          <button onClick={onClose} aria-label={t("common.close")} className="text-ink hover:opacity-60">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4"><path d="M6 6l12 12M18 6L6 18" /></svg>
          </button>
        </header>

        <div className="px-6 py-5">
          <Card title={t("ord.status")}>
            <div className="flex flex-wrap gap-1.5 p-4">
              {STATUSES.map((s) => (
                <button
                  key={s}
                  onClick={() => {
                    if (s === "Returned" && order.status !== "Returned") setPendingReturn(true);
                    else onStatus(s);
                  }}
                  className={`rounded-full border px-3 py-1 text-[12px] transition-colors ${order.status === s ? "border-ink bg-ink text-white" : "edge hover:bg-[var(--color-tile)]"}`}
                >
                  {t(`status.${s}`)}
                </button>
              ))}
            </div>
            {pendingReturn && (
              <div className="space-y-2 border-t edge p-4">
                <select className="input" value={reason} onChange={(e) => setReason(e.target.value as ReturnReason)}>
                  <option value="">{t("ord.return_reason_placeholder")}</option>
                  {RETURN_REASONS.map((r) => <option key={r} value={r}>{t(`ord.reason.${r}`)}</option>)}
                </select>
                <textarea
                  className="input h-16 resize-none py-2"
                  placeholder={t("ord.return_note_placeholder")}
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                />
                <div className="flex justify-end gap-2">
                  <Btn variant="ghost" onClick={() => { setPendingReturn(false); setReason(""); setNote(""); }}>{t("common.cancel")}</Btn>
                  <Btn
                    disabled={!reason}
                    onClick={() => {
                      onStatus("Returned", reason as ReturnReason, note);
                      setPendingReturn(false);
                      setReason("");
                      setNote("");
                    }}
                  >
                    {t("common.save")}
                  </Btn>
                </div>
              </div>
            )}
            {order.status === "Returned" && order.return_reason && (
              <p className="border-t edge px-4 py-3 text-xs text-ink-soft">
                {t("ord.return_reason_label")}: {t(`ord.reason.${order.return_reason}`)}
                {order.return_note && <span> — {order.return_note}</span>}
              </p>
            )}
          </Card>

          <h3 className="mt-6 text-[12px] tracking-[0.12em] text-ink-soft">{t("ord.items")}</h3>
          <ul className="mt-2 divide-y divide-[var(--color-line)] border-y edge">
            {items.data.map((i) => {
              const image = i.variants?.styles?.images?.[0];
              return (
                <li key={i.id} className="flex items-start justify-between gap-3 py-3">
                  {image ? (
                    <img src={image} alt="" className="h-10 w-10 shrink-0 rounded object-cover object-top bg-[var(--color-tile)]" />
                  ) : (
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded bg-[var(--color-tile)] text-ink-soft opacity-50">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="2" /><circle cx="8.5" cy="8.5" r="1.5" /><path d="M21 15l-5-5L5 21" /></svg>
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="font-serif text-sm">{i.name}</p>
                    <p className="font-mono text-[12px] text-ink-soft">{i.sku}</p>
                    <p className="text-[12px] text-ink-soft">{i.size} / {i.color} × {i.qty}</p>
                  </div>
                  <span className="shrink-0 text-xs tabular-nums">{vnd(i.price * i.qty)}</span>
                </li>
              );
            })}
            {items.loading && <li className="py-4 text-center text-xs text-ink-soft">{t("common.loading")}</li>}
          </ul>

          <dl className="mt-4 space-y-1.5 text-xs">
            <div className="flex justify-between text-ink-soft"><dt>{t("ord.subtotal")}</dt><dd className="tabular-nums">{vnd(order.total)}</dd></div>
            <div className="flex justify-between text-ink-soft"><dt>{t("ord.shipping")}</dt><dd>{t("ord.free")}</dd></div>
            <div className="flex justify-between border-t edge pt-2 font-serif text-base"><dt>{t("ord.total")}</dt><dd className="tabular-nums">{vnd(order.total)}</dd></div>
          </dl>
        </div>
      </aside>
    </>
  );
}

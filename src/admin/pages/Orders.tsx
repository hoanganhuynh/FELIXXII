import { useState } from "react";
import {
  listOrders, getOrderItems, setOrderStatus, getOrderStats,
  type OrderListRow, type OrderStatus, type OrderChannel,
} from "../api/orders";
import { useAsync, useDebounced } from "../lib/useAsync";
import { Badge, Btn, Card } from "../components/ui";
import { vnd, compactVnd, fmtDate } from "../lib/format";

const STATUSES: OrderStatus[] = ["Pending", "Processing", "Shipped", "Delivered", "Returned", "Cancelled"];
const CHANNELS: OrderChannel[] = ["Web", "Boutique", "Instagram", "Wholesale"];
const PAGE = 20;

export default function AdminOrders() {
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
        <h1 className="font-serif text-3xl">Orders</h1>
        <p className="mt-1 text-xs text-ink-soft">
          {list.loading ? "Loading…" : `${list.data.total} orders match · ${stats.data.pending} awaiting fulfilment`}
        </p>
      </div>

      {list.error && <p className="mb-3 rounded-md bg-[var(--color-accent-soft)] px-4 py-2.5 text-xs text-[var(--color-accent)]">{list.error}</p>}

      <div className="mb-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Mini k="Net revenue" v={compactVnd(stats.data.revenue)} />
        <Mini k="Orders" v={String(stats.data.count)} />
        <Mini k="AOV" v={compactVnd(stats.data.aov)} />
        <Mini k="To fulfil" v={String(stats.data.pending)} accent />
      </div>

      <div className="mb-4 flex flex-wrap gap-2">
        <input value={q} onChange={(e) => { setQ(e.target.value); setPage(0); }} placeholder="Search order #…" className="input max-w-xs flex-1" />
        <select value={status} onChange={(e) => { setStatus(e.target.value); setPage(0); }} className="input w-auto">
          <option value="">All statuses</option>
          {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
        <select value={channel} onChange={(e) => { setChannel(e.target.value); setPage(0); }} className="input w-auto">
          <option value="">All channels</option>
          {CHANNELS.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
      </div>

      <div className="overflow-x-auto rounded-lg border edge bg-white/40">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b edge text-left text-[10px] tracking-[0.1em] text-ink-soft">
              <th className="px-4 py-2.5">ORDER</th><th className="px-2 py-2.5">DATE</th><th className="px-2 py-2.5">CUSTOMER</th>
              <th className="px-2 py-2.5">CHANNEL</th><th className="px-2 py-2.5 text-right">ITEMS</th>
              <th className="px-2 py-2.5 text-right">TOTAL</th><th className="px-2 py-2.5">STATUS</th>
            </tr>
          </thead>
          <tbody className={list.loading ? "opacity-40" : ""}>
            {list.data.rows.map((o) => (
              <tr key={o.id} onClick={() => setOpen(o)} className="cursor-pointer border-b edge last:border-0 hover:bg-[var(--color-tile)]/50">
                <td className="px-4 py-2.5 font-mono text-[11px]">{o.id}</td>
                <td className="px-2 py-2.5 text-xs text-ink-soft">{fmtDate(o.placed_at)}</td>
                <td className="px-2 py-2.5 text-xs">{o.customers?.name}<span className="ml-1.5 text-ink-soft">· {o.city}</span></td>
                <td className="px-2 py-2.5 text-xs text-ink-soft">{o.channel}</td>
                <td className="px-2 py-2.5 text-right text-xs tabular-nums">{o.order_items.reduce((n, i) => n + i.qty, 0)}</td>
                <td className="px-2 py-2.5 text-right text-xs tabular-nums">{vnd(o.total)}</td>
                <td className="px-2 py-2.5"><Badge>{o.status}</Badge></td>
              </tr>
            ))}
            {!list.loading && !list.data.rows.length && <tr><td colSpan={7} className="py-10 text-center text-xs text-ink-soft">No orders match.</td></tr>}
          </tbody>
        </table>
      </div>

      {pageCount > 1 && (
        <div className="mt-4 flex items-center justify-between text-xs text-ink-soft">
          <span>Page {page + 1} / {pageCount}</span>
          <div className="flex gap-2">
            <Btn variant="ghost" onClick={() => setPage((p) => Math.max(0, p - 1))} disabled={page === 0}>Prev</Btn>
            <Btn variant="ghost" onClick={() => setPage((p) => Math.min(pageCount - 1, p + 1))} disabled={page >= pageCount - 1}>Next</Btn>
          </div>
        </div>
      )}

      {open && (
        <OrderDrawer
          order={open}
          onClose={() => setOpen(null)}
          onStatus={async (s) => {
            try {
              await setOrderStatus(open.id, s);
              setOpen({ ...open, status: s });
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
      <p className="text-[10px] tracking-[0.1em] text-ink-soft">{k.toUpperCase()}</p>
      <p className="mt-1 font-serif text-xl tabular-nums">{v}</p>
    </div>
  );
}

function OrderDrawer({ order, onClose, onStatus }: {
  order: OrderListRow; onClose: () => void; onStatus: (s: OrderStatus) => void;
}) {
  const items = useAsync(() => getOrderItems(order.id), [order.id], []);
  return (
    <>
      <div className="fixed inset-0 z-[60] bg-black/25" onClick={onClose} />
      <aside className="fixed right-0 top-0 z-[70] h-full w-full max-w-md overflow-y-auto bg-[var(--color-bg)] shadow-2xl">
        <header className="flex items-start justify-between border-b edge px-6 py-5">
          <div>
            <p className="font-mono text-xs text-ink-soft">{order.id}</p>
            <h2 className="mt-1 font-serif text-xl">{order.customers?.name}</h2>
            <p className="mt-0.5 text-xs text-ink-soft">{fmtDate(order.placed_at)} · {order.channel} · {order.city}</p>
          </div>
          <button onClick={onClose} aria-label="Close" className="text-ink hover:opacity-60">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4"><path d="M6 6l12 12M18 6L6 18" /></svg>
          </button>
        </header>

        <div className="px-6 py-5">
          <Card title="Status">
            <div className="flex flex-wrap gap-1.5 p-4">
              {STATUSES.map((s) => (
                <button key={s} onClick={() => onStatus(s)} className={`rounded-full border px-3 py-1 text-[11px] transition-colors ${order.status === s ? "border-ink bg-ink text-white" : "edge hover:bg-[var(--color-tile)]"}`}>{s}</button>
              ))}
            </div>
          </Card>

          <h3 className="mt-6 text-[11px] tracking-[0.12em] text-ink-soft">ITEMS</h3>
          <ul className="mt-2 divide-y divide-[var(--color-line)] border-y edge">
            {items.data.map((i) => (
              <li key={i.id} className="flex items-start justify-between gap-3 py-3">
                <div className="min-w-0">
                  <p className="font-serif text-sm">{i.name}</p>
                  <p className="font-mono text-[10px] text-ink-soft">{i.sku}</p>
                  <p className="text-[11px] text-ink-soft">{i.size} / {i.color} × {i.qty}</p>
                </div>
                <span className="shrink-0 text-xs tabular-nums">{vnd(i.price * i.qty)}</span>
              </li>
            ))}
            {items.loading && <li className="py-4 text-center text-xs text-ink-soft">Loading…</li>}
          </ul>

          <dl className="mt-4 space-y-1.5 text-xs">
            <div className="flex justify-between text-ink-soft"><dt>Subtotal</dt><dd className="tabular-nums">{vnd(order.total)}</dd></div>
            <div className="flex justify-between text-ink-soft"><dt>Shipping</dt><dd>FREE</dd></div>
            <div className="flex justify-between border-t edge pt-2 font-serif text-base"><dt>Total</dt><dd className="tabular-nums">{vnd(order.total)}</dd></div>
          </dl>
        </div>
      </aside>
    </>
  );
}

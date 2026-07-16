import { useMemo, useState } from "react";
import { useAdmin } from "../store/adminData";
import { Badge, Btn, Card } from "../components/ui";
import { vnd, compactVnd, fmtDate } from "../lib/format";
import type { Order } from "../data/generate";

const STATUSES: Order["status"][] = ["Pending", "Processing", "Shipped", "Delivered", "Returned", "Cancelled"];
const CHANNELS: Order["channel"][] = ["Web", "Boutique", "Instagram", "Wholesale"];
const PAGE = 20;

export default function AdminOrders() {
  const { orders, setOrderStatus } = useAdmin();
  const [q, setQ] = useState("");
  const [status, setStatus] = useState<Order["status"] | "">("");
  const [channel, setChannel] = useState<Order["channel"] | "">("");
  const [page, setPage] = useState(0);
  const [open, setOpen] = useState<Order | null>(null);

  const filtered = useMemo(() => {
    const nq = q.trim().toLowerCase();
    return orders.filter((o) => {
      if (status && o.status !== status) return false;
      if (channel && o.channel !== channel) return false;
      if (nq && !(
        o.id.toLowerCase().includes(nq) ||
        o.customerName.toLowerCase().includes(nq) ||
        o.items.some((i) => i.sku.toLowerCase().includes(nq))
      )) return false;
      return true;
    });
  }, [orders, q, status, channel]);

  const stats = useMemo(() => {
    const paid = filtered.filter((o) => o.status !== "Cancelled" && o.status !== "Returned");
    return {
      revenue: paid.reduce((n, o) => n + o.total, 0),
      count: filtered.length,
      pending: filtered.filter((o) => o.status === "Pending" || o.status === "Processing").length,
      aov: paid.length ? paid.reduce((n, o) => n + o.total, 0) / paid.length : 0,
    };
  }, [filtered]);

  const pageCount = Math.ceil(filtered.length / PAGE);
  const items = filtered.slice(page * PAGE, page * PAGE + PAGE);

  return (
    <div>
      <div className="mb-5">
        <h1 className="font-serif text-3xl">Orders</h1>
        <p className="mt-1 text-xs text-ink-soft">{filtered.length} orders · {compactVnd(stats.revenue)} net revenue · {stats.pending} awaiting fulfilment</p>
      </div>

      <div className="mb-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Mini k="Net revenue" v={compactVnd(stats.revenue)} />
        <Mini k="Orders" v={String(stats.count)} />
        <Mini k="AOV" v={compactVnd(stats.aov)} />
        <Mini k="To fulfil" v={String(stats.pending)} accent />
      </div>

      <div className="mb-4 flex flex-wrap gap-2">
        <input value={q} onChange={(e) => { setQ(e.target.value); setPage(0); }} placeholder="Search order #, customer, SKU…" className="input max-w-xs flex-1" />
        <select value={status} onChange={(e) => { setStatus(e.target.value as Order["status"] | ""); setPage(0); }} className="input w-auto">
          <option value="">All statuses</option>
          {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
        <select value={channel} onChange={(e) => { setChannel(e.target.value as Order["channel"] | ""); setPage(0); }} className="input w-auto">
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
          <tbody>
            {items.map((o) => (
              <tr key={o.id} onClick={() => setOpen(o)} className="cursor-pointer border-b edge last:border-0 hover:bg-[var(--color-tile)]/50">
                <td className="px-4 py-2.5 font-mono text-[11px]">{o.id}</td>
                <td className="px-2 py-2.5 text-xs text-ink-soft">{fmtDate(o.date)}</td>
                <td className="px-2 py-2.5 text-xs">{o.customerName}<span className="ml-1.5 text-ink-soft">· {o.city}</span></td>
                <td className="px-2 py-2.5 text-xs text-ink-soft">{o.channel}</td>
                <td className="px-2 py-2.5 text-right tabular-nums text-xs">{o.items.reduce((n, i) => n + i.qty, 0)}</td>
                <td className="px-2 py-2.5 text-right tabular-nums text-xs">{vnd(o.total)}</td>
                <td className="px-2 py-2.5"><Badge>{o.status}</Badge></td>
              </tr>
            ))}
            {!items.length && <tr><td colSpan={7} className="py-10 text-center text-xs text-ink-soft">No orders match.</td></tr>}
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

      {open && <OrderDrawer order={orders.find((o) => o.id === open.id) ?? open} onClose={() => setOpen(null)} onStatus={(s) => setOrderStatus(open.id, s)} />}
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

function OrderDrawer({ order, onClose, onStatus }: { order: Order; onClose: () => void; onStatus: (s: Order["status"]) => void }) {
  return (
    <>
      <div className="fixed inset-0 z-[60] bg-black/25" onClick={onClose} />
      <aside className="fixed right-0 top-0 z-[70] h-full w-full max-w-md overflow-y-auto bg-[var(--color-bg)] shadow-2xl">
        <header className="flex items-start justify-between border-b edge px-6 py-5">
          <div>
            <p className="font-mono text-xs text-ink-soft">{order.id}</p>
            <h2 className="mt-1 font-serif text-xl">{order.customerName}</h2>
            <p className="mt-0.5 text-xs text-ink-soft">{fmtDate(order.date)} · {order.channel} · {order.city}</p>
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
            {order.items.map((i, idx) => (
              <li key={idx} className="flex items-start justify-between gap-3 py-3">
                <div className="min-w-0">
                  <p className="font-serif text-sm">{i.styleName}</p>
                  <p className="font-mono text-[10px] text-ink-soft">{i.sku}</p>
                  <p className="text-[11px] text-ink-soft">{i.size} / {i.color} × {i.qty}</p>
                </div>
                <span className="shrink-0 text-xs tabular-nums">{vnd(i.price * i.qty)}</span>
              </li>
            ))}
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

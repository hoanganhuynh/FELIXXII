import { useMemo, useState } from "react";
import { useAdmin } from "../store/adminData";
import { Badge, Btn } from "../components/ui";
import { vnd, compactVnd } from "../lib/format";
import { Donut, CHART_PALETTE } from "../components/charts";
import type { Customer } from "../data/generate";

const SEGMENTS: Customer["segment"][] = ["VIP", "Loyal", "Regular", "New", "At-risk"];
const PAGE = 20;

export default function AdminCustomers() {
  const { customers, orders } = useAdmin();
  const [q, setQ] = useState("");
  const [seg, setSeg] = useState<Customer["segment"] | "">("");
  const [page, setPage] = useState(0);
  const [open, setOpen] = useState<Customer | null>(null);

  const filtered = useMemo(() => {
    const nq = q.trim().toLowerCase();
    return customers
      .filter((c) => (!seg || c.segment === seg) && (!nq || c.name.toLowerCase().includes(nq) || c.email.includes(nq)))
      .sort((a, b) => b.ltv - a.ltv);
  }, [customers, q, seg]);

  const segData = useMemo(
    () => SEGMENTS.map((s, i) => ({ label: s, value: customers.filter((c) => c.segment === s).length, color: CHART_PALETTE[i] })),
    [customers]
  );
  const totalLtv = customers.reduce((n, c) => n + c.ltv, 0);
  const pageCount = Math.ceil(filtered.length / PAGE);
  const items = filtered.slice(page * PAGE, page * PAGE + PAGE);

  return (
    <div>
      <div className="mb-5">
        <h1 className="font-serif text-3xl">Customers</h1>
        <p className="mt-1 text-xs text-ink-soft">{customers.length} customers · {compactVnd(totalLtv)} lifetime value</p>
      </div>

      <div className="mb-4 grid gap-4 lg:grid-cols-[1fr_2fr]">
        <div className="rounded-lg border edge bg-white/40 p-5">
          <p className="text-[10px] tracking-[0.12em] text-ink-soft">SEGMENTS</p>
          <div className="mt-4"><Donut segments={segData} size={130} /></div>
        </div>
        <div className="rounded-lg border edge bg-[var(--color-accent-soft)] p-5">
          <p className="font-serif text-base">Who to talk to next</p>
          <p className="mt-1.5 text-xs leading-relaxed text-ink-soft">
            <b>{segData[0].value} VIPs</b> hold {((customers.filter((c) => c.segment === "VIP").reduce((n, c) => n + c.ltv, 0) / totalLtv) * 100).toFixed(0)}% of total LTV — give them the SS26 preview first.
            <b> {segData[4].value} at-risk</b> customers haven't reordered; a bridal fitting invite converts best for this group.
          </p>
        </div>
      </div>

      <div className="mb-4 flex flex-wrap gap-2">
        <input value={q} onChange={(e) => { setQ(e.target.value); setPage(0); }} placeholder="Search name or email…" className="input max-w-xs flex-1" />
        <select value={seg} onChange={(e) => { setSeg(e.target.value as Customer["segment"] | ""); setPage(0); }} className="input w-auto">
          <option value="">All segments</option>
          {SEGMENTS.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
      </div>

      <div className="overflow-x-auto rounded-lg border edge bg-white/40">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b edge text-left text-[10px] tracking-[0.1em] text-ink-soft">
              <th className="px-4 py-2.5">CUSTOMER</th><th className="px-2 py-2.5">CITY</th><th className="px-2 py-2.5">BODY TYPE</th>
              <th className="px-2 py-2.5 text-right">ORDERS</th><th className="px-2 py-2.5 text-right">LTV</th><th className="px-2 py-2.5">SEGMENT</th>
            </tr>
          </thead>
          <tbody>
            {items.map((c) => (
              <tr key={c.id} onClick={() => setOpen(c)} className="cursor-pointer border-b edge last:border-0 hover:bg-[var(--color-tile)]/50">
                <td className="px-4 py-2.5"><p className="font-serif text-[15px]">{c.name}</p><p className="text-[10px] text-ink-soft">{c.email}</p></td>
                <td className="px-2 py-2.5 text-xs text-ink-soft">{c.city}</td>
                <td className="px-2 py-2.5 text-xs capitalize text-ink-soft">{c.bodyType.replace("-", " ")}</td>
                <td className="px-2 py-2.5 text-right tabular-nums text-xs">{c.orders}</td>
                <td className="px-2 py-2.5 text-right tabular-nums text-xs">{compactVnd(c.ltv)}</td>
                <td className="px-2 py-2.5"><Badge>{c.segment}</Badge></td>
              </tr>
            ))}
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
        <>
          <div className="fixed inset-0 z-[60] bg-black/25" onClick={() => setOpen(null)} />
          <aside className="fixed right-0 top-0 z-[70] h-full w-full max-w-md overflow-y-auto bg-[var(--color-bg)] p-6 shadow-2xl">
            <button onClick={() => setOpen(null)} aria-label="Close" className="absolute right-5 top-5 hover:opacity-60">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4"><path d="M6 6l12 12M18 6L6 18" /></svg>
            </button>
            <h2 className="font-serif text-2xl">{open.name}</h2>
            <p className="mt-1 text-xs text-ink-soft">{open.email} · {open.city}</p>
            <div className="mt-3"><Badge>{open.segment}</Badge></div>

            <div className="mt-6 grid grid-cols-3 gap-3 border-y edge py-4 text-center">
              <div><p className="text-[10px] tracking-[0.1em] text-ink-soft">ORDERS</p><p className="mt-1 font-serif text-lg tabular-nums">{open.orders}</p></div>
              <div><p className="text-[10px] tracking-[0.1em] text-ink-soft">LTV</p><p className="mt-1 font-serif text-lg tabular-nums">{compactVnd(open.ltv)}</p></div>
              <div><p className="text-[10px] tracking-[0.1em] text-ink-soft">AOV</p><p className="mt-1 font-serif text-lg tabular-nums">{compactVnd(open.ltv / open.orders)}</p></div>
            </div>

            <p className="mt-5 text-[11px] tracking-[0.12em] text-ink-soft">BODY PROFILE</p>
            <p className="mt-1 text-sm capitalize">{open.bodyType.replace("-", " ")}</p>
            <p className="mt-1 text-xs text-ink-soft">Size recommendations on the storefront are driven by this profile.</p>

            <p className="mt-6 text-[11px] tracking-[0.12em] text-ink-soft">RECENT ORDERS</p>
            <ul className="mt-2 divide-y divide-[var(--color-line)] border-y edge">
              {orders.filter((o) => o.customerId === open.id).slice(0, 5).map((o) => (
                <li key={o.id} className="flex items-center justify-between py-2.5 text-xs">
                  <div><p className="font-mono text-[10px] text-ink-soft">{o.id}</p><p>{o.items.map((i) => i.styleName).join(", ")}</p></div>
                  <div className="text-right"><p className="tabular-nums">{vnd(o.total)}</p><Badge>{o.status}</Badge></div>
                </li>
              ))}
              {!orders.some((o) => o.customerId === open.id) && <li className="py-4 text-center text-xs text-ink-soft">No orders in this demo slice.</li>}
            </ul>
          </aside>
        </>
      )}
    </div>
  );
}

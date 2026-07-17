import { Link } from "react-router-dom";
import { getDashboardStats, EMPTY_STATS } from "../api/dashboard";
import { useAsync } from "../lib/useAsync";
import { useAuth } from "../../store/auth";
import { Stat, Card, Badge } from "../components/ui";
import { AreaChart, BarList, Donut, CHART_PALETTE } from "../components/charts";
import { compactVnd, compact } from "../lib/format";

export default function Dashboard() {
  const { isAdmin, ready, setLoginOpen } = useAuth();
  const { data: m, loading, error } = useAsync(
    () => (isAdmin ? getDashboardStats() : Promise.resolve(EMPTY_STATS)),
    [isAdmin],
    EMPTY_STATS
  );

  const bridal = m.by_category.find((c) => c.id === "dam-bridal")?.value ?? 0;
  const vipShare = m.total_ltv ? (m.vip_ltv / m.total_ltv) * 100 : 0;

  // Revenue, AOV and LTV are business data. Rather than render a dashboard of
  // zeros (which reads as broken), say plainly that it needs an admin session.
  if (ready && !isAdmin) {
    return (
      <div>
        <h1 className="font-serif text-3xl">Dashboard</h1>
        <div className="mt-8 rounded-lg border edge bg-white/40 px-6 py-16 text-center">
          <p className="font-serif text-xl">Sales analytics are admin-only</p>
          <p className="mx-auto mt-2 max-w-md text-xs leading-relaxed text-ink-soft">
            Revenue, AOV and customer lifetime value are gated behind the admin role in
            Postgres, so an anonymous session cannot read them. Sign in to view.
          </p>
          <button onClick={() => setLoginOpen(true)} className="mt-6 h-10 rounded-md bg-ink px-6 text-[11px] tracking-[0.1em] text-white transition-opacity hover:opacity-85">
            SIGN IN AS ADMIN
          </button>
          <p className="mt-4 font-mono text-[10px] text-ink-soft">admin@felixxii.local · admin123456</p>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6 flex items-end justify-between">
        <div>
          <h1 className="font-serif text-3xl">Dashboard</h1>
          <p className="mt-1 text-xs text-ink-soft">
            {loading ? "Loading from Postgres…" : "Sales performance & inventory health · FW25–SS26"}
          </p>
        </div>
        <Link to="/admin/products/new" className="h-9 rounded-md bg-ink px-4 text-[11px] leading-9 tracking-[0.08em] text-white transition-opacity hover:opacity-85">
          + NEW PRODUCT
        </Link>
      </div>

      {error && (
        <p className="mb-4 rounded-md bg-[var(--color-accent-soft)] px-4 py-2.5 text-xs text-[var(--color-accent)]">{error}</p>
      )}

      <div className={loading ? "opacity-40 transition-opacity" : "transition-opacity"}>
        {/* KPIs */}
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-6">
          <Stat label="Revenue" value={compactVnd(m.revenue)} delta={12.4} hint="vs last period" />
          <Stat label="Orders" value={compact(m.orders)} delta={8.1} />
          <Stat label="AOV" value={compactVnd(m.aov)} delta={3.9} />
          <Stat label="Units sold" value={compact(m.units)} delta={6.2} />
          <Stat label="Conversion" value={`${Number(m.conversion).toFixed(1)}%`} delta={-0.4} />
          <Stat label="Return rate" value={`${Number(m.return_rate).toFixed(1)}%`} delta={-1.2} hint="lower is better" />
        </div>

        {/* trend + donut */}
        <div className="mt-4 grid gap-4 lg:grid-cols-[2fr_1fr]">
          <Card title="Revenue trend">
            <div className="px-4 pb-6 pt-4">
              {m.months.length > 1 ? (
                <AreaChart
                  data={m.months.map((x) => Number(x.v))}
                  labels={m.months.map((x) => x.m)}
                  valueFmt={compactVnd}
                  height={220}
                />
              ) : (
                <p className="py-16 text-center text-xs text-ink-soft">Not enough data.</p>
              )}
            </div>
          </Card>
          <Card title="Revenue by collection">
            <div className="flex items-center justify-center px-5 py-8">
              <Donut
                segments={m.by_collection.map((c, i) => ({
                  label: c.label, value: Number(c.value), color: CHART_PALETTE[i],
                }))}
              />
            </div>
          </Card>
        </div>

        {/* category + top + stock */}
        <div className="mt-4 grid gap-4 lg:grid-cols-3">
          <Card title="Sales by category">
            <div className="px-5 py-4">
              <BarList items={m.by_category.map((c) => ({ label: c.label, value: Number(c.value) }))} valueFmt={compactVnd} />
            </div>
          </Card>

          <Card title="Top styles" action={<Link to="/admin/products" className="text-[10px] text-ink-soft link-underline">All</Link>}>
            <ul className="divide-y divide-[var(--color-line)]">
              {m.top.map((s, i) => (
                <li key={s.id}>
                  <Link to={`/admin/products/${s.id}`} className="flex items-center gap-3 px-5 py-2.5 hover:bg-[var(--color-tile)]">
                    <span className="w-4 text-center text-[11px] tabular-nums text-ink-soft">{i + 1}</span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-serif text-sm">{s.name}</p>
                      <p className="text-[10px] text-ink-soft">{s.style_code} · {compact(s.units_sold)} sold</p>
                    </div>
                    <span className="shrink-0 text-xs tabular-nums">{compactVnd(Number(s.revenue))}</span>
                  </Link>
                </li>
              ))}
              {!loading && !m.top.length && <li className="px-5 py-6 text-center text-xs text-ink-soft">No data.</li>}
            </ul>
          </Card>

          <Card title="Stock-outs by SKU" action={<Badge>{`${m.oos_skus} out`}</Badge>}>
            <ul className="divide-y divide-[var(--color-line)]">
              {m.stock_outs.map((s) => (
                <li key={s.id}>
                  <Link to={`/admin/products/${s.id}`} className="flex items-center gap-3 px-5 py-2.5 hover:bg-[var(--color-tile)]">
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-serif text-sm">{s.name}</p>
                      <p className="text-[10px] text-ink-soft">{s.style_code} · {s.sku_count} SKUs · {compact(s.units_sold)} sold</p>
                    </div>
                    <span className="shrink-0 text-right text-[11px] tabular-nums">
                      {s.oos_count > 0 && <span className="text-[var(--color-accent)]">{s.oos_count} out</span>}
                      {s.oos_count > 0 && s.low_count > 0 && <span className="text-ink-soft"> · </span>}
                      {s.low_count > 0 && <span className="text-amber-600">{s.low_count} low</span>}
                    </span>
                  </Link>
                </li>
              ))}
              {!loading && !m.stock_outs.length && <li className="px-5 py-6 text-center text-xs text-ink-soft">All SKUs in stock.</li>}
            </ul>
          </Card>
        </div>

        {/* insights */}
        <div className="mt-4 grid gap-4 lg:grid-cols-3">
          <Insight
            tone="accent"
            title="Bridal drives margin"
            body={`Bridal is ${m.revenue ? ((bridal / m.revenue) * 100).toFixed(0) : 0}% of revenue on far fewer units — protect stock & lead times on custom sizes.`}
          />
          <Insight
            tone="ink"
            title={`${m.vip_count} VIP customers`}
            body={`VIPs hold ${vipShare.toFixed(0)}% of total lifetime value. Trigger a private SS26 preview for this segment before public launch.`}
          />
          <Insight
            tone="soft"
            title="Restock before the peak"
            body={`${m.oos_skus} SKUs are fully out of stock — mostly single sizes on live styles, which silently kills conversion. Reorder the broken size runs before Q4.`}
          />
        </div>
      </div>
    </div>
  );
}

function Insight({ title, body, tone }: { title: string; body: string; tone: "accent" | "ink" | "soft" }) {
  const bg = tone === "accent" ? "bg-[var(--color-accent-soft)]" : tone === "ink" ? "bg-ink text-white" : "bg-white/50";
  return (
    <div className={`rounded-lg border edge p-5 ${bg}`}>
      <p className={`font-serif text-base ${tone === "ink" ? "text-white" : ""}`}>{title}</p>
      <p className={`mt-1.5 text-xs leading-relaxed ${tone === "ink" ? "text-white/70" : "text-ink-soft"}`}>{body}</p>
    </div>
  );
}

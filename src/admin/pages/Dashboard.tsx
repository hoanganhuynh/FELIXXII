import { useMemo } from "react";
import { Link } from "react-router-dom";
import { useAdmin, totalStock } from "../store/adminData";
import { Stat, Card, Badge } from "../components/ui";
import { AreaChart, BarList, Donut, CHART_PALETTE } from "../components/charts";
import { compactVnd, compact } from "../lib/format";
import { categoryLabel, COLLECTIONS, type CategoryId } from "../../data/catalog";

export default function Dashboard() {
  const { styles, orders, customers } = useAdmin();

  const m = useMemo(() => {
    const delivered = orders.filter((o) => o.status !== "Cancelled" && o.status !== "Returned");
    const revenue = delivered.reduce((n, o) => n + o.total, 0);
    const units = delivered.reduce((n, o) => n + o.items.reduce((u, i) => u + i.qty, 0), 0);
    const aov = delivered.length ? revenue / delivered.length : 0;
    const returned = orders.filter((o) => o.status === "Returned").length;
    const returnRate = orders.length ? (returned / orders.length) * 100 : 0;
    const totalViews = styles.reduce((n, s) => n + s.views, 0);
    const totalUnitsSold = styles.reduce((n, s) => n + s.unitsSold, 0);
    const conversion = totalViews ? (totalUnitsSold / totalViews) * 100 : 0;

    // revenue by month (from styles telemetry -> synth a 12-pt trend from orders)
    const byMonth = new Map<string, number>();
    for (const o of delivered) {
      const key = o.date.slice(0, 7);
      byMonth.set(key, (byMonth.get(key) ?? 0) + o.total);
    }
    const months = [...byMonth.entries()].sort().slice(-9);

    // sales by category
    const byCat = new Map<CategoryId, number>();
    for (const s of styles) byCat.set(s.category, (byCat.get(s.category) ?? 0) + s.revenue);
    const catRows = [...byCat.entries()]
      .map(([id, v]) => ({ label: categoryLabel(id), value: v }))
      .sort((a, b) => b.value - a.value);

    // by collection (donut)
    const byCol = COLLECTIONS.map((c, i) => ({
      label: c.season,
      value: styles.filter((s) => s.collection === c.id).reduce((n, s) => n + s.revenue, 0),
      color: CHART_PALETTE[i],
    }));

    // top styles
    const top = [...styles].sort((a, b) => b.revenue - a.revenue).slice(0, 6);

    // stock-outs are per-SKU, not per-style: flag styles by how many
    // variants are empty (0) or critical (≤3), weighted by how fast they sell.
    const low = styles
      .filter((s) => s.status === "active")
      .map((s) => ({
        s,
        out: s.variants.filter((v) => v.stock === 0).length,
        critical: s.variants.filter((v) => v.stock > 0 && v.stock <= 3).length,
        stock: totalStock(s),
      }))
      .filter((x) => x.out > 0 || x.critical > 0)
      .sort((a, b) => b.out * 2 + b.critical - (a.out * 2 + a.critical) || b.s.unitsSold - a.s.unitsSold)
      .slice(0, 6);

    const outSkus = styles.reduce((n, s) => n + s.variants.filter((v) => v.stock === 0).length, 0);

    return { revenue, units, aov, returnRate, conversion, months, catRows, byCol, top, low, outSkus, delivered: delivered.length };
  }, [styles, orders]);

  const vipCount = customers.filter((c) => c.segment === "VIP").length;

  return (
    <div>
      <div className="mb-6 flex items-end justify-between">
        <div>
          <h1 className="font-serif text-3xl">Dashboard</h1>
          <p className="mt-1 text-xs text-ink-soft">Sales performance & inventory health · FW25–SS26</p>
        </div>
        <Link to="/admin/products/new" className="h-9 rounded-md bg-ink px-4 text-[11px] leading-9 tracking-[0.08em] text-white transition-opacity hover:opacity-85">
          + NEW PRODUCT
        </Link>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-6">
        <Stat label="Revenue" value={compactVnd(m.revenue)} delta={12.4} hint="vs last period" />
        <Stat label="Orders" value={compact(m.delivered)} delta={8.1} />
        <Stat label="AOV" value={compactVnd(m.aov)} delta={3.9} />
        <Stat label="Units sold" value={compact(m.units)} delta={6.2} />
        <Stat label="Conversion" value={`${m.conversion.toFixed(1)}%`} delta={-0.4} />
        <Stat label="Return rate" value={`${m.returnRate.toFixed(1)}%`} delta={-1.2} hint="lower is better" />
      </div>

      {/* trend + donut */}
      <div className="mt-4 grid gap-4 lg:grid-cols-[2fr_1fr]">
        <Card title="Revenue trend">
          <div className="px-4 pb-6 pt-4">
            <AreaChart
              data={m.months.map((x) => x[1])}
              labels={m.months.map((x) => x[0].slice(5))}
              height={220}
            />
          </div>
        </Card>
        <Card title="Revenue by collection">
          <div className="flex items-center justify-center px-5 py-8">
            <Donut segments={m.byCol} />
          </div>
        </Card>
      </div>

      {/* category + top + insight */}
      <div className="mt-4 grid gap-4 lg:grid-cols-3">
        <Card title="Sales by category">
          <div className="px-5 py-4">
            <BarList items={m.catRows} valueFmt={compactVnd} />
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
                    <p className="text-[10px] text-ink-soft">{s.styleCode} · {compact(s.unitsSold)} sold</p>
                  </div>
                  <span className="shrink-0 text-xs tabular-nums">{compactVnd(s.revenue)}</span>
                </Link>
              </li>
            ))}
          </ul>
        </Card>

        <Card title="Stock-outs by SKU" action={<Badge>{`${m.outSkus} out`}</Badge>}>
          <ul className="divide-y divide-[var(--color-line)]">
            {m.low.map(({ s, out, critical }) => (
              <li key={s.id}>
                <Link to={`/admin/products/${s.id}`} className="flex items-center gap-3 px-5 py-2.5 hover:bg-[var(--color-tile)]">
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-serif text-sm">{s.name}</p>
                    <p className="text-[10px] text-ink-soft">{s.styleCode} · {s.variants.length} SKUs · {compact(s.unitsSold)} sold</p>
                  </div>
                  <span className="shrink-0 text-right text-[11px] tabular-nums">
                    {out > 0 && <span className="text-[var(--color-accent)]">{out} out</span>}
                    {out > 0 && critical > 0 && <span className="text-ink-soft"> · </span>}
                    {critical > 0 && <span className="text-amber-600">{critical} low</span>}
                  </span>
                </Link>
              </li>
            ))}
            {!m.low.length && <li className="px-5 py-6 text-center text-xs text-ink-soft">All SKUs in stock.</li>}
          </ul>
        </Card>
      </div>

      {/* insights */}
      <div className="mt-4 grid gap-4 lg:grid-cols-3">
        <Insight
          tone="accent"
          title="Bridal drives margin"
          body={`Bridal is ${((m.catRows.find((c) => c.label === "Bridal")?.value ?? 0) / m.revenue * 100).toFixed(0)}% of revenue on far fewer units — protect stock & lead times on custom sizes.`}
        />
        <Insight
          tone="ink"
          title={`${vipCount} VIP customers`}
          body={`VIPs (LTV > 60M₫) are your reorder engine. Trigger a private SS26 preview for this segment before public launch.`}
        />
        <Insight
          tone="soft"
          title="Restock before the peak"
          body={`${m.outSkus} SKUs are fully out of stock — mostly single sizes on live styles, which silently kills conversion. Reorder the broken size runs before Q4.`}
        />
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

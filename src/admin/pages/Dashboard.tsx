import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { getDashboardStats, EMPTY_STATS } from "../api/dashboard";
import { useAsync } from "../lib/useAsync";
import { useAuth } from "../../store/auth";
import { Stat, Card, Badge } from "../components/ui";
import { BarList, Donut, CHART_PALETTE } from "../components/charts";
import { RevenueTrend } from "../components/RevenueTrend";
import { compactVnd, compact } from "../lib/format";

export default function Dashboard() {
  const { t } = useTranslation();
  const { isAdmin, ready, setLoginOpen } = useAuth();
  const { data: m, loading, error } = useAsync(
    () => (isAdmin ? getDashboardStats() : Promise.resolve(EMPTY_STATS)),
    [isAdmin],
    EMPTY_STATS
  );

  const bridal = Number(m.by_category.find((c) => c.id === "dam-bridal")?.value ?? 0);
  // by_category now sums the same order-based revenue as m.revenue (see
  // supabase/migrations/20260720120000_fix_dashboard_revenue.sql), so both
  // share one total — dividing directly against m.revenue is safe.
  const bridalShare = m.revenue ? (bridal / m.revenue) * 100 : 0;
  const vipShare = m.total_ltv ? (m.vip_ltv / m.total_ltv) * 100 : 0;

  // Revenue, AOV and LTV are business data. Rather than render a dashboard of
  // zeros (which reads as broken), say plainly that it needs an admin session.
  if (ready && !isAdmin) {
    return (
      <div>
        <h1 className="font-serif text-3xl">{t("dashboard")}</h1>
        <div className="mt-8 rounded-lg border edge bg-white/40 px-6 py-16 text-center">
          <p className="font-serif text-xl">{t("dash.gate_title")}</p>
          <p className="mx-auto mt-2 max-w-md text-xs leading-relaxed text-ink-soft">{t("dash.gate_body")}</p>
          <button onClick={() => setLoginOpen(true)} className="mt-6 h-10 rounded-md bg-ink px-6 text-[11px] tracking-[0.1em] text-white transition-opacity hover:opacity-85">
            {t("dash.gate_cta")}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6 flex items-end justify-between">
        <div>
          <h1 className="font-serif text-3xl">{t("dashboard")}</h1>
          <p className="mt-1 text-xs text-ink-soft">{loading ? t("dash.loading") : t("dash.subtitle")}</p>
        </div>
        <Link to="/admin/products/new" className="h-9 rounded-md bg-ink px-4 text-[11px] leading-9 tracking-[0.08em] text-white transition-opacity hover:opacity-85">
          {t("dash.new_product")}
        </Link>
      </div>

      {error && (
        <p className="mb-4 rounded-md bg-[var(--color-accent-soft)] px-4 py-2.5 text-xs text-[var(--color-accent)]">{error}</p>
      )}

      <div className={loading ? "opacity-40 transition-opacity" : "transition-opacity"}>
        {/* KPIs */}
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-6">
          <Stat label={t("dash.revenue")} value={compactVnd(m.revenue)} delta={12.4} hint={t("dash.vs_last")} />
          <Stat label={t("dash.orders")} value={compact(m.orders)} delta={8.1} />
          <Stat label={t("dash.aov")} value={compactVnd(m.aov)} delta={3.9} />
          <Stat label={t("dash.units")} value={compact(m.units)} delta={6.2} />
          <Stat label={t("dash.conversion")} value={`${Number(m.conversion).toFixed(1)}%`} delta={-0.4} />
          <Stat label={t("dash.return_rate")} value={`${Number(m.return_rate).toFixed(1)}%`} delta={-1.2} hint={t("dash.lower_better")} />
        </div>

        {/* trend + donut */}
        <div className="mt-4 grid gap-4 lg:grid-cols-[2fr_1fr]">
          <Card title={t("dash.trend")}>
            <RevenueTrend />
          </Card>
          <Card title={t("dash.by_collection")}>
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
          <Card title={t("dash.by_category")}>
            <div className="px-5 py-4">
              <BarList items={m.by_category.map((c) => ({ label: c.label, value: Number(c.value) }))} valueFmt={compactVnd} />
            </div>
          </Card>

          <Card title={t("dash.top_styles")} action={<Link to="/admin/products" className="text-[10px] text-ink-soft link-underline">{t("common.all")}</Link>}>
            <ul className="divide-y divide-[var(--color-line)]">
              {m.top.map((s, i) => (
                <li key={s.id}>
                  <Link to={`/admin/products/${s.id}`} className="flex items-center gap-3 px-5 py-2.5 hover:bg-[var(--color-tile)]">
                    <span className="w-4 text-center text-[11px] tabular-nums text-ink-soft">{i + 1}</span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-serif text-sm">{s.name}</p>
                      <p className="text-[10px] text-ink-soft">{s.style_code} · {compact(s.units_sold)} {t("dash.sold")}</p>
                    </div>
                    <span className="shrink-0 text-xs tabular-nums">{compactVnd(Number(s.revenue))}</span>
                  </Link>
                </li>
              ))}
              {!loading && !m.top.length && <li className="px-5 py-6 text-center text-xs text-ink-soft">{t("common.none")}</li>}
            </ul>
          </Card>

          <Card title={t("dash.stock_outs")} action={<Badge>{`${m.oos_skus} ${t("dash.out")}`}</Badge>}>
            <ul className="divide-y divide-[var(--color-line)]">
              {m.stock_outs.map((s) => (
                <li key={s.id}>
                  <Link to={`/admin/products/${s.id}`} className="flex items-center gap-3 px-5 py-2.5 hover:bg-[var(--color-tile)]">
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-serif text-sm">{s.name}</p>
                      <p className="text-[10px] text-ink-soft">{s.style_code} · {s.sku_count} SKUs · {compact(s.units_sold)} {t("dash.sold")}</p>
                    </div>
                    <span className="shrink-0 text-right text-[11px] tabular-nums">
                      {s.oos_count > 0 && <span className="text-[var(--color-accent)]">{s.oos_count} {t("dash.out")}</span>}
                      {s.oos_count > 0 && s.low_count > 0 && <span className="text-ink-soft"> · </span>}
                      {s.low_count > 0 && <span className="text-amber-600">{s.low_count} {t("dash.low")}</span>}
                    </span>
                  </Link>
                </li>
              ))}
              {!loading && !m.stock_outs.length && <li className="px-5 py-6 text-center text-xs text-ink-soft">{t("dash.all_in_stock")}</li>}
            </ul>
          </Card>
        </div>

        {/* insights */}
        <div className="mt-4 grid gap-4 lg:grid-cols-3">
          <Insight
            tone="accent"
            title={t("dash.insight_bridal_t")}
            body={t("dash.insight_bridal_b", { pct: bridalShare.toFixed(0) })}
          />
          <Insight
            tone="ink"
            title={t("dash.insight_vip_t", { count: m.vip_count })}
            body={t("dash.insight_vip_b", { pct: vipShare.toFixed(0) })}
          />
          <Insight
            tone="soft"
            title={t("dash.insight_restock_t")}
            body={t("dash.insight_restock_b", { count: m.oos_skus })}
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

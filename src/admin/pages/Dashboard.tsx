import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { getDashboardStats, EMPTY_STATS } from "../api/dashboard";
import { useAsync } from "../lib/useAsync";
import { useAuth } from "../../store/auth";
import { Stat, Card, Badge } from "../components/ui";
import { BarList, Donut, CHART_PALETTE } from "../components/charts";
import { RevenueTrend } from "../components/RevenueTrend";
import { compactVnd, compact } from "../lib/format";

type CollInsight = { kind: "ok" | "warn" | "act"; tKey: string; vars: Record<string, string> };

function parseCollSeason(label: string) {
  const m = label.match(/^(SS|FW|AW|RS|PF)(\d{2})$/i);
  return m ? { season: m[1].toUpperCase(), year: 2000 + parseInt(m[2], 10) } : null;
}

function buildCollInsights(sorted: { label: string; value: number }[], total: number): CollInsight[] {
  if (!sorted.length || total === 0) return [];
  const top = sorted[0];
  const bottom = sorted[sorted.length - 1];
  const topPct = (top.value / total) * 100;
  const botPct = (bottom.value / total) * 100;
  const ins: CollInsight[] = [];

  ins.push(topPct > 67
    ? { kind: "warn", tKey: "dash.coll_concentrated", vars: { top: top.label, pct: topPct.toFixed(0), bottom: bottom.label } }
    : { kind: "ok",   tKey: "dash.coll_balanced",     vars: { top: top.label, pct: topPct.toFixed(0) } });

  if (sorted.length >= 2) {
    const tS = parseCollSeason(top.label);
    const bS = parseCollSeason(bottom.label);
    if (tS && bS && tS.year !== bS.year) {
      ins.push(tS.year > bS.year
        ? { kind: "ok",   tKey: "dash.coll_newer_leads", vars: { top: top.label } }
        : { kind: "warn", tKey: "dash.coll_older_leads", vars: { top: top.label, bottom: bottom.label } });
    }
    ins.push({ kind: "act", tKey: "dash.coll_action", vars: { bottom: bottom.label, pct: botPct.toFixed(0) } });
  }

  return ins;
}

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

  const repeatYears = m.repeat_rate_by_year;
  const latestRepeat = repeatYears.length ? Number(repeatYears[repeatYears.length - 1].rate) : 0;
  const prevRepeat = repeatYears.length > 1 ? Number(repeatYears[repeatYears.length - 2].rate) : undefined;
  const repeatDelta = prevRepeat !== undefined ? latestRepeat - prevRepeat : undefined;
  const latestRepeatYear = repeatYears.length ? String(repeatYears[repeatYears.length - 1].year) : "";

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
      <div className="mb-6">
        <h1 className="font-serif text-3xl">{t("dashboard")}</h1>
        <p className="mt-1 text-xs text-ink-soft">{loading ? t("dash.loading") : t("dash.subtitle")}</p>
      </div>

      {error && (
        <p className="mb-4 rounded-md bg-[var(--color-accent-soft)] px-4 py-2.5 text-xs text-[var(--color-accent)]">{error}</p>
      )}

      <div className={loading ? "opacity-40 transition-opacity" : "transition-opacity"}>
        {/* KPIs */}
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <Stat label={t("dash.revenue")} value={compactVnd(m.revenue)} delta={12.4} hint={t("dash.vs_last")} />
          <Stat label={t("dash.orders")} value={compact(m.orders)} delta={8.1} />
          <Stat label={t("dash.aov")} value={compactVnd(m.aov)} delta={3.9} />
          <Stat label={t("dash.units")} value={compact(m.units)} delta={6.2} />
          <Stat label={t("dash.conversion")} value={`${Number(m.conversion).toFixed(1)}%`} delta={-0.4} />
          <Stat label={t("dash.return_rate")} value={`${Number(m.return_rate).toFixed(1)}%`} delta={-1.2} hint={t("dash.lower_better")} />
          <Stat label={t("dash.repeat_rate")} value={`${latestRepeat.toFixed(1)}%`} delta={repeatDelta} hint={latestRepeatYear} />
          <Stat label={t("dash.avg_ltv")} value={compactVnd(m.avg_ltv)} />
        </div>

        {/* trend + donut */}
        <div className="mt-4 grid gap-4 lg:grid-cols-[2fr_1fr]">
          <Card title={t("dash.trend")}>
            <RevenueTrend />
          </Card>
          <Card title={t("dash.by_collection")}>
            {(() => {
              const sorted = [...m.by_collection].sort((a, b) => Number(b.value) - Number(a.value));
              const collTotal = sorted.reduce((n, c) => n + Number(c.value), 0);
              const insights = buildCollInsights(sorted.map(c => ({ label: c.label, value: Number(c.value) })), collTotal);
              return (
                <>
                  <div className="flex items-center justify-center px-5 pt-5 pb-2">
                    <Donut
                      segments={sorted.map((c, i) => ({ label: c.label, value: Number(c.value), color: CHART_PALETTE[i] }))}
                      valueFmt={compactVnd}
                      center={
                        <div>
                          <div className="text-[11px] text-ink-soft">{t("dash.total")}</div>
                          <div className="text-sm font-medium tabular-nums">{compactVnd(collTotal)}</div>
                        </div>
                      }
                    />
                  </div>
                  {insights.length > 0 && (
                    <div className="border-t border-[var(--color-line)] px-5 pt-4 pb-5 space-y-2.5">
                      <p className="text-[9px] tracking-[0.12em] text-ink-soft uppercase mb-3">{t("dash.coll_notes")}</p>
                      {insights.map((ins, idx) => (
                        <div key={idx} className="flex items-start gap-2.5">
                          <span className="mt-0.5 shrink-0">
                            {ins.kind === "ok" && (
                              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="var(--color-positive)" strokeWidth="2.2"><circle cx="12" cy="12" r="10"/><path d="M8 12l3 3 5-5"/></svg>
                            )}
                            {ins.kind === "warn" && (
                              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#b45309" strokeWidth="2.2"><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
                            )}
                            {ins.kind === "act" && (
                              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="var(--color-accent)" strokeWidth="2.2"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
                            )}
                          </span>
                          <p className="text-[11px] leading-snug text-ink-soft">{t(ins.tKey, ins.vars as any)}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </>
              );
            })()}
          </Card>
        </div>

        {/* category + top + stock + return reasons */}
        <div className="mt-4 grid gap-4 lg:grid-cols-2 xl:grid-cols-4">
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

          <Card title={t("dash.return_reasons")}>
            <div className="px-5 py-4">
              {m.return_reasons.length ? (
                <BarList
                  items={m.return_reasons.map((r) => ({
                    label: t(`ord.reason.${r.reason}`),
                    value: Number(r.pct),
                  }))}
                  valueFmt={(n) => `${n.toFixed(0)}%`}
                />
              ) : (
                <p className="py-6 text-center text-xs text-ink-soft">{t("common.none")}</p>
              )}
            </div>
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

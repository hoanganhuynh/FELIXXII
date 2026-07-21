import { useState, useEffect } from "react";
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
  const { data: m, loading, error, reload } = useAsync(
    () => (isAdmin ? getDashboardStats() : Promise.resolve(EMPTY_STATS)),
    [isAdmin],
    EMPTY_STATS
  );
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());
  const [topReturnedOpen, setTopReturnedOpen] = useState(false);

  useEffect(() => {
    if (!loading && !error) {
      setLastUpdated(new Date());
    }
  }, [loading, error, m]);

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
          <button onClick={() => setLoginOpen(true)} className="mt-6 h-10 rounded-md bg-ink px-6 text-[12px] tracking-[0.1em] text-white transition-opacity hover:opacity-85">
            {t("dash.gate_cta")}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6 flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h1 className="font-serif text-3xl">{t("dashboard")}</h1>
          <p className="mt-1 text-xs text-ink-soft">{loading ? t("dash.loading") : t("dash.subtitle")}</p>
        </div>
        
        <div className="flex items-center gap-3">
          {!loading && (
            <span className="text-[12px] text-ink-soft uppercase tracking-wider">
              {t("dash.last_updated", "Cập nhật:")} {lastUpdated.toLocaleTimeString()}
            </span>
          )}
          <button 
            onClick={reload} 
            disabled={loading}
            className="flex items-center gap-1.5 rounded-full border edge px-3 py-1.5 text-xs text-ink hover:bg-[var(--color-tile)] disabled:opacity-50 transition-colors"
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={loading ? "animate-spin" : ""}><path d="M21 2v6h-6"/><path d="M3 12a9 9 0 0 1 15-6.7L21 8"/><path d="M3 22v-6h6"/><path d="M21 12a9 9 0 0 1-15 6.7L3 16"/></svg>
            {t("common.refresh", "Làm mới")}
          </button>
        </div>
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

        <div className="mt-4 grid gap-4 lg:grid-cols-2">
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
                          <div className="text-[12px] text-ink-soft">{t("dash.total")}</div>
                          <div className="text-sm font-medium tabular-nums">{compactVnd(collTotal)}</div>
                        </div>
                      }
                    />
                  </div>
                  {insights.length > 0 && (
                    <div className="border-t border-[var(--color-line)] px-5 pt-4 pb-5 space-y-2.5">
                      <p className="text-[12px] tracking-[0.12em] text-ink-soft uppercase mb-3">{t("dash.coll_notes")}</p>
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
                          <p className="text-[12px] leading-snug text-ink-soft">{t(ins.tKey, ins.vars as any) as string}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </>
              );
            })()}
          </Card>
        </div>

        {/* Row 1: Sales by Category + Return Reasons */}
        <div className="mt-4 grid gap-4 lg:grid-cols-2">
          <Card title={t("dash.by_category")}>
            <div className="px-5 py-4">
              <BarList items={m.by_category.map((c) => ({ label: c.label, value: Number(c.value) }))} valueFmt={compactVnd} />
            </div>
          </Card>

          <Card title={t("dash.return_reasons")}>
            <div className="px-5 py-4">
              {m.return_reasons.length ? (
                <>
                  <BarList
                    items={m.return_reasons.map((r) => ({
                      label: t(`ord.reason.${r.reason}`),
                      value: Number(r.pct),
                    }))}
                    valueFmt={(n) => `${n.toFixed(0)}%`}
                  />
                  {m.return_reasons[0] && (
                    <div className="mt-4 rounded-lg bg-[var(--color-accent-soft)] p-3 text-xs">
                      <strong className="block text-ink">{t("common.suggestion", "Gợi ý hành động:")}</strong>
                      <span className="mt-1 block text-ink-soft">
                        {m.return_reasons[0].reason === "defect" && "Tỷ lệ lỗi cao. Cần kiểm tra lại chất lượng xưởng may và QC trước khi xuất hàng."}
                        {m.return_reasons[0].reason === "wrong_size" && "Nhiều đơn sai kích cỡ. Đề nghị cập nhật lại Size Guide cho sát với thực tế."}
                        {m.return_reasons[0].reason === "changed_mind" && "Khách đổi ý nhiều. Cân nhắc xem lại chính sách đổi trả hoặc làm nổi bật hơn mô tả sản phẩm."}
                        {m.return_reasons[0].reason === "wrong_shipment" && "Lỗi giao sai hàng. Vui lòng kiểm tra lại quy trình đóng gói tại kho."}
                        {m.return_reasons[0].reason === "unspecified" && "Lý do chưa rõ ràng. Nên bắt buộc nhân viên ghi chú lý do khi nhận hàng hoàn."}
                      </span>
                    </div>
                  )}
                  <button
                    onClick={() => setTopReturnedOpen(true)}
                    className="mt-4 w-full rounded-md border edge py-2.5 text-xs font-medium text-ink hover:bg-[var(--color-tile)] transition-colors"
                  >
                    {t("dash.top_returned", "SẢN PHẨM TRẢ VỀ NHIỀU NHẤT")} &rarr;
                  </button>
                </>
              ) : (
                <p className="py-6 text-center text-xs text-ink-soft">{t("common.none")}</p>
              )}
            </div>
          </Card>
        </div>

        {/* Row 2: Top Styles + Stock-Outs */}
        <div className="mt-4 grid gap-4 lg:grid-cols-2">
          <Card title={t("dash.top_styles")} action={<Link to="/admin/products" className="text-[12px] text-ink-soft link-underline">{t("common.all")}</Link>}>
            <ul className="divide-y divide-[var(--color-line)]">
              {m.top.map((s, i) => (
                <li key={s.id}>
                  <Link to={`/admin/products/${s.id}`} className="flex items-center gap-3 px-5 py-2.5 hover:bg-[var(--color-tile)]">
                    <span className="w-4 text-center text-[12px] tabular-nums text-ink-soft">{i + 1}</span>
                    {s.images?.[0] ? (
                      <img src={s.images[0]} alt="" className="h-10 w-10 shrink-0 rounded object-cover object-top bg-[var(--color-tile)]" />
                    ) : (
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded bg-[var(--color-tile)] text-ink-soft opacity-50">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="2" /><circle cx="8.5" cy="8.5" r="1.5" /><path d="M21 15l-5-5L5 21" /></svg>
                      </div>
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-serif text-sm">{s.name}</p>
                      <p className="text-[12px] text-ink-soft">{s.style_code} · {compact(s.units_sold)} {t("dash.sold")}</p>
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
                    {s.images?.[0] ? (
                      <img src={s.images[0]} alt="" className="h-10 w-10 shrink-0 rounded object-cover object-top bg-[var(--color-tile)]" />
                    ) : (
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded bg-[var(--color-tile)] text-ink-soft opacity-50">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="2" /><circle cx="8.5" cy="8.5" r="1.5" /><path d="M21 15l-5-5L5 21" /></svg>
                      </div>
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-serif text-sm">{s.name}</p>
                      <p className="text-[12px] text-ink-soft">{s.style_code} · {s.sku_count} SKUs · {compact(s.units_sold)} {t("dash.sold")}</p>
                    </div>
                    <span className="shrink-0 text-right text-[12px] tabular-nums">
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



      </div>


      {topReturnedOpen && (
        <>
          <div className="fixed inset-0 z-[60] bg-black/25" onClick={() => setTopReturnedOpen(false)} />
          <aside className="fixed right-0 top-0 z-[70] h-full w-full max-w-sm overflow-y-auto bg-[var(--color-bg)] shadow-2xl">
            <header className="flex items-center justify-between border-b edge px-6 py-5">
              <h2 className="font-serif text-xl">{t("dash.top_returned", "SẢN PHẨM TRẢ VỀ NHIỀU NHẤT")}</h2>
              <button onClick={() => setTopReturnedOpen(false)} className="text-ink hover:opacity-60">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4"><path d="M6 6l12 12M18 6L6 18" /></svg>
              </button>
            </header>
            <ul className="divide-y divide-[var(--color-line)]">
              {m.top_returned.map((s, i) => (
                <li key={s.id}>
                  <Link 
                    to={`/admin/products/${s.id}`} 
                    className="flex items-center gap-3 px-6 py-4 hover:bg-[var(--color-tile)]"
                    onClick={() => setTopReturnedOpen(false)}
                  >
                    <span className="w-4 text-center text-[12px] tabular-nums text-ink-soft">{i + 1}</span>
                    {s.images?.[0] ? (
                      <img src={s.images[0]} alt="" className="h-10 w-10 shrink-0 rounded object-cover object-top bg-[var(--color-tile)]" />
                    ) : (
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded bg-[var(--color-tile)] text-ink-soft opacity-50">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="2" /><circle cx="8.5" cy="8.5" r="1.5" /><path d="M21 15l-5-5L5 21" /></svg>
                      </div>
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-serif text-sm">{s.name}</p>
                      <p className="text-[12px] text-ink-soft">{s.style_code}</p>
                    </div>
                    <span className="shrink-0 text-right text-[12px] tabular-nums text-red-600">
                      {s.returned_qty} {t("dash.returned", "lượt trả")}
                    </span>
                  </Link>
                </li>
              ))}
              {!m.top_returned.length && <li className="px-6 py-8 text-center text-xs text-ink-soft">{t("common.none")}</li>}
            </ul>
          </aside>
        </>
      )}
    </div>
  );
}


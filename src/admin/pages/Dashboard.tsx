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


  import { listSources } from "../api/taxonomy";
  import type { SourceRow } from "../api/taxonomy";
  
  export default function Dashboard() {
    const { t } = useTranslation();
    const { isAdmin, ready, setLoginOpen } = useAuth();
    
    const [timeFilter, setTimeFilter] = useState("all");
    const [sourceFilter, setSourceFilter] = useState("all");
    
    const { data: sources } = useAsync(listSources, [], []);
  
  const { data: m, loading, error, reload } = useAsync(
    () => (isAdmin ? getDashboardStats(timeFilter, sourceFilter) : Promise.resolve(EMPTY_STATS)),
    [isAdmin, timeFilter, sourceFilter],
    EMPTY_STATS
  );
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());
  const [topReturnedOpen, setTopReturnedOpen] = useState(false);
  const [visitsOpen, setVisitsOpen] = useState(false);

  useEffect(() => {
    if (!loading && !error) {
      setLastUpdated(new Date());
    }
  }, [loading, error, m]);



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
      <div className="mb-4 flex flex-col sm:flex-row sm:items-start justify-between gap-4">
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

      <div className="mb-6 space-y-3">
        <div className="flex flex-wrap gap-2">
          {[
            { value: "all", label: "Toàn bộ" },
            { value: "today", label: "Hôm nay" },
            { value: "yesterday", label: "Hôm qua" },
            { value: "7d", label: "7 ngày qua" },
            { value: "month", label: "Tháng này" },
            { value: "quarter", label: "Quý này" },
            { value: "year", label: "Năm nay" },
          ].map(opt => (
            <button
              key={opt.value}
              onClick={() => setTimeFilter(opt.value)}
              className={`rounded-full px-3 py-1.5 text-xs transition-colors border ${timeFilter === opt.value ? 'bg-ink text-[var(--color-bg)] border-ink' : 'bg-white/50 edge text-ink-soft hover:text-ink hover:bg-white/80'}`}
            >
              {opt.label}
            </button>
          ))}
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setSourceFilter("all")}
            className={`rounded-full px-3 py-1.5 text-xs transition-colors border ${sourceFilter === "all" ? 'bg-ink text-[var(--color-bg)] border-ink' : 'bg-white/50 edge text-ink-soft hover:text-ink hover:bg-white/80'}`}
          >
            Tất cả Nguồn hàng
          </button>
          {sources.map((s: SourceRow) => (
            <button
              key={s.id}
              onClick={() => setSourceFilter(s.id)}
              className={`rounded-full px-3 py-1.5 text-xs transition-colors border ${sourceFilter === s.id ? 'bg-ink text-[var(--color-bg)] border-ink' : 'bg-white/50 edge text-ink-soft hover:text-ink hover:bg-white/80'}`}
            >
              {s.label}
            </button>
          ))}
        </div>
      </div>

      {error && (
        <p className="mb-4 rounded-md bg-[var(--color-accent-soft)] px-4 py-2.5 text-xs text-[var(--color-accent)]">{error}</p>
      )}

      <div className={loading ? "opacity-40 transition-opacity" : "transition-opacity"}>
        {/* KPIs */}
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
          <Stat 
            label={t("dash.revenue")} 
            value={compactVnd(m.revenue)} 
            icon={<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" /></svg>}
          />
          <Stat 
            label={t("dash.orders")} 
            value={compact(m.orders)} 
            icon={<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><circle cx="9" cy="21" r="1" /><circle cx="20" cy="21" r="1" /><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6" /></svg>}
          />
          <Stat 
            label={t("dash.aov")} 
            value={compactVnd(m.aov)} 
            icon={<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M4 2v20l2-2 2 2 2-2 2 2 2-2 2 2 2-2 2 2V2z" /></svg>}
          />
          <Stat 
            label={t("dash.units")} 
            value={compact(m.units)} 
            icon={<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" /><polyline points="3.27 6.96 12 12.01 20.73 6.96" /><line x1="12" y1="22.08" x2="12" y2="12" /></svg>}
          />
          <Stat 
            label={t("dash.conversion")} 
            value={`${Number(m.conversion).toFixed(1)}%`} 
            icon={<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6M15 3h6v6M10 14L21 3" /></svg>}
          />
          <Card className="px-5 py-4 flex flex-col justify-between">
            <div>
              <div className="flex justify-between items-center">
                <p className="text-[12px] tracking-[0.1em] text-ink-soft">LƯỢT TRUY CẬP</p>
                <span className="text-ink-soft/50"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" /><circle cx="12" cy="12" r="3" /></svg></span>
              </div>
              <p className="mt-2 font-serif text-2xl leading-none">{compact(m.clicks?.web_visits ?? 0)}</p>
            </div>
            <div className="mt-2">
              <button onClick={() => setVisitsOpen(true)} className="text-[12px] text-ink-soft hover:text-ink link-underline">See more</button>
            </div>
          </Card>
        </div>

        <div className="mt-4 grid gap-4 lg:grid-cols-2">
          <Card title="Biểu đồ đường (Doanh thu)">
            <RevenueTrend />
          </Card>
          
          <Card title="Dòng sản phẩm bán chạy (< 10% thuộc khác)">
            <div className="flex items-center justify-center px-5 py-10">
              <Donut
                segments={(() => {
                  const sorted = [...m.by_category].sort((a, b) => b.value - a.value);
                  const total = sorted.reduce((sum, s) => sum + s.value, 0);
                  let threshold = total * 0.1;
                  let otherValue = 0;
                  let finalSegments: { id: string; label: string; value: number }[] = sorted.filter(s => {
                    if (s.value < threshold) {
                      otherValue += s.value;
                      return false;
                    }
                    return true;
                  });
                  if (otherValue > 0) {
                    finalSegments.push({ id: "other", label: "Khác", value: otherValue });
                  }
                  return finalSegments.map((c, i) => ({ label: c.label, value: Number(c.value), color: CHART_PALETTE[i % CHART_PALETTE.length] }));
                })()}
                valueFmt={compactVnd}
              />
            </div>
          </Card>
        </div>

        <div className="mt-4 grid gap-4 lg:grid-cols-2">
          <Card title="Nguồn hàng bán ra">
            <div className="flex items-center justify-center px-5 py-10">
              <Donut
                segments={m.by_source.map((c, i) => ({ label: c.label, value: Number(c.value), color: CHART_PALETTE[i % CHART_PALETTE.length] }))}
                valueFmt={compactVnd}
              />
            </div>
          </Card>
          
          <Card title="Wishlist">
            <div className="flex items-center justify-center px-5 py-10">
              <Donut
                segments={m.wishlist_pie.map((c, i) => ({ label: c.label, value: Number(c.value), color: CHART_PALETTE[i % CHART_PALETTE.length] }))}
                valueFmt={v => `${compact(v)}`}
              />
            </div>
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
      {visitsOpen && (
        <>
          <div className="fixed inset-0 z-[60] bg-black/25" onClick={() => setVisitsOpen(false)} />
          <div className="fixed inset-0 z-[70] flex items-center justify-center pointer-events-none p-4">
            <div className="bg-[var(--color-bg)] rounded-lg shadow-2xl w-full max-w-sm pointer-events-auto border edge">
              <header className="flex items-center justify-between border-b edge px-5 py-4">
                <h2 className="font-serif text-lg">Chi tiết lượt truy cập</h2>
                <button onClick={() => setVisitsOpen(false)} className="text-ink hover:opacity-60">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4"><path d="M6 6l12 12M18 6L6 18" /></svg>
                </button>
              </header>
              <div className="p-5 space-y-3">
                <div className="flex justify-between items-center p-3 rounded border edge bg-[var(--color-tile)]/50">
                  <span className="text-sm font-medium">Lượt truy cập web</span>
                  <span className="tabular-nums font-medium">{compact(m.clicks?.web_visits ?? 0)}</span>
                </div>
                <div className="flex justify-between items-center p-3 rounded border edge bg-[var(--color-tile)]/50">
                  <span className="text-sm font-medium">Lượt click sản phẩm</span>
                  <span className="tabular-nums font-medium">{compact(m.clicks?.product_clicks ?? 0)}</span>
                </div>
                <div className="flex justify-between items-center p-3 rounded border edge bg-[var(--color-tile)]/50">
                  <span className="text-sm font-medium">Lượt click Nguồn hàng</span>
                  <span className="tabular-nums font-medium">{compact(m.clicks?.source_clicks ?? 0)}</span>
                </div>
                <div className="flex justify-between items-center p-3 rounded border edge bg-[var(--color-tile)]/50">
                  <span className="text-sm font-medium">Lượt click Collection</span>
                  <span className="tabular-nums font-medium">{compact(m.clicks?.collection_clicks ?? 0)}</span>
                </div>
                <div className="flex justify-between items-center p-3 rounded border edge bg-[var(--color-tile)]/50">
                  <span className="text-sm font-medium">Lượt click CT khuyến mãi</span>
                  <span className="tabular-nums font-medium">{compact(m.clicks?.campaign_clicks ?? 0)}</span>
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}


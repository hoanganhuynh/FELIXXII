import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { getDashboardStats, EMPTY_STATS } from "../api/dashboard";
import { useAsync } from "../lib/useAsync";
import { useAuth } from "../../store/auth";
import { Card } from "../components/ui";
import { compactVnd } from "../lib/format";

export default function Analytics() {
  const { isAdmin, ready, setLoginOpen } = useAuth();
  const { data: m, loading, error, reload } = useAsync(
    () => (isAdmin ? getDashboardStats() : Promise.resolve(EMPTY_STATS)),
    [isAdmin],
    EMPTY_STATS
  );
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());

  useEffect(() => {
    if (!loading && !error) setLastUpdated(new Date());
  }, [loading, error, m]);

  if (ready && !isAdmin) {
    return (
      <div>
        <h1 className="font-serif text-3xl">Phân Tích</h1>
        <div className="mt-8 rounded-lg border edge bg-white/40 px-6 py-16 text-center">
          <p className="font-serif text-xl">Yêu cầu quyền Admin</p>
          <button onClick={() => setLoginOpen(true)} className="mt-6 h-10 rounded-md bg-ink px-6 text-[12px] tracking-[0.1em] text-white transition-opacity hover:opacity-85">
            Đăng nhập
          </button>
        </div>
      </div>
    );
  }

  const NoImage = () => (
    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded bg-[var(--color-tile)] text-ink-soft opacity-50">
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="M21 15l-5-5L5 21"/>
      </svg>
    </div>
  );

  return (
    <div>
      {/* Header */}
      <div className="mb-6 flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h1 className="font-serif text-3xl">Phân Tích</h1>
          <p className="mt-1 text-xs text-ink-soft">
            {loading ? "Đang tải..." : "Dữ liệu phân tích để hỗ trợ ra quyết định"}
          </p>
        </div>
        <div className="flex items-center gap-3">
          {!loading && (
            <span className="text-[12px] text-ink-soft uppercase tracking-wider">
              Cập nhật: {lastUpdated.toLocaleTimeString()}
            </span>
          )}
          <button
            onClick={reload}
            disabled={loading}
            className="flex items-center gap-1.5 rounded-full border edge px-3 py-1.5 text-xs text-ink hover:bg-[var(--color-tile)] disabled:opacity-50 transition-colors"
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={loading ? "animate-spin" : ""}>
              <path d="M21 2v6h-6"/><path d="M3 12a9 9 0 0 1 15-6.7L21 8"/><path d="M3 22v-6h6"/><path d="M21 12a9 9 0 0 1-15 6.7L3 16"/>
            </svg>
            Làm mới
          </button>
        </div>
      </div>

      {error && (
        <p className="mb-4 rounded-md bg-[var(--color-accent-soft)] px-4 py-2.5 text-xs text-[var(--color-accent)]">{error}</p>
      )}

      <div className={loading ? "opacity-40 transition-opacity" : "transition-opacity"}>

        {/* Row 1: Dead Stock + Reorder Urgency */}
        <div className="grid gap-4 lg:grid-cols-2">

          {/* Dead Stock Alert */}
          <Card
            title="Cảnh Báo Hàng Chết"
            action={
              m.dead_stock.length > 0
                ? <span className="rounded-full bg-[var(--color-accent)] px-2 py-0.5 text-[12px] text-white">{m.dead_stock.length} sản phẩm</span>
                : <span className="text-[12px] text-emerald-600">✓ Không có</span>
            }
          >
            <div className="divide-y divide-[var(--color-line)]">
              {m.dead_stock.length === 0 && (
                <p className="px-5 py-6 text-center text-xs text-ink-soft">Tất cả sản phẩm active đang bán tốt.</p>
              )}
              {m.dead_stock.slice(0, 6).map((s) => (
                <Link key={s.id} to={`/admin/products/${s.id}`}
                  className="flex items-center gap-3 px-5 py-2.5 hover:bg-[var(--color-tile)]">
                  {s.images?.[0]
                    ? <img src={s.images[0]} alt="" className="h-9 w-9 shrink-0 rounded object-cover object-top bg-[var(--color-tile)]" />
                    : <NoImage />
                  }
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-serif text-sm">{s.name}</p>
                    <p className="text-[12px] text-ink-soft">{s.category} · {s.days_live} ngày · {s.total_stock} tồn · {s.units_sold} bán</p>
                  </div>
                  <span className={`shrink-0 rounded-full px-2 py-0.5 text-[12px] font-medium ${
                    s.alert === "critical" ? "bg-red-100 text-red-700"
                    : s.alert === "warning" ? "bg-amber-100 text-amber-700"
                    : s.alert === "low_conversion" ? "bg-orange-100 text-orange-700"
                    : "bg-[var(--color-tile)] text-ink-soft"
                  }`}>
                    {s.alert === "critical" ? "Nguy hiểm"
                      : s.alert === "warning" ? "Cảnh báo"
                      : s.alert === "low_conversion" ? "Chuyển đổi thấp"
                      : "Theo dõi"}
                  </span>
                </Link>
              ))}
              {m.dead_stock.length > 6 && (
                <p className="px-5 py-2.5 text-center text-[12px] text-ink-soft">
                  + {m.dead_stock.length - 6} sản phẩm khác
                </p>
              )}
            </div>
            {m.dead_stock.length > 0 && (
              <div className="border-t border-[var(--color-line)] px-5 py-3">
                <p className="text-[12px] text-ink-soft leading-relaxed">
                  <strong className="text-ink">Hành động đề xuất:</strong>{" "}
                  {m.dead_stock.filter(s => s.alert === "critical").length > 0
                    ? `${m.dead_stock.filter(s => s.alert === "critical").length} sản phẩm nguy hiểm — nên archive hoặc flash sale ngay.`
                    : "Giảm giá 10–20% hoặc đưa vào campaign email cuối tuần."}
                </p>
              </div>
            )}
          </Card>

          {/* Reorder Urgency */}
          <Card
            title="Dự Báo Hết Hàng"
            action={
              m.reorder_urgency.filter(s => s.urgency === "critical").length > 0
                ? <span className="rounded-full bg-red-100 px-2 py-0.5 text-[12px] text-red-700">
                    {m.reorder_urgency.filter(s => s.urgency === "critical").length} cần nhập gấp
                  </span>
                : m.reorder_urgency.length > 0
                ? <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[12px] text-amber-700">
                    {m.reorder_urgency.length} cần theo dõi
                  </span>
                : <span className="text-[12px] text-emerald-600">✓ Ổn định</span>
            }
          >
            <div className="divide-y divide-[var(--color-line)]">
              {m.reorder_urgency.length === 0 && (
                <p className="px-5 py-6 text-center text-xs text-ink-soft">Không có sản phẩm nào dự kiến hết hàng trong 30 ngày.</p>
              )}
              {m.reorder_urgency.map((s) => (
                <Link key={s.id} to={`/admin/products/${s.id}`}
                  className="flex items-center gap-3 px-5 py-2.5 hover:bg-[var(--color-tile)]">
                  {s.images?.[0]
                    ? <img src={s.images[0]} alt="" className="h-9 w-9 shrink-0 rounded object-cover object-top bg-[var(--color-tile)]" />
                    : <NoImage />
                  }
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-serif text-sm">{s.name}</p>
                    <p className="text-[12px] text-ink-soft">{s.total_stock} tồn · {Number(s.units_per_day).toFixed(1)} đơn/ngày</p>
                  </div>
                  <div className="shrink-0 text-right">
                    <p className={`text-xs font-semibold tabular-nums ${
                      s.urgency === "critical" ? "text-red-600"
                      : s.urgency === "warning" ? "text-amber-600"
                      : "text-ink"
                    }`}>
                      {s.days_until_oos != null ? `${s.days_until_oos} ngày` : "—"}
                    </p>
                    <p className="text-[12px] text-ink-soft">đến khi hết</p>
                  </div>
                </Link>
              ))}
            </div>
            {m.reorder_urgency.length > 0 && (
              <div className="border-t border-[var(--color-line)] px-5 py-3">
                <p className="text-[12px] text-ink-soft">
                  <strong className="text-ink">Nhập gấp (&lt;7 ngày):</strong>{" "}
                  {m.reorder_urgency.filter(s => s.urgency === "critical").map(s => s.style_code).join(", ") || "Không có"}
                </p>
              </div>
            )}
          </Card>
        </div>

        {/* Row 2: RPV + Return Revenue + Channel Perf */}
        <div className="mt-4 grid gap-4 lg:grid-cols-3">

          {/* Revenue Per View by Category */}
          <Card title="Hiệu Quả Traffic · RPV">
            <div className="px-5 py-4 space-y-3">
              {m.rpv_by_category.length === 0 && (
                <p className="py-4 text-center text-xs text-ink-soft">Chưa có dữ liệu.</p>
              )}
              {m.rpv_by_category.map((cat, i) => {
                const maxRpv = Math.max(...m.rpv_by_category.map(c => c.rpv), 1);
                const pct = Math.round((cat.rpv / maxRpv) * 100);
                return (
                  <div key={cat.id}>
                    <div className="mb-1 flex items-center justify-between text-[12px]">
                      <span className="truncate text-ink">{cat.label}</span>
                      <span className="ml-2 shrink-0 tabular-nums text-ink-soft">
                        {compactVnd(cat.rpv)}/lượt xem
                      </span>
                    </div>
                    <div className="h-1.5 w-full rounded-full bg-[var(--color-tile)]">
                      <div
                        className={`h-full rounded-full transition-all ${i === 0 ? "bg-emerald-500" : i === m.rpv_by_category.length - 1 ? "bg-[var(--color-accent)]" : "bg-ink/30"}`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
            {m.rpv_by_category.length > 1 && (() => {
              const best = m.rpv_by_category[0];
              const worst = m.rpv_by_category[m.rpv_by_category.length - 1];
              return (
                <div className="border-t border-[var(--color-line)] px-5 py-3">
                  <p className="text-[12px] text-ink-soft leading-relaxed">
                    <strong className="text-emerald-600">{best.label}</strong> chuyển đổi traffic hiệu quả nhất.{" "}
                    {worst.rpv < best.rpv * 0.3
                      ? <><strong className="text-[var(--color-accent)]">{worst.label}</strong> cần cải thiện ảnh sản phẩm hoặc điều chỉnh giá.</>
                      : "Các danh mục đang cân đối tốt."}
                  </p>
                </div>
              );
            })()}
          </Card>

          {/* Return Revenue by Category */}
          <Card title="Doanh Thu Rủi Ro · Trả Hàng">
            <div className="px-5 py-4 space-y-3">
              {m.return_revenue_by_cat.length === 0 && (
                <p className="py-4 text-center text-xs text-ink-soft">Chưa có dữ liệu.</p>
              )}
              {m.return_revenue_by_cat.map((cat) => (
                <div key={cat.id}>
                  <div className="mb-1 flex items-center justify-between text-[12px]">
                    <span className="truncate text-ink">{cat.label}</span>
                    <span className={`ml-2 shrink-0 tabular-nums font-medium ${
                      cat.return_pct >= 15 ? "text-[var(--color-accent)]"
                      : cat.return_pct >= 8 ? "text-amber-600"
                      : "text-emerald-600"
                    }`}>
                      {cat.return_pct}%
                    </span>
                  </div>
                  <div className="h-1.5 w-full overflow-hidden rounded-full bg-[var(--color-tile)]">
                    <div className="flex h-full">
                      <div
                        className="h-full bg-emerald-400"
                        style={{ width: `${cat.paid_revenue + cat.return_value > 0 ? Math.round(cat.paid_revenue * 100 / (cat.paid_revenue + cat.return_value)) : 100}%` }}
                      />
                      <div
                        className={`h-full ${cat.return_pct >= 15 ? "bg-[var(--color-accent)]" : "bg-amber-400"}`}
                        style={{ width: `${cat.return_pct}%` }}
                      />
                    </div>
                  </div>
                  <p className="mt-0.5 text-[12px] text-ink-soft">{compactVnd(cat.return_value)} bị trả / {compactVnd(cat.paid_revenue + cat.return_value)} tổng</p>
                </div>
              ))}
            </div>
            {m.return_revenue_by_cat.some(c => c.return_pct >= 15) && (
              <div className="border-t border-[var(--color-line)] px-5 py-3">
                <p className="text-[12px] text-ink-soft">
                  <strong className="text-[var(--color-accent)]">Cảnh báo:</strong>{" "}
                  {m.return_revenue_by_cat.filter(c => c.return_pct >= 15).map(c => c.label).join(", ")} có tỷ lệ trả &gt;15% — cần review QC.
                </p>
              </div>
            )}
          </Card>

          {/* Channel Performance */}
          <Card title="Hiệu Suất Kênh Bán">
            <div className="divide-y divide-[var(--color-line)]">
              {m.channel_perf.length === 0 && (
                <p className="px-5 py-6 text-center text-xs text-ink-soft">Chưa có dữ liệu.</p>
              )}
              {(() => {
                const totalRev = m.channel_perf.reduce((s, c) => s + c.revenue, 0);
                return m.channel_perf.map((ch, i) => {
                  const share = totalRev ? Math.round((ch.revenue / totalRev) * 100) : 0;
                  const icons: Record<string, string> = { Web: "🌐", Boutique: "🏪", Instagram: "📸", Wholesale: "📦" };
                  return (
                    <div key={ch.channel} className="flex items-center gap-3 px-5 py-2.5">
                      <span className="text-base">{icons[ch.channel] ?? "📊"}</span>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between">
                          <p className="text-[12px] font-medium text-ink">{ch.channel}</p>
                          <p className="text-[12px] tabular-nums text-ink-soft">{compactVnd(ch.revenue)}</p>
                        </div>
                        <div className="mt-1 h-1 w-full rounded-full bg-[var(--color-tile)]">
                          <div
                            className={`h-full rounded-full ${i === 0 ? "bg-ink" : "bg-ink/30"}`}
                            style={{ width: `${share}%` }}
                          />
                        </div>
                        <p className="mt-0.5 text-[12px] text-ink-soft">{ch.orders} đơn · AOV {compactVnd(ch.aov)} · {share}% doanh thu</p>
                      </div>
                    </div>
                  );
                });
              })()}
            </div>
            {m.channel_perf.length >= 2 && (() => {
              const top = [...m.channel_perf].sort((a, b) => b.aov - a.aov)[0];
              return (
                <div className="border-t border-[var(--color-line)] px-5 py-3">
                  <p className="text-[12px] text-ink-soft">
                    <strong className="text-ink">{top.channel}</strong> có AOV cao nhất ({compactVnd(top.aov)}) — ưu tiên đầu tư vào kênh này.
                  </p>
                </div>
              );
            })()}
          </Card>
        </div>
      </div>
    </div>
  );
}

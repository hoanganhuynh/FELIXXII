import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useAuth } from "../../store/auth";
import { useAsync } from "../lib/useAsync";
import { defaultTrendRange } from "../lib/dateRanges";
import { detectAnomaly } from "../lib/anomaly";
import { getDashboardTrend, getDashboardTrendDetail, type Granularity, type TrendPoint, type TrendDetailPoint } from "../api/dashboard";
import { AreaChart } from "./charts";
import { compactVnd, compact } from "../lib/format";

const GRANULARITIES: Granularity[] = ["month", "quarter", "year"];

export function RevenueTrend() {
  const { t } = useTranslation();
  const { isAdmin } = useAuth();
  const [granularity, setGranularity] = useState<Granularity>("month");
  const [drill, setDrill] = useState<{ index: number; bucket: TrendPoint } | null>(null);

  const { data: series, loading } = useAsync(
    () => {
      if (!isAdmin) return Promise.resolve([]);
      const { start, end } = defaultTrendRange(granularity);
      return getDashboardTrend(granularity, start, end);
    },
    [isAdmin, granularity],
    [] as TrendPoint[]
  );

  const { data: detail, loading: detailLoading } = useAsync(
    () => (drill ? getDashboardTrendDetail(drill.bucket.bucket_start, granularity) : Promise.resolve([])),
    [drill?.bucket.bucket_start, granularity],
    [] as TrendDetailPoint[]
  );

  return (
    <div className="px-4 pb-6 pt-4">
      <div className="mb-3 flex gap-1.5">
        {GRANULARITIES.map((g) => (
          <button
            key={g}
            onClick={() => { setGranularity(g); setDrill(null); }}
            className={`h-7 rounded-md px-3 text-[11px] tracking-wide transition-colors ${
              g === granularity ? "bg-[var(--color-accent)] text-white" : "bg-[var(--color-tile)] text-ink-soft hover:bg-[var(--color-tile-deep)]"
            }`}
          >
            {t(`dash.duration_${g}`)}
          </button>
        ))}
      </div>

      {loading ? (
        <p className="py-16 text-center text-xs text-ink-soft">{t("dash.trend_loading")}</p>
      ) : series.length > 1 ? (
        <AreaChart
          data={series.map((p) => Number(p.revenue))}
          labels={series.map((p) => p.bucket_label)}
          valueFmt={compactVnd}
          height={220}
          onPointClick={(i) => setDrill({ index: i, bucket: series[i] })}
          tooltip={(i) => {
            const p = series[i];
            const prev = series[i - 1];
            const delta = prev && Number(prev.revenue) > 0 ? ((Number(p.revenue) - Number(prev.revenue)) / Number(prev.revenue)) * 100 : null;
            const rateDelta = prev ? Number(p.return_rate) - Number(prev.return_rate) : null;
            const anomaly = detectAnomaly(series, i);
            return (
              <div className="space-y-0.5">
                <div className="font-medium">{p.bucket_label}</div>
                <div>
                  {t("dash.revenue")}: {compactVnd(Number(p.revenue))}
                  {delta !== null && (
                    <span className={delta >= 0 ? "text-[color:var(--color-positive)]" : "text-[color:var(--color-negative)]"}>
                      {" "}{delta >= 0 ? "▲" : "▼"}{Math.abs(delta).toFixed(1)}%
                    </span>
                  )}
                </div>
                <div>{t("dash.orders")}: {compact(Number(p.orders))} · {t("dash.aov")}: {compactVnd(Number(p.aov))}</div>
                <div>
                  {t("dash.return_rate")}: {Number(p.return_rate).toFixed(1)}%
                  {rateDelta !== null && (
                    <span className={rateDelta <= 0 ? "text-[color:var(--color-positive)]" : "text-[color:var(--color-negative)]"}>
                      {" "}{rateDelta > 0 ? "▲" : "▼"}{Math.abs(rateDelta).toFixed(1)}đ
                    </span>
                  )}
                </div>
                {p.top_category_label && <div>{t("dash.top_category")}: {p.top_category_label}</div>}
                {anomaly && (
                  <div className="mt-1 border-t border-white/20 pt-1 text-amber-300">
                    ⚠ {anomaly.metric === "revenue" ? t("dash.revenue") : anomaly.metric === "orders" ? t("dash.orders") : t("dash.return_rate")}{" "}
                    {anomaly.direction === "up" ? "▲" : "▼"} {t("dash.anomaly_note")}
                  </div>
                )}
              </div>
            );
          }}
        />
      ) : (
        <p className="py-16 text-center text-xs text-ink-soft">{t("dash.not_enough")}</p>
      )}

      {drill && (
        <div className="mt-3 rounded-md border edge bg-white/60 px-4 py-3">
          <div className="mb-2 flex items-center justify-between">
            <span className="text-[11px] font-medium text-ink-soft">{drill.bucket.bucket_label}</span>
            <button onClick={() => setDrill(null)} className="text-[11px] text-ink-soft hover:text-ink">✕</button>
          </div>
          {detailLoading ? (
            <p className="text-xs text-ink-soft">{t("dash.drill_loading")}</p>
          ) : (
            <ul className="space-y-1 text-xs">
              {detail.map((d) => (
                <li key={d.bucket_label} className="flex items-baseline justify-between gap-3">
                  <span className="text-ink-soft">{d.bucket_label}</span>
                  <span className="tabular-nums">{compactVnd(Number(d.revenue))} · {compact(Number(d.orders))} {t("dash.orders").toLowerCase()}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}

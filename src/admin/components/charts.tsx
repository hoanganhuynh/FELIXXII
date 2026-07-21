/* Minimal dependency-free SVG charts, palette-driven.
   ink = #1c1917, accent = #7c1f2b, soft grid = line token. */
import { useState, type ReactNode } from "react";

const INK = "#1c1917";
const ACCENT = "#7c1f2b";
const GRID = "#e2dccf";

/* ---- area/line trend ---- */
export function AreaChart({
  data, height = 220, labels, valueFmt = (n) => String(n),
  onPointClick, tooltip,
}: {
  data: number[]; height?: number; labels?: string[]; valueFmt?: (n: number) => string;
  onPointClick?: (index: number) => void;
  tooltip?: (index: number) => ReactNode;
}) {
  const [hover, setHover] = useState<number | null>(null);
  const w = 760, h = height;
  // reserve gutters so axis labels render INSIDE the viewBox
  const padL = 52, padR = 14, padT = 12, padB = 26;
  const plotW = w - padL - padR;
  const plotH = h - padT - padB;

  const max = Math.max(...data, 1);
  const min = 0; // revenue baselines at zero — a floating baseline exaggerates the swing
  const span = max - min || 1;
  const step = data.length > 1 ? plotW / (data.length - 1) : 0;

  const xOf = (i: number) => padL + i * step;
  const yOf = (v: number) => padT + plotH - ((v - min) / span) * plotH;

  const pts = data.map((d, i) => [xOf(i), yOf(d)] as const);
  const line = pts.map((p, i) => `${i ? "L" : "M"}${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(" ");
  const base = padT + plotH;
  const area = `${line} L${pts[pts.length - 1][0].toFixed(1)},${base} L${pts[0][0].toFixed(1)},${base} Z`;

  const ticks = [0, 0.5, 1]; // fraction of max

  return (
    <div className="relative">
      <svg viewBox={`0 0 ${w} ${h}`} className="w-full" role="img" aria-label="Revenue trend">
        <defs>
          <linearGradient id="areaFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={ACCENT} stopOpacity="0.18" />
            <stop offset="100%" stopColor={ACCENT} stopOpacity="0" />
          </linearGradient>
        </defs>

        {/* y grid + value labels */}
        {ticks.map((f) => {
          const v = min + f * span;
          const y = yOf(v);
          return (
            <g key={f}>
              <line x1={padL} x2={w - padR} y1={y} y2={y} stroke={GRID} strokeWidth="1" />
              <text x={padL - 8} y={y + 3} fontSize="9" fill="#948b7d" textAnchor="end">{valueFmt(v)}</text>
            </g>
          );
        })}

        <path d={area} fill="url(#areaFill)" />
        <path d={line} fill="none" stroke={ACCENT} strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
        <circle cx={pts[pts.length - 1][0]} cy={pts[pts.length - 1][1]} r="3.5" fill={ACCENT} />

        {hover !== null && (
          <>
            <line x1={pts[hover][0]} x2={pts[hover][0]} y1={padT} y2={base} stroke={GRID} strokeWidth="1" strokeDasharray="2 2" />
            <circle cx={pts[hover][0]} cy={pts[hover][1]} r="4.5" fill={ACCENT} stroke="#fff" strokeWidth="1.5" />
          </>
        )}

        {/* x labels — anchor the end ones inward so they don't clip */}
        {labels && labels.map((l, i) => (
          <text
            key={i}
            x={xOf(i)}
            y={h - 8}
            fontSize="9"
            fill="#948b7d"
            textAnchor={i === 0 ? "start" : i === labels.length - 1 ? "end" : "middle"}
          >
            {l}
          </text>
        ))}

        {/* invisible per-point hit targets, drawn last so they sit on top */}
        {pts.map((p, i) => (
          <rect
            key={i}
            x={i === 0 ? padL : p[0] - step / 2}
            y={padT}
            width={step || plotW}
            height={plotH}
            fill="transparent"
            style={{ cursor: onPointClick ? "pointer" : "default" }}
            onMouseEnter={() => setHover(i)}
            onMouseLeave={() => setHover(null)}
            onClick={() => onPointClick?.(i)}
          />
        ))}
      </svg>

      {hover !== null && tooltip && (
        <div
          className="pointer-events-none absolute z-10 -translate-x-1/2 whitespace-nowrap rounded-lg bg-ink px-3 py-2 text-[11px] leading-relaxed text-white shadow-lg"
          style={{
            left: `${(pts[hover][0] / w) * 100}%`,
            top: `${Math.max((pts[hover][1] / h) * 100 - 14, 0)}%`,
          }}
        >
          {tooltip(hover)}
        </div>
      )}
    </div>
  );
}

/* ---- horizontal bars ---- */
export function BarList({ items, valueFmt }: { items: { label: string; value: number; sub?: string }[]; valueFmt: (n: number) => string }) {
  const max = Math.max(...items.map((i) => i.value), 1);
  return (
    <ul className="space-y-2.5">
      {items.map((it) => (
        <li key={it.label}>
          <div className="flex items-baseline justify-between gap-3 text-xs">
            <span className="truncate">{it.label}</span>
            <span className="shrink-0 tabular-nums text-ink-soft">{valueFmt(it.value)}</span>
          </div>
          <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-[var(--color-tile)]">
            <div className="h-full rounded-full" style={{ width: `${(it.value / max) * 100}%`, background: ACCENT }} />
          </div>
        </li>
      ))}
    </ul>
  );
}

/* ---- donut ---- */
export function Donut({
  segments, size = 150, valueFmt, center,
}: {
  segments: { label: string; value: number; color: string }[];
  size?: number;
  valueFmt?: (n: number) => string;
  center?: ReactNode;
}) {
  const total = segments.reduce((n, s) => n + s.value, 0) || 1;
  const r = size / 2 - 12, cx = size / 2, cy = size / 2, circ = 2 * Math.PI * r;
  let offset = 0;
  return (
    <div className="flex items-center gap-5">
      <div className="relative shrink-0" style={{ width: size, height: size }}>
        <svg viewBox={`0 0 ${size} ${size}`} width={size} height={size} className="-rotate-90">
          <circle cx={cx} cy={cy} r={r} fill="none" stroke={GRID} strokeWidth="14" />
          {segments.map((s) => {
            const len = (s.value / total) * circ;
            const el = (
              <circle key={s.label} cx={cx} cy={cy} r={r} fill="none" stroke={s.color} strokeWidth="14"
                strokeDasharray={`${len} ${circ - len}`} strokeDashoffset={-offset} />
            );
            offset += len;
            return el;
          })}
        </svg>
        {center && (
          <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center">
            {center}
          </div>
        )}
      </div>
      <ul className="min-w-0 flex-1 space-y-2.5">
        {segments.map((s) => {
          const pct = (s.value / total) * 100;
          return (
            <li key={s.label} className="space-y-0.5">
              <div className="flex items-center gap-2 text-xs">
                <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: s.color }} />
                <span className="font-medium text-ink">{s.label}</span>
                <span className="ml-auto tabular-nums text-ink-soft">{pct.toFixed(0)}%</span>
              </div>
              {valueFmt && (
                <div className="flex items-center gap-2">
                  <span className="h-2 w-2 shrink-0 opacity-0" />
                  <div className="flex min-w-0 flex-1 items-center gap-2">
                    <div className="h-1 flex-1 overflow-hidden rounded-full bg-[var(--color-line)]">
                      <div className="h-full rounded-full" style={{ width: `${pct}%`, background: s.color }} />
                    </div>
                    <span className="shrink-0 tabular-nums text-[11px] text-ink-soft">{valueFmt(s.value)}</span>
                  </div>
                </div>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}

export const CHART_PALETTE = [ACCENT, INK, "#4a5a3a", "#c9a24a", "#26314d", "#2f7d78", "#948b7d"];

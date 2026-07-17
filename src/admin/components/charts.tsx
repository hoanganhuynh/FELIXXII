/* Minimal dependency-free SVG charts, palette-driven.
   ink = #1c1917, accent = #7c1f2b, soft grid = line token. */

const INK = "#1c1917";
const ACCENT = "#7c1f2b";
const GRID = "#e2dccf";

/* ---- area/line trend ---- */
export function AreaChart({
  data, height = 220, labels, valueFmt = (n) => String(n),
}: { data: number[]; height?: number; labels?: string[]; valueFmt?: (n: number) => string }) {
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
    </svg>
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
export function Donut({ segments, size = 150 }: { segments: { label: string; value: number; color: string }[]; size?: number }) {
  const total = segments.reduce((n, s) => n + s.value, 0) || 1;
  const r = size / 2 - 12, cx = size / 2, cy = size / 2, circ = 2 * Math.PI * r;
  let offset = 0;
  return (
    <div className="flex items-center gap-5">
      <svg viewBox={`0 0 ${size} ${size}`} width={size} height={size} className="shrink-0 -rotate-90">
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
      <ul className="space-y-1.5">
        {segments.map((s) => (
          <li key={s.label} className="flex items-center gap-2 text-xs">
            <span className="h-2.5 w-2.5 rounded-full" style={{ background: s.color }} />
            <span className="text-ink-soft">{s.label}</span>
            <span className="tabular-nums">{((s.value / total) * 100).toFixed(0)}%</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export const CHART_PALETTE = [ACCENT, INK, "#4a5a3a", "#c9a24a", "#26314d", "#2f7d78", "#948b7d"];

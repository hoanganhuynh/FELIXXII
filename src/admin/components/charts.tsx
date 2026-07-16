/* Minimal dependency-free SVG charts, palette-driven.
   ink = #1c1917, accent = #7c1f2b, soft grid = line token. */

const INK = "#1c1917";
const ACCENT = "#7c1f2b";
const GRID = "#e2dccf";

/* ---- area/line trend ---- */
export function AreaChart({ data, height = 200, labels }: { data: number[]; height?: number; labels?: string[] }) {
  const w = 760, h = height, pad = 8;
  const max = Math.max(...data, 1);
  const min = Math.min(...data, 0);
  const span = max - min || 1;
  const step = (w - pad * 2) / (data.length - 1 || 1);
  const pts = data.map((d, i) => [pad + i * step, h - pad - ((d - min) / span) * (h - pad * 2)]);
  const line = pts.map((p, i) => `${i ? "L" : "M"}${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(" ");
  const area = `${line} L${pts[pts.length - 1][0].toFixed(1)},${h - pad} L${pts[0][0].toFixed(1)},${h - pad} Z`;
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="w-full" role="img" aria-label="Revenue trend">
      <defs>
        <linearGradient id="areaFill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={ACCENT} stopOpacity="0.18" />
          <stop offset="100%" stopColor={ACCENT} stopOpacity="0" />
        </linearGradient>
      </defs>
      {[0.25, 0.5, 0.75].map((f) => (
        <line key={f} x1={pad} x2={w - pad} y1={pad + f * (h - pad * 2)} y2={pad + f * (h - pad * 2)} stroke={GRID} strokeWidth="1" />
      ))}
      <path d={area} fill="url(#areaFill)" />
      <path d={line} fill="none" stroke={ACCENT} strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
      {pts.map((p, i) => (
        <circle key={i} cx={p[0]} cy={p[1]} r={i === pts.length - 1 ? 3.5 : 0} fill={ACCENT} />
      ))}
      {labels && labels.map((l, i) => (
        <text key={i} x={pad + i * step} y={h - pad + 14} fontSize="9" fill="#948b7d" textAnchor="middle">{l}</text>
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

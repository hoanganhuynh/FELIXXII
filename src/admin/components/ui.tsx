import type { ReactNode } from "react";

/* ---- status / segment badge ---- */
const TONE: Record<string, string> = {
  active: "bg-emerald-50 text-emerald-700 ring-emerald-600/15",
  Delivered: "bg-emerald-50 text-emerald-700 ring-emerald-600/15",
  draft: "bg-amber-50 text-amber-700 ring-amber-600/15",
  Pending: "bg-amber-50 text-amber-700 ring-amber-600/15",
  Processing: "bg-blue-50 text-blue-700 ring-blue-600/15",
  Shipped: "bg-blue-50 text-blue-700 ring-blue-600/15",
  archived: "bg-stone-100 text-stone-500 ring-stone-500/15",
  Cancelled: "bg-stone-100 text-stone-500 ring-stone-500/15",
  Returned: "bg-[var(--color-accent-soft)] text-[var(--color-accent)] ring-[var(--color-accent)]/20",
  VIP: "bg-[var(--color-accent-soft)] text-[var(--color-accent)] ring-[var(--color-accent)]/20",
  Loyal: "bg-emerald-50 text-emerald-700 ring-emerald-600/15",
  New: "bg-blue-50 text-blue-700 ring-blue-600/15",
  "At-risk": "bg-amber-50 text-amber-700 ring-amber-600/15",
  Regular: "bg-stone-100 text-stone-600 ring-stone-500/15",
};

/** `children` stays the canonical DB value so the tone lookup keeps working;
 *  pass `label` to display a translated string. */
export function Badge({ children, label }: { children: string; label?: string }) {
  const tone = TONE[children] ?? "bg-stone-100 text-stone-600 ring-stone-500/15";
  return (
    <span className={`inline-block rounded-full px-2 py-0.5 text-[12px] tracking-wide ring-1 ${tone}`}>
      {label ?? children}
    </span>
  );
}

/* ---- section card ---- */
export function Card({ title, action, children, className = "" }: { title?: string; action?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <section className={`rounded-lg border edge bg-white/40 ${className}`}>
      {title && (
        <header className="flex items-center justify-between border-b edge px-5 py-3.5">
          <h3 className="text-[12px] font-medium tracking-[0.12em] text-ink-soft">{title.toUpperCase()}</h3>
          {action}
        </header>
      )}
      {children}
    </section>
  );
}

/* ---- color dot ---- */
export function Dot({ hex, title }: { hex: string; title?: string }) {
  return <span title={title} className="inline-block h-3.5 w-3.5 shrink-0 rounded-full ring-1 ring-black/10" style={{ background: hex }} />;
}

/* ---- primary / ghost buttons ---- */
export function Btn({ children, onClick, variant = "solid", type = "button", disabled, className = "" }: {
  children: ReactNode; onClick?: () => void; variant?: "solid" | "ghost" | "danger"; type?: "button" | "submit"; disabled?: boolean; className?: string;
}) {
  const styles =
    variant === "solid"
      ? "bg-ink text-white hover:opacity-85"
      : variant === "danger"
        ? "border border-[var(--color-accent)] text-[var(--color-accent)] hover:bg-[var(--color-accent)] hover:text-white"
        : "border edge hover:bg-[var(--color-tile)]";
  return (
    <button type={type} onClick={onClick} disabled={disabled} className={`h-9 rounded-md px-4 text-[12px] tracking-[0.08em] transition-colors disabled:opacity-40 ${styles} ${className}`}>
      {children}
    </button>
  );
}

/* ---- KPI tile ---- */
export function Stat({ label, value, delta, hint }: { label: string; value: string; delta?: number; hint?: string }) {
  return (
    <div className="rounded-lg border edge bg-white/40 px-5 py-4">
      <p className="text-[12px] tracking-[0.12em] text-ink-soft">{label.toUpperCase()}</p>
      <p className="mt-2 font-serif text-2xl tabular-nums leading-none">{value}</p>
      <div className="mt-2 flex items-center gap-2">
        {delta !== undefined && (
          <span
            className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[12px] tabular-nums"
            style={{
              background: delta >= 0 ? "var(--color-positive-bg)" : "var(--color-negative-bg)",
              color: delta >= 0 ? "var(--color-positive)" : "var(--color-negative)",
            }}
          >
            {delta >= 0 ? "▲" : "▼"} {Math.abs(delta).toFixed(1)}%
          </span>
        )}
        {hint && <span className="text-[12px] text-ink-soft">{hint}</span>}
      </div>
    </div>
  );
}

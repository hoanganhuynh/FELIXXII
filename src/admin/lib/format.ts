export const vnd = (n: number) => `${Math.round(n).toLocaleString("vi-VN")}₫`;

export const compactVnd = (n: number) => {
  if (n >= 1_000_000_000) return `${(n / 1_000_000_000).toFixed(1)}B₫`;
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M₫`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(0)}K₫`;
  return `${n}₫`;
};

export const compact = (n: number) => {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(n);
};

export const pct = (n: number, digits = 1) => `${n.toFixed(digits)}%`;

export const fmtDate = (iso: string) =>
  new Date(iso).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });

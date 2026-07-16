import type { Silhouette, AccessoryType } from "../data/catalog";

/** Original generated art — a garment/accessory silhouette on a tinted studio tile. */
export default function GarmentArt({
  color = "#c8c2b4",
  silhouette,
  accessory,
  className = "",
  seed = 0,
}: {
  color?: string;
  silhouette?: Silhouette;
  accessory?: AccessoryType;
  className?: string;
  seed?: number;
}) {
  const uid = `${silhouette ?? accessory ?? "x"}-${seed}`;
  return (
    <svg viewBox="0 0 300 400" className={className} role="img" aria-label="Product illustration">
      <defs>
        <linearGradient id={`bg-${uid}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#efe9dd" />
          <stop offset="100%" stopColor="#e4dccb" />
        </linearGradient>
        <linearGradient id={`cloth-${uid}`} x1="0.2" y1="0" x2="0.8" y2="1">
          <stop offset="0%" stopColor={lighten(color, 0.28)} />
          <stop offset="55%" stopColor={color} />
          <stop offset="100%" stopColor={darken(color, 0.22)} />
        </linearGradient>
        <filter id={`sh-${uid}`} x="-30%" y="-10%" width="160%" height="130%">
          <feDropShadow dx="0" dy="8" stdDeviation="9" floodColor="#000" floodOpacity="0.14" />
        </filter>
      </defs>

      <rect width="300" height="400" fill={`url(#bg-${uid})`} />
      <ellipse cx="150" cy="372" rx="70" ry="9" fill="#000" opacity="0.06" />

      <g filter={`url(#sh-${uid})`} fill={`url(#cloth-${uid})`}>
        {silhouette ? <Dress silhouette={silhouette} color={color} /> : null}
        {accessory ? <Accessory type={accessory} color={color} /> : null}
      </g>
    </svg>
  );
}

function Dress({ silhouette, color }: { silhouette: Silhouette; color: string }) {
  const seam = darken(color, 0.35);
  const straps = (
    <g stroke={seam} strokeWidth="2" fill="none">
      <path d="M132 96c4-18 32-18 36 0" />
    </g>
  );
  switch (silhouette) {
    case "a-line":
      return (
        <g>
          <path d="M120 96q30-16 60 0l6 40-8 8 40 176H82l40-176-8-8z" />
          {straps}
        </g>
      );
    case "mermaid":
      return (
        <g>
          <path d="M124 96q26-14 52 0l4 60q-14 10-14 92c0 40 18 52 34 72H100c16-20 34-32 34-72 0-82-14-92-14-92z" />
          {straps}
        </g>
      );
    case "ball-gown":
      return (
        <g>
          <path d="M122 94q28-14 56 0l6 54q60 30 60 156H56q0-126 60-156z" />
          {straps}
        </g>
      );
    case "wrap":
      return (
        <g>
          <path d="M118 98q32-16 64 0l-6 40 30 168H94l30-168z" />
          <path d="M150 104l-30 60 30 20 30-20-30-60z" fill={darken(color, 0.12)} />
          {straps}
        </g>
      );
    case "slip":
      return (
        <g>
          <path d="M128 92q22-10 44 0l4 44-2 160h-48l-2-160z" />
          <g stroke={seam} strokeWidth="2" fill="none">
            <path d="M132 92c2-14 34-14 36 0" />
          </g>
        </g>
      );
    case "shift":
      return (
        <g>
          <path d="M110 108h80l-4 28 8 8-6 148H112l-6-148 8-8z" />
          <path d="M110 108q40-22 80 0" fill="none" stroke={seam} strokeWidth="2" />
        </g>
      );
  }
}

function Accessory({ type, color }: { type: AccessoryType; color: string }) {
  const line = darken(color, 0.15);
  switch (type) {
    case "necklace":
      return (
        <g fill="none" stroke={color} strokeWidth="5" strokeLinecap="round">
          <path d="M104 150q46 70 92 0" />
          <circle cx="150" cy="212" r="12" fill={color} stroke="none" />
        </g>
      );
    case "earrings":
      return (
        <g fill={color}>
          <circle cx="130" cy="160" r="8" />
          <path d="M130 168c-6 14-6 34 0 46 6-12 6-32 0-46z" />
          <circle cx="170" cy="160" r="8" />
          <path d="M170 168c-6 14-6 34 0 46 6-12 6-32 0-46z" />
        </g>
      );
    case "bracelet":
      return <ellipse cx="150" cy="200" rx="58" ry="46" fill="none" stroke={color} strokeWidth="12" />;
    case "bag":
      return (
        <g>
          <rect x="104" y="176" width="92" height="66" rx="8" fill={color} />
          <path d="M120 176v-10a30 22 0 0160 0v10" fill="none" stroke={line} strokeWidth="5" />
        </g>
      );
    case "shoes":
      return (
        <g fill={color}>
          <path d="M100 200h70q22 0 22 20v14h-96q-8-18 4-34z" />
          <rect x="150" y="234" width="10" height="40" />
        </g>
      );
  }
}

/* colour helpers */
function hexToRgb(hex: string) {
  const h = hex.replace("#", "");
  const n = parseInt(h.length === 3 ? h.split("").map((x) => x + x).join("") : h, 16);
  return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
}
function mix(hex: string, amt: number, target: number) {
  const { r, g, b } = hexToRgb(hex);
  const f = (v: number) => Math.round(v + (target - v) * amt);
  return `rgb(${f(r)},${f(g)},${f(b)})`;
}
const lighten = (hex: string, amt: number) => mix(hex, amt, 255);
const darken = (hex: string, amt: number) => mix(hex, amt, 0);

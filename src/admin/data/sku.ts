/* ============================================================
   FELIXXII — SKU encoding scheme
   Format:  FX-{CC}-{SSSS}-{KK}-{ZZ}
     FX    brand prefix
     CC    category code (2)         EV BR TP ST AC
     SSSS  style serial (4, zero-pad) 0001–9999
     KK    colour code (2)           BK IV BX OL PK BG NV GD JD SV
     ZZ    size code (1–2)           XS S M L XL 2X CU
   Style code (design, no variant):  FX-{CC}-{SSSS}
   ============================================================ */

import type { CategoryId } from "../../data/catalog";

export const CATEGORY_CODE: Record<CategoryId, string> = {
  "dam-da-hoi": "EV",
  "dam-bridal": "BR",
  ao: "TP",
  set: "ST",
};

export const CODE_CATEGORY: Record<string, CategoryId> = Object.fromEntries(
  Object.entries(CATEGORY_CODE).map(([k, v]) => [v, k as CategoryId])
) as Record<string, CategoryId>;

/** colour name (from PALETTE) -> 2-letter code */
export const COLOR_CODE: Record<string, string> = {
  Black: "BK",
  Ivory: "IV",
  Bordeaux: "BX",
  "Olive Green": "OL",
  "Pastel Pink": "PK",
  Beige: "BG",
  Navy: "NV",
  Gold: "GD",
  "Jade Green": "JD",
  Silver: "SV",
};

export const SIZE_CODE: Record<string, string> = {
  XS: "XS",
  S: "S",
  M: "M",
  L: "L",
  XL: "XL",
  "2XL": "2X",
  Custom: "CU",
};

export const pad4 = (n: number) => String(n).padStart(4, "0");

/** style code, e.g. FX-EV-0142 */
export function styleCode(category: CategoryId, serial: number): string {
  return `FX-${CATEGORY_CODE[category]}-${pad4(serial)}`;
}

/** full variant SKU, e.g. FX-EV-0142-NV-M */
export function skuCode(
  category: CategoryId,
  serial: number,
  colorName: string,
  size: string
): string {
  const kk = COLOR_CODE[colorName] ?? "XX";
  const zz = SIZE_CODE[size] ?? size.toUpperCase();
  return `${styleCode(category, serial)}-${kk}-${zz}`;
}

/** EAN-13-style barcode (demo, deterministic from parts).
 *  893 = Vietnam GS1 prefix, then category + serial + colour + size.
 *  The category digit is REQUIRED: serial restarts at 1 per category, so
 *  without it FX-EV-0001-* and FX-BR-0001-* collide on the same barcode. */
export function barcode(
  category: CategoryId,
  serial: number,
  colorIdx: number,
  sizeIdx: number
): string {
  const catNum = Object.keys(CATEGORY_CODE).indexOf(category); // 0–4, stable order
  const base = `893${catNum}${pad4(serial)}${colorIdx}${sizeIdx}`.padEnd(12, "0").slice(0, 12);
  // GS1 check digit
  let sum = 0;
  for (let i = 0; i < 12; i++) sum += Number(base[i]) * (i % 2 === 0 ? 1 : 3);
  const check = (10 - (sum % 10)) % 10;
  return base + check;
}

/** decode a SKU string into parts (for search / validation) */
export function parseSku(sku: string) {
  const m = sku.toUpperCase().match(/^FX-([A-Z]{2})-(\d{4})(?:-([A-Z]{2})-([A-Z0-9]{1,2}))?$/);
  if (!m) return null;
  return {
    brand: "FX",
    categoryCode: m[1],
    category: CODE_CATEGORY[m[1]] ?? null,
    serial: Number(m[2]),
    colorCode: m[3] ?? null,
    sizeCode: m[4] ?? null,
    isStyle: !m[3],
  };
}

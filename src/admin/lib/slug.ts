/* ============================================================
   New Product flow — name-based SKU coding
   Style code:   slug(name)                         THUCKHUE
   Variant SKU:  {styleCode}-{slug(color)}-{sizeIdx} THUCKHUE-XANHNAVY-5
   ============================================================ */

export const SIZES = ["XS", "S", "M", "L", "XL", "2XL"];

/** 1-based position in SIZES, e.g. XL -> 5 */
export const SIZE_INDEX: Record<string, number> = Object.fromEntries(
  SIZES.map((s, i) => [s, i + 1])
);

const COMBINING_MARKS = /[̀-ͯ]/g;

/** strip Vietnamese diacritics, incl. đ/Đ which NFD doesn't decompose */
export function stripDiacritics(s: string): string {
  return s
    .normalize("NFD")
    .replace(COMBINING_MARKS, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D");
}

/** uppercase, alnum-only slug — used for both style codes and colour segments */
export function slugCode(s: string): string {
  return stripDiacritics(s).toUpperCase().replace(/[^A-Z0-9]/g, "");
}

/** style code for a new "Loại sản phẩm", deduped against existing codes */
export function newStyleCode(name: string, existingCodes: string[]): string {
  const base = slugCode(name) || "STYLE";
  const taken = new Set(existingCodes.map((c) => c.toUpperCase()));
  if (!taken.has(base)) return base;
  let n = 2;
  while (taken.has(`${base}${n}`)) n++;
  return `${base}${n}`;
}

/** full variant SKU, e.g. THUCKHUE-XANHNAVY-5 */
export function newSkuCode(styleCode: string, colorName: string, size: string): string {
  const colorSlug = slugCode(colorName) || "XX";
  const sizeIdx = SIZE_INDEX[size] ?? size;
  return `${styleCode}-${colorSlug}-${sizeIdx}`;
}

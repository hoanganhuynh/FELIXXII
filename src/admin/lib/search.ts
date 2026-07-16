/* ============================================================
   Client-side search that approximates the Elasticsearch
   behaviour documented in pages/Reference.tsx.
   Weighted multi-field: sku^5, styleCode^3, name^2, material^1
   + prefix + light fuzzy (edit distance ≤ 1 per token).
   7k SKUs is small enough to score in-memory per keystroke.
   ============================================================ */

import type { Style, Variant } from "../data/generate";

export interface SkuHit {
  style: Style;
  variant: Variant;
  score: number;
}

function norm(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // strip Vietnamese diacritics
    .replace(/đ/g, "d");
}

/** edit distance ≤ 1 test (cheap, bounded) */
function fuzzy1(a: string, b: string): boolean {
  if (a === b) return true;
  const la = a.length, lb = b.length;
  if (Math.abs(la - lb) > 1) return false;
  let i = 0, j = 0, edits = 0;
  while (i < la && j < lb) {
    if (a[i] === b[j]) { i++; j++; continue; }
    if (++edits > 1) return false;
    if (la > lb) i++;
    else if (lb > la) j++;
    else { i++; j++; }
  }
  if (i < la || j < lb) edits++;
  return edits <= 1;
}

function scoreField(field: string, tokens: string[], weight: number): number {
  const nf = norm(field);
  const parts = nf.split(/[\s-]+/).filter(Boolean);
  let score = 0;
  for (const tok of tokens) {
    if (nf === tok) { score += weight * 6; continue; }        // exact whole-field
    if (nf.includes(tok)) score += weight * 3;                 // substring
    if (parts.some((p) => p.startsWith(tok))) score += weight * 2; // prefix on a token
    else if (parts.some((p) => fuzzy1(p, tok))) score += weight; // typo tolerance
  }
  return score;
}

/** search SKU variants. Returns ranked hits, capped. */
export function searchSkus(styles: Style[], query: string, limit = 200): SkuHit[] {
  const q = norm(query).trim();
  if (!q) return [];
  const tokens = q.split(/\s+/).filter(Boolean);
  const hits: SkuHit[] = [];

  for (const style of styles) {
    // style-level score is shared by all its variants
    const styleScore =
      scoreField(style.name, tokens, 2) +
      scoreField(style.styleCode, tokens, 3) +
      scoreField(style.material, tokens, 1) +
      scoreField(style.category, tokens, 1) +
      scoreField(style.collection, tokens, 1);

    for (const v of style.variants) {
      const skuScore =
        scoreField(v.sku, tokens, 5) +
        scoreField(v.colorName, tokens, 1) +
        scoreField(v.barcode, tokens, 4);
      const total = styleScore + skuScore;
      if (total > 0) hits.push({ style, variant: v, score: total });
    }
  }

  hits.sort((a, b) => b.score - a.score || a.variant.sku.localeCompare(b.variant.sku));
  return hits.slice(0, limit);
}

/** search styles (design level). */
export function searchStyles(styles: Style[], query: string): Style[] {
  const q = norm(query).trim();
  if (!q) return styles;
  const tokens = q.split(/\s+/).filter(Boolean);
  return styles
    .map((style) => ({
      style,
      score:
        scoreField(style.name, tokens, 2) +
        scoreField(style.styleCode, tokens, 4) +
        scoreField(style.material, tokens, 1) +
        // match any variant sku
        Math.max(0, ...style.variants.map((v) => scoreField(v.sku, tokens, 3))),
    }))
    .filter((r) => r.score > 0)
    .sort((a, b) => b.score - a.score)
    .map((r) => r.style);
}

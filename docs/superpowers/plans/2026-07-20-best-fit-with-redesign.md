# "Best Fit With" Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the storefront's shoppable "Complete the Look" accessory upsell with a non-commercial styling poll ("Best fit with") that has a "Director's Choice" pick, and remove accessories as a purchasable product anywhere on the storefront (Shop category, standalone detail page, cart) — without touching the shared `CATEGORIES` taxonomy the admin seed generator depends on.

**Architecture:** `Product.look` changes from `Partial<Record<AccessoryType, string[]>>` to `Partial<Record<AccessoryType, LookGroup>>`, where each `LookGroup` names a `directorChoice` accessory id and a list of `{accessoryId, demoVotePct}` options (static illustrative percentages — no backend, no real vote counting, per user decision). A new `BestFitWith.tsx` component (extracted out of the inline `CompleteTheLook` in `Product.tsx`) renders these as clickable poll rows reusing the existing `GarmentArt` generated-art renderer for icons. Every place that currently lets a user browse to, view, or buy an `Accessory` as a product (`Shop.tsx`'s accessories category view, `Product.tsx`'s standalone accessory detail page, `CartDrawer.tsx`'s accessory cart-line resolution) is removed. `CATEGORIES` itself is untouched; a new `SHOP_CATEGORIES` export (== `CATEGORIES` minus `"phu-kien"`) is used only by the 3 storefront nav-rendering spots, so the admin seed generator (which imports `CATEGORIES` directly) is unaffected.

**Tech Stack:** React/TypeScript, Vite, no new dependencies, no backend/Supabase changes.

**Reference spec:** `docs/superpowers/specs/2026-07-20-best-fit-with-redesign-design.md`.

---

### Task 1: Data model — `catalog.ts`

**Files:**
- Modify: `src/data/catalog.ts`

- [ ] **Step 1: Add `LookOption`/`LookGroup`, update `Product.look`, remove `Accessory.price`, add `SHOP_CATEGORIES`**

Replace the `Product` interface's `look` field (currently `look?: Partial<Record<AccessoryType, string[]>>;` at line 79) — insert the new types just above the `Product` interface and change the field:

```ts
export interface LookOption {
  accessoryId: string;
  /** static, illustrative vote share for the demo poll — not derived from real votes */
  demoVotePct: number;
}

export interface LookGroup {
  directorChoice: string; // must match one entry in options[].accessoryId
  options: LookOption[];
}

export interface Product {
  id: string;
  name: string;
  category: CategoryId;
  collection: CollectionId;
  price: number; // VND
  colors: ColorSwatch[];
  sizes: string[];
  silhouette?: Silhouette;
  occasion: Occasion;
  bodyType: string; // gợi ý dáng người
  care: string[];
  material: string;
  customizable?: boolean; // bridal / đầm chỉnh size
  bestseller?: number; // rank (nhỏ = bán chạy hơn)
  createdAt: number; // để sort "mới nhất"
  blurb: string;
  /** real product photos in /public/product-image-demo (fallback = generated art) */
  images?: string[];
  /** best-fit-with: styling poll options per accessory type, with a director's-choice pick */
  look?: Partial<Record<AccessoryType, LookGroup>>;
}
```

Remove `price: number;` from the `Accessory` interface (was line 91):

```ts
export interface Accessory {
  id: string;
  name: string;
  type: AccessoryType;
  category: "phu-kien";
  collection: CollectionId;
  colors: ColorSwatch[];
  detail: string; // pendant dài / drop / cuff...
}
```

Add, immediately after the `CATEGORIES` array (after line 23, before `COLLECTIONS`):

```ts
/** Storefront-browsable categories only. Excludes "phu-kien" — that entry has
 *  zero storefront Product entries today and only ever routed to the
 *  jewelry/bag Accessory poll data, which is no longer a shoppable category.
 *  CATEGORIES itself must stay intact: the admin seed generator
 *  (src/admin/data/generate.ts, via scripts/gen-seed.ts) depends on all 5
 *  entries existing to seed the admin's real "Accessories" garment category. */
export const SHOP_CATEGORIES = CATEGORIES.filter((c) => c.id !== "phu-kien");
```

Remove `price: ...,` from each of the 11 entries in the `accessories` array (was lines 310-320). The array becomes:

```ts
export const accessories: Accessory[] = [
  { id: "day-ngoc", name: "Dây chuyền Ngọc", type: "necklace", category: "phu-kien", collection: "thu-dong-2025", colors: c("gold", "bac"), detail: "Long pendant, pearl face" },
  { id: "chain-kim", name: "Layered Chain Kim", type: "necklace", category: "phu-kien", collection: "xuan-he-2026", colors: c("gold"), detail: "Multi-layered chain" },
  { id: "bong-giot", name: "Bông tai Giọt", type: "earrings", category: "phu-kien", collection: "thu-dong-2025", colors: c("gold", "bac"), detail: "Teardrop earrings" },
  { id: "huggie-vang", name: "Huggie Vàng", type: "earrings", category: "phu-kien", collection: "xuan-he-2026", colors: c("gold"), detail: "Ear-hugging huggies, compact" },
  { id: "lac-manh", name: "Lắc tay Mảnh", type: "bracelet", category: "phu-kien", collection: "xuan-he-2026", colors: c("gold", "bac"), detail: "Delicate, sophisticated thin band" },
  { id: "cuff-bac", name: "Cuff Bạc", type: "bracelet", category: "phu-kien", collection: "thu-dong-2025", colors: c("bac"), detail: "Large statement cuff" },
  { id: "clutch-lua", name: "Clutch Lụa", type: "bag", category: "phu-kien", collection: "thu-dong-2025", colors: c("den", "dodo", "gold"), detail: "Evening clutch, metal clasp" },
  { id: "mini-da", name: "Mini Bag Da", type: "bag", category: "phu-kien", collection: "xuan-he-2026", colors: c("be", "den"), detail: "Leather mini bag, chain strap" },
  { id: "heel-nhung", name: "Block Heel Nhung", type: "shoes", category: "phu-kien", collection: "thu-dong-2025", colors: c("den", "dodo"), detail: "Velvet block heel, 7cm square heel" },
  { id: "mule-satin", name: "Mule Satin", type: "shoes", category: "phu-kien", collection: "xuan-he-2026", colors: c("ngavoi", "hong"), detail: "Pointed-toe satin mule" },
  { id: "sandal-quai", name: "Sandal Quai Mảnh", type: "shoes", category: "phu-kien", collection: "xuan-he-2026", colors: c("be", "den"), detail: "Thin-strap sandal, stiletto heel" },
];
```

- [ ] **Step 2: Migrate all 10 `Product.look` entries**

Every `look:` line changes from `{ type: string[] }` to `{ type: { directorChoice, options } }`. Director's choice = the accessory id the product previously suggested; the alternate option is the catalog's other entry of the same type (60/40 illustrative split throughout). Alternate-pairing used below: `day-ngoc ↔ chain-kim` (necklace), `bong-giot ↔ huggie-vang` (earrings), `lac-manh ↔ cuff-bac` (bracelet), `clutch-lua ↔ mini-da` (bag), and for `shoes` (3 entries) a round-robin: `heel-nhung → mule-satin`, `mule-satin → sandal-quai`, `sandal-quai → heel-nhung`.

In `src/data/catalog.ts`, replace each of the following 10 `look:` lines. Several are textually identical to each other (e.g. `lua-dem`, `moc-lan`, and `cam-tu` all currently have the exact same `look:` line) — disambiguate by the product's `id:` field a few lines above each `look:` line (products appear in this file in the order listed below, top to bottom), not by line number (Step 1's edits shift every line number below the interfaces/`accessories` array).

**Product `lua-dem`**, replace:
```ts
    look: { necklace: ["day-ngoc"], earrings: ["bong-giot"], bag: ["clutch-lua"], shoes: ["heel-nhung"] },
```
with:
```ts
    look: {
      necklace: { directorChoice: "day-ngoc", options: [{ accessoryId: "day-ngoc", demoVotePct: 60 }, { accessoryId: "chain-kim", demoVotePct: 40 }] },
      earrings: { directorChoice: "bong-giot", options: [{ accessoryId: "bong-giot", demoVotePct: 60 }, { accessoryId: "huggie-vang", demoVotePct: 40 }] },
      bag: { directorChoice: "clutch-lua", options: [{ accessoryId: "clutch-lua", demoVotePct: 60 }, { accessoryId: "mini-da", demoVotePct: 40 }] },
      shoes: { directorChoice: "heel-nhung", options: [{ accessoryId: "heel-nhung", demoVotePct: 60 }, { accessoryId: "mule-satin", demoVotePct: 40 }] },
    },
```

**Product `suong-mai`**, replace:
```ts
    look: { earrings: ["huggie-vang"], necklace: ["chain-kim"], shoes: ["mule-satin"] },
```
with:
```ts
    look: {
      earrings: { directorChoice: "huggie-vang", options: [{ accessoryId: "huggie-vang", demoVotePct: 60 }, { accessoryId: "bong-giot", demoVotePct: 40 }] },
      necklace: { directorChoice: "chain-kim", options: [{ accessoryId: "chain-kim", demoVotePct: 60 }, { accessoryId: "day-ngoc", demoVotePct: 40 }] },
      shoes: { directorChoice: "mule-satin", options: [{ accessoryId: "mule-satin", demoVotePct: 60 }, { accessoryId: "sandal-quai", demoVotePct: 40 }] },
    },
```

**Product `nguyet`**, replace:
```ts
    look: { earrings: ["bong-giot"], bracelet: ["lac-manh"], shoes: ["sandal-quai"] },
```
with:
```ts
    look: {
      earrings: { directorChoice: "bong-giot", options: [{ accessoryId: "bong-giot", demoVotePct: 60 }, { accessoryId: "huggie-vang", demoVotePct: 40 }] },
      bracelet: { directorChoice: "lac-manh", options: [{ accessoryId: "lac-manh", demoVotePct: 60 }, { accessoryId: "cuff-bac", demoVotePct: 40 }] },
      shoes: { directorChoice: "sandal-quai", options: [{ accessoryId: "sandal-quai", demoVotePct: 60 }, { accessoryId: "heel-nhung", demoVotePct: 40 }] },
    },
```

**Product `ha-vu`**, replace:
```ts
    look: { necklace: ["chain-kim"], earrings: ["huggie-vang"], bag: ["mini-da"], shoes: ["mule-satin"] },
```
with:
```ts
    look: {
      necklace: { directorChoice: "chain-kim", options: [{ accessoryId: "chain-kim", demoVotePct: 60 }, { accessoryId: "day-ngoc", demoVotePct: 40 }] },
      earrings: { directorChoice: "huggie-vang", options: [{ accessoryId: "huggie-vang", demoVotePct: 60 }, { accessoryId: "bong-giot", demoVotePct: 40 }] },
      bag: { directorChoice: "mini-da", options: [{ accessoryId: "mini-da", demoVotePct: 60 }, { accessoryId: "clutch-lua", demoVotePct: 40 }] },
      shoes: { directorChoice: "mule-satin", options: [{ accessoryId: "mule-satin", demoVotePct: 60 }, { accessoryId: "sandal-quai", demoVotePct: 40 }] },
    },
```

**Product `moc-lan`**, replace:
```ts
    look: { necklace: ["day-ngoc"], earrings: ["bong-giot"], bag: ["clutch-lua"], shoes: ["heel-nhung"] },
```
with:
```ts
    look: {
      necklace: { directorChoice: "day-ngoc", options: [{ accessoryId: "day-ngoc", demoVotePct: 60 }, { accessoryId: "chain-kim", demoVotePct: 40 }] },
      earrings: { directorChoice: "bong-giot", options: [{ accessoryId: "bong-giot", demoVotePct: 60 }, { accessoryId: "huggie-vang", demoVotePct: 40 }] },
      bag: { directorChoice: "clutch-lua", options: [{ accessoryId: "clutch-lua", demoVotePct: 60 }, { accessoryId: "mini-da", demoVotePct: 40 }] },
      shoes: { directorChoice: "heel-nhung", options: [{ accessoryId: "heel-nhung", demoVotePct: 60 }, { accessoryId: "mule-satin", demoVotePct: 40 }] },
    },
```
(This is textually identical to `lua-dem`'s new block — both products happen to suggest the same pairings. Apply this block at `moc-lan`'s `look:` line specifically — the second occurrence of this old text when scanning top to bottom, since `lua-dem` comes first in file order.)

**Product `sen-ao`**, replace:
```ts
    look: { necklace: ["chain-kim"], earrings: ["huggie-vang"], bag: ["mini-da"] },
```
with:
```ts
    look: {
      necklace: { directorChoice: "chain-kim", options: [{ accessoryId: "chain-kim", demoVotePct: 60 }, { accessoryId: "day-ngoc", demoVotePct: 40 }] },
      earrings: { directorChoice: "huggie-vang", options: [{ accessoryId: "huggie-vang", demoVotePct: 60 }, { accessoryId: "bong-giot", demoVotePct: 40 }] },
      bag: { directorChoice: "mini-da", options: [{ accessoryId: "mini-da", demoVotePct: 60 }, { accessoryId: "clutch-lua", demoVotePct: 40 }] },
    },
```

**Product `vu-khuc`**, replace:
```ts
    look: { earrings: ["bong-giot"], bracelet: ["cuff-bac"], bag: ["mini-da"], shoes: ["sandal-quai"] },
```
with:
```ts
    look: {
      earrings: { directorChoice: "bong-giot", options: [{ accessoryId: "bong-giot", demoVotePct: 60 }, { accessoryId: "huggie-vang", demoVotePct: 40 }] },
      bracelet: { directorChoice: "cuff-bac", options: [{ accessoryId: "cuff-bac", demoVotePct: 60 }, { accessoryId: "lac-manh", demoVotePct: 40 }] },
      bag: { directorChoice: "mini-da", options: [{ accessoryId: "mini-da", demoVotePct: 60 }, { accessoryId: "clutch-lua", demoVotePct: 40 }] },
      shoes: { directorChoice: "sandal-quai", options: [{ accessoryId: "sandal-quai", demoVotePct: 60 }, { accessoryId: "heel-nhung", demoVotePct: 40 }] },
    },
```

**Product `cam-tu`**, replace:
```ts
    look: { necklace: ["day-ngoc"], earrings: ["bong-giot"], bag: ["clutch-lua"], shoes: ["heel-nhung"] },
```
with:
```ts
    look: {
      necklace: { directorChoice: "day-ngoc", options: [{ accessoryId: "day-ngoc", demoVotePct: 60 }, { accessoryId: "chain-kim", demoVotePct: 40 }] },
      earrings: { directorChoice: "bong-giot", options: [{ accessoryId: "bong-giot", demoVotePct: 60 }, { accessoryId: "huggie-vang", demoVotePct: 40 }] },
      bag: { directorChoice: "clutch-lua", options: [{ accessoryId: "clutch-lua", demoVotePct: 60 }, { accessoryId: "mini-da", demoVotePct: 40 }] },
      shoes: { directorChoice: "heel-nhung", options: [{ accessoryId: "heel-nhung", demoVotePct: 60 }, { accessoryId: "mule-satin", demoVotePct: 40 }] },
    },
```
(Third and last occurrence of this exact old text, following `cam-tu`'s `id:` — `lua-dem` and `moc-lan` come first in file order.)

**Product `to-vang`**, replace:
```ts
    look: { earrings: ["huggie-vang"], necklace: ["chain-kim"], shoes: ["mule-satin"] },
```
with:
```ts
    look: {
      earrings: { directorChoice: "huggie-vang", options: [{ accessoryId: "huggie-vang", demoVotePct: 60 }, { accessoryId: "bong-giot", demoVotePct: 40 }] },
      necklace: { directorChoice: "chain-kim", options: [{ accessoryId: "chain-kim", demoVotePct: 60 }, { accessoryId: "day-ngoc", demoVotePct: 40 }] },
      shoes: { directorChoice: "mule-satin", options: [{ accessoryId: "mule-satin", demoVotePct: 60 }, { accessoryId: "sandal-quai", demoVotePct: 40 }] },
    },
```
(Second occurrence of this exact old text, following `to-vang`'s `id:` — `suong-mai` comes first in file order.)

**Product `thanh-tan`**, replace:
```ts
    look: { earrings: ["bong-giot"], necklace: ["day-ngoc"], shoes: ["heel-nhung"] },
```
with:
```ts
    look: {
      earrings: { directorChoice: "bong-giot", options: [{ accessoryId: "bong-giot", demoVotePct: 60 }, { accessoryId: "huggie-vang", demoVotePct: 40 }] },
      necklace: { directorChoice: "day-ngoc", options: [{ accessoryId: "day-ngoc", demoVotePct: 60 }, { accessoryId: "chain-kim", demoVotePct: 40 }] },
      shoes: { directorChoice: "heel-nhung", options: [{ accessoryId: "heel-nhung", demoVotePct: 60 }, { accessoryId: "mule-satin", demoVotePct: 40 }] },
    },
```

- [ ] **Step 3: Type-check**

Run: `npx tsc -b --noEmit`
Expected: errors in `src/pages/Shop.tsx`, `src/pages/Product.tsx`, `src/components/CartDrawer.tsx`, `src/components/ProductCard.tsx`, `src/components/ProductImage.tsx` (all reference the old `Accessory.price` or the old `look` shape — expected, fixed in later tasks). No errors should point at `catalog.ts` itself.

- [ ] **Step 4: Commit**

```bash
git add src/data/catalog.ts
git commit -m "$(cat <<'EOF'
Redesign product.look as a director's-choice styling poll

LookGroup replaces the plain accessory-id array with an explicit
directorChoice pick plus per-option demo vote percentages. Removes
Accessory.price (no longer a purchasable product — see later
commits). Adds SHOP_CATEGORIES (CATEGORIES minus phu-kien) for
storefront nav, without touching CATEGORIES itself since the admin
seed generator depends on all 5 entries existing.

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 2: Remove accessories from storefront navigation

**Files:**
- Modify: `src/components/Header.tsx`
- Modify: `src/pages/Home.tsx`

- [ ] **Step 1: `Header.tsx`**

Change the import (line 6):
```ts
import { CATEGORIES, COLLECTIONS } from "../data/catalog";
```
to:
```ts
import { SHOP_CATEGORIES, COLLECTIONS } from "../data/catalog";
```

Replace all 3 uses of `CATEGORIES` with `SHOP_CATEGORIES`:
- Line 51: `{CATEGORIES.slice(0, 3).map((cat) => (` → `{SHOP_CATEGORIES.slice(0, 3).map((cat) => (`
- Line 72: `{CATEGORIES.slice(3).map((cat) => (` → `{SHOP_CATEGORIES.slice(3).map((cat) => (`
- Line 103: `{CATEGORIES.map((cat) => (` → `{SHOP_CATEGORIES.map((cat) => (`

- [ ] **Step 2: `Home.tsx`**

Change the import (line 2):
```ts
import { products, COLLECTIONS, CATEGORIES, IMG_BASE } from "../data/catalog";
```
to:
```ts
import { products, COLLECTIONS, SHOP_CATEGORIES, IMG_BASE } from "../data/catalog";
```

Replace both uses:
- Line 70: `<h2 className="mt-1 font-serif text-2xl">Categories ({CATEGORIES.length})</h2>` → `<h2 className="mt-1 font-serif text-2xl">Categories ({SHOP_CATEGORIES.length})</h2>`
- Line 72: `{CATEGORIES.map((cat) => (` → `{SHOP_CATEGORIES.map((cat) => (`

- [ ] **Step 3: Type-check**

Run: `npx tsc -b --noEmit`
Expected: same set of errors as Task 1 Step 3, minus none new from these two files.

- [ ] **Step 4: Commit**

```bash
git add src/components/Header.tsx src/pages/Home.tsx
git commit -m "$(cat <<'EOF'
Hide Accessories from storefront nav and homepage category tiles

Uses the new SHOP_CATEGORIES export instead of CATEGORIES directly.

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 3: Remove the accessories Shop category view

**Files:**
- Modify: `src/pages/Shop.tsx`

- [ ] **Step 1: Remove the `accessories` import and `isAccessoryView` branch**

Change the import (lines 3-16):
```tsx
import {
  products,
  accessories,
  PALETTE,
  SILHOUETTES,
  OCCASIONS,
  CATEGORIES,
  categoryLabel,
  collectionLabel,
  type CategoryId,
  type CollectionId,
  type Silhouette,
  type Occasion,
} from "../data/catalog";
```
to:
```tsx
import {
  products,
  PALETTE,
  SILHOUETTES,
  OCCASIONS,
  SHOP_CATEGORIES,
  categoryLabel,
  collectionLabel,
  type CategoryId,
  type CollectionId,
  type Silhouette,
  type Occasion,
} from "../data/catalog";
```

Remove `isAccessoryView` (line 51) and simplify the `list` memo (lines 53-79):

Replace:
```tsx
  const isAccessoryView = cat === "phu-kien";

  const list = useMemo(() => {
    let pool: (typeof products[number] | typeof accessories[number])[] = isAccessoryView ? accessories : products;
    if (cat && !isAccessoryView) pool = (pool as typeof products).filter((p) => p.category === cat);
    if (collection) pool = pool.filter((p) => p.collection === collection);

    // faceted (each facet AND; values within a facet OR)
    pool = pool.filter((p) => {
      if (colors.length && !p.colors.some((c) => colors.includes(c.name))) return false;
      if (prices.length && !prices.some((id) => PRICE_BUCKETS.find((b) => b.id === id)!.test(p.price))) return false;
      if (!("type" in p)) {
        if (sizes.length && !sizes.some((s) => p.sizes.includes(s))) return false;
        if (sils.length && (!p.silhouette || !sils.includes(p.silhouette))) return false;
        if (occs.length && !occs.includes(p.occasion)) return false;
      }
      return true;
    });

    const arr = [...pool];
    arr.sort((a, b) => {
      if (sort === "asc") return a.price - b.price;
      if (sort === "desc") return b.price - a.price;
      if (sort === "best") return (("bestseller" in a && a.bestseller) || 99) - (("bestseller" in b && b.bestseller) || 99);
      // new
      return (("createdAt" in b && b.createdAt) || 0) - (("createdAt" in a && a.createdAt) || 0);
    });
    return arr;
  }, [cat, collection, colors, sizes, sils, occs, prices, sort, isAccessoryView]);
```
with:
```tsx
  const list = useMemo(() => {
    let pool = products;
    if (cat) pool = pool.filter((p) => p.category === cat);
    if (collection) pool = pool.filter((p) => p.collection === collection);

    // faceted (each facet AND; values within a facet OR)
    pool = pool.filter((p) => {
      if (colors.length && !p.colors.some((c) => colors.includes(c.name))) return false;
      if (prices.length && !prices.some((id) => PRICE_BUCKETS.find((b) => b.id === id)!.test(p.price))) return false;
      if (sizes.length && !sizes.some((s) => p.sizes.includes(s))) return false;
      if (sils.length && (!p.silhouette || !sils.includes(p.silhouette))) return false;
      if (occs.length && !occs.includes(p.occasion)) return false;
      return true;
    });

    const arr = [...pool];
    arr.sort((a, b) => {
      if (sort === "asc") return a.price - b.price;
      if (sort === "desc") return b.price - a.price;
      if (sort === "best") return (a.bestseller || 99) - (b.bestseller || 99);
      // new
      return b.createdAt - a.createdAt;
    });
    return arr;
  }, [cat, collection, colors, sizes, sils, occs, prices, sort]);
```

- [ ] **Step 2: Use `SHOP_CATEGORIES` for the quick-switch tabs**

Replace (line 111):
```tsx
          {CATEGORIES.map((c) => (
```
with:
```tsx
          {SHOP_CATEGORIES.map((c) => (
```

- [ ] **Step 3: Unwrap the always-true facet-visibility condition**

Replace:
```tsx
          {!isAccessoryView && (
            <>
              <Facet title="Size">
                <ChipRow options={SIZES} active={sizes} onToggle={(v) => setSizes((s) => toggle(s, v))} />
              </Facet>
              <Facet title="Silhouette">
                <ChipRow options={SILHOUETTES.map((s) => s.id)} labels={Object.fromEntries(SILHOUETTES.map((s) => [s.id, s.label]))} active={sils} onToggle={(v) => setSils((s) => toggle(s, v as Silhouette))} />
              </Facet>
              <Facet title="Occasion">
                <ChipRow options={OCCASIONS.map((o) => o.id)} labels={Object.fromEntries(OCCASIONS.map((o) => [o.id, o.label]))} active={occs} onToggle={(v) => setOccs((s) => toggle(s, v as Occasion))} />
              </Facet>
            </>
          )}
```
with:
```tsx
          <Facet title="Size">
            <ChipRow options={SIZES} active={sizes} onToggle={(v) => setSizes((s) => toggle(s, v))} />
          </Facet>
          <Facet title="Silhouette">
            <ChipRow options={SILHOUETTES.map((s) => s.id)} labels={Object.fromEntries(SILHOUETTES.map((s) => [s.id, s.label]))} active={sils} onToggle={(v) => setSils((s) => toggle(s, v as Silhouette))} />
          </Facet>
          <Facet title="Occasion">
            <ChipRow options={OCCASIONS.map((o) => o.id)} labels={Object.fromEntries(OCCASIONS.map((o) => [o.id, o.label]))} active={occs} onToggle={(v) => setOccs((s) => toggle(s, v as Occasion))} />
          </Facet>
```

- [ ] **Step 4: Type-check**

Run: `npx tsc -b --noEmit`
Expected: no errors from `Shop.tsx` itself; the remaining errors are in `Product.tsx`, `CartDrawer.tsx`, `ProductCard.tsx`, `ProductImage.tsx` (fixed in later tasks).

- [ ] **Step 5: Commit**

```bash
git add src/pages/Shop.tsx
git commit -m "$(cat <<'EOF'
Remove the Accessories category view from Shop

Shop only ever lists real Products now. The facet rail (Size/
Silhouette/Occasion) always shows since there's no longer an
accessory-only view that needed to hide it.

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 4: Simplify `ProductImage` and `ProductCard` to `Product`-only

**Files:**
- Modify: `src/components/ProductImage.tsx`
- Modify: `src/components/ProductCard.tsx`

These two components accept a `Product | Accessory` union solely to support the accessory shopping paths removed in Tasks 3, 5, and 6. After those removals, no caller anywhere passes an `Accessory`. Simplify both to `Product`-only rather than leaving a dead union branch.

- [ ] **Step 1: `ProductImage.tsx`**

Replace the whole file:
```tsx
import { IMG_BASE, type Product } from "../data/catalog";
import GarmentArt from "./GarmentArt";

/** Renders a real product photo when available; falls back to generated art. */
export default function ProductImage({
  item,
  index = 0,
  className = "",
  sizes,
}: {
  item: Product;
  index?: number;
  className?: string;
  sizes?: string;
}) {
  if (item.images && item.images.length) {
    const src = IMG_BASE + item.images[Math.min(index, item.images.length - 1)];
    return (
      <img
        src={src}
        alt={item.name}
        loading="lazy"
        sizes={sizes}
        className={`object-cover ${className}`}
      />
    );
  }

  return (
    <GarmentArt
      color={item.colors[0]?.hex}
      silhouette={item.silhouette}
      seed={index}
      className={className}
    />
  );
}
```

- [ ] **Step 2: `ProductCard.tsx`**

Replace the whole file:
```tsx
import { Link } from "react-router-dom";
import ProductImage from "./ProductImage";
import type { Product } from "../data/catalog";

export const vnd = (n: number) => `${n.toLocaleString("vi-VN")}₫`;

export default function ProductCard({ item, index = 0 }: { item: Product; index?: number }) {
  const tag = item.bestseller && item.bestseller <= 3 ? "Bestseller" : item.createdAt >= 20260101 ? "New" : null;

  return (
    <article className="group">
      <Link to={`/san-pham/${item.id}`} className="block">
        <div className="relative aspect-[3/4] overflow-hidden rounded-sm bg-[var(--color-tile)]">
          <ProductImage
            item={item}
            index={index}
            sizes="(max-width: 768px) 50vw, 25vw"
            className="h-full w-full transition-transform duration-[800ms] ease-[var(--ease-out-expo)] group-hover:scale-[1.04]"
          />
          {tag && (
            <span className="label absolute left-3 top-3 bg-[var(--color-bg)]/90 px-2.5 py-1 text-[10px]">
              {tag}
            </span>
          )}
        </div>
      </Link>

      <div className="mt-3">
        <div className="flex items-baseline justify-between gap-2">
          <Link to={`/san-pham/${item.id}`} className="font-serif text-[15px] leading-none link-underline">
            {item.name}
          </Link>
          <span className="text-xs tabular-nums text-ink-soft">{vnd(item.price)}</span>
        </div>
        <div className="mt-2 flex items-center gap-1.5">
          {item.colors.map((c) => (
            <span
              key={c.name}
              title={c.name}
              className="h-3.5 w-3.5 rounded-full ring-1 ring-black/10"
              style={{ background: c.hex }}
            />
          ))}
        </div>
      </div>
    </article>
  );
}
```

- [ ] **Step 3: Type-check**

Run: `npx tsc -b --noEmit`
Expected: remaining errors only in `Product.tsx` and `CartDrawer.tsx` (fixed in Tasks 5-6).

- [ ] **Step 4: Commit**

```bash
git add src/components/ProductImage.tsx src/components/ProductCard.tsx
git commit -m "$(cat <<'EOF'
Simplify ProductImage/ProductCard to Product-only

Both accepted a Product | Accessory union solely to support the
accessory shopping paths being removed in this change — no caller
passes an Accessory anymore.

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 5: Remove the standalone accessory detail page from `Product.tsx`, add `BestFitWith`

**Files:**
- Create: `src/components/BestFitWith.tsx`
- Modify: `src/pages/Product.tsx`

- [ ] **Step 1: Create `src/components/BestFitWith.tsx`**

```tsx
import { useState } from "react";
import { accessoryById, LOOK_LABELS, type AccessoryType, type LookGroup } from "../data/catalog";
import GarmentArt from "./GarmentArt";

export default function BestFitWith({ look }: { look: Partial<Record<AccessoryType, LookGroup>> }) {
  const [selected, setSelected] = useState<Partial<Record<AccessoryType, string>>>({});
  const types = Object.keys(look) as AccessoryType[];

  return (
    <section className="border-y edge bg-[var(--color-tile)]/40 px-5 py-16 md:px-8">
      <div className="mx-auto max-w-[1800px]">
        <p className="label text-[var(--color-accent)]">Styling suggestion</p>
        <h2 className="mt-2 font-serif text-3xl">Best fit with</h2>
        <p className="mt-2 max-w-md text-sm text-ink-soft">
          Vote for the accessories our stylists say pair best with this piece — not sold here.
        </p>

        <div className="mt-8 grid grid-cols-1 gap-x-10 gap-y-8 md:grid-cols-2 lg:grid-cols-3">
          {types.map((type) => {
            const group = look[type];
            if (!group) return null;
            return (
              <div key={type}>
                <p className="mb-3 text-xs font-medium uppercase tracking-[0.06em] text-ink-soft">{LOOK_LABELS[type]}</p>
                <div className="space-y-1">
                  {group.options.map((opt) => {
                    const accessory = accessoryById(opt.accessoryId);
                    if (!accessory) return null;
                    const isDirectorChoice = opt.accessoryId === group.directorChoice;
                    const isSelected = selected[type] === opt.accessoryId;
                    return (
                      <button
                        key={opt.accessoryId}
                        onClick={() => setSelected((s) => ({ ...s, [type]: opt.accessoryId }))}
                        className="flex w-full items-center gap-3 border-b edge py-2 text-left last:border-0"
                      >
                        <span
                          className={`h-9 w-9 shrink-0 overflow-hidden rounded-full bg-white ring-1 ${
                            isSelected ? "ring-2 ring-[var(--color-accent)]" : "ring-black/10"
                          }`}
                        >
                          <GarmentArt accessory={accessory.type} color={accessory.colors[0]?.hex} className="h-full w-full" />
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="flex items-center gap-2 text-xs">
                            <span className="truncate">{accessory.name}</span>
                            {isDirectorChoice && (
                              <span className="shrink-0 rounded-full bg-[var(--color-accent)] px-1.5 py-0.5 text-[8px] tracking-[0.04em] text-white">
                                DIRECTOR'S CHOICE
                              </span>
                            )}
                          </span>
                          <span className="mt-1 block h-1 overflow-hidden rounded-full bg-[var(--color-tile-deep)]">
                            <span
                              className="block h-full rounded-full bg-[var(--color-accent)]"
                              style={{ width: `${opt.demoVotePct}%` }}
                            />
                          </span>
                        </span>
                        <span className="w-9 shrink-0 text-right text-[11px] tabular-nums text-ink-soft">
                          {opt.demoVotePct}%
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
```

- [ ] **Step 2: Remove the accessory detail page path and the old `CompleteTheLook` from `Product.tsx`**

Change the import block (lines 1-17):
```tsx
import { useMemo, useState, type ReactNode } from "react";
import { Link, useParams } from "react-router-dom";
import {
  productById,
  accessoryById,
  products,
  LOOK_LABELS,
  categoryLabel,
  collectionLabel,
  type AccessoryType,
} from "../data/catalog";
import { SIZE_CHART, recommendSize } from "../data/sizing";
import { useCart } from "../store/cart";
import { useBodyProfile } from "../store/bodyProfile";
import ProductImage from "../components/ProductImage";
import ProductCard, { vnd } from "../components/ProductCard";
import NotFound from "./NotFound";
```
to:
```tsx
import { useMemo, useState, type ReactNode } from "react";
import { Link, useParams } from "react-router-dom";
import { productById, products, categoryLabel, collectionLabel } from "../data/catalog";
import { SIZE_CHART, recommendSize } from "../data/sizing";
import { useCart } from "../store/cart";
import { useBodyProfile } from "../store/bodyProfile";
import ProductImage from "../components/ProductImage";
import ProductCard, { vnd } from "../components/ProductCard";
import BestFitWith from "../components/BestFitWith";
import NotFound from "./NotFound";
```

Replace (lines 19-56, the component's opening through `handleAdd`):
```tsx
export default function Product() {
  const { id } = useParams();
  const product = id ? productById(id) : undefined;
  const accessory = id && !product ? accessoryById(id) : undefined;
  const item = product ?? accessory;

  const add = useCart((s) => s.add);
  const measurements = useBodyProfile((s) => s.measurements);
  const openBody = useBodyProfile((s) => s.setModal);

  const [colorIdx, setColorIdx] = useState(0);
  const [size, setSize] = useState<string | null>(null);
  const [added, setAdded] = useState(false);

  const stdSizes = useMemo(() => (product ? product.sizes.filter((s) => s !== "Custom") : []), [product]);
  const rec = useMemo(
    () => (product && measurements ? recommendSize(measurements, stdSizes) : null),
    [product, measurements, stdSizes],
  );

  if (!item) return <NotFound />;
  const color = item.colors[colorIdx] ?? item.colors[0];

  const handleAdd = () => {
    if (product && !size) {
      setSize(rec?.size ?? product.sizes[0]);
    }
    add({
      id: item.id,
      name: item.name,
      price: item.price,
      size: product ? (size ?? rec?.size ?? product.sizes[0]) : undefined,
      colorName: color?.name,
      colorHex: color?.hex,
    });
    setAdded(true);
    setTimeout(() => setAdded(false), 1500);
  };
```
with:
```tsx
export default function Product() {
  const { id } = useParams();
  const product = id ? productById(id) : undefined;

  const add = useCart((s) => s.add);
  const measurements = useBodyProfile((s) => s.measurements);
  const openBody = useBodyProfile((s) => s.setModal);

  const [colorIdx, setColorIdx] = useState(0);
  const [size, setSize] = useState<string | null>(null);
  const [added, setAdded] = useState(false);

  const stdSizes = useMemo(() => (product ? product.sizes.filter((s) => s !== "Custom") : []), [product]);
  const rec = useMemo(
    () => (product && measurements ? recommendSize(measurements, stdSizes) : null),
    [product, measurements, stdSizes],
  );

  if (!product) return <NotFound />;
  const color = product.colors[colorIdx] ?? product.colors[0];

  const handleAdd = () => {
    if (!size) {
      setSize(rec?.size ?? product.sizes[0]);
    }
    add({
      id: product.id,
      name: product.name,
      price: product.price,
      size: size ?? rec?.size ?? product.sizes[0],
      colorName: color?.name,
      colorHex: color?.hex,
    });
    setAdded(true);
    setTimeout(() => setAdded(false), 1500);
  };
```

Now replace the remaining `item.`/`accessory`/`product &&` references in the render body. Replace:
```tsx
          {(product?.images?.length ? product.images.map((_, i) => i) : [0, 3, 6]).map((idx, n) => (
            <div
              key={n}
              className={`overflow-hidden bg-[var(--color-tile)] ${
                n === 0 ? "aspect-[4/5] sm:col-span-2" : "aspect-[3/4]"
              }`}
            >
              <ProductImage item={item} index={idx} className="h-full w-full" />
            </div>
          ))}
        </div>

        {/* info (sticky) */}
        <div className="lg:sticky lg:top-[62px] lg:h-fit">
          <div className="px-5 py-10 md:px-10 lg:px-12 lg:py-14">
            <p className="text-xs text-ink-soft">
              <Link to="/shop" className="link-underline">
                {categoryLabel(item.category)}
              </Link>
              <span className="mx-1.5">·</span>
              {collectionLabel(item.collection)}
            </p>

            <h1 className="mt-3 font-serif text-3xl">{item.name}</h1>
            <p className="mt-2 font-serif text-lg">{vnd(item.price)}</p>
            {accessory && <p className="mt-1 text-sm text-ink-soft">{accessory.detail}</p>}
            {product && <p className="mt-5 max-w-md text-sm leading-relaxed text-ink-soft">{product.blurb}</p>}

            {/* colour */}
            <div className="mt-7">
              <p className="text-xs text-ink-soft">Color: <span className="text-ink">{color?.name}</span></p>
              <div className="mt-2 flex gap-2.5">
                {item.colors.map((c, i) => (
```
with:
```tsx
          {(product.images?.length ? product.images.map((_, i) => i) : [0, 3, 6]).map((idx, n) => (
            <div
              key={n}
              className={`overflow-hidden bg-[var(--color-tile)] ${
                n === 0 ? "aspect-[4/5] sm:col-span-2" : "aspect-[3/4]"
              }`}
            >
              <ProductImage item={product} index={idx} className="h-full w-full" />
            </div>
          ))}
        </div>

        {/* info (sticky) */}
        <div className="lg:sticky lg:top-[62px] lg:h-fit">
          <div className="px-5 py-10 md:px-10 lg:px-12 lg:py-14">
            <p className="text-xs text-ink-soft">
              <Link to="/shop" className="link-underline">
                {categoryLabel(product.category)}
              </Link>
              <span className="mx-1.5">·</span>
              {collectionLabel(product.collection)}
            </p>

            <h1 className="mt-3 font-serif text-3xl">{product.name}</h1>
            <p className="mt-2 font-serif text-lg">{vnd(product.price)}</p>
            <p className="mt-5 max-w-md text-sm leading-relaxed text-ink-soft">{product.blurb}</p>

            {/* colour */}
            <div className="mt-7">
              <p className="text-xs text-ink-soft">Color: <span className="text-ink">{color?.name}</span></p>
              <div className="mt-2 flex gap-2.5">
                {product.colors.map((c, i) => (
```

Now remove the remaining `product && (...)` wrappers that are dead (always true post-guard) — the "size + recommendation", "body-type compatibility", and accordion blocks are already gated on `product &&`, which is now always true after the `if (!product) return <NotFound />;` guard. Replace each `{product && (` with `{(` is unnecessary churn; simpler to leave these as `product && (...)` — they still type-check fine since `product` is now guaranteed non-null by the guard, and TypeScript narrows it. **No change needed** to those blocks or to the "actions"/"accordions" sections — they already reference `product.xxx` directly, not `item.xxx`.

Finally, replace the bottom section:
```tsx
      {/* ---- COMPLETE THE LOOK (feature 3) ---- */}
      {product?.look && <CompleteTheLook look={product.look} />}

      {/* similar */}
      <section className="mx-auto max-w-[1800px] px-5 py-16 md:px-8">
        <h2 className="mb-8 font-serif text-2xl">You might also like</h2>
        <div className="grid grid-cols-2 gap-x-5 gap-y-10 md:grid-cols-4 md:gap-x-6">
          {products.filter((p) => p.id !== item.id).slice(0, 4).map((p, i) => (
            <ProductCard key={p.id} item={p} index={i} />
          ))}
        </div>
      </section>
    </div>
  );
}

function CompleteTheLook({ look }: { look: Partial<Record<AccessoryType, string[]>> }) {
  const groups = (Object.keys(look) as AccessoryType[])
    .map((type) => ({ type, items: (look[type] ?? []).map((id) => accessoryById(id)).filter(Boolean) }))
    .filter((g) => g.items.length);

  return (
    <section className="border-y edge bg-[var(--color-tile)]/40 px-5 py-16 md:px-8">
      <div className="mx-auto max-w-[1800px]">
        <p className="label text-[var(--color-accent)]">Styling suggestion</p>
        <h2 className="mt-2 font-serif text-3xl">Complete the look</h2>
        <p className="mt-2 max-w-md text-sm text-ink-soft">
          Pair with accessories handpicked by our stylist for this piece.
        </p>

        <div className="mt-8 grid grid-cols-2 gap-x-5 gap-y-10 md:grid-cols-3 lg:grid-cols-5">
          {groups.map((g) => (
            <div key={g.type}>
              <p className="mb-3 text-xs font-medium">{LOOK_LABELS[g.type]}</p>
              {g.items.map((a) => a && <ProductCard key={a.id} item={a} />)}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
```
with:
```tsx
      {/* ---- BEST FIT WITH (feature 3) ---- */}
      {product.look && <BestFitWith look={product.look} />}

      {/* similar */}
      <section className="mx-auto max-w-[1800px] px-5 py-16 md:px-8">
        <h2 className="mb-8 font-serif text-2xl">You might also like</h2>
        <div className="grid grid-cols-2 gap-x-5 gap-y-10 md:grid-cols-4 md:gap-x-6">
          {products.filter((p) => p.id !== product.id).slice(0, 4).map((p, i) => (
            <ProductCard key={p.id} item={p} index={i} />
          ))}
        </div>
      </section>
    </div>
  );
}
```

- [ ] **Step 3: Type-check**

Run: `npx tsc -b --noEmit`
Expected: remaining errors only in `CartDrawer.tsx` (fixed in Task 6).

- [ ] **Step 4: Commit**

```bash
git add src/components/BestFitWith.tsx src/pages/Product.tsx
git commit -m "$(cat <<'EOF'
Replace Complete the Look with the Best Fit With poll

Removes the standalone accessory detail-page path (accessoryById
resolution, unconditional Add to Cart for accessories) from
Product.tsx — the page only ever resolves a real Product now, so an
old accessory URL falls through to the existing not-found handling.
BestFitWith renders director's-choice poll rows with GarmentArt icons
instead of shoppable ProductCards.

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 6: Remove accessory cart-line resolution from `CartDrawer.tsx`

**Files:**
- Modify: `src/components/CartDrawer.tsx`

- [ ] **Step 1: Remove the `accessoryById` import and fallback**

Replace (line 4):
```tsx
import { products, productById, accessoryById } from "../data/catalog";
```
with:
```tsx
import { products, productById } from "../data/catalog";
```

Replace (line 51):
```tsx
                const src = productById(l.id) ?? accessoryById(l.id);
```
with:
```tsx
                const src = productById(l.id);
```

- [ ] **Step 2: Type-check**

Run: `npx tsc -b --noEmit`
Expected: no errors anywhere in the project.

- [ ] **Step 3: Commit**

```bash
git add src/components/CartDrawer.tsx
git commit -m "$(cat <<'EOF'
Remove accessory cart-line resolution from CartDrawer

Accessories can no longer be added to cart (Product.tsx no longer
has an accessory detail page), so this fallback is dead.

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 7: End-to-end manual verification

**Files:** none — verification only.

- [ ] **Step 1: Full type-check**

Run: `npx tsc -b --noEmit`
Expected: `TypeScript: No errors found`.

- [ ] **Step 2: Start the dev server and open the storefront**

Open `http://localhost:5180/` in the browser preview. Confirm:
- Header nav no longer shows an "Accessories" link (main nav or mobile menu).
- Homepage "By Category" tile grid no longer shows an "Accessories" tile, and the count in the heading is 4.

- [ ] **Step 3: Shop page**

Navigate to `/shop`. Confirm:
- The quick-switch category tabs no longer include "Accessories".
- Navigating directly to `/shop?cat=phu-kien` shows an empty "No products match" state (or all products, depending on filter semantics) rather than a jewelry/bag grid — confirms the accessories pool is gone.
- Size/Silhouette/Occasion facets are visible regardless of which category tab is active (previously hidden only for the accessories view — now they should always show since that view no longer exists).

- [ ] **Step 4: Product page — Best Fit With poll**

Open any product with a `look` field (e.g. `/san-pham/lua-dem`). Confirm:
- Section heading reads "Best fit with", not "Complete the look"; no prices shown.
- Each accessory type shows 2 rows (or 3 for shoes) with a percentage bar; exactly one row per type has a "DIRECTOR'S CHOICE" badge.
- Clicking a row highlights its icon with a bordeaux ring; clicking a different row in the same type moves the highlight; the percentage numbers do not change on click.
- Reload the page — selection resets (no persistence, as designed).

- [ ] **Step 5: Accessory URLs are no longer shoppable**

Navigate directly to a former accessory detail URL, e.g. `/san-pham/day-ngoc`. Confirm it renders the `NotFound` page (no accessory detail page, no "ADD TO CART" button for it).

- [ ] **Step 6: Cart still works for real products**

From `/shop`, add a real product to cart, open the cart drawer, confirm the line item image/name/price render correctly (exercises `productById` in `CartDrawer.tsx` without the old `accessoryById` fallback).

- [ ] **Step 7: Admin Dashboard unaffected**

Open `/admin` (already logged in as admin from earlier work in this session). Confirm the "Sales by category" panel still shows 5 categories including "Accessories" with real revenue — proving `CATEGORIES` (and the admin seed data built on it) was not affected by this change.

---

## Self-Review Notes

- **Spec coverage:** data model (`LookGroup`/`LookOption`, `Accessory.price` removal), nav/Shop/Product/Cart accessory-purchase removal, and the new `BestFitWith` poll component are covered by Tasks 1-6. Task 7 verifies the admin side is untouched, directly addressing the spec's critical constraint.
- **Placeholders:** none — every step has literal, complete code. The 10 `look` migrations in Task 1 are each written out in full (not summarized as a table) specifically so no step requires inferring unstated values.
- **Type consistency:** `LookGroup`/`LookOption` (Task 1) match exactly what `BestFitWith.tsx` destructures (Task 5) and what the migrated `catalog.ts` entries produce (Task 1, Step 2). `SHOP_CATEGORIES` (Task 1) is consumed identically by `Header.tsx`/`Home.tsx` (Task 2) and `Shop.tsx` (Task 3).
- **Out of scope reminder** (per spec): `CATEGORIES`/`CategoryId` and the admin seed generator are never modified by this plan — Task 7, Step 7 is the explicit proof.

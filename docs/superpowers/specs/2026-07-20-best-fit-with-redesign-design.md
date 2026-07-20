# "Best Fit With" redesign — design

Date: 2026-07-20
Status: draft, pending user review

## Background

The storefront product page (`src/pages/Product.tsx`) has a "Complete the Look" section (`CompleteTheLook`, lines 211-236) that shows accessories (necklace/earrings/bag/etc.) as shoppable `ProductCard`s with prices, pulled from `product.look` (a map of `AccessoryType → accessory id[]`, `src/data/catalog.ts:79`).

User feedback: this reads as an upsell ("buy these accessories"), but the site doesn't actually sell accessories as a business — the correct framing is a stylist's pairing recommendation ("Best fit with"), presented as a non-commercial poll: users can click a shape to indicate their preference, one option per accessory type is labeled "Director's choice" (the production director's recommended pairing), and there is no price or purchase path.

**Scope discovery during research:** accessories are not just cosmetically priced in this one widget — they have a full parallel commerce path today: a browsable/filterable "Accessories" category on the Shop page (`src/pages/Shop.tsx:51-54`, `isAccessoryView`), a standalone shoppable detail page per accessory (`src/pages/Product.tsx:22-23`, `accessoryById(id)`, with an unconditional "ADD TO CART" button), and full cart/checkout support (`src/components/CartDrawer.tsx:4,51`). The user confirmed (via Q&A) the intent is broader than the one widget: remove accessories as purchasable anywhere on the storefront, not just restyle `CompleteTheLook`.

**Critical constraint found during research:** `CategoryId`/`CATEGORIES` (`src/data/catalog.ts:6,17-23`, includes `"phu-kien"` / "Accessories") is **not** specific to the jewelry/bag concept this spec is about — it is the shared 5-category garment taxonomy used by *both* the storefront demo data *and* the admin/Supabase seed generator (`src/admin/data/generate.ts` → `scripts/gen-seed.ts` → `supabase/seed.sql`, e.g. `('phu-kien', 'Accessories', 'AC', 4)` seeds real silk/chiffon garment styles like "Kiều Atelier" that generate real revenue in the admin Dashboard built earlier this session). **This spec does not touch `CATEGORIES` or `CategoryId`** — doing so would silently change the admin's 5-category business simulation. The storefront's small `Accessory`/`AccessoryType` interface (necklace/earrings/bracelet/bag/shoes, `catalog.ts:10,85-94`) is a separate, unrelated data structure that happens to also carry `category: "phu-kien"` on each entry purely so it can reuse the same URL-filter plumbing on the Shop page — no storefront demo `Product` (dress) entry actually uses `category: "phu-kien"` (verified: 0 of 10). Removing the jewelry/bag shopping path only requires touching the components below; the shared category taxonomy is untouched.

## Decisions (from Q&A with user)

1. **Scope**: remove accessories as purchasable anywhere on the storefront (Shop category, standalone detail page, cart) — not just restyle one widget.
2. **Shop/nav visibility**: the "Accessories" entry should not appear as a browsable category anywhere in storefront navigation. Implemented by filtering it out of the 3 storefront components that render `CATEGORIES` (`Header.tsx`, `Home.tsx`, `Shop.tsx`) rather than removing it from the shared array (see constraint above).
3. **Poll persistence**: no backend. No Supabase table, no real vote counting. Percentages are static, illustrative numbers baked into the demo data.
4. **Vote interaction**: clicking an option selects/highlights it (radio-button-like, single selection per accessory type, user can change their mind by clicking another option). The displayed percentage does **not** change in response to the click — it's understood as a fixed "community result" demo figure, not derived from the user's own click.
5. **"Director's choice"**: an explicit per-look field (not an implicit "first array item" convention) — `directorChoice: accessoryId` on each type's look group.
6. **Copy**: eyebrow stays "Styling suggestion"; heading changes from "Complete the look" to "Best fit with"; subcopy clarifies it's a pairing suggestion, not a sale. Storefront pages have no i18n (confirmed: zero `useTranslation` usage in `src/pages/*.tsx`) — new copy is hardcoded English, consistent with the rest of the storefront.
7. **Visual direction** (approved via mockup, Option B): compact horizontal rows per accessory type — small circular icon, name + "DIRECTOR'S CHOICE" badge inline, a thin percentage bar, percentage at the row's end. Selected row gets a bordeaux ring on the icon.

## Data model changes

**`src/data/catalog.ts`**

`Product.look` changes shape from `Partial<Record<AccessoryType, string[]>>` to:

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

// Product interface:
look?: Partial<Record<AccessoryType, LookGroup>>;
```

All 10 existing `look: {...}` entries in `catalog.ts` (lines 119, 143, 166, 185, 204, 222, 240, 258, 281, 305) are migrated to this shape. The `accessories` catalog (`catalog.ts:309-320`) already has exactly 2 real entries per type (3 for `shoes`), so every migrated look group gets a real second option pulled from the existing catalog — no invented data. Example (`lua-dem`'s necklace group, was `necklace: ["day-ngoc"]`):

```ts
necklace: { directorChoice: "day-ngoc", options: [
  { accessoryId: "day-ngoc", demoVotePct: 64 },
  { accessoryId: "chain-kim", demoVotePct: 36 },
] },
```

`Accessory.price` (`catalog.ts:91`) is removed — nothing will read it after the changes below (verified reads today: `ProductCard.tsx:43`, `Product.tsx:87`, `Shop.tsx:61,72-74`, `CartDrawer.tsx:63,83-90` — all removed or made unreachable by this spec).

## Component changes

**`src/pages/Shop.tsx`**: remove the `isAccessoryView`/`accessories` branch entirely (lines 51, 54-55, 62-66, 146) and the `accessories` import — the Shop page only ever lists `products` now. (Defense in depth: even if `CATEGORIES` still contains `"phu-kien"`, the storefront nav no longer links to it — see next point — so this is unreachable via normal navigation, but removing the dead branch avoids a stale `/shop?cat=phu-kien` URL still working.)

**`src/components/Header.tsx`** and **`src/pages/Home.tsx`**: both render `CATEGORIES` directly for nav links / category tiles. Add a local filter, e.g. `CATEGORIES.filter((c) => c.id !== "phu-kien")`, so the shared array stays untouched for the admin seed generator but the storefront never links to it.

**`src/pages/Product.tsx`**: remove the accessory standalone-detail-page path — `accessoryById` import, the `accessory`/`item = product ?? accessory` resolution (lines 5, 22-23), and the accessory-only detail text (line 88). `Product.tsx` only ever resolves and renders a real `Product`. If a URL still points at an old accessory id, it now falls through to whatever this file already does for an unknown product id (i.e., existing not-found handling — no new behavior to build).

**`src/components/CartDrawer.tsx`**: remove the `accessoryById` import and its use in resolving a cart line's source item (line 4, 51) — cart lines only ever resolve via `productById` now.

**New file `src/components/BestFitWith.tsx`** (extracted out of `Product.tsx`, replacing the inline `CompleteTheLook` function, lines 211-236): renders the redesigned section.
- Heading: eyebrow "Styling suggestion", `h2` "Best fit with", subcopy noting these are stylist pairing picks, not for sale.
- For each accessory type present in `look`: a labeled group of horizontal rows (one row per `LookOption`), each row:
  - A small circular icon: `<GarmentArt accessory={type} color={accessory.colors[0]?.hex} className="h-full w-full" />` inside a `overflow-hidden rounded-full` container sized ~34px (reuses the existing generated-art renderer already used elsewhere for products/accessories — no new icon assets).
  - Accessory name, with a "DIRECTOR'S CHOICE" pill badge shown only on the row matching `directorChoice`.
  - A thin percentage bar (`demoVotePct` as width %) and the percentage number, right-aligned.
  - Local component state: `selected: Partial<Record<AccessoryType, string>>` (accessory id per type). Clicking a row sets that type's selection; the selected row's icon gets a 2px bordeaux ring. Nothing is persisted (no localStorage, no network) — resets on page reload, consistent with the "just a UI demo" decision.

## Out of scope

- Any change to `CATEGORIES`/`CategoryId` or the admin seed generator — the shared garment-category taxonomy stays exactly as-is.
- Real vote persistence (Supabase table, RPC, anti-double-vote logic) — explicitly deferred; today's build is presentation-only.
- Any change to the storefront's real `Product` shopping flow (dresses/tops/sets) — only the accessory/jewelry path is affected.
- Expanding the accessory catalog with new items — the redesign reuses the 11 existing accessories as-is.

## Open questions for user review

1. When a `Product` has only 1 accessory suggested for a given type (not applicable after migration, since every type will get a real second option from the existing 2-3-per-type catalog) — not actually a live concern given the current data, noting only in case future products are added with a type that has no second catalog entry yet.
2. Confirm the demo percentage split (e.g., 64/36) is fine as an illustrative placeholder — exact numbers aren't specified by the user, so the implementation plan will pick numbers that feel plausible (director's choice always highest) per look group.

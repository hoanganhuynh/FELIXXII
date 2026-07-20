# Storefront search — design

Date: 2026-07-20
Status: draft, pending user review

## Background

The storefront header's Search icon (`src/components/Header.tsx:77-79`) has no `onClick` and is `hidden md:block` — it does nothing on any screen size and isn't even shown on mobile. There is no search page, modal, store, or text-query logic anywhere in the storefront (`src/pages`, `src/components`, `src/store`); the admin's SKU lookup (`src/admin/pages/Reference.tsx`, backed by a real Postgres RPC `search_skus`) is a separate, admin-only feature and not reusable here. There's no Elasticsearch or backend text-search for the storefront catalog, and the user confirmed that's expected for now — the catalog is small (10 static demo `Product` entries in `src/data/catalog.ts`), so client-side, in-memory filtering is the right scope for a first version.

## Decisions (from Q&A with user)

1. **Form factor**: a full-screen overlay (not a small dropdown) — works the same on mobile and desktop, and fixes the header's mobile gap (Search currently isn't shown on mobile at all).
2. **Empty-query state**: shows the top 5 bestsellers (`Product.bestseller`, lower = better rank), reusing the same sort idiom already used in `Home.tsx`'s "Season Bestsellers" (`(a.bestseller ?? 99) - (b.bestseller ?? 99)`).
3. **Query matching**: name-only, diacritic-insensitive (so typing "lua dem" without accents still matches "Lụa Đêm"), live-filtered as the user types (no submit button), capped at ~8 results.
4. **Scope**: searches `products` only — not `accessories` (consistent with the recent "Best fit with" change, which removed accessories as a purchasable/browsable thing anywhere on the storefront).
5. **Selecting a result**: navigates to `/san-pham/:id` and closes the overlay. Esc or clicking the backdrop also closes it.

## Architecture

- **`src/lib/text.ts`** (new): `normalizeVi(s: string): string` — lowercases and strips Vietnamese diacritics (`đ/Đ` handled explicitly since Unicode NFD doesn't decompose it) for accent-insensitive matching. Small, reusable, no dependency on any component.
- **`src/store/search.ts`** (new): a tiny zustand store `useSearch` exposing `{ open: boolean; setOpen: (v: boolean) => void }` — ephemeral UI state, not persisted, mirroring the existing `useCart`/`useBodyProfile` pattern (`setOpen`/`setModal`) that `Header.tsx` already calls into for the Cart and Account/Body-profile buttons.
- **`src/components/SearchOverlay.tsx`** (new): reads `open`/`setOpen` from `useSearch`. Renders nothing when closed. When open: full-screen backdrop + centered input, live-filters `products` by `normalizeVi(name)` against `normalizeVi(query)`, shows top-5 bestsellers when the query is empty, top ~8 matches otherwise, each row linking to `/san-pham/:id` and closing the overlay on click. Escape key and backdrop click close it. Mounted once in `App.tsx` alongside `CartDrawer`/`BodyProfileModal` (same convention — a top-level overlay component, not nested inside `Header`).
- **`src/components/Header.tsx`**: Search button gets `onClick={() => setOpen(true)}` (from `useSearch`) and drops `hidden md:block` so it's visible at every breakpoint, matching the Account/Cart buttons next to it.
- **`src/App.tsx`**: adds `<SearchOverlay />` next to the existing `<CartDrawer />`/`<BodyProfileModal />` mounts.

## Out of scope

- No Elasticsearch, no backend RPC, no debounced network calls — everything is synchronous, in-memory filtering over the already-imported `products` array.
- No search-history, no recent-searches persistence.
- No matching on category/collection/material text (name-only, per decision 3).
- No changes to the admin SKU search (`Reference.tsx`) — unrelated feature, already backend-driven.

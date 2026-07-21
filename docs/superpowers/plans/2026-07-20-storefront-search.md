# Storefront Search Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the header's Search icon actually work — a full-screen overlay showing bestseller suggestions by default and live, accent-insensitive name search as the user types, with no backend/Elasticsearch involved.

**Architecture:** A tiny non-persisted zustand store (`useSearch`) tracks the overlay's open state, mirroring how `useCart`/`useBodyProfile` already expose `setOpen`/`setModal` to `Header.tsx`. `SearchOverlay.tsx` (new, mounted once in `App.tsx` alongside `CartDrawer`/`BodyProfileModal`) reads that store, filters the in-memory `products` array from `catalog.ts` by a diacritic-stripped substring match on `name`, and falls back to the top-5 bestseller sort already used in `Home.tsx` when the query is empty.

**Tech Stack:** React/TypeScript, zustand (already a dependency), no new packages. No automated test suite in this project — verification is manual via the browser.

**Reference spec:** `docs/superpowers/specs/2026-07-20-storefront-search-design.md`.

---

### Task 1: Diacritic-insensitive text helper

**Files:**
- Create: `src/lib/text.ts`

- [ ] **Step 1: Write the helper**

```ts
/** Lowercases and strips Vietnamese diacritics for accent-insensitive
 *  matching (e.g. "lua dem" matches "Lụa Đêm"). Unicode NFD decomposes
 *  most accented Latin letters into base + combining marks, but "đ" is
 *  its own base letter and needs an explicit swap after lowercasing. */
export function normalizeVi(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d");
}
```

- [ ] **Step 2: Type-check**

Run: `npx tsc -b --noEmit`
Expected: `TypeScript: No errors found` (new file, no other file references it yet).

- [ ] **Step 3: Spot-check the logic in the browser console**

With the dev server running, open the browser console on any storefront page and run:
```js
// paste-testable equivalent of the function above
const normalizeVi = (s) => s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/đ/g, "d");
[normalizeVi("Lụa Đêm"), normalizeVi("lua dem"), normalizeVi("Sương Mai")];
```
Expected: `["lua dem", "lua dem", "suong mai"]` — first two values equal, confirming accent-insensitive matching will work both ways (typed with or without diacritics).

- [ ] **Step 4: Commit**

```bash
git add src/lib/text.ts
git commit -m "$(cat <<'EOF'
Add normalizeVi text helper for accent-insensitive search

Lowercases and strips Vietnamese diacritics (NFD decomposition +
explicit đ/Đ swap, since đ isn't decomposed by NFD) so typing without
accents still matches accented product names.

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 2: Search open/close store

**Files:**
- Create: `src/store/search.ts`

- [ ] **Step 1: Write the store**

```ts
import { create } from "zustand";

interface SearchState {
  open: boolean;
  setOpen: (open: boolean) => void;
}

/** Ephemeral UI state only — not persisted, unlike useCart/useBodyProfile. */
export const useSearch = create<SearchState>((set) => ({
  open: false,
  setOpen: (open) => set({ open }),
}));
```

- [ ] **Step 2: Type-check**

Run: `npx tsc -b --noEmit`
Expected: `TypeScript: No errors found`.

- [ ] **Step 3: Commit**

```bash
git add src/store/search.ts
git commit -m "$(cat <<'EOF'
Add useSearch store for the search overlay's open state

Mirrors the existing useCart/useBodyProfile setOpen/setModal pattern
that Header.tsx already calls into for the Cart and Account buttons.

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 3: `SearchOverlay` component

**Files:**
- Create: `src/components/SearchOverlay.tsx`

- [ ] **Step 1: Write the component**

```tsx
import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { products } from "../data/catalog";
import { useSearch } from "../store/search";
import { normalizeVi } from "../lib/text";
import { vnd } from "./ProductCard";

const BESTSELLER_LIMIT = 5;
const RESULT_LIMIT = 8;

export default function SearchOverlay() {
  const { open, setOpen } = useSearch();
  const [query, setQuery] = useState("");

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [setOpen]);

  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  useEffect(() => {
    if (!open) setQuery("");
  }, [open]);

  const bestsellers = useMemo(
    () => [...products].sort((a, b) => (a.bestseller ?? 99) - (b.bestseller ?? 99)).slice(0, BESTSELLER_LIMIT),
    [],
  );

  const results = useMemo(() => {
    const q = normalizeVi(query.trim());
    if (!q) return bestsellers;
    return products.filter((p) => normalizeVi(p.name).includes(q)).slice(0, RESULT_LIMIT);
  }, [query, bestsellers]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[90] overflow-y-auto bg-[var(--color-bg)]" onClick={() => setOpen(false)}>
      <div className="mx-auto max-w-[720px] px-5 py-10 md:px-8 md:py-16" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between gap-4">
          <input
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search products…"
            className="w-full border-b-2 edge bg-transparent py-2 font-serif text-2xl focus:border-ink focus:outline-none md:text-3xl"
          />
          <button onClick={() => setOpen(false)} aria-label="Close" className="shrink-0 text-ink hover:opacity-60">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4"><path d="M6 6l12 12M18 6L6 18" /></svg>
          </button>
        </div>

        <p className="mt-8 text-xs tracking-[0.1em] text-ink-soft">
          {query.trim() ? "RESULTS" : "BESTSELLERS"}
        </p>
        <ul className="mt-3 divide-y divide-[var(--color-line)]">
          {results.map((p) => (
            <li key={p.id}>
              <Link
                to={`/san-pham/${p.id}`}
                onClick={() => setOpen(false)}
                className="flex items-center justify-between gap-4 py-4 hover:opacity-70"
              >
                <span className="font-serif text-lg">{p.name}</span>
                <span className="shrink-0 text-sm tabular-nums text-ink-soft">{vnd(p.price)}</span>
              </Link>
            </li>
          ))}
          {!results.length && (
            <li className="py-8 text-center text-sm text-ink-soft">No products match "{query}".</li>
          )}
        </ul>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Type-check**

Run: `npx tsc -b --noEmit`
Expected: `TypeScript: No errors found` (`vnd` is already exported from `ProductCard.tsx`; `useSearch`/`normalizeVi` were added in Tasks 1-2).

- [ ] **Step 3: Commit**

```bash
git add src/components/SearchOverlay.tsx
git commit -m "$(cat <<'EOF'
Add SearchOverlay component

Full-screen overlay: shows top-5 bestsellers when the query is empty,
live-filters products by accent-insensitive name match otherwise
(capped at 8 results). Escape and backdrop click close it; selecting
a result navigates to the product page and closes the overlay. Not
yet reachable from the UI — wired into Header.tsx and App.tsx next.

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 4: Wire the Search button and mount the overlay

**Files:**
- Modify: `src/components/Header.tsx`
- Modify: `src/App.tsx`

- [ ] **Step 1: `Header.tsx` — import the store and wire the button**

Add the import (after the existing store imports, e.g. after `import { useAuth } from "../store/auth";`):
```tsx
import { useSearch } from "../store/search";
```

Add a hook call alongside the other store hooks (after `const { user, setLoginOpen } = useAuth();`):
```tsx
  const openSearch = useSearch((s) => s.setOpen);
```

Replace the dead Search button:
```tsx
          <button aria-label="Search" className="hidden text-ink transition-opacity hover:opacity-50 md:block">
            <Icon><circle cx="11" cy="11" r="6" /><path d="M20 20l-4.5-4.5" /></Icon>
          </button>
```
with:
```tsx
          <button aria-label="Search" onClick={() => openSearch(true)} className="text-ink transition-opacity hover:opacity-50">
            <Icon><circle cx="11" cy="11" r="6" /><path d="M20 20l-4.5-4.5" /></Icon>
          </button>
```
(Dropping `hidden md:block` makes it visible at every breakpoint, matching the Account/Cart buttons right next to it.)

- [ ] **Step 2: `App.tsx` — mount the overlay**

Add the import (after `import BodyProfileModal from "./components/BodyProfileModal";`):
```tsx
import SearchOverlay from "./components/SearchOverlay";
```

Add the element inside `Storefront()`, next to the other overlay mounts:
```tsx
      <Header />
      <CartDrawer />
      <BodyProfileModal />
      <LoginDrawer />
      <SearchOverlay />
```

- [ ] **Step 3: Type-check**

Run: `npx tsc -b --noEmit`
Expected: `TypeScript: No errors found`.

- [ ] **Step 4: Manually verify in the browser**

Open the storefront preview at `http://localhost:5180/`.

- Desktop width: click the Search icon in the header. Expected: a full-screen ivory overlay opens with a large input, auto-focused, and a "BESTSELLERS" label above 5 product rows (ranked by the same order as Home's "Season Bestsellers" section).
- Type `lua dem` (no diacritics). Expected: label switches to "RESULTS" and "Lụa Đêm" appears in the filtered list within a few keystrokes (live filtering, no submit needed).
- Type a nonsense query (e.g. `zzzzz`). Expected: `No products match "zzzzz".` message, no rows.
- Click a result row. Expected: navigates to that product's `/san-pham/:id` page and the overlay closes.
- Reopen, press `Escape`. Expected: overlay closes.
- Reopen, click the empty margin outside the centered content column. Expected: overlay closes (backdrop click).
- Resize to a mobile width (e.g. 375px) and confirm the Search icon is now visible in the header (previously `hidden` below `md`) and the overlay still opens/works identically.

- [ ] **Step 5: Commit**

```bash
git add src/components/Header.tsx src/App.tsx
git commit -m "$(cat <<'EOF'
Wire up the header Search button to open SearchOverlay

The Search icon was previously a dead button hidden below the md
breakpoint. It now opens the search overlay and is visible at every
screen size, matching the Account/Cart buttons beside it.

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

## Self-Review Notes

- **Spec coverage:** full-screen form factor, bestseller default, accent-insensitive live name search, product-only scope, and close behaviors (Escape/backdrop/result-click) are all implemented across Tasks 1-4.
- **Placeholders:** none — every step has complete, literal code and concrete expected output.
- **Type consistency:** `SearchOverlay.tsx` (Task 3) imports `useSearch` exactly as defined in Task 2 (`{ open, setOpen }` destructured from the same shape) and `normalizeVi` exactly as defined in Task 1 (single-string-argument, string return).
- **Out of scope reminder** (per spec): no backend/Elasticsearch call, no search history, no category/material matching, no changes to the admin SKU search.

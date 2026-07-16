# FELIXXII — evening & bridal atelier (static frontend + admin)

A couture storefront and its ecommerce admin, built as a **static frontend — no backend**.
Cart, auth and body-profile state persist to `localStorage`; the admin's catalogue is
generated deterministically in memory.

> Demo / case-study build. Brand, copy and catalogue are original; product photography is
> the author's own.

## Stack

- **Vite** + **React 19** + **TypeScript** (strict)
- **Tailwind CSS v4** — design tokens in `src/index.css`
- **React Router v7**
- **Zustand** — cart, auth, body profile (persisted); admin data (in-memory)
- Zero chart/UI dependencies — SVG charts and components are hand-rolled

## Getting started

```bash
npm install
npm run dev        # http://localhost:5180
npm run build      # static bundle → dist/
npm run preview    # preview the production build
```

Storefront: `/` · Admin: `/admin`

## Storefront

| Route | What's there |
|---|---|
| `/` | Hero, collection & category entry points, bestsellers |
| `/shop` | Faceted filter — colour swatches, size, silhouette, occasion, price |
| `/san-pham/:id` | Gallery, size recommendation, Complete the Look, care, size chart |
| `/account` | Orders, wishlist, profile, body profile |

**Body Profile** — the customer saves bust/waist/hip once; `src/data/sizing.ts` scores each
size by distance from its range midpoints and surfaces a recommendation on every PDP.

**Auth** — email (2-step) or Google/Facebook, as a slide-over drawer. Demo only: no real
identity provider is wired up.

## Admin (`/admin`)

Runs against a seeded dataset of **509 styles / ~7,000 SKUs**, 220 orders, 150 customers.

| Route | What's there |
|---|---|
| `/admin` | KPIs, revenue trend, category/collection split, top styles, stock-outs, insights |
| `/admin/products` | Styles \| SKUs views, search, facets, bulk edit, duplicate/delete |
| `/admin/products/:id` | Editor with live SKU preview, variant grid, body-fit rule |
| `/admin/collections` | Collection CRUD + category taxonomy |
| `/admin/orders` | Filters, status transitions, order drawer |
| `/admin/customers` | Segments, LTV, customer drawer |
| `/admin/size-rules` | Editable size chart per body type |
| `/admin/import` | CSV template, create/upsert/overwrite modes, row validation |
| `/admin/reference` | SKU scheme + Elasticsearch mapping/query spec |

### SKU scheme

```
FX - EV - 0142 - NV - M
│    │    │      │    └ size     S M L XL 2X CU
│    │    │      └ colour        BK IV BX OL PK BG NV GD JD SV
│    │    └ style serial         0001–9999
│    └ category                  EV BR TP ST AC
└ brand
```

`FX-EV-0142` is the **style** (a design, grouping its variants); the full string is the
**SKU** (one sellable unit — what stock, barcodes and orders key on). Fixed-width segments
sort as plain text, decode without a lookup, and give Elasticsearch a clean tokenisation
boundary on `-`.

**Product naming**: `{Poetic name} {Line?} {Variant?}` — e.g. *Nguyệt Couture B42*.
Colour, size, SKU and season never appear in the name; they live in structured fields.

### Search

`/admin/reference` carries the full Elasticsearch mapping and query DSL. `sku` is indexed as
a `keyword` (exact), plus `sku.parts` (pattern tokenizer on `-`) and `sku.prefix`
(`search_as_you_type`); `name` uses `asciifolding` so `nguyet` matches `Nguyệt`. Fuzziness
is applied to `name` only — never to `sku`, where a one-character difference is a different
product. `src/admin/lib/search.ts` mirrors that ranking in-memory so the behaviour is
demonstrable without a cluster.

## Structure

```
src/
  components/   Header, Footer, CartDrawer, LoginDrawer, ProductCard, ProductImage, GarmentArt
  pages/        Home, Shop, Product, Account, About, NotFound
  store/        cart · auth · bodyProfile  (zustand + persist)
  data/         catalog.ts (typed catalogue) · sizing.ts (size recommendation)
  admin/
    data/       sku.ts (encoding) · generate.ts (seeded dataset)
    lib/        search.ts (ES-like ranking) · format.ts
    store/      adminData.ts
    pages/      Dashboard, Products, ProductEditor, Collections, Orders,
                Customers, SizeRules, Import, Reference
  index.css     Tailwind v4 tokens + components + animations
```

## Design

- **Type**: Newsreader (serif) + Helvetica/Arial (UI sans)
- **Palette**: warm ivory canvas `#f6f2ea`, warm near-black ink, bordeaux accent `#7c1f2b`
- Scroll reveals, expo easing; respects `prefers-reduced-motion`

## Wiring a backend

The UI is already decoupled from its data. Replace `src/data/catalog.ts` and
`src/admin/store/adminData.ts` with API calls, point `/admin/reference`'s mapping at a real
Elasticsearch index, and swap `LoginDrawer`'s demo handlers for a real identity provider.

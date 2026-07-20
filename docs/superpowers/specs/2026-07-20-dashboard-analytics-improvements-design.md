# Dashboard analytics improvements — design

Date: 2026-07-20
Status: draft, pending user review

## Background

The admin Dashboard (`src/admin/pages/Dashboard.tsx`) renders every KPI tile and chart from one RPC call, `public.dashboard_stats()` (`supabase/migrations/20260716120300_views_rpc.sql:34-120`). The trend chart is a hand-rolled, dependency-free SVG component (`src/admin/components/charts.tsx`) — there is no charting library in the project.

User feedback (Vietnamese, six points) drove this spec:

1. No way to pick a duration (month/quarter/year) or drill into a specific period.
2. Colors overuse the brand accent, making positive/negative trend hard to read; needs lighter backgrounds.
3. No hover tooltip with per-point insight on the chart.
4. Business metrics don't reconcile — total revenue doesn't equal the sum of the component (category/collection) revenues.
5. Missing metrics: repeat-customer rate (by year), average customer LTV.
6. The "return reasons" content needs more detail.

This spec covers all six as one design, staged for implementation in this order: **(1) data-correctness fix → (2) UI/UX (duration, color, tooltip) → (3) new metrics → (4) returns detail**. Each stage is independently shippable; later stages depend on the RPC shape introduced by earlier ones (see Data Flow).

## Decisions already made with the user

- **Color scheme**: Option A — semantic international green/red, light pill backgrounds (`#e7f6ec`/`#1e7d3a` positive, `#fce9ea`/`#c0293b` negative), fully separate from `--color-accent` (brand bordeaux), which stays reserved for brand/CTA/status badges (Returned, VIP).
- **Duration control**: a simple segmented toggle (Tháng / Quý / Năm) above the trend chart. Clicking a bar opens an inline popover with the next-finer breakdown for *that bucket only* (e.g., click a month → popover shows that month's weeks) — no page navigation, no breadcrumb re-render of the whole chart.
- **Tooltip depth**: the fullest option — period label, revenue + delta%, orders + AOV, return rate + delta, top category, plus an auto-generated anomaly line when a metric deviates from its trailing baseline.
- **Repeat-customer rate**: per year Y, among customers who placed at least one order in Y, the % who have ≥2 orders total by the end of Y (computed from `orders.placed_at`, not the denormalized lifetime `customers.orders_count`, since that field reflects "now," not "as of year Y").
- **Returns detail**: add a real `return_reason` column and a capture flow, not just a richer view of existing counts.
- **Layout**: confirmed via the combined mockup — 8 stat tiles (2 new: Khách mua lại, LTV trung bình), category/collection breakdown now reconciles with total revenue, plus a new "Lý do trả hàng" panel.

## Stage 1 — Fix the revenue-reconciliation bug (#4)

**Root cause**: `dashboard_stats()`'s `by_cat` and `by_col` CTEs (lines 67-84) sum `styles.revenue` — a denormalized lifetime/telemetry column on `styles` — while the top-level `kpi.revenue` sums `orders.total` filtered to non-cancelled/non-returned orders (lines 34-51). These are two different universes of data and will never sum to the same total. The `top` CTE (lines 85-90) has the same root cause: it ranks by `styles.revenue`, not actual order revenue.

**Fix**: recompute `by_cat`, `by_col`, and `top` from the same `paid` order set the KPI uses, joined through `order_items → variants → styles`:

```sql
paid_items as (
  select oi.*, v.style_id, s.category_id, s.collection_id
  from public.order_items oi
  join paid p on p.id = oi.order_id
  join public.variants v on v.sku = oi.sku
  join public.styles s on s.id = v.style_id
),
by_cat as (
  select jsonb_agg(jsonb_build_object('id', cat.id, 'label', cat.label, 'value', coalesce(pi.v, 0)) order by coalesce(pi.v,0) desc)
  from public.categories cat
  left join (
    select category_id, sum(qty * price)::bigint as v
    from paid_items group by category_id
  ) pi on pi.category_id = cat.id
),
by_col as ( -- same pattern, grouped by collection_id )
top as (
  select jsonb_agg(t) from (
    select s.id, s.name, s.style_code, coalesce(sum(pi.qty * pi.price), 0)::bigint as revenue, s.units_sold
    from public.styles s
    left join paid_items pi on pi.style_id = s.id
    group by s.id, s.name, s.style_code, s.units_sold
    order by revenue desc limit 6
  ) t
)
```

This makes `sum(by_category[].value) = sum(by_collection[].value) = kpi.revenue` by construction (same `paid_items` source, same date filter once Stage 2's range parameter exists).

`styles.revenue` itself is untouched — it may still be read elsewhere (e.g. `ProductEditor.tsx`) as a lifetime counter; only the Dashboard's aggregation stops treating it as if it were period revenue.

**Also remove**: the now-unnecessary `bridalShare`/`catTotal` workaround in `Dashboard.tsx:19-25` — once `by_category` sums to the same total as `revenue`, the insight can divide directly by `m.revenue` again.

## Stage 2 — Duration control, color tokens, hover tooltip (#1, #2, #3)

**RPC shape change**: `dashboard_stats()` becomes range/granularity-aware. Add a new RPC:

```sql
dashboard_trend(granularity text, range_start date, range_end date) returns jsonb
```

returning bucketed rows `{ bucket_label, bucket_start, revenue, orders, aov, return_rate, top_category_label }` at the requested granularity (`month`/`quarter`/`year`). `dashboard_stats()` keeps returning the non-time-series KPI tiles and breakdowns; the trend chart calls `dashboard_trend` separately so switching granularity doesn't re-fetch the whole dashboard.

**Drill-down popover**: a second lightweight RPC, `dashboard_trend_detail(bucket_start date, bucket_granularity text)`, returns the next-finer buckets for one clicked bar only (e.g., weeks within a clicked month). Called on demand on click — not preloaded for every bar.

**Duration UI**: segmented control (Tháng/Quý/Năm) above `AreaChart` in `Dashboard.tsx`. Default: Tháng, trailing 12 buckets. Switching granularity re-fetches `dashboard_trend` with a sensible default range (12 months / 8 quarters / 5 years). Clicking a bar opens an inline popover (positioned via the bar's x-coordinate) showing the detail RPC result; clicking elsewhere closes it.

**Color tokens** (`src/index.css`): add
```css
--color-positive: #1e7d3a;
--color-positive-bg: #e7f6ec;
--color-negative: #c0293b;
--color-negative-bg: #fce9ea;
```
`Stat` component (`ui.tsx:70-85`) renders the delta as a pill using these tokens instead of `text-emerald-600` / `var(--color-accent)`. The area chart's stroke/fill stays the brand bordeaux (identity, not a status signal) — only delta pills, tooltip deltas, and the new return-rate indicator use the semantic tokens.

**Hover tooltip**: `AreaChart` gains `onMouseMove`/`onMouseLeave` handlers and per-point hit targets (invisible wider rects over each bucket, standard SVG chart pattern, since there's no library). Tooltip content per bucket: label, revenue + delta% (colored pill), orders + AOV, return rate + delta, top category label, and — when applicable — one anomaly line.

**Anomaly rule** (needed for the tooltip's warning line — flagging this as an assumption for spec review): a bucket is anomalous on a metric if it deviates from the trailing 3-bucket average by more than 25% (revenue, orders) or more than 2 percentage points (rates: return rate). This is a simple, explainable heuristic, computed client-side from the already-fetched `dashboard_trend` series (no new backend logic needed) — no ML, no external service.

## Stage 3 — New metrics: repeat-customer rate, average LTV (#5)

Add to `dashboard_stats()`:

```sql
'avg_ltv', (select case when count(*) = 0 then 0 else avg(ltv) end from public.customers),
'repeat_rate_by_year', (
  select jsonb_agg(jsonb_build_object('year', yr, 'rate', rate) order by yr)
  from (
    select
      extract(year from o.placed_at)::int as yr,
      100.0 * count(*) filter (where cust_orders.n >= 2) / count(*) as rate
    from public.orders o
    join lateral (
      select count(*) as n
      from public.orders o2
      where o2.customer_id = o.customer_id
        and o2.placed_at <= (date_trunc('year', o.placed_at) + interval '1 year' - interval '1 day')
    ) cust_orders on true
    group by 1
  ) x
)
```

(Computed per distinct customer per year — the query above double-counts customers with multiple orders in the same year; the real implementation groups by `distinct customer_id` per year first, then classifies each customer once. Spec intent stands; exact SQL will be finalized in the implementation plan.)

Two new stat tiles on the Dashboard: "Khách mua lại" (shows the most recent year's rate, dropdown or small inline chart for prior years) and "LTV trung bình" (`avg_ltv`, formatted with `compactVnd`). Both use the existing `Stat` component — no new UI primitive needed.

## Stage 4 — Return reasons (#6)

**Schema**: new migration adds to `public.orders`:
```sql
create type public.return_reason as enum ('defect', 'wrong_size', 'changed_mind', 'wrong_shipment', 'other');
alter table public.orders add column return_reason public.return_reason;
alter table public.orders add column return_note text;
```
(`return_reason`/`return_note` are null unless `status = 'Returned'`.)

**Capture flow**: in `src/admin/pages/Orders.tsx`, changing an order's status to "Returned" opens a small required form (reason dropdown + optional free-text note) before the status change commits. This is the only place `return_reason` gets written.

**Dashboard panel**: new "Lý do trả hàng" card next to the category breakdown, showing reason distribution (list or donut, matching existing `charts.tsx` primitives) for orders with `status = 'Returned'` in the selected range. Added to `dashboard_stats()` as `return_reasons: [{reason, count, pct}]`.

**i18n**: add reason labels to `src/admin/lib/i18n.ts` (EN + VI blocks), e.g. `return_reason.defect: "Lỗi sản phẩm"`, `wrong_size: "Không vừa size"`, `changed_mind: "Đổi ý"`, `wrong_shipment: "Giao sai/thiếu"`, `other: "Khác"`.

## Out of scope

- Any change to `styles.revenue` itself, or to the pages that already read it as a lifetime counter (`ProductEditor.tsx`).
- Historical backfill of `return_reason` for existing Returned orders (they'll show as "unspecified" in the new panel — a backfill/import script is a separate task if wanted).
- A general-purpose date-range picker component for the rest of the admin — this spec only builds the Tháng/Quý/Năm toggle for the Dashboard trend chart.
- Adopting a charting library — Stage 2 extends the existing hand-rolled SVG chart rather than introducing recharts/etc.

## Open questions for user review

1. Stage 3's repeat-rate SQL sketch has a known double-counting issue (noted inline) that the implementation plan must fix — flagging so it's not mistaken for final SQL.
2. The anomaly threshold (25% / 2pp) is a placeholder heuristic — confirm it's reasonable before implementation, or propose different numbers.
3. "LTV trung bình" is defined as `avg(customers.ltv)` — this is a lifetime, not period-filtered, number even when a duration is selected on the chart (LTV is definitionally lifetime). Confirm this reads clearly to users as "average lifetime value," not "LTV within selected period."

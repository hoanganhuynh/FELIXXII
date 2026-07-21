# Dashboard Repeat-Rate & LTV (Stage 3) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add two new Dashboard metrics — repeat-customer rate by year and average customer LTV — backed by real per-year computation (not the denormalized lifetime `customers.orders_count`, which reflects "now," not "as of year Y").

**Architecture:** `dashboard_stats()` gains two new jsonb fields: `avg_ltv` (a simple average over `customers.ltv`) and `repeat_rate_by_year` (an array of `{year, rate}`, computed per distinct customer-year pair by counting that customer's total orders placed on or before the end of that year). Two new `Stat` tiles render on `Dashboard.tsx`; the KPI grid changes from 6 to 8 tiles and its column count changes from `lg:grid-cols-6` to `lg:grid-cols-4` (matches the approved combined-layout mockup: two rows of four).

**Tech Stack:** Postgres (Supabase migration), React/TypeScript.

**Reference spec:** `docs/superpowers/specs/2026-07-20-dashboard-analytics-improvements-design.md`, section "Stage 3". Builds on Stage 1 (revenue reconciliation, already implemented) and Stage 2 (duration/color/tooltip, already implemented).

**Repeat-rate definition (already approved by user):** for year Y, among customers who placed at least one order in Y, the % who have ≥2 orders total by the end of Y (computed from `orders.placed_at`).

**Known fix vs. the spec's draft SQL:** the spec flagged a double-counting risk in its sketch (a customer with multiple orders in the same year could be counted more than once). This plan's SQL avoids it by first collapsing to distinct `(customer_id, year)` pairs, then computing each pair's cumulative order count exactly once.

---

### Task 1: Backend — `avg_ltv` and `repeat_rate_by_year`

**Files:**
- Create: `supabase/migrations/20260720140000_dashboard_customer_metrics.sql`

- [ ] **Step 1: Write the migration**

Create `supabase/migrations/20260720140000_dashboard_customer_metrics.sql`. This redefines `dashboard_stats()` again (the live definition, per the pattern established in Stages 1-2), adding two fields and leaving everything else identical to `20260720130000_dashboard_trend.sql`'s version:

```sql
-- ============================================================
-- Add avg_ltv and repeat_rate_by_year to dashboard_stats().
--
-- repeat_rate_by_year avoids double-counting a customer who placed
-- multiple orders in the same year: customer_years first collapses
-- to distinct (customer_id, year) pairs, then cumulative_orders
-- computes each pair's total order count (as of that year-end)
-- exactly once, before grouping by year.
-- ============================================================
create or replace function public.dashboard_stats()
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  result jsonb;
begin
  if not public.is_admin() then
    raise exception 'forbidden: admin role required'
      using errcode = '42501';
  end if;

  with paid as (
    select * from public.orders where status not in ('Cancelled', 'Returned')
  ),
  paid_items as (
    select oi.qty, oi.price, v.style_id, s.category_id, s.collection_id
    from public.order_items oi
    join paid p on p.id = oi.order_id
    join public.variants v on v.sku = oi.sku
    join public.styles s on s.id = v.style_id
  ),
  kpi as (
    select
      coalesce(sum(p.total), 0)::bigint as revenue,
      count(*)::int                     as orders,
      coalesce(avg(p.total), 0)::bigint as aov,
      (select coalesce(sum(oi.qty), 0)::int
         from public.order_items oi join paid p2 on p2.id = oi.order_id) as units
    from paid p
  ),
  rates as (
    select
      (select count(*) from public.orders)::int as all_orders,
      (select count(*) from public.orders where status = 'Returned')::int as returned,
      (select coalesce(sum(views), 0) from public.styles)::bigint      as views,
      (select coalesce(sum(units_sold), 0) from public.styles)::bigint as sold
  ),
  by_cat as (
    select jsonb_agg(jsonb_build_object('id', c.id, 'label', c.label, 'value', c.v) order by c.v desc) as rows
    from (
      select cat.id, cat.label, coalesce(sum(pi.qty * pi.price), 0)::bigint as v
      from public.categories cat
      left join paid_items pi on pi.category_id = cat.id
      group by cat.id, cat.label
    ) c
  ),
  by_col as (
    select jsonb_agg(jsonb_build_object('id', c.id, 'label', c.season, 'value', c.v) order by c.sort) as rows
    from (
      select col.id, col.season, col.sort, coalesce(sum(pi.qty * pi.price), 0)::bigint as v
      from public.collections col
      left join paid_items pi on pi.collection_id = col.id
      group by col.id, col.season, col.sort
    ) c
  ),
  top as (
    select jsonb_agg(t) as rows from (
      select s.id, s.name, s.style_code,
             coalesce(sum(pi.qty * pi.price), 0)::bigint as revenue,
             s.units_sold
      from public.styles s
      left join paid_items pi on pi.style_id = s.id
      group by s.id, s.name, s.style_code, s.units_sold
      order by revenue desc
      limit 6
    ) t
  ),
  oos as (
    select jsonb_agg(o) as rows from (
      select s.id, s.name, s.style_code,
             count(v.*)::int                                        as sku_count,
             s.units_sold,
             count(v.*) filter (where v.stock = 0)::int             as oos_count,
             count(v.*) filter (where v.stock between 1 and 3)::int as low_count
      from public.styles s join public.variants v on v.style_id = s.id
      where s.status = 'active'
      group by s.id, s.name, s.style_code, s.units_sold
      having count(v.*) filter (where v.stock = 0) > 0
          or count(v.*) filter (where v.stock between 1 and 3) > 0
      order by (count(v.*) filter (where v.stock = 0) * 2
              + count(v.*) filter (where v.stock between 1 and 3)) desc,
               s.units_sold desc
      limit 6
    ) o
  ),
  oos_total as (select count(*)::int as n from public.variants where stock = 0),
  customer_years as (
    select distinct customer_id, extract(year from placed_at)::int as yr
    from public.orders
  ),
  cumulative_orders as (
    select
      cy.customer_id, cy.yr,
      (select count(*) from public.orders o2
         where o2.customer_id = cy.customer_id
           and o2.placed_at < make_date(cy.yr + 1, 1, 1))::int as orders_thru_year
    from customer_years cy
  ),
  repeat_by_year as (
    select jsonb_agg(jsonb_build_object('year', yr, 'rate', rate) order by yr) as rows
    from (
      select yr, 100.0 * count(*) filter (where orders_thru_year >= 2) / count(*) as rate
      from cumulative_orders
      group by yr
    ) x
  )
  select jsonb_build_object(
    'revenue',       (select revenue from kpi),
    'orders',        (select orders  from kpi),
    'aov',           (select aov     from kpi),
    'units',         (select units   from kpi),
    'return_rate',   (select case when all_orders = 0 then 0 else returned::numeric * 100 / all_orders end from rates),
    'conversion',    (select case when views = 0 then 0 else sold::numeric * 100 / views end from rates),
    'by_category',   coalesce((select rows from by_cat), '[]'::jsonb),
    'by_collection', coalesce((select rows from by_col), '[]'::jsonb),
    'top',           coalesce((select rows from top), '[]'::jsonb),
    'stock_outs',    coalesce((select rows from oos), '[]'::jsonb),
    'oos_skus',      (select n from oos_total),
    'vip_count',     (select count(*)::int from public.customers where segment = 'VIP'),
    'vip_ltv',       (select coalesce(sum(ltv), 0)::bigint from public.customers where segment = 'VIP'),
    'total_ltv',     (select coalesce(sum(ltv), 0)::bigint from public.customers),
    'avg_ltv',       (select coalesce(round(avg(ltv)), 0)::bigint from public.customers),
    'repeat_rate_by_year', coalesce((select rows from repeat_by_year), '[]'::jsonb)
  ) into result;

  return result;
end;
$$;

revoke all on function public.dashboard_stats() from public, anon;
grant execute on function public.dashboard_stats() to authenticated;
```

- [ ] **Step 2: Apply the migration**

Run: `npm run db:reset`
Expected: completes without error, migration `20260720140000_dashboard_customer_metrics.sql` listed.

- [ ] **Step 3: Verify `avg_ltv`**

```bash
supabase db query "select coalesce(round(avg(ltv)), 0)::bigint as avg_ltv, count(*) as customer_count from public.customers;"
```
Note the `avg_ltv` value — you'll compare it against the Dashboard UI in Task 3.

- [ ] **Step 4: Verify `repeat_rate_by_year` has no double-counting**

First, find a customer with 2+ orders in the same year (a case that would double-count with the spec's naive draft SQL):

```bash
supabase db query "
select customer_id, extract(year from placed_at)::int as yr, count(*) as orders_that_year
from public.orders
group by customer_id, yr
having count(*) > 1
order by orders_that_year desc
limit 3;
"
```
Expected: at least one row (confirms the dataset actually exercises the double-counting risk).

Then run the fixed logic directly and confirm each `(customer_id, yr)` pair appears at most once in the intermediate `cumulative_orders` set:

```bash
supabase db query "
with customer_years as (
  select distinct customer_id, extract(year from placed_at)::int as yr
  from public.orders
)
select customer_id, yr, count(*) as pair_count
from customer_years
group by customer_id, yr
having count(*) > 1;
"
```
Expected: **zero rows** — proves `customer_years` (and therefore the final `repeat_rate_by_year` grouping) never counts the same customer twice in the same year regardless of how many orders they placed that year.

- [ ] **Step 5: Sanity-check one year's rate by hand**

```bash
supabase db query "
with customer_years as (
  select distinct customer_id, extract(year from placed_at)::int as yr
  from public.orders
),
cumulative_orders as (
  select
    cy.customer_id, cy.yr,
    (select count(*) from public.orders o2
       where o2.customer_id = cy.customer_id
         and o2.placed_at < make_date(cy.yr + 1, 1, 1))::int as orders_thru_year
  from customer_years cy
)
select yr, count(*) as customers_active, count(*) filter (where orders_thru_year >= 2) as repeat_customers,
       round(100.0 * count(*) filter (where orders_thru_year >= 2) / count(*), 1) as rate_pct
from cumulative_orders
group by yr
order by yr;
"
```
Expected: one row per year present in the seed data, `rate_pct` between 0 and 100, `repeat_customers <= customers_active` for every row (a basic sanity bound — repeat count can never exceed the active count it's a subset of).

- [ ] **Step 6: Confirm the admin gate still holds**

```bash
supabase db query "select dashboard_stats();"
```
Expected: fails with `ERROR: forbidden: admin role required (SQLSTATE 42501)`.

- [ ] **Step 7: Commit**

```bash
git add supabase/migrations/20260720140000_dashboard_customer_metrics.sql
git commit -m "$(cat <<'EOF'
Add avg_ltv and repeat_rate_by_year to dashboard_stats()

repeat_rate_by_year classifies each customer at most once per year
(collapse to distinct customer-year pairs before computing cumulative
order count), fixing the double-counting risk flagged in the spec's
draft SQL. avg_ltv is a simple average over customers.ltv.

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 2: Frontend types + two new `Stat` tiles

**Files:**
- Modify: `src/admin/api/dashboard.ts` (add fields to `DashboardStats`/`EMPTY_STATS`)
- Modify: `src/admin/pages/Dashboard.tsx:62-69` (grid + two new tiles)
- Modify: `src/admin/lib/i18n.ts` (two new keys, EN + VI)

- [ ] **Step 1: Add fields to `DashboardStats`**

In `src/admin/api/dashboard.ts`, add to the `DashboardStats` interface (after `total_ltv: number;`):

```ts
  avg_ltv: number;
  repeat_rate_by_year: { year: number; rate: number }[];
```

Add to `EMPTY_STATS` (after `total_ltv: 0,`):

```ts
  avg_ltv: 0, repeat_rate_by_year: [],
```

- [ ] **Step 2: Add i18n keys**

In `src/admin/lib/i18n.ts` EN `dash` block, after `return_rate: "Return rate",`:
```ts
    repeat_rate: "Repeat customers",
    avg_ltv: "Avg. LTV",
```

In the VI `dash` block, after `return_rate: "Tỷ lệ trả hàng",`:
```ts
    repeat_rate: "Khách mua lại",
    avg_ltv: "LTV trung bình",
```

- [ ] **Step 3: Add the two tiles and widen the grid**

In `src/admin/pages/Dashboard.tsx`, add this computation near the other derived values (after the `vipShare` line):

```tsx
  const repeatYears = m.repeat_rate_by_year;
  const latestRepeat = repeatYears.length ? Number(repeatYears[repeatYears.length - 1].rate) : 0;
  const prevRepeat = repeatYears.length > 1 ? Number(repeatYears[repeatYears.length - 2].rate) : undefined;
  const repeatDelta = prevRepeat !== undefined ? latestRepeat - prevRepeat : undefined;
  const latestRepeatYear = repeatYears.length ? String(repeatYears[repeatYears.length - 1].year) : "";
```

Then replace the KPI grid (currently `grid grid-cols-2 gap-3 lg:grid-cols-6` with 6 `Stat`s):

```tsx
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-6">
          <Stat label={t("dash.revenue")} value={compactVnd(m.revenue)} delta={12.4} hint={t("dash.vs_last")} />
          <Stat label={t("dash.orders")} value={compact(m.orders)} delta={8.1} />
          <Stat label={t("dash.aov")} value={compactVnd(m.aov)} delta={3.9} />
          <Stat label={t("dash.units")} value={compact(m.units)} delta={6.2} />
          <Stat label={t("dash.conversion")} value={`${Number(m.conversion).toFixed(1)}%`} delta={-0.4} />
          <Stat label={t("dash.return_rate")} value={`${Number(m.return_rate).toFixed(1)}%`} delta={-1.2} hint={t("dash.lower_better")} />
        </div>
```

with (widened to 4 columns for 8 tiles, matching the approved mockup):

```tsx
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <Stat label={t("dash.revenue")} value={compactVnd(m.revenue)} delta={12.4} hint={t("dash.vs_last")} />
          <Stat label={t("dash.orders")} value={compact(m.orders)} delta={8.1} />
          <Stat label={t("dash.aov")} value={compactVnd(m.aov)} delta={3.9} />
          <Stat label={t("dash.units")} value={compact(m.units)} delta={6.2} />
          <Stat label={t("dash.conversion")} value={`${Number(m.conversion).toFixed(1)}%`} delta={-0.4} />
          <Stat label={t("dash.return_rate")} value={`${Number(m.return_rate).toFixed(1)}%`} delta={-1.2} hint={t("dash.lower_better")} />
          <Stat label={t("dash.repeat_rate")} value={`${latestRepeat.toFixed(1)}%`} delta={repeatDelta} hint={latestRepeatYear} />
          <Stat label={t("dash.avg_ltv")} value={compactVnd(m.avg_ltv)} />
        </div>
```

- [ ] **Step 4: Type-check**

Run: `npx tsc -b --noEmit`
Expected: no errors.

- [ ] **Step 5: Verify i18n parity**

Run: `npm run i18n:check`
Expected: `missing_in_vi` and `extra_in_vi` empty; `repeat_rate`/`avg_ltv` do not appear in `identical_en_vi`.

- [ ] **Step 6: Manually verify in the browser**

Reload `http://localhost:5180/admin`. Confirm:
- 8 KPI tiles now render in a 4-column grid (2 rows of 4 on desktop).
- "Repeat customers" tile shows a plausible percentage with a year hint; "Avg. LTV" shows a currency value matching Task 1 Step 3's `avg_ltv` query result.
- Switch to VI and confirm "Khách mua lại" / "LTV trung bình" labels render.

- [ ] **Step 7: Commit**

```bash
git add src/admin/api/dashboard.ts src/admin/pages/Dashboard.tsx src/admin/lib/i18n.ts
git commit -m "$(cat <<'EOF'
Surface repeat-customer rate and average LTV on the Dashboard

Two new Stat tiles read the avg_ltv/repeat_rate_by_year fields added
to dashboard_stats(). KPI grid widens from 6 to 8 tiles (2 rows of 4)
to match the approved layout.

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

## Self-Review Notes

- **Spec coverage:** repeat-customer rate by year and average LTV (#5) fully covered by Tasks 1-2.
- **Placeholders:** none — every step has literal SQL/TS content and concrete expected output.
- **Type consistency:** `repeat_rate_by_year: { year: number; rate: number }[]` (Task 2) matches the `jsonb_build_object('year', yr, 'rate', rate)` shape from Task 1 exactly.
- **Double-counting fix verified in Task 1, Step 4** — this was an explicit open question in the spec; this plan closes it rather than carrying the bug forward.
- **Out of scope reminder** (per spec): no new "Customers" page or drill-down for repeat rate — the Dashboard tile shows only the latest year (with the prior year used for the delta). A full per-year breakdown view is not requested and would be a separate feature.

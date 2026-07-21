# Dashboard Revenue Reconciliation (Stage 1) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the Dashboard's category/collection revenue breakdown and top-styles ranking sum to the same total as the top-level "Revenue" KPI, by computing all of them from the same `orders` data instead of two different sources.

**Architecture:** `public.dashboard_stats()` (a single Postgres function) currently computes `by_category`/`by_collection`/`top` from `styles.revenue` (a denormalized lifetime counter) while the top-level `revenue` KPI sums `orders.total`. Its *live* definition is the one in `supabase/migrations/20260716120500_admin_gate.sql` (a later migration than `20260716120300_views_rpc.sql` — `CREATE OR REPLACE FUNCTION` means the last migration to touch it wins), which wraps the same logic in `SECURITY DEFINER` + an explicit `public.is_admin()` check (verified via `auth.jwt() -> 'app_metadata' ->> 'role'`) so non-admins get a clear error instead of a silently-empty dashboard. This plan adds a new migration that replaces the function body — **preserving `security definer`, `set search_path = ''`, and the `is_admin()` gate exactly** — so that inside it, `by_category`, `by_collection`, and `top` are derived from a shared `paid_items` CTE (`order_items` joined through `variants` to `styles`), filtered to the same non-cancelled/non-returned order set the KPI already uses. No new tables, no new RPC, no frontend data-shape changes; only `Dashboard.tsx`'s now-unnecessary `catTotal` workaround is simplified.

**Verification caveat:** because `is_admin()` reads `auth.jwt()`, a direct superuser connection (`supabase db query`, used for verification below) has no JWT and will always fail the gate. Verification therefore runs the same CTE logic as a standalone query (not through the gated RPC) before and after the fix — this proves the reconciliation math without needing to fake an admin session.

**Tech Stack:** Supabase (Postgres) SQL migrations, local Supabase CLI stack (already running: db on port 54322, Studio on 54323), React/TypeScript frontend (no build-time schema regen needed — the RPC's TS return type is untyped `Json`, structurally typed via the `DashboardStats` interface in `src/admin/api/dashboard.ts`).

**Reference spec:** `docs/superpowers/specs/2026-07-20-dashboard-analytics-improvements-design.md`, section "Stage 1".

---

### Task 1: Prove the bug against the live local database

**Files:** none created — this task only runs queries against the already-running local Supabase Postgres (`postgresql://postgres:postgres@127.0.0.1:54322/postgres`).

- [ ] **Step 1: Reset and reseed the local database so there's known data to check against**

Run: `npm run db:reset`
Expected: completes without error, ends with the seed script's summary line (`"N styles · N SKUs · N orders..."`) and `seed-users.ts` output.

- [ ] **Step 2: Query the current (buggy) revenue logic and confirm the mismatch**

`dashboard_stats()` is gated by `is_admin()`, which reads `auth.jwt()` — a direct `supabase db query` connection has no JWT and will always be rejected. So verification runs the *same CTE logic the function contains* directly, as a standalone query, instead of calling the gated RPC:

```bash
supabase db query "
with paid as (
  select * from public.orders where status not in ('Cancelled', 'Returned')
),
kpi_revenue as (
  select coalesce(sum(total), 0)::bigint as v from paid
),
cat_revenue as (
  select coalesce(sum(s.revenue), 0)::bigint as v
  from public.categories cat
  left join public.styles s on s.category_id = cat.id
),
col_revenue as (
  select coalesce(sum(s.revenue), 0)::bigint as v
  from public.collections col
  left join public.styles s on s.collection_id = col.id
)
select
  (select v from kpi_revenue) as kpi_revenue,
  (select v from cat_revenue) as sum_by_category,
  (select v from col_revenue) as sum_by_collection;
"
```
Expected: the three numbers are **different** from each other (e.g. `kpi_revenue` a few hundred million, `sum_by_category`/`sum_by_collection` a much larger and unrelated number). This confirms the bug described in the spec — write down the three values, you'll re-run the equivalent query in Task 2 to confirm the fix.

- [ ] **Step 3: No commit for this task** — it only establishes the "before" baseline.

---

### Task 2: Replace `dashboard_stats()` with a reconciled implementation

**Files:**
- Create: `supabase/migrations/20260720120000_fix_dashboard_revenue.sql`

- [ ] **Step 1: Write the migration**

Create `supabase/migrations/20260720120000_fix_dashboard_revenue.sql`. This preserves the `security definer` + `is_admin()` gate from `20260716120500_admin_gate.sql` exactly (that migration is the live definition — a later `CREATE OR REPLACE FUNCTION` than `20260716120300_views_rpc.sql`) and only changes how `by_cat`/`by_col`/`top` are computed:

```sql
-- ============================================================
-- Fix dashboard_stats(): by_category/by_collection/top must sum
-- to the same total as the top-level `revenue` KPI.
--
-- Root cause: by_cat/by_col/top summed styles.revenue, a denormalized
-- lifetime/telemetry column on `styles`, while kpi.revenue sums
-- orders.total for non-cancelled/non-returned orders. Two different
-- data universes that were never going to add up. This replaces all
-- three with aggregates over the same `paid` order set, joined through
-- order_items -> variants -> styles, so everything reconciles by
-- construction.
--
-- This redefinition preserves the security definer + is_admin() gate
-- from 20260716120500_admin_gate.sql verbatim — only the by_cat/by_col/
-- top CTEs change.
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
  months as (
    select jsonb_agg(x order by x.m) as rows from (
      select to_char(date_trunc('month', placed_at), 'YYYY-MM') as m,
             sum(total)::bigint as v
      from paid group by 1 order by 1
    ) x
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
  oos_total as (select count(*)::int as n from public.variants where stock = 0)
  select jsonb_build_object(
    'revenue',       (select revenue from kpi),
    'orders',        (select orders  from kpi),
    'aov',           (select aov     from kpi),
    'units',         (select units   from kpi),
    'return_rate',   (select case when all_orders = 0 then 0 else returned::numeric * 100 / all_orders end from rates),
    'conversion',    (select case when views = 0 then 0 else sold::numeric * 100 / views end from rates),
    'months',        coalesce((select rows from months), '[]'::jsonb),
    'by_category',   coalesce((select rows from by_cat), '[]'::jsonb),
    'by_collection', coalesce((select rows from by_col), '[]'::jsonb),
    'top',           coalesce((select rows from top), '[]'::jsonb),
    'stock_outs',    coalesce((select rows from oos), '[]'::jsonb),
    'oos_skus',      (select n from oos_total),
    'vip_count',     (select count(*)::int from public.customers where segment = 'VIP'),
    'vip_ltv',       (select coalesce(sum(ltv), 0)::bigint from public.customers where segment = 'VIP'),
    'total_ltv',     (select coalesce(sum(ltv), 0)::bigint from public.customers)
  ) into result;

  return result;
end;
$$;

revoke all on function public.dashboard_stats() from public, anon;
grant execute on function public.dashboard_stats() to authenticated;
```

- [ ] **Step 2: Apply the migration to the local database**

Run: `npm run db:reset`
Expected: completes without error, ends with the seed script's summary line — this replays all migrations (including the new one) against a fresh database, then reseeds it, matching Task 1's baseline data volume.

- [ ] **Step 3: Confirm the admin gate still rejects an unauthenticated call**

`supabase db query` connects as the Postgres superuser with no JWT, so it must still be rejected exactly as before — this proves the migration didn't accidentally weaken the security check:

Run:
```bash
supabase db query "select dashboard_stats();"
```
Expected: fails with `ERROR: forbidden: admin role required (SQLSTATE 42501)` — same error as before the migration.

- [ ] **Step 4: Re-run Task 1's verification query (as raw CTEs, using the new `paid_items` join) and confirm reconciliation**

```bash
supabase db query "
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
kpi_revenue as (
  select coalesce(sum(total), 0)::bigint as v from paid
),
cat_revenue as (
  select coalesce(sum(pi.qty * pi.price), 0)::bigint as v from paid_items pi
),
col_revenue as (
  select coalesce(sum(pi.qty * pi.price), 0)::bigint as v from paid_items pi
)
select
  (select v from kpi_revenue) as kpi_revenue,
  (select v from cat_revenue) as sum_by_category,
  (select v from col_revenue) as sum_by_collection;
"
```
Expected: all three values are now **identical** — this is the pass condition for the fix (`sum_by_category` and `sum_by_collection` both sum every `paid_items` row exactly once, same as `kpi_revenue`, since every category has exactly one collection-less grouping and vice versa — every row belongs to exactly one category and one collection).

- [ ] **Step 5: Confirm `top` no longer reads `styles.revenue`**

```bash
supabase db query "
with paid as (
  select * from public.orders where status not in ('Cancelled', 'Returned')
),
paid_items as (
  select oi.qty, oi.price, v.style_id
  from public.order_items oi
  join paid p on p.id = oi.order_id
  join public.variants v on v.sku = oi.sku
)
select s.style_code, s.revenue as styles_table_revenue,
       coalesce(sum(pi.qty * pi.price), 0)::bigint as order_based_revenue
from public.styles s
left join paid_items pi on pi.style_id = s.id
group by s.id, s.style_code, s.revenue
order by order_based_revenue desc
limit 10;
"
```
Expected: `styles_table_revenue` and `order_based_revenue` are **different** for most of the top 10 rows — confirming the fixed `top` CTE (which uses the same `order_based_revenue` computation) ranks by actual order revenue, not the old lifetime column.

- [ ] **Step 6: Commit**

```bash
git add supabase/migrations/20260720120000_fix_dashboard_revenue.sql
git commit -m "$(cat <<'EOF'
Fix dashboard revenue reconciliation

by_category, by_collection, and top styles now sum order_items
through variants/styles instead of the styles.revenue lifetime
counter, so they reconcile with the top-level revenue KPI.

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 3: Simplify the frontend workaround now that totals reconcile

**Files:**
- Modify: `src/admin/pages/Dashboard.tsx:19-25`

- [ ] **Step 1: Replace the `catTotal` workaround**

In `src/admin/pages/Dashboard.tsx`, replace lines 19-25:

```tsx
  const bridal = Number(m.by_category.find((c) => c.id === "dam-bridal")?.value ?? 0);
  // by_category sums styles.revenue (lifetime telemetry); m.revenue sums the
  // orders table (a 220-order slice). Dividing one by the other compared two
  // different universes and printed "9197% of revenue". Share must be taken
  // against the same total it came from.
  const catTotal = m.by_category.reduce((n, c) => n + Number(c.value), 0);
  const bridalShare = catTotal ? (bridal / catTotal) * 100 : 0;
```

with:

```tsx
  const bridal = Number(m.by_category.find((c) => c.id === "dam-bridal")?.value ?? 0);
  // by_category now sums the same order-based revenue as m.revenue (see
  // supabase/migrations/20260720120000_fix_dashboard_revenue.sql), so both
  // share one total — dividing directly against m.revenue is safe.
  const bridalShare = m.revenue ? (bridal / m.revenue) * 100 : 0;
```

- [ ] **Step 2: Type-check the change**

Run: `npx tsc -b --noEmit`
Expected: no errors (the `catTotal` identifier is fully removed with no remaining references).

- [ ] **Step 3: Manually verify in the browser**

Run: `npm run dev` (or use the existing preview flow), open `/admin` (login as admin), and check:
- The "Doanh thu theo danh mục" bar list values sum to the same figure as the "Doanh thu" stat tile at the top.
- The bridal-share insight sentence (`dash.insight_bridal_b`) shows a plausible percentage (well under 100%), not an inflated figure like the previously-reported "9197%".

- [ ] **Step 4: Commit**

```bash
git add src/admin/pages/Dashboard.tsx
git commit -m "$(cat <<'EOF'
Simplify bridal-share calc now revenue totals reconcile

Divides directly against m.revenue instead of a separately-summed
catTotal, now that by_category sums to the same total as the KPI.

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

## Self-Review Notes

- **Spec coverage**: Stage 1 of the spec (fix `by_cat`/`by_col`/`top` to derive from `orders`, remove the `catTotal` workaround) is fully covered by Tasks 2 and 3. Task 1 adds the missing "prove it's broken first" step the spec didn't need to spell out but an implementer needs.
- **Placeholders**: none — every step has literal SQL/TS/shell content and concrete expected output.
- **Type consistency**: `DashboardStats` in `src/admin/api/dashboard.ts` is unchanged (same field names/shapes: `by_category`, `by_collection`, `top`), so no frontend type edits are needed beyond Task 3.
- **Out of scope reminder** (per spec): `styles.revenue` itself is untouched; `ProductEditor.tsx` and any other reader of that column is unaffected by this plan.

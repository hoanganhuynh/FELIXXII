# Dashboard Duration/Color/Tooltip (Stage 2) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a Tháng/Quý/Năm duration toggle with click-to-drill popover, semantic (non-brand) colors for positive/negative indicators, and a hover tooltip with per-bucket insight + anomaly detection to the Dashboard's revenue trend chart.

**Architecture:** Two new Postgres RPCs (`dashboard_trend`, `dashboard_trend_detail`) replace the static `months` array on `dashboard_stats()` — the trend chart now fetches its own bucketed series independently of the rest of the dashboard, so switching granularity doesn't re-fetch every KPI tile. The trend card is extracted into its own component (`RevenueTrend.tsx`) that owns granularity state, the fetch, hover/tooltip wiring, and the drill-down popover — keeping `Dashboard.tsx` from absorbing this complexity. `AreaChart` (existing hand-rolled SVG component) gains hover/click support and a `tooltip` render-prop; no charting library is introduced. Color semantics move from ad-hoc Tailwind/brand colors to four new CSS custom properties.

**Tech Stack:** Postgres (Supabase migrations), React/TypeScript, existing hand-rolled SVG charts (no new dependency).

**Reference spec:** `docs/superpowers/specs/2026-07-20-dashboard-analytics-improvements-design.md`, section "Stage 2". Builds on Stage 1 (`docs/superpowers/plans/2026-07-20-dashboard-revenue-reconciliation.md`, already implemented — `dashboard_stats()` now reconciles revenue from `orders`).

**Decisions from brainstorming (already approved by user):**
- Color: semantic green/red pills — `#1e7d3a`/`#e7f6ec` positive, `#c0293b`/`#fce9ea` negative — fully separate from `--color-accent`.
- Duration: segmented toggle (Tháng/Quý/Năm), default Tháng. Click a bar → inline popover with the next-finer breakdown for that bucket only.
- Tooltip: period label, revenue + delta%, orders + AOV, return rate + delta, top category, plus an anomaly line when a metric deviates from its trailing baseline (25% for revenue/orders, 2 percentage points for return rate — computed client-side from the already-fetched series, trailing 3-bucket average).

---

### Task 1: Semantic color tokens

**Files:**
- Modify: `src/index.css:18-19` (add tokens after `--color-accent-soft`)
- Modify: `src/admin/components/ui.tsx:70-85` (`Stat` component)

- [ ] **Step 1: Add the tokens**

In `src/index.css`, after line 19 (`--color-accent-soft: #a8536018;`), add:

```css
  --color-positive: #1e7d3a;
  --color-positive-bg: #e7f6ec;
  --color-negative: #c0293b;
  --color-negative-bg: #fce9ea;
```

- [ ] **Step 2: Update `Stat`'s delta pill**

In `src/admin/components/ui.tsx`, replace the delta `<span>` (lines 76-79):

```tsx
        {delta !== undefined && (
          <span className={`text-[11px] tabular-nums ${delta >= 0 ? "text-emerald-600" : "text-[var(--color-accent)]"}`}>
            {delta >= 0 ? "▲" : "▼"} {Math.abs(delta).toFixed(1)}%
          </span>
        )}
```

with:

```tsx
        {delta !== undefined && (
          <span
            className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] tabular-nums"
            style={{
              background: delta >= 0 ? "var(--color-positive-bg)" : "var(--color-negative-bg)",
              color: delta >= 0 ? "var(--color-positive)" : "var(--color-negative)",
            }}
          >
            {delta >= 0 ? "▲" : "▼"} {Math.abs(delta).toFixed(1)}%
          </span>
        )}
```

- [ ] **Step 3: Type-check and visually verify**

Run: `npx tsc -b --noEmit` — expect no errors.

Open the running dev preview (`http://localhost:5180/admin`, already logged in as admin from Stage 1 verification), screenshot the KPI row, and confirm delta pills now render as light green/red pills instead of plain emerald/bordeaux text.

- [ ] **Step 4: Commit**

```bash
git add src/index.css src/admin/components/ui.tsx
git commit -m "$(cat <<'EOF'
Add semantic positive/negative color tokens for trend indicators

Delta pills now use dedicated --color-positive/--color-negative
tokens instead of a plain Tailwind emerald and the brand accent
color, so trend direction no longer shares a color with brand/
status badges (Returned, VIP).

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 2: Backend — `dashboard_trend` and `dashboard_trend_detail` RPCs

**Files:**
- Create: `supabase/migrations/20260720130000_dashboard_trend.sql`

- [ ] **Step 1: Write the migration**

Create `supabase/migrations/20260720130000_dashboard_trend.sql`:

```sql
-- ============================================================
-- dashboard_trend(): bucketed revenue series for the trend chart,
-- fetched independently of dashboard_stats() so switching
-- granularity (month/quarter/year) doesn't re-fetch every KPI tile.
--
-- dashboard_trend_detail(): the next-finer breakdown for ONE bucket,
-- fetched on demand when a user clicks a bar (drill-down popover).
--
-- Both preserve the security definer + is_admin() gate pattern from
-- dashboard_stats(). The old `months` field on dashboard_stats() is
-- dropped — dashboard_trend() supersedes it.
-- ============================================================

create or replace function public.dashboard_trend(
  granularity text,
  range_start date,
  range_end date
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  result jsonb;
  step interval;
  aligned_start timestamp;
begin
  if not public.is_admin() then
    raise exception 'forbidden: admin role required' using errcode = '42501';
  end if;

  case granularity
    when 'month'   then step := interval '1 month';  aligned_start := date_trunc('month',   range_start::timestamp);
    when 'quarter' then step := interval '3 months';  aligned_start := date_trunc('quarter', range_start::timestamp);
    when 'year'    then step := interval '1 year';    aligned_start := date_trunc('year',    range_start::timestamp);
    else raise exception 'invalid granularity: %', granularity;
  end case;

  with buckets as (
    select generate_series(aligned_start, range_end::timestamp - step, step) as bucket_start
  ),
  paid as (
    select * from public.orders
    where status not in ('Cancelled', 'Returned')
      and placed_at >= aligned_start and placed_at < range_end
  ),
  all_in_range as (
    select * from public.orders
    where placed_at >= aligned_start and placed_at < range_end
  ),
  paid_items as (
    select oi.qty, oi.price, p.placed_at, s.category_id
    from public.order_items oi
    join paid p on p.id = oi.order_id
    join public.variants v on v.sku = oi.sku
    join public.styles s on s.id = v.style_id
  ),
  bucket_kpi as (
    select
      b.bucket_start,
      coalesce(sum(p.total), 0)::bigint as revenue,
      count(p.id)::int as orders,
      case when count(p.id) = 0 then 0 else coalesce(avg(p.total), 0)::bigint end as aov
    from buckets b
    left join paid p on p.placed_at >= b.bucket_start and p.placed_at < b.bucket_start + step
    group by b.bucket_start
  ),
  bucket_rates as (
    select
      b.bucket_start,
      count(a.id)::int as all_orders,
      count(a.id) filter (where a.status = 'Returned')::int as returned
    from buckets b
    left join all_in_range a on a.placed_at >= b.bucket_start and a.placed_at < b.bucket_start + step
    group by b.bucket_start
  ),
  bucket_cat as (
    select bucket_start, label from (
      select
        b.bucket_start,
        cat.label,
        coalesce(sum(pi.qty * pi.price), 0)::bigint as revenue,
        row_number() over (partition by b.bucket_start order by coalesce(sum(pi.qty * pi.price), 0) desc) as rn
      from buckets b
      left join paid_items pi on pi.placed_at >= b.bucket_start and pi.placed_at < b.bucket_start + step
      left join public.categories cat on cat.id = pi.category_id
      group by b.bucket_start, cat.label
    ) x
    where rn = 1
  )
  select jsonb_agg(jsonb_build_object(
    'bucket_start', to_char(bk.bucket_start, 'YYYY-MM-DD'),
    'bucket_label', case granularity
      when 'month'   then to_char(bk.bucket_start, 'YYYY-MM')
      when 'quarter' then to_char(bk.bucket_start, 'YYYY') || '-Q' || to_char(bk.bucket_start, 'Q')
      else to_char(bk.bucket_start, 'YYYY')
    end,
    'revenue', bk.revenue,
    'orders', bk.orders,
    'aov', bk.aov,
    'return_rate', case when br.all_orders = 0 then 0 else br.returned::numeric * 100 / br.all_orders end,
    'top_category_label', bc.label
  ) order by bk.bucket_start)
  into result
  from bucket_kpi bk
  join bucket_rates br on br.bucket_start = bk.bucket_start
  left join bucket_cat bc on bc.bucket_start = bk.bucket_start;

  return coalesce(result, '[]'::jsonb);
end;
$$;

revoke all on function public.dashboard_trend(text, date, date) from public, anon;
grant execute on function public.dashboard_trend(text, date, date) to authenticated;

create or replace function public.dashboard_trend_detail(
  bucket_start date,
  bucket_granularity text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  result jsonb;
  detail_unit text;
  range_end date;
  step interval;
begin
  if not public.is_admin() then
    raise exception 'forbidden: admin role required' using errcode = '42501';
  end if;

  case bucket_granularity
    when 'year'    then detail_unit := 'quarter'; range_end := bucket_start + interval '1 year';   step := interval '3 months';
    when 'quarter' then detail_unit := 'month';   range_end := bucket_start + interval '3 months'; step := interval '1 month';
    when 'month'   then detail_unit := 'week';    range_end := bucket_start + interval '1 month';  step := interval '1 week';
    else raise exception 'invalid bucket_granularity: %', bucket_granularity;
  end case;

  with buckets as (
    select generate_series(bucket_start::timestamp, range_end::timestamp - step, step) as sub_start
  ),
  paid as (
    select * from public.orders
    where status not in ('Cancelled', 'Returned')
      and placed_at >= bucket_start and placed_at < range_end
  ),
  bucket_kpi as (
    select
      b.sub_start,
      coalesce(sum(p.total), 0)::bigint as revenue,
      count(p.id)::int as orders
    from buckets b
    left join paid p on p.placed_at >= b.sub_start and p.placed_at < b.sub_start + step
    group by b.sub_start
  )
  select jsonb_agg(jsonb_build_object(
    'bucket_label', case detail_unit
      when 'quarter' then to_char(bk.sub_start, 'YYYY') || '-Q' || to_char(bk.sub_start, 'Q')
      when 'month'   then to_char(bk.sub_start, 'YYYY-MM')
      else 'Tuần ' || to_char(bk.sub_start, 'DD/MM')
    end,
    'revenue', bk.revenue,
    'orders', bk.orders
  ) order by bk.sub_start)
  into result
  from bucket_kpi bk;

  return coalesce(result, '[]'::jsonb);
end;
$$;

revoke all on function public.dashboard_trend_detail(date, text) from public, anon;
grant execute on function public.dashboard_trend_detail(date, text) to authenticated;

-- Drop the now-superseded `months` field from dashboard_stats() — the
-- trend chart uses dashboard_trend() instead. Everything else in the
-- function body is unchanged from 20260720120000_fix_dashboard_revenue.sql.
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
  oos_total as (select count(*)::int as n from public.variants where stock = 0)
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
    'total_ltv',     (select coalesce(sum(ltv), 0)::bigint from public.customers)
  ) into result;

  return result;
end;
$$;

revoke all on function public.dashboard_stats() from public, anon;
grant execute on function public.dashboard_stats() to authenticated;
```

- [ ] **Step 2: Apply the migration**

Run: `npm run db:reset`
Expected: completes without error, migration `20260720130000_dashboard_trend.sql` listed in the "Applying migration" lines.

- [ ] **Step 3: Verify `dashboard_trend` bucketing and reconciliation (raw CTE, bypassing the admin gate — same reasoning as Stage 1)**

```bash
supabase db query "
with paid as (
  select * from public.orders
  where status not in ('Cancelled', 'Returned')
    and placed_at >= date_trunc('month', now()) - interval '11 months'
    and placed_at < date_trunc('month', now()) + interval '1 month'
),
by_month as (
  select date_trunc('month', placed_at) as m, sum(total)::bigint as v
  from paid group by 1
)
select count(*) as month_count, sum(v) as total_revenue from by_month;
"
```
Note the `total_revenue` value. Then confirm `dashboard_trend`'s bucket revenues sum to the same figure by temporarily calling it as the `postgres` role would if it had a JWT — since that's not available via `db query`, instead re-derive the equivalent generate_series query directly:

```bash
supabase db query "
with buckets as (
  select generate_series(
    date_trunc('month', now()) - interval '11 months',
    date_trunc('month', now()),
    interval '1 month'
  ) as bucket_start
),
paid as (
  select * from public.orders
  where status not in ('Cancelled', 'Returned')
    and placed_at >= date_trunc('month', now()) - interval '11 months'
    and placed_at < date_trunc('month', now()) + interval '1 month'
)
select count(*) as bucket_count, sum(bk.revenue) as total_revenue
from (
  select b.bucket_start, coalesce(sum(p.total), 0)::bigint as revenue
  from buckets b
  left join paid p on p.placed_at >= b.bucket_start and p.placed_at < b.bucket_start + interval '1 month'
  group by b.bucket_start
) bk;
"
```
Expected: `bucket_count` = 12, and `total_revenue` matches the first query's `total_revenue` exactly (both compute the same 12-month window, just one grouped by actual order months and one by a fixed 12-bucket generate_series — proving the bucketing logic `dashboard_trend` uses doesn't drop or double-count orders).

- [ ] **Step 4: Confirm the admin gate covers both new functions**

```bash
supabase db query "select dashboard_trend('month', current_date - 365, current_date);"
supabase db query "select dashboard_trend_detail(current_date, 'month');"
```
Expected: both fail with `ERROR: forbidden: admin role required (SQLSTATE 42501)`.

- [ ] **Step 5: Confirm `dashboard_stats()` no longer returns `months`**

```bash
supabase db query "select proname, prosrc ~ 'months' as still_has_months from pg_proc where proname = 'dashboard_stats';"
```
Expected: `still_has_months` = `f` (false).

- [ ] **Step 6: Commit**

```bash
git add supabase/migrations/20260720130000_dashboard_trend.sql
git commit -m "$(cat <<'EOF'
Add dashboard_trend/dashboard_trend_detail RPCs for the duration toggle

The trend chart now fetches its own bucketed series (month/quarter/
year) independently of dashboard_stats(), so switching granularity
doesn't re-fetch every KPI tile. dashboard_trend_detail() powers the
click-to-drill popover for a single bucket. Drops the now-superseded
`months` field from dashboard_stats().

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 3: Frontend API layer + helpers

**Files:**
- Modify: `src/admin/api/dashboard.ts` (remove `months`, add trend types + fetchers)
- Modify: `src/lib/database.types.ts:469` (add `dashboard_trend`/`dashboard_trend_detail` — manually maintained, no gen-types script; `supabase.rpc()` type-checks its first argument against this file's `Functions` keys, so omitting this makes Step 1 fail to compile)
- Create: `src/admin/lib/dateRanges.ts`
- Create: `src/admin/lib/anomaly.ts`

- [ ] **Step 1: Update `dashboard.ts`**

In `src/admin/api/dashboard.ts`, remove `months: { m: string; v: number }[];` from `DashboardStats` and `months: [],` from `EMPTY_STATS`. Then append:

```ts
export type Granularity = "month" | "quarter" | "year";

export interface TrendPoint {
  bucket_start: string;
  bucket_label: string;
  revenue: number;
  orders: number;
  aov: number;
  return_rate: number;
  top_category_label: string | null;
}

export interface TrendDetailPoint {
  bucket_label: string;
  revenue: number;
  orders: number;
}

export async function getDashboardTrend(
  granularity: Granularity, rangeStart: string, rangeEnd: string
): Promise<TrendPoint[]> {
  const { data, error } = await supabase.rpc("dashboard_trend", {
    granularity, range_start: rangeStart, range_end: rangeEnd,
  });
  if (error) throw error;
  return (data ?? []) as unknown as TrendPoint[];
}

export async function getDashboardTrendDetail(
  bucketStart: string, bucketGranularity: Granularity
): Promise<TrendDetailPoint[]> {
  const { data, error } = await supabase.rpc("dashboard_trend_detail", {
    bucket_start: bucketStart, bucket_granularity: bucketGranularity,
  });
  if (error) throw error;
  return (data ?? []) as unknown as TrendDetailPoint[];
}
```

- [ ] **Step 2: Create `src/admin/lib/dateRanges.ts`**

```ts
import type { Granularity } from "../api/dashboard";

/** ISO yyyy-mm-dd, using local calendar month/day (no UTC shift). */
function toISODate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/** Trailing window ending at the start of next month, sized per granularity:
 *  12 months, 8 quarters (24 months), or 5 years. */
export function defaultTrendRange(granularity: Granularity): { start: string; end: string } {
  const now = new Date();
  const end = new Date(now.getFullYear(), now.getMonth() + 1, 1);
  let start: Date;
  if (granularity === "month") start = new Date(end.getFullYear(), end.getMonth() - 12, 1);
  else if (granularity === "quarter") start = new Date(end.getFullYear(), end.getMonth() - 24, 1);
  else start = new Date(end.getFullYear() - 5, end.getMonth(), 1);
  return { start: toISODate(start), end: toISODate(end) };
}
```

- [ ] **Step 3: Create `src/admin/lib/anomaly.ts`**

```ts
import type { TrendPoint } from "../api/dashboard";

export type AnomalyMetric = "revenue" | "orders" | "return_rate";

const RATE_METRICS = new Set<AnomalyMetric>(["return_rate"]);

/** Flags a bucket as anomalous when it deviates from the trailing
 *  3-bucket average by more than 25% (revenue/orders) or 2 percentage
 *  points (rate metrics like return_rate). Needs at least 1 prior
 *  bucket to compare against; returns null otherwise or when in-range. */
export function detectAnomaly(series: TrendPoint[], index: number): { metric: AnomalyMetric; direction: "up" | "down" } | null {
  if (index === 0) return null;
  const lookback = series.slice(Math.max(0, index - 3), index);
  if (lookback.length === 0) return null;

  const metrics: AnomalyMetric[] = ["revenue", "orders", "return_rate"];
  for (const metric of metrics) {
    const avg = lookback.reduce((sum, p) => sum + Number(p[metric]), 0) / lookback.length;
    const current = Number(series[index][metric]);
    if (RATE_METRICS.has(metric)) {
      if (Math.abs(current - avg) > 2) {
        return { metric, direction: current > avg ? "up" : "down" };
      }
    } else if (avg > 0 && Math.abs(current - avg) / avg > 0.25) {
      return { metric, direction: current > avg ? "up" : "down" };
    }
  }
  return null;
}
```

- [ ] **Step 4: Add the new RPCs to `database.types.ts`**

In `src/lib/database.types.ts`, after the `dashboard_stats: { Args: never; Returns: Json }` line (~line 469), add:

```ts
      dashboard_trend: {
        Args: { granularity: string; range_start: string; range_end: string }
        Returns: Json
      }
      dashboard_trend_detail: {
        Args: { bucket_start: string; bucket_granularity: string }
        Returns: Json
      }
```

(This file has no `gen-types` script — it's hand-maintained. `supabase.rpc()` type-checks its first argument against these keys, so skipping this makes Step 1's new calls fail to compile with `Argument of type '"dashboard_trend"' is not assignable to parameter of type ...`.)

- [ ] **Step 5: Type-check**

Run: `npx tsc -b --noEmit`
Expected: errors referencing `m.months` in `Dashboard.tsx` (expected — fixed in Task 5) and no other errors.

- [ ] **Step 6: Commit**

```bash
git add src/admin/api/dashboard.ts src/lib/database.types.ts src/admin/lib/dateRanges.ts src/admin/lib/anomaly.ts
git commit -m "$(cat <<'EOF'
Add dashboard trend API client, date-range and anomaly helpers

getDashboardTrend/getDashboardTrendDetail call the new RPCs.
defaultTrendRange() computes the trailing window per granularity.
detectAnomaly() flags a bucket that deviates from its trailing
3-bucket average by more than 25% (revenue/orders) or 2 percentage
points (return_rate) — pure function, no backend round-trip.

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

(This commit intentionally leaves `Dashboard.tsx` referencing the removed `months` field — Task 5 fixes it. Do not skip Task 5.)

---

### Task 4: `AreaChart` hover + click support

**Files:**
- Modify: `src/admin/components/charts.tsx:1-73`

- [ ] **Step 1: Replace the `AreaChart` function**

Replace the entire existing `AreaChart` function (lines 9-73) with:

```tsx
import { useState, type ReactNode } from "react";

/* ---- area/line trend ---- */
export function AreaChart({
  data, height = 220, labels, valueFmt = (n) => String(n),
  onPointClick, tooltip,
}: {
  data: number[]; height?: number; labels?: string[]; valueFmt?: (n: number) => string;
  onPointClick?: (index: number) => void;
  tooltip?: (index: number) => ReactNode;
}) {
  const [hover, setHover] = useState<number | null>(null);
  const w = 760, h = height;
  // reserve gutters so axis labels render INSIDE the viewBox
  const padL = 52, padR = 14, padT = 12, padB = 26;
  const plotW = w - padL - padR;
  const plotH = h - padT - padB;

  const max = Math.max(...data, 1);
  const min = 0; // revenue baselines at zero — a floating baseline exaggerates the swing
  const span = max - min || 1;
  const step = data.length > 1 ? plotW / (data.length - 1) : 0;

  const xOf = (i: number) => padL + i * step;
  const yOf = (v: number) => padT + plotH - ((v - min) / span) * plotH;

  const pts = data.map((d, i) => [xOf(i), yOf(d)] as const);
  const line = pts.map((p, i) => `${i ? "L" : "M"}${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(" ");
  const base = padT + plotH;
  const area = `${line} L${pts[pts.length - 1][0].toFixed(1)},${base} L${pts[0][0].toFixed(1)},${base} Z`;

  const ticks = [0, 0.5, 1]; // fraction of max

  return (
    <div className="relative">
      <svg viewBox={`0 0 ${w} ${h}`} className="w-full" role="img" aria-label="Revenue trend">
        <defs>
          <linearGradient id="areaFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={ACCENT} stopOpacity="0.18" />
            <stop offset="100%" stopColor={ACCENT} stopOpacity="0" />
          </linearGradient>
        </defs>

        {/* y grid + value labels */}
        {ticks.map((f) => {
          const v = min + f * span;
          const y = yOf(v);
          return (
            <g key={f}>
              <line x1={padL} x2={w - padR} y1={y} y2={y} stroke={GRID} strokeWidth="1" />
              <text x={padL - 8} y={y + 3} fontSize="9" fill="#948b7d" textAnchor="end">{valueFmt(v)}</text>
            </g>
          );
        })}

        <path d={area} fill="url(#areaFill)" />
        <path d={line} fill="none" stroke={ACCENT} strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
        <circle cx={pts[pts.length - 1][0]} cy={pts[pts.length - 1][1]} r="3.5" fill={ACCENT} />

        {hover !== null && (
          <>
            <line x1={pts[hover][0]} x2={pts[hover][0]} y1={padT} y2={base} stroke={GRID} strokeWidth="1" strokeDasharray="2 2" />
            <circle cx={pts[hover][0]} cy={pts[hover][1]} r="4.5" fill={ACCENT} stroke="#fff" strokeWidth="1.5" />
          </>
        )}

        {/* x labels — anchor the end ones inward so they don't clip */}
        {labels && labels.map((l, i) => (
          <text
            key={i}
            x={xOf(i)}
            y={h - 8}
            fontSize="9"
            fill="#948b7d"
            textAnchor={i === 0 ? "start" : i === labels.length - 1 ? "end" : "middle"}
          >
            {l}
          </text>
        ))}

        {/* invisible per-point hit targets, drawn last so they sit on top */}
        {pts.map((p, i) => (
          <rect
            key={i}
            x={i === 0 ? padL : p[0] - step / 2}
            y={padT}
            width={step || plotW}
            height={plotH}
            fill="transparent"
            style={{ cursor: onPointClick ? "pointer" : "default" }}
            onMouseEnter={() => setHover(i)}
            onMouseLeave={() => setHover(null)}
            onClick={() => onPointClick?.(i)}
          />
        ))}
      </svg>

      {hover !== null && tooltip && (
        <div
          className="pointer-events-none absolute z-10 -translate-x-1/2 whitespace-nowrap rounded-lg bg-ink px-3 py-2 text-[11px] leading-relaxed text-white shadow-lg"
          style={{
            left: `${(pts[hover][0] / w) * 100}%`,
            top: `${Math.max((pts[hover][1] / h) * 100 - 14, 0)}%`,
          }}
        >
          {tooltip(hover)}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Type-check**

Run: `npx tsc -b --noEmit`
Expected: no new errors from `charts.tsx` itself (errors about `Dashboard.tsx`'s old `AreaChart` call shape and `m.months` are expected until Task 5).

- [ ] **Step 3: Commit**

```bash
git add src/admin/components/charts.tsx
git commit -m "$(cat <<'EOF'
Add hover tooltip and click-to-drill support to AreaChart

Per-point invisible hit targets drive a hover state (vertical guide
line + emphasized dot + an absolutely-positioned tooltip via a
render-prop) and an optional onPointClick callback. Chart owns
interaction and positioning; callers own tooltip content.

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 5: `RevenueTrend` component (granularity toggle, tooltip content, drill popover)

**Files:**
- Create: `src/admin/components/RevenueTrend.tsx`
- Modify: `src/admin/pages/Dashboard.tsx:1-8` (imports), `:72-87` (replace the trend `Card` block)

- [ ] **Step 1: Add i18n keys** (needed before the component compiles meaningfully — see Task 6 for the full list; add just these two blocks now so `t()` calls resolve)

In `src/admin/lib/i18n.ts`, EN `dash` block (after `trend: "Revenue trend",` on line 74), add:
```ts
    duration_month: "Month",
    duration_quarter: "Quarter",
    duration_year: "Year",
    top_category: "Top category",
    trend_loading: "Loading trend…",
    drill_loading: "Loading detail…",
    anomaly_note: "vs. the last 3 periods",
```

In the VI `dash` block (after `trend: "Diễn biến doanh thu",` on line 422), add:
```ts
    duration_month: "Tháng",
    duration_quarter: "Quý",
    duration_year: "Năm",
    top_category: "Danh mục dẫn đầu",
    trend_loading: "Đang tải diễn biến…",
    drill_loading: "Đang tải chi tiết…",
    anomaly_note: "so với trung bình 3 kỳ gần nhất",
```

- [ ] **Step 2: Create `src/admin/components/RevenueTrend.tsx`**

```tsx
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useAuth } from "../../store/auth";
import { useAsync } from "../lib/useAsync";
import { defaultTrendRange } from "../lib/dateRanges";
import { detectAnomaly } from "../lib/anomaly";
import { getDashboardTrend, getDashboardTrendDetail, type Granularity, type TrendPoint } from "../api/dashboard";
import { AreaChart } from "./charts";
import { compactVnd, compact } from "../lib/format";

const GRANULARITIES: Granularity[] = ["month", "quarter", "year"];

export function RevenueTrend() {
  const { t } = useTranslation();
  const { isAdmin } = useAuth();
  const [granularity, setGranularity] = useState<Granularity>("month");
  const [drill, setDrill] = useState<{ index: number; bucket: TrendPoint } | null>(null);

  const { data: series, loading } = useAsync(
    () => {
      if (!isAdmin) return Promise.resolve([]);
      const { start, end } = defaultTrendRange(granularity);
      return getDashboardTrend(granularity, start, end);
    },
    [isAdmin, granularity],
    [] as TrendPoint[]
  );

  const { data: detail, loading: detailLoading } = useAsync(
    () => (drill ? getDashboardTrendDetail(drill.bucket.bucket_start, granularity) : Promise.resolve([])),
    [drill?.bucket.bucket_start, granularity],
    [] as Awaited<ReturnType<typeof getDashboardTrendDetail>>
  );

  return (
    <div className="px-4 pb-6 pt-4">
      <div className="mb-3 flex gap-1.5">
        {GRANULARITIES.map((g) => (
          <button
            key={g}
            onClick={() => { setGranularity(g); setDrill(null); }}
            className={`h-7 rounded-md px-3 text-[11px] tracking-wide transition-colors ${
              g === granularity ? "bg-[var(--color-accent)] text-white" : "bg-[var(--color-tile)] text-ink-soft hover:bg-[var(--color-tile-deep)]"
            }`}
          >
            {t(`dash.duration_${g}`)}
          </button>
        ))}
      </div>

      {loading ? (
        <p className="py-16 text-center text-xs text-ink-soft">{t("dash.trend_loading")}</p>
      ) : series.length > 1 ? (
        <AreaChart
          data={series.map((p) => Number(p.revenue))}
          labels={series.map((p) => p.bucket_label)}
          valueFmt={compactVnd}
          height={220}
          onPointClick={(i) => setDrill({ index: i, bucket: series[i] })}
          tooltip={(i) => {
            const p = series[i];
            const prev = series[i - 1];
            const delta = prev && Number(prev.revenue) > 0 ? ((Number(p.revenue) - Number(prev.revenue)) / Number(prev.revenue)) * 100 : null;
            const rateDelta = prev ? Number(p.return_rate) - Number(prev.return_rate) : null;
            const anomaly = detectAnomaly(series, i);
            return (
              <div className="space-y-0.5">
                <div className="font-medium">{p.bucket_label}</div>
                <div>
                  {t("dash.revenue")}: {compactVnd(Number(p.revenue))}
                  {delta !== null && (
                    <span className={delta >= 0 ? "text-[color:var(--color-positive)]" : "text-[color:var(--color-negative)]"}>
                      {" "}{delta >= 0 ? "▲" : "▼"}{Math.abs(delta).toFixed(1)}%
                    </span>
                  )}
                </div>
                <div>{t("dash.orders")}: {compact(Number(p.orders))} · {t("dash.aov")}: {compactVnd(Number(p.aov))}</div>
                <div>
                  {t("dash.return_rate")}: {Number(p.return_rate).toFixed(1)}%
                  {rateDelta !== null && (
                    <span className={rateDelta <= 0 ? "text-[color:var(--color-positive)]" : "text-[color:var(--color-negative)]"}>
                      {" "}{rateDelta > 0 ? "▲" : "▼"}{Math.abs(rateDelta).toFixed(1)}đ
                    </span>
                  )}
                </div>
                {p.top_category_label && <div>{t("dash.top_category")}: {p.top_category_label}</div>}
                {anomaly && (
                  <div className="mt-1 border-t border-white/20 pt-1 text-amber-300">
                    ⚠ {anomaly.metric === "revenue" ? t("dash.revenue") : anomaly.metric === "orders" ? t("dash.orders") : t("dash.return_rate")}{" "}
                    {anomaly.direction === "up" ? "▲" : "▼"} {t("dash.anomaly_note")}
                  </div>
                )}
              </div>
            );
          }}
        />
      ) : (
        <p className="py-16 text-center text-xs text-ink-soft">{t("dash.not_enough")}</p>
      )}

      {drill && (
        <div className="mt-3 rounded-md border edge bg-white/60 px-4 py-3">
          <div className="mb-2 flex items-center justify-between">
            <span className="text-[11px] font-medium text-ink-soft">{drill.bucket.bucket_label}</span>
            <button onClick={() => setDrill(null)} className="text-[11px] text-ink-soft hover:text-ink">✕</button>
          </div>
          {detailLoading ? (
            <p className="text-xs text-ink-soft">{t("dash.drill_loading")}</p>
          ) : (
            <ul className="space-y-1 text-xs">
              {detail.map((d) => (
                <li key={d.bucket_label} className="flex items-baseline justify-between gap-3">
                  <span className="text-ink-soft">{d.bucket_label}</span>
                  <span className="tabular-nums">{compactVnd(Number(d.revenue))} · {compact(Number(d.orders))} {t("dash.orders").toLowerCase()}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 3: Wire it into `Dashboard.tsx`**

In `src/admin/pages/Dashboard.tsx`, replace the import line:
```tsx
import { AreaChart, BarList, Donut, CHART_PALETTE } from "../components/charts";
```
with:
```tsx
import { BarList, Donut, CHART_PALETTE } from "../components/charts";
import { RevenueTrend } from "../components/RevenueTrend";
```

Then replace the trend `Card` block (originally lines 74-87):
```tsx
          <Card title={t("dash.trend")}>
            <div className="px-4 pb-6 pt-4">
              {m.months.length > 1 ? (
                <AreaChart
                  data={m.months.map((x) => Number(x.v))}
                  labels={m.months.map((x) => x.m)}
                  valueFmt={compactVnd}
                  height={220}
                />
              ) : (
                <p className="py-16 text-center text-xs text-ink-soft">{t("dash.not_enough")}</p>
              )}
            </div>
          </Card>
```
with:
```tsx
          <Card title={t("dash.trend")}>
            <RevenueTrend />
          </Card>
```

- [ ] **Step 4: Type-check**

Run: `npx tsc -b --noEmit`
Expected: no errors. (`m.months` no longer referenced anywhere; `DashboardStats` no longer declares it.)

- [ ] **Step 5: Manually verify in the browser**

Reload `http://localhost:5180/admin` (already logged in as admin). Confirm:
- The trend card shows a Tháng/Quý/Năm toggle; clicking each re-fetches and re-renders the chart with a different bucket count/labels.
- Hovering over the chart shows a tooltip with revenue, delta, orders/AOV, return rate, and top category for that bucket.
- Clicking a bar opens the drill-down panel below the chart with a finer breakdown; clicking ✕ closes it.

- [ ] **Step 6: Commit**

```bash
git add src/admin/components/RevenueTrend.tsx src/admin/pages/Dashboard.tsx src/admin/lib/i18n.ts
git commit -m "$(cat <<'EOF'
Wire up duration toggle, hover tooltip, and drill-down popover

New RevenueTrend component owns granularity state, the
dashboard_trend fetch, tooltip content (including anomaly
detection), and the click-to-drill popover backed by
dashboard_trend_detail. Replaces the static m.months rendering
in Dashboard.tsx.

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 6: i18n parity check

**Files:** none modified — verification only (the keys were added in Task 5, Step 1).

- [ ] **Step 1: Run the i18n checker**

Run: `npx tsx scripts/i18n-check.ts`
Expected: `missing_in_vi` and `extra_in_vi` arrays are empty (both EN and VI `dash` blocks have the 6 new keys from Task 5, Step 1). `identical_en_vi` may list unrelated pre-existing entries — only check that none of the 6 new keys appear in it (they shouldn't, since VI translations differ from EN for all of them).

- [ ] **Step 2: No commit** — this task only verifies work already committed in Task 5.

---

## Self-Review Notes

- **Spec coverage:** duration toggle + drill popover (#1), semantic colors (#2), hover tooltip with anomaly detection (#3) are covered by Tasks 1, 2, 4, 5. Task 3 provides the supporting API/helper layer. Task 6 verifies i18n completeness.
- **Placeholders:** none — every step has literal SQL/TS/CSS content and concrete expected output.
- **Type consistency:** `TrendPoint`/`TrendDetailPoint` (Task 3) match the JSON shape `dashboard_trend`/`dashboard_trend_detail` return (Task 2) field-for-field. `AreaChart`'s new `onPointClick`/`tooltip` props (Task 4) match exactly how `RevenueTrend.tsx` calls them (Task 5). `detectAnomaly` (Task 3) is called with the same `TrendPoint[]` type `RevenueTrend` holds.
- **Out of scope reminder** (per spec): no charting library introduced; no breadcrumb-style whole-chart re-render on drill (popover only, per the approved mockup); LTV/repeat-rate (Stage 3) and return reasons (Stage 4) are separate plans.

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

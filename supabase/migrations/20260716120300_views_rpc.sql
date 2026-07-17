-- ============================================================
-- Views + aggregate RPCs
-- Goal: the client should never pull 7k variant rows just to render
-- a stock column or a KPI tile. Aggregate in the DB, ship the answer.
-- ============================================================

-- ⚠️ security_invoker = true is REQUIRED.
-- Postgres views default to running as the view OWNER, which silently
-- BYPASSES RLS on the underlying tables — a draft-style leak to anon.
-- With security_invoker the view runs as the CALLER, so RLS still applies.
create view public.style_list with (security_invoker = true) as
select
  s.id, s.style_code, s.serial, s.name,
  s.category_id, s.collection_id, s.silhouette, s.occasion,
  s.price, s.material, s.body_type, s.status, s.images,
  s.units_sold, s.views, s.returns, s.revenue, s.created_at,
  agg.sku_count, agg.total_stock, agg.oos_count, agg.low_count, agg.colors, agg.sizes
from public.styles s
left join lateral (
  select
    count(*)::int                                        as sku_count,
    coalesce(sum(v.stock), 0)::int                       as total_stock,
    count(*) filter (where v.stock = 0)::int             as oos_count,
    count(*) filter (where v.stock between 1 and 3)::int as low_count,
    coalesce(jsonb_agg(distinct jsonb_build_object('name', v.color_name, 'hex', v.color_hex)), '[]'::jsonb) as colors,
    coalesce(array_agg(distinct v.size), '{}')           as sizes
  from public.variants v
  where v.style_id = s.id
) agg on true;

-- ============================================================
-- dashboard_stats() — every tile on the dashboard in ONE round trip
-- ============================================================
create or replace function public.dashboard_stats()
returns jsonb
language sql
stable
set search_path = ''
as $$
  with paid as (
    -- cancelled/returned orders are not revenue
    select * from public.orders where status not in ('Cancelled', 'Returned')
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
      select cat.id, cat.label, coalesce(sum(s.revenue), 0)::bigint as v
      from public.categories cat
      left join public.styles s on s.category_id = cat.id
      group by cat.id, cat.label
    ) c
  ),
  by_col as (
    select jsonb_agg(jsonb_build_object('id', c.id, 'label', c.season, 'value', c.v) order by c.sort) as rows
    from (
      select col.id, col.season, col.sort, coalesce(sum(s.revenue), 0)::bigint as v
      from public.collections col
      left join public.styles s on s.collection_id = col.id
      group by col.id, col.season, col.sort
    ) c
  ),
  top AS (
    select jsonb_agg(t) as rows from (
      select id, name, style_code, revenue, units_sold
      from public.styles order by revenue desc limit 6
    ) t
  ),
  oos as (
    select jsonb_agg(o) as rows from (
      select id, name, style_code, sku_count, units_sold, oos_count, low_count
      from public.style_list
      where status = 'active' and (oos_count > 0 or low_count > 0)
      order by (oos_count * 2 + low_count) desc, units_sold desc
      limit 6
    ) o
  ),
  oos_total as (
    select count(*)::int as n from public.variants where stock = 0
  )
  select jsonb_build_object(
    'revenue',     (select revenue from kpi),
    'orders',      (select orders  from kpi),
    'aov',         (select aov     from kpi),
    'units',       (select units   from kpi),
    'return_rate', (select case when all_orders = 0 then 0 else returned::numeric * 100 / all_orders end from rates),
    'conversion',  (select case when views = 0 then 0 else sold::numeric * 100 / views end from rates),
    'months',      coalesce((select rows from months), '[]'::jsonb),
    'by_category', coalesce((select rows from by_cat), '[]'::jsonb),
    'by_collection', coalesce((select rows from by_col), '[]'::jsonb),
    'top',         coalesce((select rows from top), '[]'::jsonb),
    'stock_outs',  coalesce((select rows from oos), '[]'::jsonb),
    'oos_skus',    (select n from oos_total),
    'vip_count',   (select count(*)::int from public.customers where segment = 'VIP'),
    'vip_ltv',     (select coalesce(sum(ltv), 0)::bigint from public.customers where segment = 'VIP'),
    'total_ltv',   (select coalesce(sum(ltv), 0)::bigint from public.customers)
  );
$$;

-- ============================================================
-- bulk_update_styles() — one statement instead of N round trips
-- ============================================================
create or replace function public.bulk_update_styles(
  ids       uuid[],
  attribute text,
  value     text
)
returns int
language plpgsql
security definer          -- admin-gated below; definer keeps the check in one place
set search_path = ''
as $$
declare
  n int;
begin
  if not public.is_admin() then
    raise exception 'forbidden: admin role required';
  end if;

  if attribute = 'status' then
    update public.styles set status = value::public.style_status where id = any(ids);
  elsif attribute = 'collection' then
    update public.styles set collection_id = value where id = any(ids);
  elsif attribute = 'category' then
    update public.styles set category_id = value where id = any(ids);
  elsif attribute = 'priceSet' then
    update public.styles set price = value::bigint where id = any(ids);
  elsif attribute = 'pricePct' then
    -- round to 50k so prices stay presentable after a % move
    update public.styles
       set price = greatest(50000, round(price * (1 + value::numeric / 100) / 50000) * 50000)
     where id = any(ids);
  else
    raise exception 'unknown attribute: %', attribute;
  end if;

  get diagnostics n = row_count;
  return n;
end;
$$;

revoke all on function public.bulk_update_styles(uuid[], text, text) from public, anon;
grant execute on function public.bulk_update_styles(uuid[], text, text) to authenticated;

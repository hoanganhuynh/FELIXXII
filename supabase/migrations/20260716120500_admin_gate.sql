-- ============================================================
-- Gate the analytics RPC behind the admin role.
--
-- dashboard_stats() ran as the CALLER, so RLS on `orders` reduced an anonymous
-- visitor's view to zero rows and the dashboard rendered "Revenue 0₫". That
-- reads as broken, not as protected — and revenue/AOV/LTV are business data an
-- anonymous visitor has no business seeing at all.
--
-- Now: SECURITY DEFINER (so it can aggregate across all orders) + an explicit
-- admin check (so only admins can invoke it). Non-admins get a clear error the
-- UI can turn into a sign-in prompt.
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
  top as (
    select jsonb_agg(t) as rows from (
      select id, name, style_code, revenue, units_sold
      from public.styles order by revenue desc limit 6
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

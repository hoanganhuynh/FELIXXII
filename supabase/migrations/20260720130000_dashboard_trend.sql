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

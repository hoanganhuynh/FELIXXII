-- ============================================================
-- Fix nested aggregate error in rpv_by_category.
-- PostgreSQL does not allow aggregate functions nested inside
-- another aggregate's argument list or ORDER BY clause.
-- Solution: compute per-category aggregates in a subquery first,
-- then apply jsonb_agg on the pre-computed rows.
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
  returned_orders as (
    select * from public.orders where status = 'Returned'
  ),
  returned_items as (
    select oi.qty, oi.price, v.style_id
    from public.order_items oi
    join returned_orders r on r.id = oi.order_id
    join public.variants v on v.sku = oi.sku
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
      select s.id, s.name, s.style_code, s.images,
             coalesce(sum(pi.qty * pi.price), 0)::bigint as revenue,
             s.units_sold
      from public.styles s
      left join paid_items pi on pi.style_id = s.id
      group by s.id, s.name, s.style_code, s.images, s.units_sold
      order by revenue desc
      limit 6
    ) t
  ),
  oos as (
    select jsonb_agg(o) as rows from (
      select s.id, s.name, s.style_code, s.images,
             count(v.*)::int                                        as sku_count,
             s.units_sold,
             count(v.*) filter (where v.stock = 0)::int             as oos_count,
             count(v.*) filter (where v.stock between 1 and 3)::int as low_count
      from public.styles s join public.variants v on v.style_id = s.id
      where s.status = 'active'
      group by s.id, s.name, s.style_code, s.images, s.units_sold
      having count(v.*) filter (where v.stock = 0) > 0
          or count(v.*) filter (where v.stock between 1 and 3) > 0
      order by (count(v.*) filter (where v.stock = 0) * 2
              + count(v.*) filter (where v.stock between 1 and 3)) desc,
               s.units_sold desc
      limit 6
    ) o
  ),
  top_returned as (
    select jsonb_agg(tr) as rows from (
      select s.id, s.name, s.style_code, s.images,
             coalesce(sum(ri.qty), 0)::int as returned_qty
      from public.styles s
      join returned_items ri on ri.style_id = s.id
      group by s.id, s.name, s.style_code, s.images
      order by returned_qty desc
      limit 6
    ) tr
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
  ),
  return_reasons as (
    select jsonb_agg(jsonb_build_object('reason', reason, 'count', n, 'pct', pct) order by n desc) as rows
    from (
      select
        coalesce(return_reason::text, 'unspecified') as reason,
        count(*) as n,
        round(100.0 * count(*) / sum(count(*)) over (), 1) as pct
      from public.orders
      where status = 'Returned'
      group by return_reason
    ) x
  ),

  -- ── 1. DEAD STOCK ALERT ────────────────────────────────────────
  dead_stock_raw as (
    select
      s.id, s.name, s.style_code, s.images,
      s.units_sold, s.views, s.price,
      cat.label as category,
      coalesce(sum(v.stock), 0)::int as total_stock,
      extract(day from now() - s.created_at)::int as days_live,
      (coalesce(sum(v.stock), 0)
        * extract(day from now() - s.created_at)
        / greatest(s.units_sold, 1))::int as score,
      case
        when s.units_sold = 0
             and coalesce(sum(v.stock), 0) > 10
             and extract(day from now() - s.created_at) > 60 then 'critical'
        when s.units_sold = 0
             and extract(day from now() - s.created_at) > 30 then 'warning'
        when s.views > 200
             and (s.units_sold::numeric / greatest(s.views, 1)) < 0.01 then 'low_conversion'
        else 'watch'
      end as alert
    from public.styles s
    join public.categories cat on cat.id = s.category_id
    left join public.variants v on v.style_id = s.id
    where s.status = 'active'
      and (
        (s.units_sold = 0 and s.created_at < now() - interval '30 days')
        or (s.views > 200 and s.units_sold::numeric / greatest(s.views, 1) < 0.01)
      )
    group by s.id, s.name, s.style_code, s.images, s.units_sold, s.views, s.price, cat.label, s.created_at
    order by score desc
    limit 20
  ),
  dead_stock as (
    select jsonb_agg(d order by d.score desc) as rows from dead_stock_raw d
  ),

  -- ── 2. REORDER URGENCY ─────────────────────────────────────────
  reorder_raw as (
    select
      s.id, s.name, s.style_code, s.images,
      cat.label as category,
      s.units_sold,
      coalesce(sum(v.stock), 0)::int as total_stock,
      case
        when extract(day from now() - s.created_at) > 0
        then round(s.units_sold::numeric / extract(day from now() - s.created_at), 2)
        else 0
      end as units_per_day,
      case
        when extract(day from now() - s.created_at) > 0 and s.units_sold > 0
        then round(
               coalesce(sum(v.stock), 0)::numeric
               / (s.units_sold::numeric / extract(day from now() - s.created_at))
             )::int
        else null
      end as days_until_oos,
      case
        when extract(day from now() - s.created_at) > 0 and s.units_sold > 0
             and coalesce(sum(v.stock), 0)::numeric
                 / (s.units_sold::numeric / extract(day from now() - s.created_at)) < 7
        then 'critical'
        when extract(day from now() - s.created_at) > 0 and s.units_sold > 0
             and coalesce(sum(v.stock), 0)::numeric
                 / (s.units_sold::numeric / extract(day from now() - s.created_at)) < 21
        then 'warning'
        else 'normal'
      end as urgency
    from public.styles s
    join public.categories cat on cat.id = s.category_id
    left join public.variants v on v.style_id = s.id
    where s.status = 'active'
    group by s.id, s.name, s.style_code, s.images, s.units_sold, cat.label, s.created_at
    having
      coalesce(sum(v.stock), 0) > 0
      and s.units_sold > 0
      and extract(day from now() - s.created_at) > 0
      and (
        coalesce(sum(v.stock), 0)::numeric
        / (s.units_sold::numeric / extract(day from now() - s.created_at))
      ) <= 30
    order by days_until_oos asc
    limit 10
  ),
  reorder_urgency as (
    select jsonb_agg(r order by r.days_until_oos asc) as rows from reorder_raw r
  ),

  -- ── 3. REVENUE PER VIEW (RPV) by category ─────────────────────
  -- Pre-compute aggregates per category first to avoid nested aggregates.
  rpv_raw as (
    select
      cat.id,
      cat.label,
      coalesce(sum(pi.qty * pi.price), 0)::bigint           as revenue,
      coalesce(sum(s.views), 0)::bigint                      as views,
      coalesce(sum(s.units_sold), 0)::bigint                 as units_sold,
      case
        when coalesce(sum(s.views), 0) = 0 then 0::bigint
        else round(
               coalesce(sum(pi.qty * pi.price), 0)::numeric
               / coalesce(sum(s.views), 0)
             )::bigint
      end as rpv
    from public.categories cat
    join public.styles s on s.category_id = cat.id
    left join paid_items pi on pi.style_id = s.id
    group by cat.id, cat.label
    order by rpv desc
  ),
  rpv_by_category as (
    select jsonb_agg(jsonb_build_object(
      'id',         r.id,
      'label',      r.label,
      'revenue',    r.revenue,
      'views',      r.views,
      'units_sold', r.units_sold,
      'rpv',        r.rpv
    ) order by r.rpv desc) as rows
    from rpv_raw r
  ),

  -- ── 4. RETURN REVENUE (revenue at risk) by category ───────────
  ret_rev_raw as (
    select
      cat.id,
      cat.label,
      coalesce(paid_agg.v, 0)::bigint as paid_revenue,
      coalesce(ret_agg.v, 0)::bigint  as return_value,
      case
        when coalesce(paid_agg.v, 0) + coalesce(ret_agg.v, 0) = 0 then 0
        else round(
          coalesce(ret_agg.v, 0)::numeric * 100
          / (coalesce(paid_agg.v, 0) + coalesce(ret_agg.v, 0))
        )::int
      end as return_pct
    from public.categories cat
    left join (
      select s2.category_id, coalesce(sum(pi2.qty * pi2.price), 0)::bigint as v
      from public.styles s2
      left join paid_items pi2 on pi2.style_id = s2.id
      group by s2.category_id
    ) paid_agg on paid_agg.category_id = cat.id
    left join (
      select s3.category_id, coalesce(sum(ri2.qty * ri2.price), 0)::bigint as v
      from public.styles s3
      left join returned_items ri2 on ri2.style_id = s3.id
      group by s3.category_id
    ) ret_agg on ret_agg.category_id = cat.id
    order by return_value desc
  ),
  return_revenue_by_cat as (
    select jsonb_agg(jsonb_build_object(
      'id',           r.id,
      'label',        r.label,
      'paid_revenue', r.paid_revenue,
      'return_value', r.return_value,
      'return_pct',   r.return_pct
    ) order by r.return_value desc) as rows
    from ret_rev_raw r
  ),

  -- ── 5. CHANNEL PERFORMANCE ─────────────────────────────────────
  channel_perf as (
    select jsonb_agg(jsonb_build_object(
      'channel',  channel::text,
      'orders',   cnt,
      'revenue',  rev,
      'aov',      case when cnt = 0 then 0 else round(rev::numeric / cnt) end
    ) order by rev desc) as rows
    from (
      select channel, count(*)::int as cnt, coalesce(sum(total), 0)::bigint as rev
      from public.orders
      where status not in ('Cancelled', 'Returned')
      group by channel
    ) x
  )

  select jsonb_build_object(
    'revenue',                (select revenue from kpi),
    'orders',                 (select orders  from kpi),
    'aov',                    (select aov     from kpi),
    'units',                  (select units   from kpi),
    'return_rate',            (select case when all_orders = 0 then 0 else returned::numeric * 100 / all_orders end from rates),
    'conversion',             (select case when views = 0 then 0 else sold::numeric * 100 / views end from rates),
    'by_category',            coalesce((select rows from by_cat), '[]'::jsonb),
    'by_collection',          coalesce((select rows from by_col), '[]'::jsonb),
    'top',                    coalesce((select rows from top), '[]'::jsonb),
    'stock_outs',             coalesce((select rows from oos), '[]'::jsonb),
    'top_returned',           coalesce((select rows from top_returned), '[]'::jsonb),
    'oos_skus',               (select n from oos_total),
    'vip_count',              (select count(*)::int from public.customers where segment = 'VIP'),
    'vip_ltv',                (select coalesce(sum(ltv), 0)::bigint from public.customers where segment = 'VIP'),
    'total_ltv',              (select coalesce(sum(ltv), 0)::bigint from public.customers),
    'avg_ltv',                (select coalesce(round(avg(ltv)), 0)::bigint from public.customers),
    'repeat_rate_by_year',    coalesce((select rows from repeat_by_year), '[]'::jsonb),
    'return_reasons',         coalesce((select rows from return_reasons), '[]'::jsonb),
    'dead_stock',             coalesce((select rows from dead_stock), '[]'::jsonb),
    'reorder_urgency',        coalesce((select rows from reorder_urgency), '[]'::jsonb),
    'rpv_by_category',        coalesce((select rows from rpv_by_category), '[]'::jsonb),
    'return_revenue_by_cat',  coalesce((select rows from return_revenue_by_cat), '[]'::jsonb),
    'channel_perf',           coalesce((select rows from channel_perf), '[]'::jsonb)
  ) into result;

  return result;
end;
$$;

revoke all on function public.dashboard_stats() from public, anon;
grant execute on function public.dashboard_stats() to authenticated;

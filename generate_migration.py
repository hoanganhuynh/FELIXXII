import os

content = """-- Add tracking_events and wishlist tables
create table if not exists public.tracking_events (
  id uuid primary key default gen_random_uuid(),
  event_type text not null,
  object_id text,
  created_at timestamptz not null default now()
);
alter table public.tracking_events enable row level security;
create policy "tracking_events insertable by anyone" on public.tracking_events for insert with check (true);
create policy "tracking_events readable by admin" on public.tracking_events for select using (public.is_admin());

create table if not exists public.wishlist (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid references public.customers(id),
  style_id uuid references public.styles(id),
  created_at timestamptz not null default now()
);
alter table public.wishlist enable row level security;
create policy "wishlist all by admin" on public.wishlist using (public.is_admin());
create policy "wishlist readable by owner" on public.wishlist for select using (auth.uid() = customer_id);

create or replace function public.dashboard_stats_v2(
  time_filter text default 'all',
  source_filter text default 'all'
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  result jsonb;
  range_start timestamptz;
  range_end timestamptz := now();
begin
  if not public.is_admin() then
    raise exception 'forbidden: admin role required'
      using errcode = '42501';
  end if;

  if time_filter = 'today' then
    range_start := date_trunc('day', now());
  elsif time_filter = 'yesterday' then
    range_start := date_trunc('day', now() - interval '1 day');
    range_end := date_trunc('day', now());
  elsif time_filter = '7d' then
    range_start := date_trunc('day', now() - interval '7 days');
  elsif time_filter = 'month' then
    range_start := date_trunc('month', now());
  elsif time_filter = 'quarter' then
    range_start := date_trunc('quarter', now());
  elsif time_filter = 'year' then
    range_start := date_trunc('year', now());
  else
    range_start := '2000-01-01'::timestamptz;
  end if;

  with paid_items as (
    select oi.order_id, oi.qty, oi.price, v.style_id, s.category_id, s.collection_id, s.source_id
    from public.order_items oi
    join public.orders p on p.id = oi.order_id
    join public.variants v on v.sku = oi.sku
    join public.styles s on s.id = v.style_id
    where p.status not in ('Cancelled', 'Returned')
      and p.placed_at >= range_start and p.placed_at < range_end
      and (source_filter = 'all' or s.source_id = source_filter)
  ),
  returned_items as (
    select oi.order_id, oi.qty, oi.price, v.style_id, s.category_id, s.collection_id, s.source_id
    from public.order_items oi
    join public.orders p on p.id = oi.order_id
    join public.variants v on v.sku = oi.sku
    join public.styles s on s.id = v.style_id
    where p.status = 'Returned'
      and p.placed_at >= range_start and p.placed_at < range_end
      and (source_filter = 'all' or s.source_id = source_filter)
  ),
  kpi as (
    select
      coalesce(sum(pi.qty * pi.price), 0)::bigint as revenue,
      count(distinct pi.order_id)::int as orders,
      case when count(distinct pi.order_id) = 0 then 0 else coalesce(sum(pi.qty * pi.price), 0) / count(distinct pi.order_id) end as aov,
      coalesce(sum(pi.qty), 0)::int as units
    from paid_items pi
  ),
  rates as (
    select
      (select count(distinct pi.order_id) from paid_items pi)::int as all_orders,
      (select count(distinct ri.order_id) from returned_items ri)::int as returned,
      (select count(*) from public.tracking_events where event_type = 'web_visit' and created_at >= range_start and created_at < range_end)::bigint as views,
      (select units from kpi) as sold
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
  by_source as (
    select jsonb_agg(jsonb_build_object('id', src.id, 'label', src.label, 'value', src.v) order by src.v desc) as rows
    from (
      select s.id, s.label, coalesce(sum(pi.qty * pi.price), 0)::bigint as v
      from public.sources s
      left join paid_items pi on pi.source_id = s.id
      group by s.id, s.label
    ) src
  ),
  top as (
    select jsonb_agg(t) as rows from (
      select s.id, s.name, s.style_code, s.images,
             coalesce(sum(pi.qty * pi.price), 0)::bigint as revenue,
             coalesce(sum(pi.qty), 0)::int as units_sold
      from public.styles s
      left join paid_items pi on pi.style_id = s.id
      where pi.qty is not null
      group by s.id, s.name, s.style_code, s.images
      order by revenue desc
      limit 6
    ) t
  ),
  clicks as (
    select jsonb_build_object(
      'web_visits', (select count(*) from public.tracking_events where event_type = 'web_visit' and created_at >= range_start and created_at < range_end),
      'product_clicks', (select count(*) from public.tracking_events where event_type = 'product_click' and created_at >= range_start and created_at < range_end),
      'source_clicks', (select count(*) from public.tracking_events where event_type = 'source_click' and created_at >= range_start and created_at < range_end),
      'collection_clicks', (select count(*) from public.tracking_events where event_type = 'collection_click' and created_at >= range_start and created_at < range_end),
      'campaign_clicks', (select count(*) from public.tracking_events where event_type = 'campaign_click' and created_at >= range_start and created_at < range_end)
    ) as stats
  ),
  wishlist_pie as (
    select jsonb_agg(jsonb_build_object('id', cat.id, 'label', cat.label, 'value', w.v) order by w.v desc) as rows
    from (
      select s.category_id, count(*)::int as v
      from public.wishlist wl
      join public.styles s on s.id = wl.style_id
      where wl.created_at >= range_start and wl.created_at < range_end
      group by s.category_id
    ) w
    join public.categories cat on cat.id = w.category_id
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
    'by_source',              coalesce((select rows from by_source), '[]'::jsonb),
    'top',                    coalesce((select rows from top), '[]'::jsonb),
    'clicks',                 (select stats from clicks),
    'wishlist_pie',           coalesce((select rows from wishlist_pie), '[]'::jsonb)
  ) into result;

  return result;
end;
$$;
revoke all on function public.dashboard_stats_v2(text, text) from public, anon;
grant execute on function public.dashboard_stats_v2(text, text) to authenticated;
"""

with open('supabase/migrations/20260806000000_dashboard_tracking_wishlist.sql', 'w') as f:
    f.write(content)


-- Add 'day' granularity to dashboard_trend().
-- Shows the last N days (typically 30) at 1-day resolution.
-- Drill-down for day view is handled client-side (no detail RPC needed).
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
    when 'day'     then step := interval '1 day';    aligned_start := date_trunc('day',     range_start::timestamp);
    when 'month'   then step := interval '1 month';  aligned_start := date_trunc('month',   range_start::timestamp);
    when 'quarter' then step := interval '3 months'; aligned_start := date_trunc('quarter', range_start::timestamp);
    when 'year'    then step := interval '1 year';   aligned_start := date_trunc('year',    range_start::timestamp);
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
      when 'day'     then to_char(bk.bucket_start, 'DD/MM')
      when 'month'   then to_char(bk.bucket_start, 'YYYY-MM')
      when 'quarter' then to_char(bk.bucket_start, 'YYYY') || '-Q' || to_char(bk.bucket_start, 'Q')
      else to_char(bk.bucket_start, 'YYYY')
    end,
    'revenue',            bk.revenue,
    'orders',             bk.orders,
    'aov',                bk.aov,
    'return_rate',        case when br.all_orders = 0 then 0 else br.returned::numeric * 100 / br.all_orders end,
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

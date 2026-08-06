-- ============================================================
-- Storefront New Arrival ranking
--
-- Public visitors cannot read orders/order_items directly because RLS keeps
-- order history private. This SECURITY DEFINER RPC exposes only the aggregate
-- needed by the homepage: among the newest active admin-managed styles,
-- which sold most in the last 7 days.
-- ============================================================

create or replace function public.storefront_new_arrivals(
  p_candidates int default 20,
  p_limit int default 5
)
returns table (
  style_id uuid,
  weekly_units int,
  created_at timestamptz
)
language sql
stable
security definer
set search_path = public
as $$
  with newest as (
    select s.id, s.created_at
    from public.styles s
    where s.status = 'active'
      and s.source_id is not null
      and s.garment_type_id is not null
      and exists (select 1 from public.variants v where v.style_id = s.id)
    order by s.created_at desc
    limit greatest(p_candidates, p_limit)
  ),
  weekly_sales as (
    select v.style_id, coalesce(sum(oi.qty), 0)::int as weekly_units
    from public.order_items oi
    join public.orders o on o.id = oi.order_id
    join public.variants v on v.sku = oi.sku
    where o.placed_at >= now() - interval '7 days'
      and o.status not in ('Returned', 'Cancelled')
    group by v.style_id
  )
  select
    n.id as style_id,
    coalesce(ws.weekly_units, 0)::int as weekly_units,
    n.created_at
  from newest n
  left join weekly_sales ws on ws.style_id = n.id
  order by coalesce(ws.weekly_units, 0) desc, n.created_at desc
  limit p_limit;
$$;

grant execute on function public.storefront_new_arrivals(int, int) to anon, authenticated;

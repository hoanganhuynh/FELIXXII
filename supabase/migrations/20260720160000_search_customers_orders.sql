-- ============================================================
-- search_customers — accent-insensitive, word-order-independent
-- "nguyen lan" → finds "Lan Nguyen" regardless of word order
-- "0912 hcm"  → finds customers matching phone + city
-- Depends on f_unaccent() from 20260716120100_search.sql
-- ============================================================
create or replace function public.search_customers(
  q            text    default '',
  p_segment    text    default null,
  p_page       int     default 0,
  p_page_size  int     default 20
)
returns table (
  id           uuid,
  name         text,
  email        text,
  phone        text,
  city         text,
  segment      public.segment,
  ltv          bigint,
  orders_count int,
  joined       date,
  height       int,
  weight       int,
  bust         int,
  waist        int,
  hip          int,
  body_type    public.body_type,
  user_id      uuid,
  total_count  bigint
)
language sql
stable
set search_path = ''
as $$
  with words as (
    -- split folded query into individual tokens, drop blanks
    select trim(w) as w
    from unnest(string_to_array(public.f_unaccent(lower(trim(q))), ' ')) as w
    where trim(w) <> ''
  ),
  matched as (
    select c.*
    from public.customers c
    where (
      -- no query → return all
      not exists (select 1 from words)
      or (
        -- every word must hit at least one field (AND-of-ORs)
        not exists (
          select 1 from words wd
          where not (
              public.f_unaccent(c.name)                  ilike '%' || wd.w || '%'
            or c.email                                   ilike '%' || wd.w || '%'
            or coalesce(c.phone, '')                     ilike '%' || wd.w || '%'
            or public.f_unaccent(coalesce(c.city, ''))   ilike '%' || wd.w || '%'
          )
        )
      )
    )
    and (p_segment is null or c.segment = p_segment::public.segment)
  )
  select
    c.id, c.name, c.email, c.phone, c.city, c.segment, c.ltv,
    c.orders_count, c.joined, c.height, c.weight, c.bust, c.waist, c.hip,
    c.body_type, c.user_id,
    count(*) over ()::bigint
  from matched c
  order by c.ltv desc
  limit p_page_size
  offset p_page * p_page_size;
$$;

-- ============================================================
-- search_orders — by order ID, customer name, customer email
-- Returns a flat row (no nested JSON) — TypeScript reshapes it.
-- ============================================================
create or replace function public.search_orders(
  q            text    default '',
  p_status     text    default null,
  p_channel    text    default null,
  p_page       int     default 0,
  p_page_size  int     default 20
)
returns table (
  id             text,
  customer_id    uuid,
  placed_at      timestamptz,
  status         public.order_status,
  channel        public.order_channel,
  total          bigint,
  city           text,
  return_reason  public.return_reason,
  return_note    text,
  customer_name  text,
  customer_email text,
  item_qty       bigint,
  total_count    bigint
)
language sql
stable
set search_path = ''
as $$
  with words as (
    select trim(w) as w
    from unnest(string_to_array(public.f_unaccent(lower(trim(q))), ' ')) as w
    where trim(w) <> ''
  ),
  matched as (
    select o.*, c.name as c_name, c.email as c_email
    from public.orders o
    join public.customers c on c.id = o.customer_id
    where (
      not exists (select 1 from words)
      or not exists (
        select 1 from words wd
        where not (
            o.id                         ilike '%' || wd.w || '%'
          or public.f_unaccent(c.name)   ilike '%' || wd.w || '%'
          or c.email                     ilike '%' || wd.w || '%'
        )
      )
    )
    and (p_status  is null or o.status  = p_status::public.order_status)
    and (p_channel is null or o.channel = p_channel::public.order_channel)
  )
  select
    m.id, m.customer_id, m.placed_at, m.status, m.channel, m.total, m.city,
    m.return_reason, m.return_note,
    m.c_name, m.c_email,
    coalesce(
      (select sum(oi.qty) from public.order_items oi where oi.order_id = m.id),
      0
    )::bigint,
    count(*) over ()::bigint
  from matched m
  order by m.placed_at desc
  limit p_page_size
  offset p_page * p_page_size;
$$;

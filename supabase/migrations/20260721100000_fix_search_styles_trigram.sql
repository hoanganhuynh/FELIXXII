-- Fix: trigram fallback caused "Lụa Đêm A40" to return all 14 Lụa Đêm products
-- because every "Lụa Đêm *" name shares enough trigrams with "lua dem a40".
-- Solution: only use trigram for single-word queries (typo tolerance like "loa" → "Lụa").
-- Multi-word queries rely solely on tsvector AND logic for precise results.
create or replace function public.search_styles(
  q            text                default '',
  p_category   text                default null,
  p_collection text                default null,
  p_status     text                default null,
  p_stock      text                default null,
  p_sort       text                default 'new',
  p_page       int                 default 0,
  p_page_size  int                 default 25
)
returns table (
  id            uuid,
  style_code    text,
  serial        int,
  name          text,
  category_id   text,
  collection_id text,
  silhouette    text,
  occasion      text,
  price         bigint,
  material      text,
  body_type     public.body_type,
  status        public.style_status,
  images        text[],
  units_sold    int,
  views         int,
  returns       int,
  revenue       bigint,
  created_at    timestamptz,
  sku_count     int,
  total_stock   int,
  oos_count     int,
  low_count     int,
  colors        jsonb,
  sizes         text[],
  total_count   bigint
)
language sql
stable
set search_path = ''
as $$
  with
  norm_q as (
    select public.f_unaccent(lower(trim(q))) as v
  ),
  tsq as (
    select websearch_to_tsquery('simple', (select v from norm_q)) as v
  ),
  is_single_word as (
    -- single word: no spaces after normalization
    select (select v from norm_q) not like '% %' as v
  ),
  matched as (
    select sl.*
    from public.style_list sl
    join public.styles s on s.id = sl.id
    where (
        -- full-text: all words must match (AND), so "lua dem a40" only hits "Lụa Đêm A40"
        (select v from tsq) is not null
        and s.search_vector @@ (select v from tsq)
      or (
        -- trigram fallback: only for single-word queries (typo tolerance)
        (select v from is_single_word)
        and public.f_unaccent(sl.name) OPERATOR(public.%) (select v from norm_q)
      )
    )
    and (p_category   is null or p_category   = '' or sl.category_id   = p_category)
    and (p_collection is null or p_collection = '' or sl.collection_id = p_collection)
    and (p_status     is null or p_status     = '' or sl.status        = p_status::public.style_status)
    and (
      p_stock is null or p_stock = ''
      or (p_stock = 'out' and sl.total_stock = 0)
      or (p_stock = 'low' and sl.total_stock < 12)
    )
  )
  select
    id, style_code, serial, name, category_id, collection_id, silhouette, occasion,
    price, material, body_type, status, images,
    units_sold, views, returns, revenue, created_at,
    sku_count, total_stock, oos_count, low_count, colors, sizes,
    count(*) over ()::bigint
  from matched
  order by
    (case when p_sort = 'best' then units_sold  end) desc nulls last,
    (case when p_sort = 'asc'  then price       end) asc  nulls last,
    (case when p_sort = 'desc' then price       end) desc nulls last,
    (case when p_sort not in ('best', 'asc', 'desc') then created_at end) desc nulls last,
    style_code asc
  limit p_page_size
  offset p_page * p_page_size;
$$;

-- ============================================================
-- Search — the Postgres equivalent of the Elasticsearch spec
-- in /admin/reference. Mirrors admin/lib/search.ts ranking.
--
--   asciifolding      -> unaccent      (gõ 'nguyet' ra 'Nguyệt')
--   sku^5 name^2 …    -> setweight A/B/C + ts_rank
--   search_as_you_type-> text_pattern_ops prefix index
--   fuzziness: AUTO   -> pg_trgm  (name only — NEVER on sku)
-- ============================================================

-- unaccent() is STABLE, not IMMUTABLE, so it cannot be used directly in a
-- generated column or an index expression. Pinning the dictionary makes the
-- wrapper safely immutable. Without this, the ALTER below errors out.
create or replace function public.f_unaccent(text)
returns text
language sql
immutable
strict
parallel safe
set search_path = ''
as $$ select public.unaccent('public.unaccent', $1) $$;

-- ---------- style search vector ----------
-- 'simple' NOT 'english': the english stemmer mangles Vietnamese.
alter table public.styles add column search_vector tsvector
  generated always as (
    setweight(to_tsvector('simple', public.f_unaccent(coalesce(style_code, ''))), 'A') ||
    setweight(to_tsvector('simple', public.f_unaccent(coalesce(name, ''))),       'B') ||
    setweight(to_tsvector('simple', public.f_unaccent(coalesce(material, ''))),   'C')
  ) stored;

create index styles_search_idx on public.styles using gin (search_vector);

-- fuzzy name matching (typo tolerance)
create index styles_name_trgm_idx on public.styles using gin (public.f_unaccent(name) gin_trgm_ops);

-- ---------- sku lookup ----------
-- text_pattern_ops powers prefix scans: sku LIKE 'FX-EV-01%'
create index variants_sku_prefix_idx on public.variants (sku text_pattern_ops);
-- segment search: staff type just '0142' or 'NV'
create index variants_sku_trgm_idx   on public.variants using gin (sku gin_trgm_ops);

-- ============================================================
-- search_skus() — one round trip, ranked like the ES bool/should
-- Boosts:  exact sku/barcode 100 > style_code 60 > prefix 40
--          > sku segment 25 > name fts 15 > name fuzzy 5
-- ============================================================
create or replace function public.search_skus(
  q             text,
  only_active   boolean default true,
  in_stock_only boolean default false,
  max_rows      int     default 200
)
returns table (
  sku        text,
  style_id   uuid,
  style_name text,
  style_code text,
  color_name text,
  color_hex  text,
  size       text,
  stock      int,
  barcode    text,
  price      bigint,
  score      real
)
language sql
stable
set search_path = ''
as $$
  -- IMPORTANT: match the two levels SEPARATELY, then combine.
  -- A single WHERE with ORs spanning styles+variants forces a seq scan of all
  -- 7k variants and re-evaluates f_unaccent(s.name) once PER VARIANT (14x waste,
  -- ~120ms). Split, and each branch uses its own index over its own table.
  with n as (
    select
      upper(trim(q))                    as raw,
      public.f_unaccent(lower(trim(q))) as folded,
      websearch_to_tsquery('simple', public.f_unaccent(lower(trim(q)))) as tsq
  ),
  -- style level: only 509 rows; hits styles_search_idx / styles_name_trgm_idx
  style_hits as (
    select
      s.id,
      (   case when s.style_code = n.raw then 60 else 0 end
        + case when n.tsq is not null and s.search_vector @@ n.tsq
               then 15 * ts_rank(s.search_vector, n.tsq) else 0 end
        -- fuzzy rescues the NAME only; a 1-char slip in a SKU is a different product
        + case when public.similarity(public.f_unaccent(s.name), n.folded) > 0.3
               then 5 * public.similarity(public.f_unaccent(s.name), n.folded) else 0 end
      )::real as sscore
    from public.styles s cross join n
    where s.style_code = n.raw
       or (n.tsq is not null and s.search_vector @@ n.tsq)
       -- OPERATOR(public.%) not bare %: search_path is pinned to ''.
       or public.f_unaccent(s.name) OPERATOR(public.%) n.folded
  ),
  -- sku level: hits variants_sku_prefix_idx / variants_sku_trgm_idx
  sku_hits as (
    select
      v.sku,
      (   case when v.sku = n.raw or v.barcode = n.raw then 100 else 0 end
        + case when v.sku like n.raw || '%'            then 40  else 0 end
        + case when v.sku like '%' || n.raw || '%'     then 25  else 0 end
      )::real as vscore
    from public.variants v cross join n
    where n.raw <> ''
      and ( v.sku = n.raw
         or v.barcode = n.raw
         -- leading-wildcard LIKE is fine here: pg_trgm's GIN index serves it,
         -- which is what lets staff search a bare segment like '0142'
         or v.sku like '%' || n.raw || '%' )
  ),
  cand as (
    select v.sku, sh.sscore as score
      from public.variants v join style_hits sh on sh.id = v.style_id
    union all
    select kh.sku, kh.vscore from sku_hits kh
  ),
  agg as (
    select c.sku, sum(c.score)::real as score from cand c group by c.sku
  )
  select
    v.sku, s.id, s.name, s.style_code, v.color_name, v.color_hex,
    v.size, v.stock, v.barcode,
    coalesce(v.price_override, s.price) as price,
    a.score
  from agg a
  join public.variants v on v.sku = a.sku
  join public.styles   s on s.id  = v.style_id
  where a.score > 0
    and (not only_active   or s.status = 'active')
    and (not in_stock_only or v.stock > 0)
  order by a.score desc, v.sku
  limit greatest(1, least(max_rows, 500));
$$;

-- ============================================================
-- facet counts — the terms-agg equivalent for the storefront rail
-- ============================================================
create or replace function public.facet_counts(collection text default null)
returns table (facet text, value text, n bigint)
language sql
stable
set search_path = ''
as $$
  select 'category', s.category_id, count(*)
  from public.styles s
  where s.status = 'active' and (collection is null or s.collection_id = collection)
  group by s.category_id
  union all
  select 'color', v.color_name, count(distinct s.id)
  from public.styles s join public.variants v on v.style_id = s.id
  where s.status = 'active' and (collection is null or s.collection_id = collection)
  group by v.color_name
  union all
  select 'size', v.size, count(distinct s.id)
  from public.styles s join public.variants v on v.style_id = s.id
  where s.status = 'active' and (collection is null or s.collection_id = collection)
  group by v.size;
$$;

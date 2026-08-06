-- ============================================================
-- New Product flow: Nguồn hàng > Loại sản phẩm > Tên sản phẩm-Màu-Size
--
-- Additive only — no existing column/table is dropped or renamed, so the
-- dashboard/analytics RPCs and the order_items -> variants.sku FK keep
-- working untouched. New concepts:
--   sources        ("Nguồn hàng")   — new taxonomy, separate from categories
--   garment_types  ("Phân loại")    — Top/Jacket/Out-wear/Shirt/Skirt/Dress/Pants/Gown
--   styles.*       new descriptive columns (source, garment type, description,
--                   3-slot images) to match the "Loại sản phẩm" shared fields
--   variants.in_stock  simple "Còn hàng / Hết hàng" toggle, backed by the
--                   existing `stock` column so style_list's aggregates and
--                   every dashboard tile need zero changes.
-- ============================================================

-- ---------- Nguồn hàng ----------
create table public.sources (
  id    text primary key,
  label text not null,
  sort  int  not null default 0
);

insert into public.sources (id, label, sort) values
  ('bridal',         'Bridal',         0),
  ('ready-to-wear',  'Ready-to-Wear',  1),
  ('custom-order',   'Custom Order',   2),
  ('import',         'Import',         3);

-- ---------- Phân loại ----------
create table public.garment_types (
  id    text primary key,
  label text not null,
  sort  int  not null default 0
);

insert into public.garment_types (id, label, sort) values
  ('top',      'Top',      0),
  ('jacket',   'Jacket',   1),
  ('outwear',  'Out-wear', 2),
  ('shirt',    'Shirt',    3),
  ('skirt',    'Skirt',    4),
  ('dress',    'Dress',    5),
  ('pants',    'Pants',    6),
  ('gown',     'Gown',     7);

-- ---------- styles: shared "Loại sản phẩm" fields ----------
alter table public.styles
  add column source_id        text references public.sources(id),
  add column garment_type_id  text references public.garment_types(id),
  add column description      text,
  add column image_product_view text,
  add column image_model_view   text,
  add column images_detail      text[] not null default '{}';

create index styles_source_id_idx       on public.styles (source_id);
create index styles_garment_type_id_idx on public.styles (garment_type_id);

-- ---------- variants: "Tên sản phẩm" stock toggle ----------
alter table public.variants
  add column in_stock boolean not null default true;

update public.variants set in_stock = (stock > 0);

-- ---------- style_list view: append the new columns (additive, same shape otherwise) ----------
create or replace view public.style_list with (security_invoker = true) as
select
  s.id, s.style_code, s.serial, s.name,
  s.category_id, s.collection_id, s.silhouette, s.occasion,
  s.price, s.material, s.body_type, s.status, s.images,
  s.units_sold, s.views, s.returns, s.revenue, s.created_at,
  agg.sku_count, agg.total_stock, agg.oos_count, agg.low_count, agg.colors, agg.sizes,
  s.source_id, s.garment_type_id, s.description,
  s.image_product_view, s.image_model_view, s.images_detail
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

-- ---------- RLS: same public-read / admin-write shape as categories/collections ----------
alter table public.sources       enable row level security;
alter table public.garment_types enable row level security;

create policy "sources readable by anyone" on public.sources
  for select using (true);
create policy "garment types readable by anyone" on public.garment_types
  for select using (true);

create policy "admin all sources" on public.sources
  for all using ((select public.is_admin())) with check ((select public.is_admin()));
create policy "admin all garment types" on public.garment_types
  for all using ((select public.is_admin())) with check ((select public.is_admin()));

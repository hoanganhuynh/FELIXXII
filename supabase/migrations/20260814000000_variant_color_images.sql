-- ============================================================
-- Per-colour product images
--
-- A style such as "Rose" can have several colours, and each colour needs its
-- own product/model/detail images. Keep legacy style-level images as fallback,
-- but allow every variant row to carry the image set for its colour.
-- ============================================================

alter table public.variants
  add column if not exists image_product_view text,
  add column if not exists image_model_view text,
  add column if not exists images_detail text[] not null default '{}';

create or replace view public.style_list with (security_invoker = true) as
select
  s.id, s.style_code, s.serial, s.name,
  s.category_id, s.collection_id, s.silhouette, s.occasion,
  s.price, s.material, s.body_type, s.status, s.images,
  s.units_sold, s.views, s.returns, s.revenue, s.created_at,
  agg.sku_count, agg.total_stock, agg.oos_count, agg.low_count, agg.colors, agg.sizes,
  s.source_id, s.garment_type_id, s.description,
  s.image_product_view, s.image_model_view, s.images_detail,
  cv.color_variants
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
) agg on true
left join lateral (
  select coalesce(jsonb_agg(jsonb_build_object(
    'name', by_color.color_name,
    'hex', by_color.color_hex,
    'sizes', by_color.sizes,
    'price', by_color.price,
    'image_product_view', coalesce(by_color.image_product_view, s.image_product_view),
    'image_model_view', coalesce(by_color.image_model_view, s.image_model_view),
    'images_detail', case
      when by_color.images_detail is not null and cardinality(by_color.images_detail) > 0
        then by_color.images_detail
      else s.images_detail
    end
  )), '[]'::jsonb) as color_variants
  from (
    select
      v.color_name,
      v.color_hex,
      array_agg(distinct v.size order by v.size) as sizes,
      max(coalesce(v.price_override, s.price)) as price,
      max(v.image_product_view) filter (where v.image_product_view is not null) as image_product_view,
      max(v.image_model_view) filter (where v.image_model_view is not null) as image_model_view,
      (
        select v2.images_detail
        from public.variants v2
        where v2.style_id = s.id
          and v2.color_name = v.color_name
          and v2.color_hex = v.color_hex
          and cardinality(v2.images_detail) > 0
        order by v2.sku
        limit 1
      ) as images_detail
    from public.variants v
    where v.style_id = s.id
    group by v.color_name, v.color_hex
  ) by_color
) cv on true;

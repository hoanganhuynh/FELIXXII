-- Keep storefront colour cards in sync with admin variant pricing.
-- Price is shared by `style + colour`, not by size. For legacy rows where
-- sizes of the same colour drifted apart, keep the highest effective price so
-- edited product prices beat old defaults.

with color_prices as (
  select
    v.style_id,
    v.color_name,
    max(coalesce(v.price_override, s.price)) as price
  from public.variants v
  join public.styles s on s.id = v.style_id
  group by v.style_id, v.color_name
)
update public.variants v
set price_override = cp.price
from color_prices cp
where v.style_id = cp.style_id
  and v.color_name = cp.color_name
  and v.price_override is distinct from cp.price;

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
    'price', by_color.price
  )), '[]'::jsonb) as color_variants
  from (
    select
      v.color_name,
      v.color_hex,
      array_agg(distinct v.size order by v.size) as sizes,
      max(coalesce(v.price_override, s.price)) as price
    from public.variants v
    where v.style_id = s.id
    group by v.color_name, v.color_hex
  ) by_color
) cv on true;

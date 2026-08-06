-- Keep only the 10 most-recently-created styles; delete everything else.
-- Run once in Supabase Dashboard → SQL Editor.

begin;

-- order_items has "on delete restrict" on variants.sku, so clear those first
delete from public.order_items
where sku in (
  select v.sku
  from public.variants v
  where v.style_id not in (
    select id from public.styles order by created_at desc limit 10
  )
);

-- deleting the style cascades to its variants automatically
delete from public.styles
where id not in (
  select id from public.styles order by created_at desc limit 10
);

commit;

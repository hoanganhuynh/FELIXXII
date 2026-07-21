-- ============================================================
-- Delete Accessories Category and Associated Data
-- ============================================================

-- 1. Delete all order items associated with accessories
delete from public.order_items
where sku in (
  select v.sku
  from public.variants v
  join public.styles s on v.style_id = s.id
  where s.category_id = 'phu-kien'
);

-- 2. Delete empty orders to prevent orphaned records
delete from public.orders
where id not in (
  select order_id from public.order_items
);

-- 3. Delete styles (and variants via cascade) in the accessories category
delete from public.styles
where category_id = 'phu-kien';

-- 4. Delete the category itself
delete from public.categories
where id = 'phu-kien';

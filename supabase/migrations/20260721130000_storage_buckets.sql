-- ============================================================
-- Add Product Images Storage Bucket
-- ============================================================

insert into storage.buckets (id, name, public)
values ('product-images', 'product-images', true)
on conflict (id) do nothing;

create policy "Product images public access"
on storage.objects for select
using ( bucket_id = 'product-images' );

create policy "Product images admin upload"
on storage.objects for insert
with check ( bucket_id = 'product-images' and public.is_admin() );

create policy "Product images admin update"
on storage.objects for update
using ( bucket_id = 'product-images' and public.is_admin() );

create policy "Product images admin delete"
on storage.objects for delete
using ( bucket_id = 'product-images' and public.is_admin() );

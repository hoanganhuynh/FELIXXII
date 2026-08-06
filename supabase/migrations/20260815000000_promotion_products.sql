-- Link promotion banners to the storefront products they should open.
-- Admin can manage mappings; shoppers can read mappings only for active banners.

create table if not exists public.promotion_products (
  promotion_id uuid not null references public.promotions(id) on delete cascade,
  style_id     uuid not null references public.styles(id) on delete cascade,
  sort_order   smallint not null default 0,
  created_at   timestamptz not null default now(),
  primary key (promotion_id, style_id)
);

alter table public.promotion_products enable row level security;

create policy "active promotion products public" on public.promotion_products
  for select using (
    exists (
      select 1
      from public.promotions p
      where p.id = promotion_products.promotion_id
        and p.active = true
    )
  );

create policy "admin manages promotion products" on public.promotion_products
  for all using (public.is_admin()) with check (public.is_admin());

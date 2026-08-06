-- ============================================================
-- Promotions — storefront banner strip managed from admin
-- Same shape as hero_banners: public reads active rows only,
-- admin has full read/write.
-- ============================================================

create table public.promotions (
  id          uuid        primary key default gen_random_uuid(),
  sort_order  smallint    not null default 0,
  active      boolean     not null default true,
  image_url   text        not null,
  link_url    text        not null default '',
  title       text        not null default '',
  created_at  timestamptz not null default now()
);

alter table public.promotions enable row level security;

create policy "active promotions public" on public.promotions
  for select using (active = true);

create policy "admin manages promotions" on public.promotions
  for all using (public.is_admin()) with check (public.is_admin());

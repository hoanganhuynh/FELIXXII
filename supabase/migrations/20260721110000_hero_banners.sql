-- ============================================================
-- Hero Banners — storefront carousel managed from admin
-- ============================================================

create table public.hero_banners (
  id              uuid        primary key default gen_random_uuid(),
  sort_order      smallint    not null default 0,
  active          boolean     not null default true,
  image_url       text        not null,
  collection_tag  text        not null default '',
  heading         text        not null default '',
  subheading      text        not null default '',
  cta1_label      text        not null default '',
  cta1_url        text        not null default '',
  cta2_label      text        not null default '',
  cta2_url        text        not null default '',
  created_at      timestamptz not null default now()
);

alter table public.hero_banners enable row level security;

-- Storefront: anyone can read active banners
create policy "active hero banners public" on public.hero_banners
  for select using (active = true);

-- Admin: full access including inactive/draft banners
create policy "admin manages hero banners" on public.hero_banners
  for all using (public.is_admin()) with check (public.is_admin());

-- ---- seed ----
insert into public.hero_banners
  (sort_order, image_url, collection_tag, heading, subheading, cta1_label, cta1_url, cta2_label, cta2_url)
values
(1,
 '/hero-banner/592347093_1190008066643058_5631399014138437439_n.jpg',
 'Fall — Winter 2025 · FW25',
 'Draped silk, deep tones, and your silhouette.',
 '',
 'Explore Collection', '/shop?collection=thu-dong-2025',
 'Shop by Category', '/shop?cat=dam-da-hoi'),

(2,
 '/product-image-demo/667405324_1300229082287622_3951756945889064705_n.jpg',
 'Spring — Summer 2026 · SS26',
 'Where light falls, the silhouette endures.',
 'The new season — airy silks, petal whites, and shapes made to move.',
 'Discover SS26', '/shop?collection=xuan-he-2026',
 'View Dresses', '/shop?cat=dam-da-hoi');

-- ============================================================
-- FELIXXII — core schema
-- Model: category (taxonomy) × collection (season)
--        style (design)  →  variant (sellable SKU)
-- Money is VND: integer bigint, never float (no sub-unit in VND).
-- ============================================================

create extension if not exists unaccent;
create extension if not exists pg_trgm;

-- ---------- taxonomy ----------
create table public.categories (
  id          text primary key,              -- 'dam-da-hoi'
  label       text not null,
  sku_prefix  text not null unique,          -- 'EV'  -> drives the SKU
  sort        int  not null default 0
);

create table public.collections (
  id        text primary key,                -- 'thu-dong-2025'
  label     text not null,
  season    text not null unique,            -- 'FW25'
  note      text,
  image     text,
  sort      int  not null default 0
);

-- ---------- styles (a design) ----------
create type public.style_status as enum ('active', 'draft', 'archived');
create type public.body_type    as enum ('hourglass', 'pear', 'apple', 'rectangle', 'inverted-triangle');

create table public.styles (
  id            uuid primary key default gen_random_uuid(),
  style_code    text not null unique,                       -- FX-EV-0142
  serial        int  not null,
  name          text not null,
  category_id   text not null references public.categories(id),
  collection_id text not null references public.collections(id),
  silhouette    text,
  occasion      text,
  price         bigint not null check (price > 0),          -- VND
  material      text,
  body_type     public.body_type,
  status        public.style_status not null default 'draft',
  images        text[] not null default '{}',
  -- denormalised analytics (a warehouse would own these; kept here so the
  -- dashboard is one query instead of a fact-table join per tile)
  units_sold    int not null default 0 check (units_sold >= 0),
  views         int not null default 0 check (views >= 0),
  returns       int not null default 0 check (returns >= 0),
  revenue       bigint generated always as (units_sold::bigint * price) stored,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  unique (category_id, serial)
);

-- ---------- variants (the sellable SKU) ----------
create table public.variants (
  sku            text primary key,                          -- FX-EV-0142-NV-M
  style_id       uuid not null references public.styles(id) on delete cascade,
  color_name     text not null,
  color_hex      text not null,
  size           text not null,
  stock          int  not null default 0 check (stock >= 0),
  reserved       int  not null default 0 check (reserved >= 0),
  barcode        text unique,
  price_override bigint check (price_override > 0),
  unique (style_id, color_name, size)
);

-- ---------- customers ----------
create type public.segment as enum ('VIP', 'Loyal', 'Regular', 'New', 'At-risk');

create table public.customers (
  id        uuid primary key default gen_random_uuid(),
  -- links to Supabase Auth when the customer has an account; null = guest/imported
  user_id   uuid unique references auth.users(id) on delete set null,
  name      text not null,
  email     text not null unique,
  phone     text,
  city      text,
  segment   public.segment not null default 'New',
  body_type public.body_type,
  -- body profile measurements (cm/kg)
  bust      int, waist int, hip int, height int, weight int,
  -- denormalised lifetime stats (same rationale as styles.units_sold)
  orders_count int    not null default 0 check (orders_count >= 0),
  ltv          bigint not null default 0 check (ltv >= 0),
  joined    date not null default current_date
);

-- ---------- orders ----------
create type public.order_status  as enum ('Pending', 'Processing', 'Shipped', 'Delivered', 'Returned', 'Cancelled');
create type public.order_channel as enum ('Web', 'Boutique', 'Instagram', 'Wholesale');

create table public.orders (
  id          text primary key,                             -- FX-2026-0041
  customer_id uuid not null references public.customers(id),
  status      public.order_status  not null default 'Pending',
  channel     public.order_channel not null default 'Web',
  city        text,
  total       bigint not null check (total >= 0),
  placed_at   timestamptz not null default now()
);

create table public.order_items (
  id       bigint generated always as identity primary key,
  order_id text not null references public.orders(id) on delete cascade,
  -- restrict: never let a SKU delete rewrite order history
  sku      text not null references public.variants(sku) on delete restrict,
  name     text   not null,                                 -- snapshot at purchase time
  size     text   not null,
  color    text   not null,
  qty      int    not null check (qty > 0),
  price    bigint not null check (price >= 0)               -- snapshot, not a live FK read
);

-- ---------- size rules ----------
create table public.size_rules (
  body_type public.body_type not null,
  size      text not null,
  bust_min  int not null, bust_max  int not null,
  waist_min int not null, waist_max int not null,
  hip_min   int not null, hip_max   int not null,
  primary key (body_type, size),
  check (bust_min <= bust_max and waist_min <= waist_max and hip_min <= hip_max)
);

create table public.body_rule_meta (
  body_type public.body_type primary key,
  label     text not null,
  guidance  text not null,
  ease_note text not null
);

-- ---------- indexes ----------
-- FK columns need their own index: Postgres does NOT create one automatically,
-- and without it every cascade/join does a seq scan.
create index variants_style_id_idx     on public.variants (style_id);
create index order_items_order_id_idx  on public.order_items (order_id);
create index order_items_sku_idx       on public.order_items (sku);
create index orders_customer_id_idx    on public.orders (customer_id);
create index styles_category_id_idx    on public.styles (category_id);
create index styles_collection_id_idx  on public.styles (collection_id);

-- listing/filtering
create index styles_status_idx  on public.styles (status);
create index orders_placed_idx  on public.orders (placed_at desc);
-- partial: the storefront only ever lists active styles
create index styles_active_idx  on public.styles (collection_id, category_id) where status = 'active';
-- partial: stock-out reporting only cares about the empties
create index variants_oos_idx   on public.variants (style_id) where stock = 0;

-- ---------- updated_at ----------
create or replace function public.touch_updated_at()
returns trigger language plpgsql
set search_path = ''
as $$ begin new.updated_at = now(); return new; end $$;

create trigger styles_touch before update on public.styles
  for each row execute function public.touch_updated_at();

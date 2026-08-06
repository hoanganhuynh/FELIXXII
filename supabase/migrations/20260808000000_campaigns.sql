-- ============================================================
-- Campaign (discount campaigns) — "Chương trình khuyến mại"
--
-- One flexible table covering 4 campaign types, mirroring the shape of the
-- reference POS screen: Giảm giá hóa đơn (invoice_discount), Giảm giá
-- hàng hóa (item_discount), Mua m tặng n (buy_x_get_y), Tặng hàng hóa
-- (free_gift). Additive only — no existing table/column touched.
-- ============================================================

create type public.campaign_type as enum ('invoice_discount', 'item_discount', 'buy_x_get_y', 'free_gift');
create type public.discount_kind as enum ('percent', 'amount');
create type public.campaign_scope as enum ('all', 'category', 'garment_type', 'source', 'style');

create table public.campaigns (
  id             uuid primary key default gen_random_uuid(),
  name           text not null,
  description    text not null default '',
  type           campaign_type not null,
  active         boolean not null default true,
  start_date     date,
  end_date       date,
  -- invoice_discount / item_discount
  discount_kind  discount_kind,
  discount_value numeric,
  min_subtotal   numeric,
  -- item_discount / buy_x_get_y targeting
  scope          campaign_scope not null default 'all',
  target_ids     text[] not null default '{}',
  -- buy_x_get_y
  buy_qty        int,
  get_qty        int,
  -- free_gift
  gift_style_id  uuid references public.styles(id),
  created_at     timestamptz not null default now()
);

alter table public.campaigns enable row level security;

create policy "active campaigns public" on public.campaigns
  for select using (
    active = true
    and (start_date is null or start_date <= current_date)
    and (end_date is null or end_date >= current_date)
  );

create policy "admin all campaigns" on public.campaigns
  for all using ((select public.is_admin())) with check ((select public.is_admin()));

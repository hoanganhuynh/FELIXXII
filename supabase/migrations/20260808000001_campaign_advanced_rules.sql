-- ============================================================
-- Campaign Advanced Rules
--
-- Adds additional targeting fields to campaigns: days of week, time of day,
-- and a flag to exclude items that already received a discount from being
-- counted towards an invoice discount subtotal.
-- ============================================================

alter table public.campaigns
  add column valid_days int[] default null,
  add column start_time time without time zone default null,
  add column end_time time without time zone default null,
  add column exclude_promotional_items boolean not null default false;

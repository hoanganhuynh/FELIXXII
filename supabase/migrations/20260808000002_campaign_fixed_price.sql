-- ============================================================
-- Campaign Fixed Price
--
-- Adds fixed_price enum value to discount_kind
-- ============================================================

ALTER TYPE public.discount_kind ADD VALUE IF NOT EXISTS 'fixed_price';

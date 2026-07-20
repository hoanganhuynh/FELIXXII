-- ============================================================
-- Capture *why* an order was returned, not just that it was.
-- return_reason/return_note are null unless status = 'Returned' —
-- enforced by a check constraint so a status change away from
-- 'Returned' can't leave a stale reason behind unnoticed.
-- ============================================================
create type public.return_reason as enum (
  'defect', 'wrong_size', 'changed_mind', 'wrong_shipment', 'other'
);

alter table public.orders
  add column return_reason public.return_reason,
  add column return_note text;

alter table public.orders
  add constraint return_reason_only_when_returned
  check (return_reason is null or status = 'Returned');

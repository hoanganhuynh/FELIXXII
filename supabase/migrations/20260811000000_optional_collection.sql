-- A product no longer has to belong to a collection — "Collection" becomes
-- optional in the New Product form. Additive/relaxing only: the FK to
-- public.collections stays, just no longer required.
alter table public.styles alter column collection_id drop not null;

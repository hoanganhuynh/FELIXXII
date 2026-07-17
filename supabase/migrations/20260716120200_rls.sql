-- ============================================================
-- Row Level Security
--
-- The frontend is a STATIC SPA: the anon key ships to every visitor
-- and is fully public. RLS is therefore the ONLY thing standing between
-- a curious visitor and your catalogue. The service_role key must never
-- appear in client code.
--
-- Perf note: every auth.*() call is wrapped in (select ...) so Postgres
-- evaluates it ONCE per statement instead of once per row.
-- ============================================================

alter table public.categories     enable row level security;
alter table public.collections    enable row level security;
alter table public.styles         enable row level security;
alter table public.variants       enable row level security;
alter table public.customers      enable row level security;
alter table public.orders         enable row level security;
alter table public.order_items    enable row level security;
alter table public.size_rules     enable row level security;
alter table public.body_rule_meta enable row level security;

-- ---------- admin check ----------
-- Reads the role off the JWT, so no extra table hit per policy.
-- Set it with: supabase.auth.admin.updateUserById(id, { app_metadata: { role: 'admin' } })
-- app_metadata is NOT user-writable — user_metadata would be a privilege-escalation hole.
create or replace function public.is_admin()
returns boolean
language sql
stable
set search_path = ''
as $$
  select coalesce(
    (select auth.jwt() -> 'app_metadata' ->> 'role') = 'admin',
    false
  );
$$;

-- ---------- public catalogue: read-only, active only ----------
create policy "catalogue readable by anyone" on public.categories
  for select using (true);
create policy "collections readable by anyone" on public.collections
  for select using (true);
create policy "size rules readable by anyone" on public.size_rules
  for select using (true);
create policy "body rule meta readable by anyone" on public.body_rule_meta
  for select using (true);

-- draft/archived styles stay invisible to the public
create policy "active styles readable by anyone" on public.styles
  for select using (status = 'active');

create policy "variants of active styles readable" on public.variants
  for select using (
    exists (select 1 from public.styles s where s.id = style_id and s.status = 'active')
  );

-- ---------- customers own their row ----------
create policy "customers read own row" on public.customers
  for select using ((select auth.uid()) = user_id);
create policy "customers update own row" on public.customers
  for update using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);
create policy "customers insert own row" on public.customers
  for insert with check ((select auth.uid()) = user_id);

-- ---------- orders are private to their owner ----------
create policy "customers read own orders" on public.orders
  for select using (
    customer_id in (select id from public.customers where user_id = (select auth.uid()))
  );

create policy "customers read own order items" on public.order_items
  for select using (
    order_id in (
      select o.id from public.orders o
      join public.customers c on c.id = o.customer_id
      where c.user_id = (select auth.uid())
    )
  );

-- ---------- admin: full access everywhere ----------
create policy "admin all categories"  on public.categories     for all using ((select public.is_admin())) with check ((select public.is_admin()));
create policy "admin all collections" on public.collections    for all using ((select public.is_admin())) with check ((select public.is_admin()));
create policy "admin all styles"      on public.styles         for all using ((select public.is_admin())) with check ((select public.is_admin()));
create policy "admin all variants"    on public.variants       for all using ((select public.is_admin())) with check ((select public.is_admin()));
create policy "admin all customers"   on public.customers      for all using ((select public.is_admin())) with check ((select public.is_admin()));
create policy "admin all orders"      on public.orders         for all using ((select public.is_admin())) with check ((select public.is_admin()));
create policy "admin all order items" on public.order_items    for all using ((select public.is_admin())) with check ((select public.is_admin()));
create policy "admin all size rules"  on public.size_rules     for all using ((select public.is_admin())) with check ((select public.is_admin()));
create policy "admin all rule meta"   on public.body_rule_meta for all using ((select public.is_admin())) with check ((select public.is_admin()));

-- index the columns the policies filter on
create index customers_user_id_idx on public.customers (user_id);

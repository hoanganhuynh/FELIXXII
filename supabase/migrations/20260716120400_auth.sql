-- ============================================================
-- Auth wiring
-- ============================================================

-- When someone signs up (email or OAuth), mirror them into customers so the
-- storefront account page has a row to hang orders / body profile off.
-- SECURITY DEFINER: the trigger runs as the definer, not the signing-up user,
-- who has no rights on public.customers yet.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.customers (user_id, name, email)
  values (
    new.id,
    coalesce(
      new.raw_user_meta_data ->> 'full_name',   -- Google/Facebook
      new.raw_user_meta_data ->> 'name',
      split_part(new.email, '@', 1)             -- email signup fallback
    ),
    new.email
  )
  on conflict (email) do update
    set user_id = excluded.user_id             -- claim a pre-existing imported row
  where public.customers.user_id is null;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ============================================================
-- Let an admin read the role off their own session in the client.
-- (is_admin() reads app_metadata, which users cannot self-edit —
--  user_metadata WOULD be a privilege-escalation hole.)
-- ============================================================
create or replace function public.me()
returns jsonb
language sql
stable
set search_path = ''
as $$
  select jsonb_build_object(
    'uid',      (select auth.uid()),
    'email',    (select auth.jwt() ->> 'email'),
    'is_admin', public.is_admin()
  );
$$;

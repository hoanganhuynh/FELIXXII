-- ============================================================
-- Colors — admin-managed swatch palette used by the New Product flow
-- Same shape as sources/garment_types.
-- ============================================================

create table public.colors (
  id    text primary key,
  name  text not null,
  hex   text not null,
  sort  int  not null default 0
);

insert into public.colors (id, name, hex, sort) values
  ('den',    'Black',       '#1a1a1a', 0),
  ('ngavoi', 'Ivory',       '#efe7d6', 1),
  ('dodo',   'Bordeaux',    '#7c1f2b', 2),
  ('reu',    'Olive Green', '#4a5a3a', 3),
  ('hong',   'Pastel Pink', '#e6c2cd', 4),
  ('be',     'Beige',       '#d8c3a5', 5),
  ('navy',   'Navy',        '#26314d', 6),
  ('gold',   'Gold',        '#c9a24a', 7),
  ('ngoc',   'Jade Green',  '#2f7d78', 8),
  ('bac',    'Silver',      '#c3c7cc', 9);

alter table public.colors enable row level security;

create policy "colors readable by anyone" on public.colors
  for select using (true);

create policy "admin all colors" on public.colors
  for all using ((select public.is_admin())) with check ((select public.is_admin()));

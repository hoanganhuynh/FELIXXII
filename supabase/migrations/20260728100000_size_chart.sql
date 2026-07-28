-- Size chart table — brand's general measurement guide shown in size guide popup
create table public.size_chart (
  id          uuid primary key default gen_random_uuid(),
  size        text not null,
  bust_min    int  not null,
  bust_max    int  not null,
  waist_min   int  not null,
  waist_max   int  not null,
  hip_min     int  not null,
  hip_max     int  not null,
  sort_order  int  not null default 0,
  created_at  timestamptz default now()
);

insert into public.size_chart (size, bust_min, bust_max, waist_min, waist_max, hip_min, hip_max, sort_order) values
  ('S',  78, 84,  60, 66,  84,  90,  1),
  ('M',  85, 90,  67, 72,  91,  96,  2),
  ('L',  91, 97,  73, 79,  97, 103,  3),
  ('XL', 98, 104, 80, 86, 104, 110,  4);

alter table public.size_chart enable row level security;

create policy "public read size_chart"
  on public.size_chart for select using (true);

create policy "admin write size_chart"
  on public.size_chart for all
  using ((select public.is_admin()))
  with check ((select public.is_admin()));

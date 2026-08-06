create table public.size_templates (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  is_default boolean not null default false,
  data jsonb not null default '[]'::jsonb,
  created_at timestamptz default now()
);

-- Insert default template
insert into public.size_templates (name, is_default, data) values (
  'Size Standard',
  true,
  '[
    {"size": "S", "bust_min": 78, "bust_max": 84, "waist_min": 60, "waist_max": 66, "hip_min": 84, "hip_max": 90},
    {"size": "M", "bust_min": 85, "bust_max": 90, "waist_min": 67, "waist_max": 72, "hip_min": 91, "hip_max": 96},
    {"size": "L", "bust_min": 91, "bust_max": 97, "waist_min": 73, "waist_max": 79, "hip_min": 97, "hip_max": 103},
    {"size": "XL", "bust_min": 98, "bust_max": 104, "waist_min": 80, "waist_max": 86, "hip_min": 104, "hip_max": 110}
  ]'::jsonb
);

-- Alter styles to include size_template_id
alter table public.styles add column size_template_id uuid references public.size_templates(id);

-- Update all existing styles to use the default size template
update public.styles set size_template_id = (select id from public.size_templates where is_default = true limit 1);

-- RLS
alter table public.size_templates enable row level security;

create policy "public read size_templates"
  on public.size_templates for select using (true);

create policy "admin write size_templates"
  on public.size_templates for all
  using ((select public.is_admin()))
  with check ((select public.is_admin()));

-- Recreate style views if necessary (wait, do we need to? Let's check if style_list view includes *)
-- Usually style_list view selects specific columns. Let's run a migration that updates the view.
-- I'll need to check the definition of style_list view.

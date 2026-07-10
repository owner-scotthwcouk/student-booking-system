-- Shared dashboard announcement, managed by tutors and visible to all authenticated users.
create table if not exists public.system_settings (
  key text primary key,
  value text not null default '',
  updated_at timestamptz not null default now()
);

insert into public.system_settings (key, value)
values
  ('maintenance_mode', 'false'),
  ('announcement_banner', '')
on conflict (key) do nothing;

alter table public.system_settings enable row level security;

drop policy if exists "system_settings_select_authenticated" on public.system_settings;
create policy "system_settings_select_authenticated"
on public.system_settings
for select
to authenticated
using (true);

drop policy if exists "system_settings_manage_tutors" on public.system_settings;
create policy "system_settings_manage_tutors"
on public.system_settings
for all
to authenticated
using (
  exists (select 1 from public.profiles where id = auth.uid() and role = 'tutor')
)
with check (
  exists (select 1 from public.profiles where id = auth.uid() and role = 'tutor')
);

drop trigger if exists trg_system_settings_updated_at on public.system_settings;
create trigger trg_system_settings_updated_at
before update on public.system_settings
for each row execute function public.set_updated_at();

do $$
begin
  alter publication supabase_realtime add table public.system_settings;
exception
  when duplicate_object then null;
end;
$$;

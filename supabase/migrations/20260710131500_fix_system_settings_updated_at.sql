-- Some existing deployments created system_settings before it tracked updates.
-- Add the field required by the shared set_updated_at() trigger.
alter table public.system_settings
  add column if not exists updated_at timestamptz not null default now();

drop trigger if exists trg_system_settings_updated_at on public.system_settings;
create trigger trg_system_settings_updated_at
before update on public.system_settings
for each row execute function public.set_updated_at();

-- migrations/20260129_0001_tutor_availability.sql

-- Ensure uuid generator is available
create extension if not exists pgcrypto;

-- Shared updated_at trigger function (safe to replace)
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- Tutor availability table
create table if not exists public.tutor_availability (
  id uuid primary key default gen_random_uuid(),
  tutor_id uuid not null references public.profiles(id) on delete cascade,

  -- 0 = Sunday ... 6 = Saturday
  day_of_week smallint not null check (day_of_week between 0 and 6),

  start_time time not null,
  end_time time not null,

  is_active boolean not null default true,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint tutor_availability_time_order check (end_time > start_time)
);

create index if not exists idx_tutor_availability_tutor_day
  on public.tutor_availability (tutor_id, day_of_week);

-- updated_at trigger
drop trigger if exists set_tutor_availability_updated_at on public.tutor_availability;
create trigger set_tutor_availability_updated_at
before update on public.tutor_availability
for each row execute function public.set_updated_at();

-- RLS
alter table public.tutor_availability enable row level security;

-- Grants (typical Supabase)
grant select, insert, update, delete on public.tutor_availability to authenticated;

-- Policies (idempotent via pg_policies check)
do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'tutor_availability'
      and policyname = 'Tutor can manage own availability'
  ) then
    create policy "Tutor can manage own availability"
      on public.tutor_availability
      for all
      using (auth.uid() = tutor_id)
      with check (auth.uid() = tutor_id);
  end if;

  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'tutor_availability'
      and policyname = 'Anyone can view active availability'
  ) then
    create policy "Anyone can view active availability"
      on public.tutor_availability
      for select
      using (is_active = true);
  end if;
end $$;

-- Phase 2 video room features:
-- - passcode protection
-- - lobby/admit state
-- - attendance and chat event history

alter table public.bookings
  add column if not exists video_room_passcode text,
  add column if not exists video_room_lobby_enabled boolean not null default true;

alter table public.bookings
  alter column video_room_passcode set default lpad((floor(random() * 1000000))::int::text, 6, '0');

-- Backfill passcodes for existing bookings so every room can be gated.
update public.bookings
set video_room_passcode = lpad((floor(random() * 1000000))::int::text, 6, '0')
where video_room_passcode is null;

alter table public.bookings
  alter column video_room_passcode set not null;

create table if not exists public.video_room_admissions (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null references public.bookings(id) on delete cascade,
  student_id uuid not null references public.profiles(id) on delete cascade,
  requested_at timestamptz not null default now(),
  approved_at timestamptz null,
  approved_by uuid null references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (booking_id, student_id)
);

create index if not exists video_room_admissions_booking_id_idx
  on public.video_room_admissions(booking_id);
create index if not exists video_room_admissions_student_id_idx
  on public.video_room_admissions(student_id);

drop trigger if exists trg_video_room_admissions_updated_at on public.video_room_admissions;
create trigger trg_video_room_admissions_updated_at
before update on public.video_room_admissions
for each row execute function public.set_updated_at();

create table if not exists public.video_room_events (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null references public.bookings(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  display_name text not null default '',
  event_type text not null check (event_type in ('joined', 'left', 'chat')),
  message text null,
  created_at timestamptz not null default now()
);

create index if not exists video_room_events_booking_id_idx
  on public.video_room_events(booking_id);
create index if not exists video_room_events_created_at_idx
  on public.video_room_events(created_at);

alter table public.video_room_admissions enable row level security;
alter table public.video_room_events enable row level security;

drop policy if exists "video_admissions_select_participants" on public.video_room_admissions;
create policy "video_admissions_select_participants"
on public.video_room_admissions
for select
to authenticated
using (
  exists (
    select 1
    from public.bookings b
    where b.id = video_room_admissions.booking_id
      and (b.student_id = auth.uid() or b.tutor_id = auth.uid())
  )
);

drop policy if exists "video_admissions_insert_student" on public.video_room_admissions;
create policy "video_admissions_insert_student"
on public.video_room_admissions
for insert
to authenticated
with check (
  student_id = auth.uid()
  and exists (
    select 1
    from public.bookings b
    where b.id = video_room_admissions.booking_id
      and b.student_id = auth.uid()
  )
);

drop policy if exists "video_admissions_update_tutor" on public.video_room_admissions;
create policy "video_admissions_update_tutor"
on public.video_room_admissions
for update
to authenticated
using (
  exists (
    select 1
    from public.bookings b
    where b.id = video_room_admissions.booking_id
      and b.tutor_id = auth.uid()
  )
)
with check (
  exists (
    select 1
    from public.bookings b
    where b.id = video_room_admissions.booking_id
      and b.tutor_id = auth.uid()
  )
);

drop policy if exists "video_events_select_participants" on public.video_room_events;
create policy "video_events_select_participants"
on public.video_room_events
for select
to authenticated
using (
  exists (
    select 1
    from public.bookings b
    where b.id = video_room_events.booking_id
      and (b.student_id = auth.uid() or b.tutor_id = auth.uid())
  )
);

drop policy if exists "video_events_insert_own_participant" on public.video_room_events;
create policy "video_events_insert_own_participant"
on public.video_room_events
for insert
to authenticated
with check (
  user_id = auth.uid()
  and exists (
    select 1
    from public.bookings b
    where b.id = video_room_events.booking_id
      and (b.student_id = auth.uid() or b.tutor_id = auth.uid())
  )
);

create or replace function public.verify_video_room_access(
  p_room_token text,
  p_passcode text
)
returns table (
  id uuid,
  student_id uuid,
  tutor_id uuid,
  lesson_date date,
  lesson_time time,
  video_room_token text,
  video_provider text,
  video_room_lobby_enabled boolean
)
language sql
security definer
set search_path = public
as $$
  select
    b.id,
    b.student_id,
    b.tutor_id,
    b.lesson_date,
    b.lesson_time,
    b.video_room_token,
    b.video_provider,
    b.video_room_lobby_enabled
  from public.bookings b
  where b.video_room_token = p_room_token
    and (b.student_id = auth.uid() or b.tutor_id = auth.uid())
    and b.video_room_passcode = p_passcode
  limit 1;
$$;

grant execute on function public.verify_video_room_access(text, text) to authenticated;

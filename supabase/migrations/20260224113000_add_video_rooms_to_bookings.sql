-- Add video room metadata for each booking.
alter table public.bookings
  add column if not exists video_room_token text,
  add column if not exists video_provider text not null default 'jitsi',
  add column if not exists video_room_created_at timestamptz not null default now();

alter table public.bookings
  alter column video_room_token set default encode(gen_random_bytes(12), 'hex');

-- Backfill existing rows.
update public.bookings
set video_room_token = encode(gen_random_bytes(12), 'hex')
where video_room_token is null;

-- Enforce uniqueness and presence after backfill.
alter table public.bookings
  alter column video_room_token set not null;

create unique index if not exists bookings_video_room_token_idx
  on public.bookings(video_room_token);

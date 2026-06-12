-- Store in-app email-style messages between tutors and students.

create table if not exists public.system_mail (
  id uuid primary key default gen_random_uuid(),
  sender_id uuid not null references public.profiles(id) on delete cascade,
  recipient_id uuid not null references public.profiles(id) on delete cascade,
  sender_email text not null default '',
  recipient_email text not null default '',
  subject text not null default '',
  body text not null default '',
  external_sent boolean not null default false,
  external_error text null,
  read_at timestamptz null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists system_mail_sender_id_idx
  on public.system_mail(sender_id);

create index if not exists system_mail_recipient_id_idx
  on public.system_mail(recipient_id);

create index if not exists system_mail_created_at_idx
  on public.system_mail(created_at);

drop trigger if exists trg_system_mail_updated_at
  on public.system_mail;
create trigger trg_system_mail_updated_at
before update on public.system_mail
for each row execute function public.set_updated_at();

alter table public.system_mail enable row level security;

drop policy if exists "system_mail_select_participants"
  on public.system_mail;
create policy "system_mail_select_participants"
on public.system_mail
for select
to authenticated
using (
  sender_id = auth.uid()
  or recipient_id = auth.uid()
);

drop policy if exists "system_mail_insert_sender_only"
  on public.system_mail;
create policy "system_mail_insert_sender_only"
on public.system_mail
for insert
to authenticated
with check (sender_id = auth.uid());

drop policy if exists "system_mail_update_recipient_or_sender"
  on public.system_mail;
create policy "system_mail_update_recipient_or_sender"
on public.system_mail
for update
to authenticated
using (
  sender_id = auth.uid()
  or recipient_id = auth.uid()
)
with check (
  sender_id = auth.uid()
  or recipient_id = auth.uid()
);

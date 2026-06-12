-- Track tutor-issued temporary passwords for students.

create table if not exists public.student_temporary_passwords (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.profiles(id) on delete cascade,
  tutor_id uuid not null references public.profiles(id) on delete cascade,
  password_hash text not null,
  issued_at timestamptz not null default now(),
  expires_at timestamptz null,
  used_at timestamptz null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists student_temporary_passwords_student_id_idx
  on public.student_temporary_passwords(student_id);

create index if not exists student_temporary_passwords_tutor_id_idx
  on public.student_temporary_passwords(tutor_id);

create index if not exists student_temporary_passwords_created_at_idx
  on public.student_temporary_passwords(created_at);

drop trigger if exists trg_student_temporary_passwords_updated_at
  on public.student_temporary_passwords;
create trigger trg_student_temporary_passwords_updated_at
before update on public.student_temporary_passwords
for each row execute function public.set_updated_at();

alter table public.student_temporary_passwords enable row level security;

drop policy if exists "student_temporary_passwords_select_participants"
  on public.student_temporary_passwords;
create policy "student_temporary_passwords_select_participants"
on public.student_temporary_passwords
for select
to authenticated
using (
  student_id = auth.uid()
  or tutor_id = auth.uid()
);

drop policy if exists "student_temporary_passwords_insert_tutor_only"
  on public.student_temporary_passwords;
create policy "student_temporary_passwords_insert_tutor_only"
on public.student_temporary_passwords
for insert
to authenticated
with check (tutor_id = auth.uid());

drop policy if exists "student_temporary_passwords_update_tutor_only"
  on public.student_temporary_passwords;
create policy "student_temporary_passwords_update_tutor_only"
on public.student_temporary_passwords
for update
to authenticated
using (tutor_id = auth.uid())
with check (tutor_id = auth.uid());

-- Track tutor-initiated password reset requests per student.

create table if not exists public.student_password_reset_requests (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.profiles(id) on delete cascade,
  tutor_id uuid not null references public.profiles(id) on delete cascade,
  tutor_name text not null default '',
  tutor_email text not null default '',
  student_email text not null default '',
  status text not null default 'requested' check (status in ('requested', 'sent', 'failed')),
  error_message text null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists student_password_reset_requests_student_id_idx
  on public.student_password_reset_requests(student_id);

create index if not exists student_password_reset_requests_tutor_id_idx
  on public.student_password_reset_requests(tutor_id);

create index if not exists student_password_reset_requests_created_at_idx
  on public.student_password_reset_requests(created_at);

drop trigger if exists trg_student_password_reset_requests_updated_at
  on public.student_password_reset_requests;
create trigger trg_student_password_reset_requests_updated_at
before update on public.student_password_reset_requests
for each row execute function public.set_updated_at();

alter table public.student_password_reset_requests enable row level security;

drop policy if exists "student_password_reset_requests_select_participants"
  on public.student_password_reset_requests;
create policy "student_password_reset_requests_select_participants"
on public.student_password_reset_requests
for select
to authenticated
using (
  student_id = auth.uid()
  or tutor_id = auth.uid()
);

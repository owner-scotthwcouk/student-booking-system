-- Associate payments directly with tutors so archived lessons stay visible in payment history.

alter table public.payments
add column if not exists tutor_id uuid null references public.profiles(id) on delete cascade;

create index if not exists payments_tutor_id_idx
  on public.payments(tutor_id);

update public.payments p
set tutor_id = b.tutor_id
from public.bookings b
where p.booking_id = b.id
  and p.tutor_id is null;

drop policy if exists "payments_select_own" on public.payments;
create policy "payments_select_own"
on public.payments
for select
to authenticated
using (
  student_id = auth.uid()
  or tutor_id = auth.uid()
  or exists (
    select 1
    from public.bookings b
    where b.id = payments.booking_id
      and b.tutor_id = auth.uid()
  )
);

drop policy if exists "payments_insert_student_or_tutor_for_booking" on public.payments;
create policy "payments_insert_student_or_tutor_for_booking"
on public.payments
for insert
to authenticated
with check (
  student_id = auth.uid()
  or tutor_id = auth.uid()
  or (
    booking_id is not null
    and exists (
      select 1
      from public.bookings b
      where b.id = payments.booking_id
        and b.tutor_id = auth.uid()
    )
  )
);

-- Allow tutors to delete payments they manage and keep booking payment_status in sync.

drop policy if exists "payments_delete_tutor_or_owner" on public.payments;
create policy "payments_delete_tutor_or_owner"
on public.payments
for delete
to authenticated
using (
  tutor_id = auth.uid()
  or student_id = auth.uid()
  or exists (
    select 1
    from public.bookings b
    where b.id = payments.booking_id
      and b.tutor_id = auth.uid()
  )
);

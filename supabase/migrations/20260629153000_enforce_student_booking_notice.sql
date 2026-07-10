-- Enforce a 24-hour minimum notice for student-created bookings.
-- Tutor-created POS bookings remain allowed.

create or replace function public.enforce_student_booking_minimum_notice()
returns trigger
language plpgsql
as $$
declare
  booking_start timestamptz;
begin
  -- Only validate when the lesson start actually changes.
  if tg_op = 'UPDATE'
     and new.lesson_date = old.lesson_date
     and new.lesson_time = old.lesson_time then
    return new;
  end if;

  -- Service-role or unauthenticated internal writes should not be blocked here.
  if auth.uid() is null then
    return new;
  end if;

  -- Tutors can create/update bookings for students through the POS flow.
  if new.tutor_id = auth.uid() then
    return new;
  end if;

  -- Students creating/updating their own bookings must give 24 hours notice.
  if new.student_id = auth.uid() then
    booking_start := (new.lesson_date::timestamp + new.lesson_time);

    if booking_start < (now() + interval '24 hours') then
      raise exception using
        errcode = '23514',
        message = 'Students must book at least 24 hours in advance.';
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists trg_enforce_student_booking_minimum_notice on public.bookings;
create trigger trg_enforce_student_booking_minimum_notice
before insert or update of lesson_date, lesson_time on public.bookings
for each row
execute function public.enforce_student_booking_minimum_notice();

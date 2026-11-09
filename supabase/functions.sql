-- Database functions

-- Block deactivated users at auth-to-profile resolution (used by app; also enforce in trigger)
create or replace function public.is_active_user(p_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (select 1 from public.profiles where id = p_user_id and status = 'active');
$$;

-- Register for a course (transaction + row locking)
create or replace function public.register_for_course(p_course_id uuid)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_student_id uuid := auth.uid();
  v_profile public.profiles%rowtype;
  v_course public.courses%rowtype;
  v_registration_id uuid;
begin
  if v_student_id is null then
    raise exception 'Not authenticated';
  end if;

  select * into v_profile from public.profiles where id = v_student_id;
  if not found or v_profile.role <> 'student' or v_profile.status <> 'active' then
    raise exception 'Active student account required';
  end if;

  -- lock the course row
  select * into v_course from public.courses where id = p_course_id for update;
  if not found then
    raise exception 'Course not found';
  end if;

  if v_course.enrolled_count >= v_course.capacity then
    raise exception 'Course is full';
  end if;

  if exists (select 1 from public.registrations where student_id = v_student_id and course_id = p_course_id) then
    raise exception 'Already registered for this course';
  end if;

  insert into public.registrations (student_id, course_id)
  values (v_student_id, p_course_id)
  returning id into v_registration_id;

  return v_registration_id;
end;
$$;

grant execute on function public.register_for_course(uuid) to authenticated;

-- Drop a course registration (student can only drop own)
create or replace function public.drop_course(p_course_id uuid)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_student_id uuid := auth.uid();
  v_deleted integer;
begin
  if v_student_id is null then
    raise exception 'Not authenticated';
  end if;
  delete from public.registrations
   where student_id = v_student_id and course_id = p_course_id;
  get diagnostics v_deleted = row_count;
  if v_deleted = 0 then
    raise exception 'Registration not found';
  end if;
  return true;
end;
$$;

grant execute on function public.drop_course(uuid) to authenticated;

-- Optional: prevent reducing capacity below enrollment (trigger)
create or replace function public.check_capacity_update()
returns trigger
language plpgsql
as $$
begin
  if new.capacity < new.enrolled_count then
    raise exception 'Capacity cannot be below current enrollment';
  end if;
  return new;
end;
$$;

drop trigger if exists trg_check_capacity on public.courses;
create trigger trg_check_capacity
before update of capacity on public.courses
for each row
execute function public.check_capacity_update();

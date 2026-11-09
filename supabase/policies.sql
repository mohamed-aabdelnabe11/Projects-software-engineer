-- RLS policies
alter table public.profiles enable row level security;
alter table public.courses enable row level security;
alter table public.registrations enable row level security;

-- helper: current user's role
create or replace function public.get_current_role()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select role from public.profiles where id = auth.uid();
$$;

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(public.get_current_role()='admin', false);
$$;

-- profiles
drop policy if exists profiles_select on public.profiles;
create policy profiles_select on public.profiles
for select to authenticated
using (
  id = auth.uid()
  or public.is_admin()
  or (
    public.get_current_role() = 'doctor'
    and exists (
      select 1 from public.registrations r
      join public.courses c on c.id = r.course_id
      where r.student_id = profiles.id and c.doctor_id = auth.uid()
    )
  )
);

drop policy if exists profiles_insert on public.profiles;
create policy profiles_insert on public.profiles
for insert to authenticated
with check (public.is_admin());

drop policy if exists profiles_update on public.profiles;
create policy profiles_update on public.profiles
for update to authenticated
using (id = auth.uid() or public.is_admin())
with check (id = auth.uid() or public.is_admin());

drop policy if exists profiles_delete on public.profiles;
create policy profiles_delete on public.profiles
for delete to authenticated
using (public.is_admin());

-- courses
drop policy if exists courses_select on public.courses;
create policy courses_select on public.courses
for select to authenticated
using (
  public.is_admin()
  or public.get_current_role() = 'student'
  or (public.get_current_role() = 'doctor' and doctor_id = auth.uid())
);

drop policy if exists courses_insert on public.courses;
create policy courses_insert on public.courses
for insert to authenticated
with check (public.is_admin());

drop policy if exists courses_update on public.courses;
create policy courses_update on public.courses
for update to authenticated
using (public.is_admin())
with check (public.is_admin());

drop policy if exists courses_delete on public.courses;
create policy courses_delete on public.courses
for delete to authenticated
using (public.is_admin());

-- registrations: no direct insert (use register_for_course)
drop policy if exists registrations_select on public.registrations;
create policy registrations_select on public.registrations
for select to authenticated
using (
  public.is_admin()
  or student_id = auth.uid()
  or exists (
    select 1 from public.courses c
    where c.id = registrations.course_id and c.doctor_id = auth.uid()
  )
);

drop policy if exists registrations_insert on public.registrations;
create policy registrations_insert on public.registrations
for insert to authenticated
with check (false);

drop policy if exists registrations_update on public.registrations;
create policy registrations_update on public.registrations
for update to authenticated
using (false);

drop policy if exists registrations_delete on public.registrations;
create policy registrations_delete on public.registrations
for delete to authenticated
using (student_id = auth.uid() or public.is_admin());

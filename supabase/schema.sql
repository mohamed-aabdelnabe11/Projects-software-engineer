-- Schema for Online Student Course Registration System
-- Run in Supabase SQL Editor (or via migration) before policies.sql / functions.sql / seed.sql

create extension if not exists "pgcrypto";

-- profiles (one row per auth user)
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null,
  email text not null unique,
  role text not null check (role in ('student','doctor','admin')),
  status text not null default 'active' check (status in ('active','inactive')),
  created_at timestamptz not null default now()
);

-- courses
create table if not exists public.courses (
  id uuid primary key default gen_random_uuid(),
  course_code text not null unique,
  course_name text not null,
  description text,
  doctor_id uuid references public.profiles(id) on delete set null,
  credit_hours integer not null default 0 check (credit_hours >= 0),
  capacity integer not null check (capacity > 0),
  enrolled_count integer not null default 0 check (enrolled_count >= 0),
  schedule text,
  created_at timestamptz not null default now(),
  constraint capacity_ge_enrollment check (capacity >= enrolled_count)
);

-- registrations
create table if not exists public.registrations (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.profiles(id) on delete cascade,
  course_id uuid not null references public.courses(id) on delete cascade,
  registration_date timestamptz not null default now(),
  constraint unique_student_course unique (student_id, course_id)
);

-- indexes
create index if not exists idx_profiles_role on public.profiles(role);
create index if not exists idx_profiles_status on public.profiles(status);
create index if not exists idx_courses_doctor_id on public.courses(doctor_id);
create index if not exists idx_courses_course_code on public.courses(course_code);
create index if not exists idx_registrations_student_id on public.registrations(student_id);
create index if not exists idx_registrations_course_id on public.registrations(course_id);

-- keep enrolled_count in sync with registrations
create or replace function public.update_enrolled_count()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'INSERT' then
    update public.courses
       set enrolled_count = enrolled_count + 1
     where id = new.course_id;
    return new;
  elsif tg_op = 'DELETE' then
    update public.courses
       set enrolled_count = greatest(enrolled_count - 1, 0)
     where id = old.course_id;
    return old;
  end if;
  return null;
end;
$$;

drop trigger if exists trg_registrations_enrolled_count on public.registrations;
create trigger trg_registrations_enrolled_count
after insert or delete on public.registrations
for each row
execute function public.update_enrolled_count();

-- protect role/status changes from non-admins
create or replace function public.protect_profile_sensitive_fields()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_role text;
begin
  select role into v_role from public.profiles where id = auth.uid();
  if coalesce(v_role,'') <> 'admin' then
    if new.role is distinct from old.role then
      raise exception 'Only admins can change role';
    end if;
    if new.status is distinct from old.status then
      raise exception 'Only admins can change status';
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_protect_profile_sensitive on public.profiles;
create trigger trg_protect_profile_sensitive
before update on public.profiles
for each row
execute function public.protect_profile_sensitive_fields();

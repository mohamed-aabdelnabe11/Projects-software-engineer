-- Sample data. Run after creating auth users + profiles.

-- Sample courses (doctor assigned by email if profile exists)
insert into public.courses (course_code, course_name, description, doctor_id, credit_hours, capacity, schedule)
select 'CS101','Introduction to Programming','Basics of programming concepts', p.id, 3, 30, 'Sun/Tue 10:00-12:00'
from public.profiles p where p.email = 'doctor1@test.com'
on conflict (course_code) do nothing;

insert into public.courses (course_code, course_name, description, doctor_id, credit_hours, capacity, schedule)
select 'CS202','Data Structures','Arrays, lists, trees and graphs', p.id, 3, 25, 'Mon/Wed 12:00-14:00'
from public.profiles p where p.email = 'doctor1@test.com'
on conflict (course_code) do nothing;

insert into public.courses (course_code, course_name, description, doctor_id, credit_hours, capacity, schedule)
select 'IT303','Databases','Relational databases and SQL', p.id, 3, 20, 'Sun/Tue 14:00-16:00'
from public.profiles p where p.email = 'doctor2@test.com'
on conflict (course_code) do nothing;

insert into public.courses (course_code, course_name, description, doctor_id, credit_hours, capacity, schedule)
select 'MG101','Management Principles','Fundamentals of management', p.id, 2, 40, 'Thu 10:00-12:00'
from public.profiles p where p.email = 'doctor2@test.com'
on conflict (course_code) do nothing;

-- 1. السبت: برمجة الويب (CS333)
insert into public.courses (course_code, course_name, description, doctor_id, credit_hours, capacity, schedule)
select 'CS333', 'برمجة الويب', 'Lec 112', p.id, 3, 30, 'السبت 11:00-12:45'
from public.profiles p where p.email = 'doctor@test.com'
on conflict (course_code) do update set schedule = excluded.schedule, capacity = excluded.capacity;

-- 2. السبت: لغة التجميع (CS331)
insert into public.courses (course_code, course_name, description, doctor_id, credit_hours, capacity, schedule)
select 'CS331', 'لغة التجميع', 'Lec 112', p.id, 3, 25, 'السبت 12:45-14:30'
from public.profiles p where p.email = 'doctor@test.com'
on conflict (course_code) do update set schedule = excluded.schedule, capacity = excluded.capacity;

-- 3. الأحد: قواعد البيانات المتطورة (CS381)
insert into public.courses (course_code, course_name, description, doctor_id, credit_hours, capacity, schedule)
select 'CS381', 'قواعد البيانات المتطورة', 'Lec 219 + Online', p.id, 3, 20, 'الأحد 11:00-12:45'
from public.profiles p where p.email = 'doctor@test.com'  
on conflict (course_code) do update set schedule = excluded.schedule, capacity = excluded.capacity;

-- 4. الأحد: هندسة البرمجيات (CS334)
insert into public.courses (course_code, course_name, description, doctor_id, credit_hours, capacity, schedule)
select 'CS334', 'هندسة البرمجيات', 'Lec 212', p.id, 3, 25, 'الأحد 12:45-14:30'
from public.profiles p where p.email = 'doctor@test.com' 
on conflict (course_code) do update set schedule = excluded.schedule, capacity = excluded.capacity;

-- 5. الخميس: البرمجة المنطقية (CS338)
insert into public.courses (course_code, course_name, description, doctor_id, credit_hours, capacity, schedule)
select 'CS338', 'البرمجة المنطقية', 'Lec 211', p.id, 3, 15, 'الخميس 11:00-12:45'
from public.profiles p where p.email = 'doctor@test.com' 
on conflict (course_code) do update set schedule = excluded.schedule, capacity = excluded.capacity;

-- 6. الخميس: مقدمة في شبكات الحاسب (CS337)
insert into public.courses (course_code, course_name, description, doctor_id, credit_hours, capacity, schedule)
select 'CS337', 'مقدمة في شبكات الحاسب', 'Lec 212', p.id, 3, 50, 'الخميس 12:45-14:30'
from public.profiles p where p.email = 'doctor@test.com'
on conflict (course_code) do update set schedule = excluded.schedule, capacity = excluded.capacity;

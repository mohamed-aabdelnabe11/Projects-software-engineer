# نظام تسجيل المقررات (Online Student Course Registration System)

Cairo Higher Institute for Engineering, Computer Science and Management

## Structure

```
index.html
style.css
app.js
config.js
assets/logo.png
supabase/schema.sql
supabase/policies.sql
supabase/functions.sql
supabase/seed.sql
README.md
```

## Setup

### 1. Supabase

1. Create a Supabase project.
2. In SQL Editor run files in order:
   1. `supabase/schema.sql`
   2. `supabase/policies.sql`
   3. `supabase/functions.sql`
   4. `supabase/seed.sql` (after creating profiles)
3. Enable email/password auth.

### 2. Create accounts

Accounts are created by administrators. Do not allow public role selection.

Test password (evaluation only): `Test@12345`

Create users in Supabase Auth Dashboard with these emails:

Students:
- student1@test.com
- student2@test.com
- student3@test.com
- student4@test.com

Doctors:
- doctor1@test.com
- doctor2@test.com

Admins:
- admin1@test.com
- admin2@test.com

Then insert profiles (as service role / SQL) mapping each auth user to a role:

```sql
insert into public.profiles (id, full_name, email, role, status)
values
 ( (select id from auth.users where email='student1@test.com'), 'Student One', 'student1@test.com','student','active'),
 ( (select id from auth.users where email='student2@test.com'), 'Student Two', 'student2@test.com','student','active'),
 ( (select id from auth.users where email='student3@test.com'), 'Student Three', 'student3@test.com','student','active'),
 ( (select id from auth.users where email='student4@test.com'), 'Student Four', 'student4@test.com','student','active'),
 ( (select id from auth.users where email='doctor1@test.com'), 'Doctor One', 'doctor1@test.com','doctor','active'),
 ( (select id from auth.users where email='doctor2@test.com'), 'Doctor Two', 'doctor2@test.com','doctor','active'),
 ( (select id from auth.users where email='admin1@test.com'), 'Admin One', 'admin1@test.com','admin','active'),
 ( (select id from auth.users where email='admin2@test.com'), 'Admin Two', 'admin2@test.com','admin','active');
```

First admin can also be created this way. Never store plain-text passwords.

### 3. Frontend config

Edit `config.js`:

```js
const SUPABASE_URL = 'https://YOUR-PROJECT.supabase.co';
const SUPABASE_ANON_KEY = 'YOUR-ANON-PUBLIC-KEY';
```

Use only anon/public key. Never expose service_role key.

### 4. Run/deploy

Netlify or Vercel: deploy the folder as a static site. No build command. Publish directory `.`.

## Concurrency

Registration uses `register_for_course` PostgreSQL function with `SELECT ... FOR UPDATE` row locking. Capacity checks and inserts happen in the database.

## Security

- RLS enabled on all tables.
- Roles stored in `profiles`.
- Frontend only uses anon key.

## Testing scenarios

- Login/logout per role
- Invalid credentials
- Register, duplicate prevention, full course rejection
- Drop course
- Doctor assigned courses/students
- Admin CRUD courses/users
- Role-based restrictions
- Last seat concurrency
- Cross-browser/device

-- Run in Supabase SQL Editor after re-adding users in Authentication.
-- Dashboard: Authentication → Users → Add user (email + password, auto-confirm email)

-- 1) See which auth users exist
select id, email, created_at, last_sign_in_at
from auth.users
where email ilike '%@mortonsmechanical.com'
order by email;

-- 2) Sync auth users into staff (portal User Management)
insert into staff (id, auth_user_id, name, email, phone, role, active, created_at)
select
  u.id,
  u.id,
  coalesce(u.raw_user_meta_data->>'full_name', initcap(replace(split_part(u.email, '@', 1), '.', ' '))),
  u.email,
  coalesce(u.phone, ''),
  'owner',
  true,
  u.created_at
from auth.users u
where u.email in (
  'adean@mortonsmechanical.com',
  'kstroud@mortonsmechanical.com'
)
on conflict (id) do update set
  auth_user_id = excluded.auth_user_id,
  name = excluded.name,
  email = excluded.email,
  role = excluded.role,
  active = excluded.active;

-- 3) Remove old demo staff rows if still present
delete from staff
where email in ('owner@mortonsmechanicals.com', 'alex@mortonsmechanicals.com')
   or id in ('st1', 'st2');

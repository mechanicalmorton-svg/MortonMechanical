-- Run in Supabase SQL Editor after re-adding users in Authentication.
-- Dashboard: Authentication → Users → Add user (email + password, auto-confirm email)

-- 1) See which auth users exist
select id, email, created_at, last_sign_in_at
from auth.users
where email ilike '%@mortonsmechanical.com'
order by email;

-- 2) Prepare staff table
alter table staff add column if not exists auth_user_id uuid;

update staff
set auth_user_id = id::uuid
where auth_user_id is null
  and id ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$';

-- Remove duplicate emails (keep auth-linked row, then newest)
delete from staff s
where s.id in (
  select id
  from (
    select
      id,
      row_number() over (
        partition by lower(trim(email))
        order by
          (auth_user_id is not null) desc,
          created_at desc nulls last,
          id desc
      ) as rn
    from staff
  ) ranked
  where rn > 1
);

-- Remove old demo staff rows
delete from staff
where email in ('owner@mortonsmechanicals.com', 'alex@mortonsmechanicals.com')
   or id in ('st1', 'st2');

-- 3) Clear owner emails so auth sync starts clean (fixes email/id mismatches)
delete from staff
where lower(trim(email)) in (
  'adean@mortonsmechanical.com',
  'kstroud@mortonsmechanical.com'
);

-- 4) Insert fresh rows from Supabase Auth
insert into staff (id, auth_user_id, name, email, phone, role, active, created_at)
select
  u.id::text,
  u.id,
  coalesce(u.raw_user_meta_data->>'full_name', initcap(replace(split_part(u.email, '@', 1), '.', ' '))),
  lower(trim(u.email)),
  coalesce(u.phone, ''),
  'owner',
  true,
  u.created_at
from auth.users u
where lower(trim(u.email)) in (
  'adean@mortonsmechanical.com',
  'kstroud@mortonsmechanical.com'
);

-- 5) Verify
select id, auth_user_id, name, email, role, active, created_at
from staff
where lower(trim(email)) in (
  'adean@mortonsmechanical.com',
  'kstroud@mortonsmechanical.com'
)
order by email;

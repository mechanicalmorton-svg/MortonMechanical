-- Run this in Supabase SQL Editor if staff_email_idx / duplicate email errors occur.
-- Safe to re-run.

-- 0) Ensure auth_user_id column exists (older databases may not have it yet)
alter table staff add column if not exists auth_user_id uuid;

-- Backfill auth_user_id when id is already a Supabase Auth UUID
update staff
set auth_user_id = id::uuid
where auth_user_id is null
  and id ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$';

-- 1) See duplicates
select lower(trim(email)) as email, count(*) as rows, array_agg(id) as ids
from staff
group by lower(trim(email))
having count(*) > 1;

-- 2) Remove duplicate staff emails (keep auth-linked row, then newest)
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

-- 3) Drop redundant index if a partial run created it
drop index if exists staff_email_idx;

-- 4) Ensure unique constraints exist
do $$
begin
  if not exists (
    select 1 from pg_constraint where conrelid = 'public.staff'::regclass and conname = 'staff_email_key'
  ) then
    alter table staff add constraint staff_email_key unique (email);
  end if;
exception
  when duplicate_object then null;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conrelid = 'public.staff'::regclass and conname = 'staff_auth_user_id_key'
  ) then
    alter table staff add constraint staff_auth_user_id_key unique (auth_user_id);
  end if;
exception
  when duplicate_object then null;
end $$;

-- 5) Re-sync staff from Supabase Auth (optional — run restore-portal-users.sql after this)

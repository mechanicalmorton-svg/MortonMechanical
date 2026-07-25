-- Multi-role support for portal staff.
-- Keeps legacy `role` (primary) in sync for older code paths.
-- Run this in the Supabase SQL editor if `staff.role_ids` is missing.

alter table staff
  add column if not exists role_ids text[];

-- Backfill from the single-role column.
update staff
set role_ids = array[role]
where (role_ids is null or cardinality(role_ids) = 0)
  and role is not null
  and btrim(role) <> '';

notify pgrst, 'reload schema';

-- Optional per-user permission overrides (grant/deny keys after role union).
-- Safe to re-run.
alter table if exists public.staff
  add column if not exists permission_overrides jsonb default '{}'::jsonb;

comment on column public.staff.permission_overrides is
  'JSON { "grant": string[], "deny": string[] } applied after combining role permissions.';

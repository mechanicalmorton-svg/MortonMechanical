-- Fix: add Vehicle Manager vehicle fields missing from an earlier table create.
-- Run in Supabase → SQL Editor, then retry saving a vehicle.

alter table public.vm_vehicles add column if not exists name text default '';
alter table public.vm_vehicles add column if not exists status text default 'active';
alter table public.vm_vehicles add column if not exists mileage int;
alter table public.vm_vehicles add column if not exists last_service text;

update public.vm_vehicles set name = coalesce(nullif(name, ''), 'Unit ' || coalesce(vehicle_number, '')) where name is null or name = '';
update public.vm_vehicles set status = 'active' where status is null or status = '';

-- Refresh PostgREST schema cache so the API sees the new columns
notify pgrst, 'reload schema';

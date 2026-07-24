-- Run once in Supabase SQL Editor to link inventory parts to fleet vehicles.
alter table inventory add column if not exists vehicle_id text default '';

create index if not exists inventory_vehicle_id_idx on inventory (vehicle_id) where vehicle_id <> '';

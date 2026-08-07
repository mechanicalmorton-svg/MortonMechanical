-- Quote requests: vehicle year, make, and model from the website form
-- Run once in Supabase SQL Editor.

alter table quotes add column if not exists vehicle_year text default '';
alter table quotes add column if not exists vehicle_make text default '';
alter table quotes add column if not exists vehicle_model text default '';

-- Run once in Supabase SQL Editor if inventory already exists without part_number.
alter table inventory add column if not exists part_number text default '';

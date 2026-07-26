-- Store daily route odometer readings (synced to fleet + Vehicle Manager).
-- Run in Supabase → SQL Editor.

alter table public.routes add column if not exists mileage int;

notify pgrst, 'reload schema';

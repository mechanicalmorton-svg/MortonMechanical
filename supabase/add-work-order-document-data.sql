-- Persist fillable work order / estimate / invoice form data as JSON.
-- Run this once in the Supabase SQL Editor if Save fails with:
-- "Could not find the 'document_data' column of 'work_orders' in the schema cache"
alter table work_orders
  add column if not exists document_data jsonb default '{}'::jsonb;

-- Refresh PostgREST schema cache (safe if unsupported)
notify pgrst, 'reload schema';

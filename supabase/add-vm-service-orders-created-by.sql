-- Track who created each Vehicle Manager work order.
-- Run in Supabase → SQL Editor, then reload the app.

alter table public.vm_service_orders add column if not exists created_by text;
alter table public.vm_service_orders add column if not exists created_by_user_id text;

notify pgrst, 'reload schema';

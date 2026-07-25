-- Persist fillable work order / estimate / invoice form data as JSON.
alter table work_orders
  add column if not exists document_data jsonb default '{}'::jsonb;

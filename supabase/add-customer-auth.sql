-- Link CRM customers to Supabase Auth for the client portal.
-- Run in Supabase SQL Editor.

alter table customers
  add column if not exists auth_user_id text;

create unique index if not exists customers_auth_user_id_uidx
  on customers (auth_user_id)
  where auth_user_id is not null and auth_user_id <> '';

comment on column customers.auth_user_id is 'Supabase auth.users.id for client portal login';

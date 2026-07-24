-- Run this in Supabase SQL Editor if your database was created before dashboard indexes were added.
-- Safe to re-run — uses IF NOT EXISTS.

create index if not exists inventory_name_idx on inventory (name);
create index if not exists inventory_sku_idx on inventory (sku) where sku <> '';
create index if not exists work_orders_status_idx on work_orders (status);
create index if not exists work_orders_updated_idx on work_orders (updated_at desc);
create index if not exists bookings_date_idx on bookings (date);
create index if not exists bookings_status_idx on bookings (status);
create index if not exists bookings_created_idx on bookings (created_at desc);
create index if not exists fleet_status_idx on fleet (status);
create index if not exists routes_date_idx on routes (date desc);
create index if not exists staff_auth_user_idx on staff (auth_user_id);
create index if not exists staff_role_idx on staff (role);

-- Ensure site content row exists
insert into site_content (id, content) values (1, '{}') on conflict (id) do nothing;

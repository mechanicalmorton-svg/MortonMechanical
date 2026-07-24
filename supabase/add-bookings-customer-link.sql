-- Link bookings to customers and website quote requests.
-- Run once in Supabase SQL Editor.

alter table bookings add column if not exists customer_id text references customers(id) on delete set null;
alter table bookings add column if not exists quote_id text;

create index if not exists bookings_customer_idx on bookings (customer_id) where customer_id is not null;
create index if not exists bookings_quote_idx on bookings (quote_id) where quote_id is not null;

update bookings set customer_id = null where customer_id = '';
update bookings set quote_id = null where quote_id = '';

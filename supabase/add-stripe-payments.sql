-- Stripe Checkout: booking deposits + work-order invoice payments
-- Run in Supabase SQL Editor.

-- Work orders: invoice payment tracking
alter table work_orders
  add column if not exists payment_status text not null default 'unpaid';

alter table work_orders
  add column if not exists stripe_checkout_session_id text;

comment on column work_orders.payment_status is 'unpaid | deposit_paid | paid';
comment on column work_orders.stripe_checkout_session_id is 'Last Stripe Checkout Session id for invoice payment';

-- Bookings: deposit tracking
alter table bookings
  add column if not exists deposit_paid boolean not null default false;

alter table bookings
  add column if not exists stripe_checkout_session_id text;

comment on column bookings.deposit_paid is 'True when booking deposit Checkout Session completed';
comment on column bookings.stripe_checkout_session_id is 'Stripe Checkout Session id for deposit';

create index if not exists work_orders_payment_status_idx on work_orders (payment_status);
create index if not exists bookings_deposit_paid_idx on bookings (deposit_paid);

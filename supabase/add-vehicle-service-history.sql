-- Phase 4 remainder: maintenance timeline for customer vehicles.
-- Safe to re-run.

create table if not exists public.customer_vehicle_service_history (
  id text primary key,
  customer_vehicle_id text not null references public.customer_vehicles(id) on delete cascade,
  performed_on text not null,
  mileage int,
  category text not null default 'Service',
  summary text not null default '',
  description text default '',
  work_order_id text,
  booking_id text,
  created_at timestamptz not null default now()
);

create index if not exists customer_vehicle_service_history_vehicle_idx
  on public.customer_vehicle_service_history (customer_vehicle_id, performed_on desc);

alter table public.customer_vehicle_service_history enable row level security;

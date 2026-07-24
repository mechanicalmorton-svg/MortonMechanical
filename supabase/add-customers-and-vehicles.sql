create table if not exists customers (
  id text primary key,
  name text not null,
  phone text default '',
  email text default '',
  address text default '',
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists customer_vehicles (
  id text primary key,
  customer_id text not null references customers(id) on delete cascade,
  year int,
  make text,
  model text,
  trim text,
  vin text default '',
  plate text default '',
  powertrain text,
  notes text,
  created_at timestamptz not null default now()
);

alter table work_orders add column if not exists customer_id text references customers(id) on delete set null;
alter table work_orders add column if not exists customer_vehicle_id text references customer_vehicles(id) on delete set null;
alter table work_orders add column if not exists customer_concern text default '';
alter table work_orders add column if not exists internal_notes text default '';

create index if not exists customers_name_idx on customers (lower(name));
create index if not exists customers_phone_idx on customers (phone) where phone <> '';
create index if not exists customer_vehicles_customer_idx on customer_vehicles (customer_id);
create index if not exists work_orders_customer_idx on work_orders (customer_id) where customer_id <> '';

alter table customers enable row level security;
alter table customer_vehicles enable row level security;

-- Fix empty-string FK values that violate constraints (safe to re-run)
update work_orders set customer_id = null where customer_id = '';
update work_orders set customer_vehicle_id = null where customer_vehicle_id = '';

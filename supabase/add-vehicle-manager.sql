-- Vehicle Manager (separate from fleet) — run in Supabase SQL editor if needed.

create table if not exists vm_vehicles (
  id text primary key,
  name text not null default '',
  vehicle_number text not null default '',
  year int not null default 0,
  make text not null default '',
  model text not null default '',
  status text not null default 'active',
  mileage int,
  last_service text
);

alter table vm_vehicles add column if not exists name text default '';
alter table vm_vehicles add column if not exists status text default 'active';
alter table vm_vehicles add column if not exists mileage int;
alter table vm_vehicles add column if not exists last_service text;

create table if not exists vm_parts (
  id text primary key,
  name text not null default '',
  part_number text not null default '',
  description text not null default ''
);

create table if not exists vm_activities (
  id text primary key,
  name text not null default ''
);

create table if not exists vm_service_orders (
  id text primary key,
  vehicle_id text not null,
  mileage text not null default '',
  work_needed text not null default '',
  dvir text not null default '',
  description text not null default '',
  hours numeric not null default 0,
  activity_id text,
  parts jsonb not null default '[]',
  created_at text not null,
  created_by text,
  created_by_user_id text
);

create table if not exists vm_checklists (
  id text primary key,
  name text not null default '',
  created_at text not null,
  items jsonb not null default '[]'
);

alter table vm_vehicles enable row level security;
alter table vm_parts enable row level security;
alter table vm_activities enable row level security;
alter table vm_service_orders enable row level security;
alter table vm_checklists enable row level security;

create index if not exists vm_vehicles_model_idx on vm_vehicles (model, vehicle_number);
create index if not exists vm_service_orders_vehicle_idx on vm_service_orders (vehicle_id, created_at desc);
create index if not exists vm_checklists_created_idx on vm_checklists (created_at desc);

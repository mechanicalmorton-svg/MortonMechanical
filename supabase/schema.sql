-- Morton's Mechanicals — run this in Supabase SQL Editor (Dashboard → SQL → New query)

create extension if not exists "pgcrypto";

-- Admin auth
create table if not exists admin_users (
  id uuid primary key default gen_random_uuid(),
  username text unique not null,
  password_hash text not null,
  created_at timestamptz not null default now()
);

create table if not exists admin_sessions (
  token text primary key,
  user_id uuid not null references admin_users(id) on delete cascade,
  expires_at timestamptz not null
);

create index if not exists admin_sessions_expires_idx on admin_sessions(expires_at);

-- Editable website content (single row)
create table if not exists site_content (
  id int primary key default 1 check (id = 1),
  content jsonb not null default '{}',
  updated_at timestamptz not null default now()
);

insert into site_content (id, content) values (1, '{}') on conflict (id) do nothing;

-- Quote requests from public contact form
create table if not exists quotes (
  id text primary key,
  name text not null,
  phone text not null,
  email text default '',
  rego text default '',
  service text not null,
  contact_method text not null default 'phone',
  message text default '',
  status text not null default 'new',
  created_at timestamptz not null default now()
);

create index if not exists quotes_created_idx on quotes(created_at desc);

-- Shop operations
create table if not exists work_orders (
  id text primary key,
  customer_name text not null,
  phone text default '',
  vehicle text default '',
  service text not null,
  status text not null default 'open',
  priority text not null default 'normal',
  assigned_to text,
  notes text,
  revenue numeric,
  scheduled_date text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists bookings (
  id text primary key,
  customer_name text not null,
  phone text not null,
  email text,
  service text not null,
  date text not null,
  time text not null,
  address text,
  status text not null default 'pending',
  notes text,
  created_at timestamptz not null default now()
);

create table if not exists inventory (
  id text primary key,
  name text not null,
  sku text default '',
  category text default 'General',
  quantity int not null default 0,
  min_stock int not null default 1,
  unit_cost numeric not null default 0,
  supplier text,
  location text,
  updated_at timestamptz not null default now()
);

create table if not exists staff (
  id text primary key,
  name text not null,
  email text not null,
  phone text default '',
  role text not null default 'mechanic',
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists fleet (
  id text primary key,
  name text not null,
  plate text not null,
  type text default 'Service Van',
  make text,
  model text,
  year int,
  status text not null default 'active',
  mileage int,
  last_service text
);

create table if not exists routes (
  id text primary key,
  date text not null,
  driver_id text,
  vehicle_id text,
  stops jsonb not null default '[]',
  status text not null default 'planned',
  notes text
);

-- Seed default inventory, staff, fleet (only if empty)
insert into inventory (id, name, sku, category, quantity, min_stock, unit_cost, supplier, location)
select * from (values
  ('inv1', '5W-30 Full Synthetic Oil', 'OIL-5W30', 'Fluids', 24, 8, 12.5, 'AutoParts Co', 'Van 1'),
  ('inv2', 'Ceramic Brake Pads (Front)', 'BRK-CP-F', 'Brakes', 6, 4, 45, 'BrakeMax', 'Warehouse'),
  ('inv3', '12V AGM Battery', 'BAT-AGM12', 'Electrical', 3, 2, 89, 'PowerCell', 'Van 2'),
  ('inv4', 'O2 Sensor (Universal)', 'SNS-O2-U', 'Diagnostics', 2, 3, 38, 'SensorPro', 'Warehouse')
) as v(id, name, sku, category, quantity, min_stock, unit_cost, supplier, location)
where not exists (select 1 from inventory limit 1);

insert into staff (id, name, email, phone, role, active)
select * from (values
  ('st1', 'Morton Owner', 'owner@mortonsmechanicals.com', '(555) 123-4567', 'owner', true),
  ('st2', 'Alex Rivera', 'alex@mortonsmechanicals.com', '(555) 234-5678', 'mechanic', true)
) as v(id, name, email, phone, role, active)
where not exists (select 1 from staff limit 1);

insert into fleet (id, name, plate, type, make, model, year, status, mileage, last_service)
select * from (values
  ('fl1', 'Mobile Unit 1', 'MM-1001', 'Service Van', 'Ford', 'Transit', 2022, 'active', 48200, '2026-06-15'),
  ('fl2', 'Mobile Unit 2', 'MM-1002', 'Service Van', 'Mercedes', 'Sprinter', 2021, 'active', 61500, '2026-05-28')
) as v(id, name, plate, type, make, model, year, status, mileage, last_service)
where not exists (select 1 from fleet limit 1);

-- Realtime: live website updates when owner saves content
alter publication supabase_realtime add table site_content;

-- Row Level Security (server uses service role key — bypasses RLS)
alter table admin_users enable row level security;
alter table admin_sessions enable row level security;
alter table site_content enable row level security;
alter table quotes enable row level security;
alter table work_orders enable row level security;
alter table bookings enable row level security;
alter table inventory enable row level security;
alter table staff enable row level security;
alter table fleet enable row level security;
alter table routes enable row level security;

-- Allow anon to read site content only (public website)
create policy "Public can read site content" on site_content for select using (true);

-- Allow anon to insert quotes (contact form)
create policy "Public can submit quotes" on quotes for insert with check (true);

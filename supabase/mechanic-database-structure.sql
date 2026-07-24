-- Morton's Mechanicals — vehicle & service catalog (PostgreSQL / Supabase)
-- Converted from MySQL mechanic_database structure.
-- Run in Supabase SQL Editor after existing portal tables are in place.
--
-- Portal mapping (existing tables — do NOT recreate):
--   customers          → customers (name, phone, email, address)
--   customer_vehicles  → customer_vehicles (+ extensions below)
--   bookings           → appointments
--   work_orders        → repair_orders
--   inventory          → parts
--   staff              → technicians

-- ==========================
-- MAKES
-- ==========================

create table if not exists makes (
  id serial primary key,
  name text not null unique,
  country text,
  logo text,
  created_at timestamptz not null default now()
);

-- ==========================
-- MODELS
-- ==========================

create table if not exists models (
  id serial primary key,
  make_id int not null references makes(id) on delete cascade,
  name text not null,
  first_year smallint,
  last_year smallint
);

create index if not exists models_make_id_idx on models (make_id);

-- ==========================
-- BODY STYLES
-- ==========================

create table if not exists body_styles (
  id serial primary key,
  name text unique
);

-- ==========================
-- ENGINE TYPES
-- ==========================

create table if not exists engines (
  id serial primary key,
  code text,
  name text,
  displacement numeric(4, 1),
  cylinders int,
  aspiration text check (
    aspiration in (
      'Naturally Aspirated',
      'Turbo',
      'Twin Turbo',
      'Supercharged',
      'Hybrid',
      'Plug-In Hybrid',
      'Electric'
    )
  ),
  horsepower smallint,
  torque smallint,
  fuel_type text check (
    fuel_type in ('Gasoline', 'Diesel', 'Hybrid', 'Electric', 'Flex Fuel', 'Hydrogen')
  )
);

-- ==========================
-- TRANSMISSIONS
-- ==========================

create table if not exists transmissions (
  id serial primary key,
  type text check (type in ('Manual', 'Automatic', 'CVT', 'Dual Clutch')),
  gears smallint
);

-- ==========================
-- DRIVE TYPES
-- ==========================

create table if not exists drive_types (
  id serial primary key,
  name text unique check (name in ('FWD', 'RWD', 'AWD', '4WD'))
);

-- ==========================
-- TRIMS
-- ==========================

create table if not exists trims (
  id serial primary key,
  model_id int references models(id) on delete cascade,
  name text
);

create index if not exists trims_model_id_idx on trims (model_id);

-- ==========================
-- YEARS
-- ==========================

create table if not exists years (
  id serial primary key,
  year smallint unique not null
);

-- ==========================
-- VEHICLE CONFIGURATIONS
-- ==========================

create table if not exists vehicle_configurations (
  id bigserial primary key,
  year_id int references years(id),
  make_id int references makes(id),
  model_id int references models(id),
  trim_id int references trims(id),
  engine_id int references engines(id),
  transmission_id int references transmissions(id),
  drive_type_id int references drive_types(id),
  body_style_id int references body_styles(id),
  doors smallint,
  seating smallint,
  wheelbase numeric(5, 2),
  curb_weight int,
  towing_capacity int,
  payload_capacity int,
  vin_pattern text
);

create index if not exists vehicle_configurations_make_model_idx on vehicle_configurations (make_id, model_id);

-- ==========================
-- SERVICES
-- ==========================

create table if not exists services (
  id serial primary key,
  name text,
  description text,
  estimated_time int,
  base_price numeric(10, 2)
);

-- ==========================
-- SERVICE ↔ VEHICLE CONFIG
-- ==========================

create table if not exists service_vehicle (
  id bigserial primary key,
  service_id int references services(id) on delete cascade,
  vehicle_configuration_id bigint references vehicle_configurations(id) on delete cascade
);

create index if not exists service_vehicle_service_idx on service_vehicle (service_id);
create index if not exists service_vehicle_config_idx on service_vehicle (vehicle_configuration_id);

-- ==========================
-- EXTEND EXISTING CUSTOMER VEHICLES
-- ==========================

alter table customer_vehicles add column if not exists vehicle_configuration_id bigint references vehicle_configurations(id) on delete set null;
alter table customer_vehicles add column if not exists mileage int;
alter table customer_vehicles add column if not exists color text;

create index if not exists customer_vehicles_config_idx on customer_vehicles (vehicle_configuration_id) where vehicle_configuration_id is not null;

-- ==========================
-- ROW LEVEL SECURITY
-- ==========================

alter table makes enable row level security;
alter table models enable row level security;
alter table body_styles enable row level security;
alter table engines enable row level security;
alter table transmissions enable row level security;
alter table drive_types enable row level security;
alter table trims enable row level security;
alter table years enable row level security;
alter table vehicle_configurations enable row level security;
alter table services enable row level security;
alter table service_vehicle enable row level security;

-- ==========================
-- OPTIONAL STARTER DATA
-- ==========================

insert into years (year)
select y from generate_series(1980, extract(year from now())::int + 1) as y
on conflict (year) do nothing;

insert into drive_types (name) values
  ('FWD'), ('RWD'), ('AWD'), ('4WD')
on conflict (name) do nothing;

insert into body_styles (name) values
  ('Sedan'), ('SUV'), ('Ute'), ('Van'), ('Hatchback'), ('Wagon'), ('Coupe'), ('Convertible')
on conflict (name) do nothing;

insert into makes (name, country) values
  ('Toyota', 'Japan'),
  ('Ford', 'USA'),
  ('Holden', 'Australia'),
  ('Mazda', 'Japan'),
  ('Hyundai', 'South Korea'),
  ('Nissan', 'Japan'),
  ('Chevrolet', 'USA'),
  ('BMW', 'Germany'),
  ('Mercedes-Benz', 'Germany'),
  ('Volkswagen', 'Germany')
on conflict (name) do nothing;

insert into models (make_id, name, first_year, last_year)
select m.id, v.model_name, 2000, extract(year from now())::int
from makes m
join (values
  ('Toyota', 'Camry'),
  ('Toyota', 'Corolla'),
  ('Toyota', 'Hilux'),
  ('Ford', 'Ranger'),
  ('Ford', 'Focus'),
  ('Holden', 'Colorado'),
  ('Holden', 'Commodore'),
  ('Mazda', '3'),
  ('Mazda', 'CX-5'),
  ('Hyundai', 'i30'),
  ('Hyundai', 'Tucson'),
  ('Nissan', 'Navara'),
  ('Nissan', 'X-Trail')
) as v(make_name, model_name) on lower(m.name) = lower(v.make_name)
where not exists (
  select 1 from models mo where mo.make_id = m.id and lower(mo.name) = lower(v.model_name)
);

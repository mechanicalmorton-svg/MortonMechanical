-- Operational service catalog (shop_services).
-- Separate from unused mechanic-database serial `services` table.
-- Safe to re-run.

create table if not exists public.shop_services (
  id text primary key,
  name text not null,
  category text not null default 'Custom Repairs',
  description text default '',
  estimated_duration_minutes int not null default 60,
  labor_hours numeric not null default 1,
  starting_price numeric not null default 0,
  photo_url text default '',
  warranty text default '',
  faqs jsonb not null default '[]'::jsonb,
  required_parts jsonb not null default '[]'::jsonb,
  optional_addons jsonb not null default '[]'::jsonb,
  maintenance_interval_miles int,
  maintenance_interval_months int,
  active boolean not null default true,
  sort_order int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists shop_services_category_idx on public.shop_services (category);
create index if not exists shop_services_active_idx on public.shop_services (active);

alter table public.bookings
  add column if not exists service_id text;

alter table public.work_orders
  add column if not exists service_id text;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'bookings_service_id_fkey'
  ) then
    alter table public.bookings
      add constraint bookings_service_id_fkey
      foreign key (service_id) references public.shop_services(id) on delete set null;
  end if;
exception
  when undefined_table then null;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'work_orders_service_id_fkey'
  ) then
    alter table public.work_orders
      add constraint work_orders_service_id_fkey
      foreign key (service_id) references public.shop_services(id) on delete set null;
  end if;
exception
  when undefined_table then null;
end $$;

alter table public.shop_services enable row level security;

-- Seed common categories (skip if name already exists).
insert into public.shop_services (id, name, category, description, estimated_duration_minutes, labor_hours, starting_price, sort_order)
select * from (values
  ('svc_oil_change', 'Oil Change', 'Oil Changes', 'Standard oil and filter service.', 45, 0.5, 79, 10),
  ('svc_brake_repair', 'Brake Repair', 'Brake Repairs', 'Inspect and service brakes.', 120, 2, 199, 20),
  ('svc_diagnostics', 'Diagnostics', 'Diagnostics', 'Computer and systems diagnosis.', 60, 1, 129, 30),
  ('svc_ac_repair', 'AC Repair', 'AC Repair', 'A/C performance diagnosis and repair.', 90, 1.5, 149, 40),
  ('svc_suspension', 'Suspension Service', 'Suspension', 'Suspension inspection and repair.', 120, 2, 189, 50),
  ('svc_steering', 'Steering Service', 'Steering', 'Steering component inspection and repair.', 90, 1.5, 169, 60),
  ('svc_tires', 'Tire Service', 'Tires', 'Tire mount, balance, or rotation.', 60, 1, 99, 70),
  ('svc_roadside', 'Roadside Assistance', 'Roadside Assistance', 'Mobile roadside support.', 60, 1, 149, 80),
  ('svc_mobile_diag', 'Mobile Diagnostics', 'Mobile Diagnostics', 'On-site diagnostic visit.', 75, 1.25, 159, 90),
  ('svc_custom', 'Custom Repair', 'Custom Repairs', 'Custom or multi-point repair work.', 90, 1.5, 0, 100)
) as v(id, name, category, description, estimated_duration_minutes, labor_hours, starting_price, sort_order)
where not exists (select 1 from public.shop_services s where s.id = v.id);

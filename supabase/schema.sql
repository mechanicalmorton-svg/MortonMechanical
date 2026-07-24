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
  auth_user_id uuid unique,
  name text not null,
  email text not null unique,
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

-- Link staff records to Supabase Auth users on existing databases
alter table staff add column if not exists auth_user_id uuid unique;
create unique index if not exists staff_email_idx on staff (email);

-- Realtime: live website updates when owner saves content
do $$
begin
  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'site_content'
  ) then
    alter publication supabase_realtime add table site_content;
  end if;
end $$;

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
drop policy if exists "Public can read site content" on site_content;
create policy "Public can read site content" on site_content for select using (true);

-- Allow anon to insert quotes (contact form)
drop policy if exists "Public can submit quotes" on quotes;
create policy "Public can submit quotes" on quotes for insert with check (true);

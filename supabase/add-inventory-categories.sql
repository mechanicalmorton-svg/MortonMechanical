-- Custom inventory categories created by owners/admins in the portal.
create table if not exists inventory_categories (
  name text primary key,
  sort_order int not null default 100,
  created_at timestamptz not null default now()
);

alter table inventory_categories enable row level security;

notify pgrst, 'reload schema';

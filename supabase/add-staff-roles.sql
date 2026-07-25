-- Customizable portal roles (name, color, dashboard permissions).
create table if not exists staff_roles (
  id text primary key,
  name text not null,
  color text not null default 'slate',
  system boolean not null default false,
  permissions jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table staff_roles enable row level security;

notify pgrst, 'reload schema';

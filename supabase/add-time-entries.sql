-- Employee clock in / out timesheets.
-- Run in Supabase → SQL Editor.

create table if not exists public.time_entries (
  id text primary key,
  staff_id text not null,
  clock_in_at timestamptz not null,
  clock_out_at timestamptz,
  note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  edited_by text,
  edited_at timestamptz
);

create index if not exists time_entries_staff_clock_idx
  on public.time_entries (staff_id, clock_in_at desc);

create index if not exists time_entries_open_idx
  on public.time_entries (staff_id)
  where clock_out_at is null;

alter table public.time_entries enable row level security;

notify pgrst, 'reload schema';

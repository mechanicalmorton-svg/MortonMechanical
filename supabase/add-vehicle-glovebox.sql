-- Phase 4 (scoped): digital glovebox for customer vehicles.
-- Safe to re-run.

create table if not exists public.customer_vehicle_documents (
  id text primary key,
  customer_vehicle_id text not null references public.customer_vehicles(id) on delete cascade,
  kind text not null default 'other',
  label text not null default '',
  file_url text not null,
  file_name text not null default '',
  content_type text not null default '',
  expires_on text,
  created_at timestamptz not null default now()
);

create index if not exists customer_vehicle_documents_vehicle_idx
  on public.customer_vehicle_documents (customer_vehicle_id);

alter table public.customer_vehicle_documents enable row level security;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'vehicle-glovebox',
  'vehicle-glovebox',
  true,
  8388608,
  array['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'application/pdf']
)
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Vehicle glovebox is publicly accessible" on storage.objects;
create policy "Vehicle glovebox is publicly accessible"
on storage.objects for select
using (bucket_id = 'vehicle-glovebox');

drop policy if exists "Service role manages vehicle glovebox" on storage.objects;
create policy "Service role manages vehicle glovebox"
on storage.objects for all
using (bucket_id = 'vehicle-glovebox')
with check (bucket_id = 'vehicle-glovebox');

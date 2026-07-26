-- Phase 3: booking location details + media uploads.
-- Safe to re-run.

alter table public.bookings
  add column if not exists gate_code text;

alter table public.bookings
  add column if not exists access_notes text;

alter table public.bookings
  add column if not exists lat double precision;

alter table public.bookings
  add column if not exists lng double precision;

alter table public.bookings
  add column if not exists photo_urls jsonb not null default '[]'::jsonb;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'booking-media',
  'booking-media',
  true,
  5242880,
  array['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Booking media is publicly accessible" on storage.objects;
create policy "Booking media is publicly accessible"
on storage.objects for select
using (bucket_id = 'booking-media');

drop policy if exists "Service role manages booking media" on storage.objects;
create policy "Service role manages booking media"
on storage.objects for all
using (bucket_id = 'booking-media')
with check (bucket_id = 'booking-media');

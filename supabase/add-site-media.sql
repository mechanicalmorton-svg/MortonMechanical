-- Site Contents: uploaded logos, favicon, and homepage images
-- Optional — the app creates this bucket automatically on first upload.
-- Run once in Supabase SQL Editor to pre-create it with explicit limits.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'site-media',
  'site-media',
  true,
  5242880,
  array['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/x-icon', 'image/vnd.microsoft.icon']
)
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Site media is publicly accessible" on storage.objects;
create policy "Site media is publicly accessible"
on storage.objects for select
using (bucket_id = 'site-media');

drop policy if exists "Service role manages site media" on storage.objects;
create policy "Service role manages site media"
on storage.objects for all
using (bucket_id = 'site-media')
with check (bucket_id = 'site-media');

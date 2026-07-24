-- Account settings: profile photo storage and staff avatar URL
-- Run once in Supabase SQL Editor.

alter table staff add column if not exists avatar_url text;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'avatars',
  'avatars',
  true,
  2097152,
  array['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Avatar images are publicly accessible" on storage.objects;
create policy "Avatar images are publicly accessible"
on storage.objects for select
using (bucket_id = 'avatars');

drop policy if exists "Service role manages avatars" on storage.objects;
create policy "Service role manages avatars"
on storage.objects for all
using (bucket_id = 'avatars')
with check (bucket_id = 'avatars');

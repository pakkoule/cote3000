begin;
alter table public.profiles
  add column if not exists avatar_kind text not null default 'base' check (avatar_kind in ('base','upload')),
  add column if not exists avatar_key text not null default 'avatar-01',
  add column if not exists avatar_url text,
  add column if not exists status_text text;
alter table public.profiles drop constraint if exists profiles_status_text_length;
alter table public.profiles add constraint profiles_status_text_length check (status_text is null or char_length(status_text) <= 90);
insert into storage.buckets (id,name,public,file_size_limit,allowed_mime_types)
values ('c3k-profile-avatars','c3k-profile-avatars',true,2097152,array['image/png','image/jpeg','image/webp']::text[])
on conflict (id) do update set public=true,file_size_limit=excluded.file_size_limit,allowed_mime_types=excluded.allowed_mime_types;
drop policy if exists c3k_profile_avatars_insert_own on storage.objects;
create policy c3k_profile_avatars_insert_own on storage.objects for insert to authenticated
with check (bucket_id='c3k-profile-avatars' and (storage.foldername(name))[1]=auth.uid()::text);
drop policy if exists c3k_profile_avatars_update_own on storage.objects;
create policy c3k_profile_avatars_update_own on storage.objects for update to authenticated
using (bucket_id='c3k-profile-avatars' and owner_id=auth.uid()::text)
with check (bucket_id='c3k-profile-avatars' and (storage.foldername(name))[1]=auth.uid()::text);
drop policy if exists c3k_profile_avatars_delete_own on storage.objects;
create policy c3k_profile_avatars_delete_own on storage.objects for delete to authenticated
using (bucket_id='c3k-profile-avatars' and owner_id=auth.uid()::text);
commit;

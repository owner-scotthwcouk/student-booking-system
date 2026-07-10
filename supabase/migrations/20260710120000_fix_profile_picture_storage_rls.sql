-- Ensure authenticated users can upload profile pictures only inside a folder
-- named after their own Auth user ID. This repairs deployments where the
-- profile-pictures bucket existed without the corresponding storage policy.

insert into storage.buckets (id, name, public)
values ('profile-pictures', 'profile-pictures', true)
on conflict (id) do update set public = excluded.public;

drop policy if exists "storage_profile_pictures_insert_own_folder" on storage.objects;
create policy "storage_profile_pictures_insert_own_folder"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'profile-pictures'
  and (storage.foldername(name))[1] = (select auth.uid()::text)
);

drop policy if exists "storage_profile_pictures_update_own_folder" on storage.objects;
create policy "storage_profile_pictures_update_own_folder"
on storage.objects
for update
to authenticated
using (
  bucket_id = 'profile-pictures'
  and (storage.foldername(name))[1] = (select auth.uid()::text)
)
with check (
  bucket_id = 'profile-pictures'
  and (storage.foldername(name))[1] = (select auth.uid()::text)
);

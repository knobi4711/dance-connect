insert into storage.buckets (id, name, public)
values ('club-assets', 'club-assets', false)
on conflict (id) do update set public = false;

create policy "Members can view private club assets"
  on storage.objects for select
  to authenticated
  using (
    bucket_id = 'club-assets'
    and public.is_active_club_member(((storage.foldername(name))[1])::uuid)
  );

create policy "Admins can upload private club assets"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'club-assets'
    and public.is_club_admin(((storage.foldername(name))[1])::uuid)
  );

create policy "Admins can update private club assets"
  on storage.objects for update
  to authenticated
  using (
    bucket_id = 'club-assets'
    and public.is_club_admin(((storage.foldername(name))[1])::uuid)
  )
  with check (
    bucket_id = 'club-assets'
    and public.is_club_admin(((storage.foldername(name))[1])::uuid)
  );

create policy "Admins can delete private club assets"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'club-assets'
    and public.is_club_admin(((storage.foldername(name))[1])::uuid)
  );

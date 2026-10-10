create policy "Members can view profiles in shared clubs"
  on public.profiles for select
  to authenticated
  using (exists (
    select 1
    from public.club_memberships own_membership
    join public.club_memberships shared_membership
      on shared_membership.club_id = own_membership.club_id
    where own_membership.user_id = auth.uid()
      and own_membership.status = 'active'
      and shared_membership.user_id = profiles.id
      and shared_membership.status = 'active'
  ));

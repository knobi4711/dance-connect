drop policy if exists "Admins can create clubs" on public.clubs;

create or replace function public.create_club_with_admin(
  p_name text,
  p_city text default null,
  p_description text default null
)
returns public.clubs
language plpgsql
security definer
set search_path = public
as $$
declare
  new_club public.clubs;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  if nullif(trim(p_name), '') is null then
    raise exception 'Club name is required';
  end if;

  insert into public.clubs (name, city, description)
  values (trim(p_name), nullif(trim(p_city), ''), nullif(trim(p_description), ''))
  returning * into new_club;

  insert into public.club_memberships (club_id, user_id, role, status)
  values (new_club.id, auth.uid(), 'admin', 'active');

  return new_club;
end;
$$;

grant execute on function public.create_club_with_admin(text, text, text) to authenticated;

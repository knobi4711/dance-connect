create table public.club_invitations (
  id uuid primary key default gen_random_uuid(),
  club_id uuid not null references public.clubs(id) on delete cascade,
  email text not null,
  role text not null default 'member' check (role in ('admin', 'trainer', 'member')),
  token_hash text not null unique,
  expires_at timestamptz not null,
  accepted_at timestamptz,
  created_by uuid not null references public.profiles(id) on delete restrict,
  created_at timestamptz not null default now()
);

create index club_invitations_club_id_idx on public.club_invitations (club_id);
create index club_invitations_email_idx on public.club_invitations (lower(email));

alter table public.club_invitations enable row level security;

create policy "Admins can view club invitations"
  on public.club_invitations for select to authenticated
  using (public.is_club_admin(club_id));

create or replace function public.create_club_invitation(
  p_club_id uuid,
  p_email text,
  p_role text default 'member'
)
returns table (invitation_id uuid, invitation_token text, expires_at timestamptz)
language plpgsql
security definer
set search_path = public
as $$
declare
  raw_token text;
  new_id uuid;
  new_expiry timestamptz;
begin
  if not public.is_club_admin(p_club_id) then
    raise exception 'Only club admins can create invitations';
  end if;

  if nullif(trim(p_email), '') is null then
    raise exception 'Email is required';
  end if;

  if p_role not in ('admin', 'trainer', 'member') then
    raise exception 'Invalid invitation role';
  end if;

  raw_token := encode(gen_random_bytes(32), 'hex');
  new_expiry := now() + interval '7 days';

  insert into public.club_invitations (club_id, email, role, token_hash, expires_at, created_by)
  values (p_club_id, lower(trim(p_email)), p_role, encode(digest(raw_token, 'sha256'), 'hex'), new_expiry, auth.uid())
  returning id into new_id;

  return query select new_id, raw_token, new_expiry;
end;
$$;

create or replace function public.accept_club_invitation(p_invitation_token text)
returns public.club_memberships
language plpgsql
security definer
set search_path = public
as $$
declare
  invitation public.club_invitations;
  membership public.club_memberships;
  current_email text;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  current_email := lower(auth.jwt() ->> 'email');

  select * into invitation
  from public.club_invitations
  where token_hash = encode(digest(p_invitation_token, 'sha256'), 'hex')
    and accepted_at is null
    and expires_at > now()
  for update;

  if invitation.id is null then
    raise exception 'Invitation is invalid or expired';
  end if;

  if current_email is null or current_email <> lower(invitation.email) then
    raise exception 'Invitation email does not match the signed-in account';
  end if;

  insert into public.club_memberships (club_id, user_id, role, status)
  values (invitation.club_id, auth.uid(), invitation.role, 'active')
  on conflict (club_id, user_id) do update
    set role = excluded.role, status = 'active', updated_at = now()
  returning * into membership;

  update public.club_invitations
  set accepted_at = now()
  where id = invitation.id;

  return membership;
end;
$$;

grant execute on function public.create_club_invitation(uuid, text, text) to authenticated;
grant execute on function public.accept_club_invitation(text) to authenticated;

create table public.trainers (
  id uuid primary key default gen_random_uuid(),
  club_id uuid not null references public.clubs(id) on delete cascade,
  name text not null,
  photo_path text,
  biography text,
  contact_email text,
  specializations text[] not null default '{}',
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.groups (
  id uuid primary key default gen_random_uuid(),
  club_id uuid not null references public.clubs(id) on delete cascade,
  name text not null,
  description text,
  level text not null check (level in ('beginner', 'advanced', 'professional', 'children', 'youth')),
  dance_style text,
  capacity integer check (capacity is null or capacity > 0),
  color text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.group_trainers (
  group_id uuid not null references public.groups(id) on delete cascade,
  trainer_id uuid not null references public.trainers(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (group_id, trainer_id)
);

create table public.group_memberships (
  group_id uuid not null references public.groups(id) on delete cascade,
  membership_id uuid not null references public.club_memberships(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (group_id, membership_id)
);

create or replace function public.validate_group_trainer_club()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if not exists (
    select 1
    from public.groups g
    join public.trainers t on t.club_id = g.club_id
    where g.id = new.group_id and t.id = new.trainer_id
  ) then
    raise exception 'Group and trainer must belong to the same club';
  end if;
  return new;
end;
$$;

create trigger ensure_group_trainer_same_club
  before insert or update on public.group_trainers
  for each row execute procedure public.validate_group_trainer_club();

create or replace function public.validate_group_membership_club()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if not exists (
    select 1
    from public.groups g
    join public.club_memberships cm on cm.club_id = g.club_id
    where g.id = new.group_id and cm.id = new.membership_id
  ) then
    raise exception 'Group and membership must belong to the same club';
  end if;
  return new;
end;
$$;

create trigger ensure_group_membership_same_club
  before insert or update on public.group_memberships
  for each row execute procedure public.validate_group_membership_club();

create index trainers_club_id_idx on public.trainers (club_id);
create index groups_club_id_idx on public.groups (club_id);

alter table public.trainers enable row level security;
alter table public.groups enable row level security;
alter table public.group_trainers enable row level security;
alter table public.group_memberships enable row level security;

create policy "Members can view trainers"
  on public.trainers for select to authenticated
  using (public.is_active_club_member(club_id));

create policy "Admins can manage trainers"
  on public.trainers for all to authenticated
  using (public.is_club_admin(club_id))
  with check (public.is_club_admin(club_id));

create policy "Members can view groups"
  on public.groups for select to authenticated
  using (public.is_active_club_member(club_id));

create policy "Admins can manage groups"
  on public.groups for all to authenticated
  using (public.is_club_admin(club_id))
  with check (public.is_club_admin(club_id));

create policy "Members can view group trainers"
  on public.group_trainers for select to authenticated
  using (exists (
    select 1 from public.groups
    where groups.id = group_trainers.group_id
      and public.is_active_club_member(groups.club_id)
  ));

create policy "Admins can manage group trainers"
  on public.group_trainers for all to authenticated
  using (exists (
    select 1 from public.groups
    where groups.id = group_trainers.group_id
      and public.is_club_admin(groups.club_id)
  ))
  with check (exists (
    select 1 from public.groups
    where groups.id = group_trainers.group_id
      and public.is_club_admin(groups.club_id)
  ));

create policy "Members can view group memberships"
  on public.group_memberships for select to authenticated
  using (exists (
    select 1 from public.groups
    where groups.id = group_memberships.group_id
      and public.is_active_club_member(groups.club_id)
  ));

create policy "Admins can manage group memberships"
  on public.group_memberships for all to authenticated
  using (exists (
    select 1 from public.groups
    where groups.id = group_memberships.group_id
      and public.is_club_admin(groups.club_id)
  ))
  with check (exists (
    select 1 from public.groups
    where groups.id = group_memberships.group_id
      and public.is_club_admin(groups.club_id)
  ));

grant select, insert, update, delete on public.trainers to authenticated;
grant select, insert, update, delete on public.groups to authenticated;
grant select, insert, update, delete on public.group_trainers to authenticated;
grant select, insert, update, delete on public.group_memberships to authenticated;

create table public.trainings (
  id uuid primary key default gen_random_uuid(),
  club_id uuid not null references public.clubs(id) on delete cascade,
  group_id uuid not null references public.groups(id) on delete restrict,
  title text not null,
  starts_at timestamptz not null,
  ends_at timestamptz,
  location text,
  notes text,
  status text not null default 'planned'
    check (status in ('planned', 'confirmed', 'cancelled', 'completed')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.training_attendance (
  id uuid primary key default gen_random_uuid(),
  training_id uuid not null references public.trainings(id) on delete cascade,
  membership_id uuid not null references public.club_memberships(id) on delete cascade,
  response text not null check (response in ('yes', 'no')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (training_id, membership_id)
);

create index trainings_club_starts_at_idx on public.trainings (club_id, starts_at);
create index training_attendance_training_id_idx on public.training_attendance (training_id);

create or replace function public.validate_training_group_club()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if not exists (
    select 1 from public.groups
    where groups.id = new.group_id and groups.club_id = new.club_id
  ) then
    raise exception 'Training and group must belong to the same club';
  end if;
  return new;
end;
$$;

create trigger ensure_training_group_same_club
  before insert or update on public.trainings
  for each row execute procedure public.validate_training_group_club();

create or replace function public.validate_training_attendance_club()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if not exists (
    select 1
    from public.trainings t
    join public.club_memberships cm on cm.club_id = t.club_id
    where t.id = new.training_id and cm.id = new.membership_id
  ) then
    raise exception 'Training and membership must belong to the same club';
  end if;
  return new;
end;
$$;

create trigger ensure_training_attendance_same_club
  before insert or update on public.training_attendance
  for each row execute procedure public.validate_training_attendance_club();

alter table public.trainings enable row level security;
alter table public.training_attendance enable row level security;

create policy "Members can view trainings"
  on public.trainings for select to authenticated
  using (public.is_active_club_member(club_id));

create policy "Admins can manage trainings"
  on public.trainings for all to authenticated
  using (public.is_club_admin(club_id))
  with check (public.is_club_admin(club_id));

create policy "Members can view attendance in their clubs"
  on public.training_attendance for select to authenticated
  using (exists (
    select 1 from public.trainings t
    where t.id = training_attendance.training_id
      and public.is_active_club_member(t.club_id)
  ));

create policy "Members can manage their own attendance"
  on public.training_attendance for insert to authenticated
  with check (exists (
    select 1 from public.club_memberships cm
    where cm.id = training_attendance.membership_id
      and cm.user_id = auth.uid()
      and cm.status = 'active'
  ));

create policy "Members can update their own attendance"
  on public.training_attendance for update to authenticated
  using (exists (
    select 1 from public.club_memberships cm
    where cm.id = training_attendance.membership_id
      and cm.user_id = auth.uid()
      and cm.status = 'active'
  ))
  with check (exists (
    select 1 from public.club_memberships cm
    where cm.id = training_attendance.membership_id
      and cm.user_id = auth.uid()
      and cm.status = 'active'
  ));

create policy "Admins can delete attendance"
  on public.training_attendance for delete to authenticated
  using (exists (
    select 1 from public.trainings t
    where t.id = training_attendance.training_id
      and public.is_club_admin(t.club_id)
  ));

grant select, insert, update, delete on public.trainings to authenticated;
grant select, insert, update, delete on public.training_attendance to authenticated;

create table public.dances (
  id uuid primary key default gen_random_uuid(),
  club_id uuid not null references public.clubs(id) on delete cascade,
  name text not null,
  category text,
  rhythm text,
  difficulty text,
  choreographer text,
  music text,
  walls integer check (walls is null or walls > 0),
  counts integer check (counts is null or counts > 0),
  motion text,
  video_url text,
  stepsheet_url text,
  notes text,
  image_path text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.dance_skills (
  id uuid primary key default gen_random_uuid(),
  dance_id uuid not null references public.dances(id) on delete cascade,
  membership_id uuid not null references public.club_memberships(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (dance_id, membership_id)
);

create index dances_club_name_idx on public.dances (club_id, name);

create or replace function public.validate_dance_skill_club()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if not exists (
    select 1
    from public.dances d
    join public.club_memberships cm on cm.club_id = d.club_id
    where d.id = new.dance_id and cm.id = new.membership_id
  ) then
    raise exception 'Dance and membership must belong to the same club';
  end if;
  return new;
end;
$$;

create trigger ensure_dance_skill_same_club
  before insert or update on public.dance_skills
  for each row execute procedure public.validate_dance_skill_club();

alter table public.dances enable row level security;
alter table public.dance_skills enable row level security;

create policy "Members can view dances"
  on public.dances for select to authenticated
  using (public.is_active_club_member(club_id));

create policy "Admins can manage dances"
  on public.dances for all to authenticated
  using (public.is_club_admin(club_id))
  with check (public.is_club_admin(club_id));

create policy "Members can view dance skills in their clubs"
  on public.dance_skills for select to authenticated
  using (exists (
    select 1 from public.dances d
    where d.id = dance_skills.dance_id
      and public.is_active_club_member(d.club_id)
  ));

create policy "Members can manage their own dance skills"
  on public.dance_skills for insert to authenticated
  with check (exists (
    select 1 from public.club_memberships cm
    where cm.id = dance_skills.membership_id
      and cm.user_id = auth.uid()
      and cm.status = 'active'
  ));

create policy "Members can delete their own dance skills"
  on public.dance_skills for delete to authenticated
  using (exists (
    select 1 from public.club_memberships cm
    where cm.id = dance_skills.membership_id
      and cm.user_id = auth.uid()
      and cm.status = 'active'
  ));

grant select, insert, update, delete on public.dances to authenticated;
grant select, insert, delete on public.dance_skills to authenticated;

create table public.events (
  id uuid primary key default gen_random_uuid(),
  club_id uuid not null references public.clubs(id) on delete cascade,
  title text not null,
  description text,
  category text not null default 'other'
    check (category in ('performance', 'competition', 'workshop', 'party', 'trip', 'other')),
  starts_at timestamptz not null,
  ends_at timestamptz,
  location text,
  image_path text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index events_club_starts_at_idx on public.events (club_id, starts_at);

alter table public.events enable row level security;

create policy "Members can view events"
  on public.events for select to authenticated
  using (public.is_active_club_member(club_id));

create policy "Admins can manage events"
  on public.events for all to authenticated
  using (public.is_club_admin(club_id))
  with check (public.is_club_admin(club_id));

grant select, insert, update, delete on public.events to authenticated;

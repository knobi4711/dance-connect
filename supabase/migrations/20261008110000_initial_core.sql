create extension if not exists pgcrypto;

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  first_name text,
  last_name text,
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.clubs (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  city text,
  contact_email text,
  website text,
  logo_path text,
  description text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.club_memberships (
  id uuid primary key default gen_random_uuid(),
  club_id uuid not null references public.clubs(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  role text not null default 'member' check (role in ('admin', 'trainer', 'member')),
  status text not null default 'active' check (status in ('active', 'inactive')),
  joined_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (club_id, user_id)
);

create index club_memberships_user_id_idx on public.club_memberships (user_id);
create index club_memberships_club_id_idx on public.club_memberships (club_id);

create or replace function public.is_active_club_member(target_club_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1
    from public.club_memberships
    where club_id = target_club_id
      and user_id = auth.uid()
      and status = 'active'
  );
$$;

create or replace function public.is_club_admin(target_club_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1
    from public.club_memberships
    where club_id = target_club_id
      and user_id = auth.uid()
      and status = 'active'
      and role = 'admin'
  );
$$;

alter table public.profiles enable row level security;
alter table public.clubs enable row level security;
alter table public.club_memberships enable row level security;

create policy "Users can view their own profile"
  on public.profiles for select
  to authenticated
  using (id = auth.uid());

create policy "Users can update their own profile"
  on public.profiles for update
  to authenticated
  using (id = auth.uid())
  with check (id = auth.uid());

create policy "Members can view their clubs"
  on public.clubs for select
  to authenticated
  using (public.is_active_club_member(id));

create policy "Admins can create clubs"
  on public.clubs for insert
  to authenticated
  with check (true);

create policy "Admins can update their clubs"
  on public.clubs for update
  to authenticated
  using (public.is_club_admin(id))
  with check (public.is_club_admin(id));

create policy "Members can view memberships in their clubs"
  on public.club_memberships for select
  to authenticated
  using (public.is_active_club_member(club_id));

create policy "Admins can create memberships"
  on public.club_memberships for insert
  to authenticated
  with check (public.is_club_admin(club_id));

create policy "Admins can update memberships"
  on public.club_memberships for update
  to authenticated
  using (public.is_club_admin(club_id))
  with check (public.is_club_admin(club_id));

create policy "Admins can delete memberships"
  on public.club_memberships for delete
  to authenticated
  using (public.is_club_admin(club_id));

grant usage on schema public to authenticated;
grant select, insert, update on public.profiles to authenticated;
grant select, insert, update on public.clubs to authenticated;
grant select, insert, update, delete on public.club_memberships to authenticated;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, display_name)
  values (new.id, coalesce(new.raw_user_meta_data ->> 'display_name', new.email));
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

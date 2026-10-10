create table public.chat_channels (
  id uuid primary key default gen_random_uuid(),
  club_id uuid not null references public.clubs(id) on delete cascade,
  name text not null,
  description text,
  created_at timestamptz not null default now(),
  unique (club_id, name)
);

create table public.chat_messages (
  id uuid primary key default gen_random_uuid(),
  channel_id uuid not null references public.chat_channels(id) on delete cascade,
  author_membership_id uuid not null references public.club_memberships(id) on delete restrict,
  body text not null check (char_length(trim(body)) > 0),
  created_at timestamptz not null default now()
);

create index chat_channels_club_id_idx on public.chat_channels (club_id);
create index chat_messages_channel_created_at_idx on public.chat_messages (channel_id, created_at);

create or replace function public.validate_chat_message_club()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if not exists (
    select 1
    from public.chat_channels channel
    join public.club_memberships membership on membership.club_id = channel.club_id
    where channel.id = new.channel_id and membership.id = new.author_membership_id
  ) then
    raise exception 'Channel and message author must belong to the same club';
  end if;
  return new;
end;
$$;

create trigger ensure_chat_message_same_club
  before insert or update on public.chat_messages
  for each row execute procedure public.validate_chat_message_club();

alter table public.chat_channels enable row level security;
alter table public.chat_messages enable row level security;

create policy "Members can view chat channels"
  on public.chat_channels for select to authenticated
  using (public.is_active_club_member(club_id));

create policy "Admins can manage chat channels"
  on public.chat_channels for all to authenticated
  using (public.is_club_admin(club_id))
  with check (public.is_club_admin(club_id));

create policy "Members can view chat messages"
  on public.chat_messages for select to authenticated
  using (exists (
    select 1 from public.chat_channels channel
    where channel.id = chat_messages.channel_id
      and public.is_active_club_member(channel.club_id)
  ));

create policy "Members can send their own chat messages"
  on public.chat_messages for insert to authenticated
  with check (exists (
    select 1 from public.club_memberships membership
    where membership.id = chat_messages.author_membership_id
      and membership.user_id = auth.uid()
      and membership.status = 'active'
  ));

create policy "Admins can delete chat messages"
  on public.chat_messages for delete to authenticated
  using (exists (
    select 1
    from public.chat_channels channel
    where channel.id = chat_messages.channel_id
      and public.is_club_admin(channel.club_id)
  ));

grant select, insert, update, delete on public.chat_channels to authenticated;
grant select, insert, delete on public.chat_messages to authenticated;

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'chat_messages'
  ) then
    alter publication supabase_realtime add table public.chat_messages;
  end if;
end
$$;

insert into public.chat_channels (club_id, name, description)
select clubs.id, defaults.name, defaults.description
from public.clubs
cross join (
  values
    ('Allgemein'::text, 'Der allgemeine Vereinskanal'::text),
    ('Training'::text, 'Absprachen rund um das Training'::text),
    ('Veranstaltungen'::text, 'Neuigkeiten zu Veranstaltungen'::text)
) as defaults(name, description)
on conflict (club_id, name) do nothing;

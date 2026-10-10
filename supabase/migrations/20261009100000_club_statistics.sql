create or replace function public.get_club_statistics(
  p_club_id uuid,
  p_from date,
  p_to date
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  result jsonb;
begin
  if not public.is_club_admin(p_club_id) then
    raise exception 'Only club admins can view statistics';
  end if;

  if p_from is null or p_to is null or p_from > p_to then
    raise exception 'Invalid statistics date range';
  end if;

  select jsonb_build_object(
    'club_id', p_club_id,
    'from_date', p_from,
    'to_date', p_to,
    'trainings', jsonb_build_object(
      'total', count(*),
      'planned', count(*) filter (where status = 'planned'),
      'confirmed', count(*) filter (where status = 'confirmed'),
      'cancelled', count(*) filter (where status = 'cancelled'),
      'completed', count(*) filter (where status = 'completed')
    ),
    'attendance', coalesce((
      select jsonb_build_object(
        'yes', count(*) filter (where ta.response = 'yes'),
        'no', count(*) filter (where ta.response = 'no'),
        'total_responses', count(*),
        'average_yes_per_training', round(
          count(*) filter (where ta.response = 'yes')::numeric
          / nullif(count(distinct ta.training_id), 0), 2
        )
      )
      from public.training_attendance ta
      join public.trainings attendance_training on attendance_training.id = ta.training_id
      where attendance_training.club_id = p_club_id
        and attendance_training.starts_at >= p_from::timestamptz
        and attendance_training.starts_at < (p_to + 1)::timestamptz
    ), '{"yes": 0, "no": 0, "total_responses": 0, "average_yes_per_training": 0}'::jsonb),
    'active_groups', (select count(*) from public.groups where club_id = p_club_id),
    'active_trainers', (select count(*) from public.trainers where club_id = p_club_id and is_active),
    'dances', (select count(*) from public.dances where club_id = p_club_id),
    'events', (select count(*) from public.events where club_id = p_club_id and starts_at >= p_from::timestamptz and starts_at < (p_to + 1)::timestamptz),
    'trainings_by_group', coalesce((
      select jsonb_agg(jsonb_build_object('group', group_summary.name, 'total', group_summary.total) order by group_summary.name)
      from (
        select g.name, count(t.id)::integer as total
        from public.groups g
        left join public.trainings t on t.group_id = g.id
          and t.club_id = p_club_id
          and t.starts_at >= p_from::timestamptz
          and t.starts_at < (p_to + 1)::timestamptz
        where g.club_id = p_club_id
        group by g.name
      ) group_summary
    ), '[]'::jsonb)
  ) into result
  from public.trainings
  where club_id = p_club_id
    and starts_at >= p_from::timestamptz
    and starts_at < (p_to + 1)::timestamptz;

  return result;
end;
$$;

grant execute on function public.get_club_statistics(uuid, date, date) to authenticated;

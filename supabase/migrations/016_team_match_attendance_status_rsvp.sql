-- Align team_match_attendance_status with RSVP values used by the app:
-- going | not_going | maybe | unknown
--
-- Older deployments may still have: present | absent | late | unknown

do $migration$
begin
  if exists (
    select 1
    from pg_type t
    join pg_enum e on e.enumtypid = t.oid
    where t.typname = 'team_match_attendance_status'
      and e.enumlabel = 'going'
  ) then
    raise notice 'team_match_attendance_status already uses RSVP values';
    return;
  end if;

  execute 'drop function if exists public.upsert_team_match_attendance(uuid, uuid, public.team_match_attendance_status)';

  execute 'alter table public.team_match_attendance alter column status drop default';
  execute 'alter table public.team_match_attendance alter column status type text using status::text';
  execute 'drop type public.team_match_attendance_status';

  execute $enum$
    create type public.team_match_attendance_status as enum (
      'going',
      'not_going',
      'maybe',
      'unknown'
    )
  $enum$;

  execute $alter$
    alter table public.team_match_attendance
      alter column status type public.team_match_attendance_status
      using (
        case status
          when 'present' then 'going'
          when 'absent' then 'not_going'
          when 'late' then 'maybe'
          when 'going' then 'going'
          when 'not_going' then 'not_going'
          when 'maybe' then 'maybe'
          else 'unknown'
        end
      )::public.team_match_attendance_status
  $alter$;

  execute $default$
    alter table public.team_match_attendance
      alter column status set default 'unknown'
  $default$;

  execute 'grant usage on type public.team_match_attendance_status to authenticated';
end;
$migration$;

create or replace function public.upsert_team_match_attendance(
  p_match_id uuid,
  p_member_id uuid,
  p_status public.team_match_attendance_status
)
returns public.team_match_attendance
language plpgsql
security definer
set search_path = public
as $$
declare
  v_team_id uuid;
  v_member public.team_members;
  v_row public.team_match_attendance;
begin
  select match_record.team_id
  into v_team_id
  from public.team_matches match_record
  where match_record.id = p_match_id;

  if v_team_id is null then
    raise exception 'MATCH_NOT_FOUND';
  end if;

  if not public.is_team_member(v_team_id) then
    raise exception 'TEAM_MEMBER_ACCESS_DENIED';
  end if;

  select *
  into v_member
  from public.team_members
  where id = p_member_id
    and team_id = v_team_id;

  if not found then
    raise exception 'TEAM_MEMBER_NOT_FOUND';
  end if;

  if not public.is_team_admin(v_team_id)
    and (v_member.user_id is distinct from auth.uid()) then
    raise exception 'TEAM_MATCH_ATTENDANCE_NOT_ALLOWED';
  end if;

  insert into public.team_match_attendance (
    match_id,
    member_id,
    status,
    updated_by,
    responded_at,
    updated_at
  )
  values (
    p_match_id,
    p_member_id,
    p_status,
    auth.uid(),
    now(),
    now()
  )
  on conflict (match_id, member_id) do update
  set
    status = excluded.status,
    updated_by = excluded.updated_by,
    responded_at = now(),
    updated_at = now()
  returning * into v_row;

  return v_row;
end;
$$;

grant execute on function public.upsert_team_match_attendance(
  uuid,
  uuid,
  public.team_match_attendance_status
) to authenticated;

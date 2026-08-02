-- One-shot repair for team_match_attendance schema drift.
-- Safe to run multiple times in Supabase SQL Editor.

-- 1) RSVP enum: going | not_going | maybe | unknown
do $enum_migration$
begin
  if exists (
    select 1
    from pg_type t
    join pg_enum e on e.enumtypid = t.oid
    where t.typname = 'team_match_attendance_status'
      and e.enumlabel = 'going'
  ) then
    raise notice 'enum already migrated';
  else
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
  end if;
end;
$enum_migration$;

-- 2) Legacy columns: marked_by / marked_at -> updated_by / responded_at
alter table public.team_match_attendance
  add column if not exists updated_by uuid references auth.users(id) on delete set null;

alter table public.team_match_attendance
  add column if not exists responded_at timestamptz;

alter table public.team_match_attendance
  add column if not exists created_at timestamptz not null default now();

alter table public.team_match_attendance
  add column if not exists updated_at timestamptz not null default now();

do $column_migration$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'team_match_attendance'
      and column_name = 'marked_by'
  ) then
    execute 'drop policy if exists "Members and admins can mark match attendance" on public.team_match_attendance';
    execute 'drop policy if exists "Members and admins can update match attendance" on public.team_match_attendance';
    execute 'drop policy if exists "Members and admins can manage match attendance" on public.team_match_attendance';

    execute 'alter table public.team_match_attendance alter column marked_by drop not null';

    execute $sql$
      update public.team_match_attendance
      set updated_by = marked_by
      where updated_by is null
        and marked_by is not null
    $sql$;

    execute 'alter table public.team_match_attendance drop column marked_by';
  end if;

  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'team_match_attendance'
      and column_name = 'marked_at'
  ) then
    execute $sql$
      update public.team_match_attendance
      set responded_at = marked_at
      where responded_at is null
        and marked_at is not null
    $sql$;

    execute 'alter table public.team_match_attendance drop column marked_at';
  end if;
end;
$column_migration$;

alter table public.team_match_attendance enable row level security;

grant select, insert, update, delete on public.team_match_attendance to authenticated;

drop policy if exists "Team members can view match attendance" on public.team_match_attendance;
create policy "Team members can view match attendance"
on public.team_match_attendance for select
to authenticated
using (
  exists (
    select 1
    from public.team_matches match_record
    where match_record.id = match_id
      and public.is_team_member(match_record.team_id)
  )
);

drop policy if exists "Members and admins can mark match attendance" on public.team_match_attendance;
drop policy if exists "Members and admins can update match attendance" on public.team_match_attendance;
drop policy if exists "Members and admins can manage match attendance" on public.team_match_attendance;

create policy "Members and admins can manage match attendance"
on public.team_match_attendance for all
to authenticated
using (
  exists (
    select 1
    from public.team_matches match_record
    join public.team_members member_record on member_record.id = member_id
    where match_record.id = match_id
      and member_record.team_id = match_record.team_id
      and (
        public.is_team_admin(match_record.team_id)
        or member_record.user_id = auth.uid()
      )
  )
)
with check (
  exists (
    select 1
    from public.team_matches match_record
    join public.team_members member_record on member_record.id = member_id
    where match_record.id = match_id
      and member_record.team_id = match_record.team_id
      and (
        public.is_team_admin(match_record.team_id)
        or member_record.user_id = auth.uid()
      )
  )
);

-- 3) Upsert RPC used by the app
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

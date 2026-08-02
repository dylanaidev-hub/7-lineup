-- Match attendance / roll call per team match

do $$
begin
  create type public.team_match_attendance_status as enum ('going', 'not_going', 'maybe', 'unknown');
exception
  when duplicate_object then null;
end;
$$;

create table if not exists public.team_match_attendance (
  id uuid primary key default gen_random_uuid(),
  match_id uuid not null references public.team_matches(id) on delete cascade,
  member_id uuid not null references public.team_members(id) on delete cascade,
  status public.team_match_attendance_status not null default 'unknown',
  updated_by uuid references auth.users(id) on delete set null,
  responded_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (match_id, member_id)
);

create index if not exists team_match_attendance_match_id_idx
on public.team_match_attendance (match_id);

create index if not exists team_match_attendance_member_id_idx
on public.team_match_attendance (member_id);

alter table public.team_match_attendance enable row level security;

grant usage on type public.team_match_attendance_status to authenticated;
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

grant execute on function public.upsert_team_match_attendance(uuid, uuid, public.team_match_attendance_status) to authenticated;

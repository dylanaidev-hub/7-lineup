-- =====================================================================
-- Team Management
-- Adds teams, team members, events, and attendance with RLS.
--
-- Notes:
-- - The creator of a team is automatically inserted as an admin member.
-- - team_members.user_id is nullable so teams can register players who do
--   not have an account yet.
-- - Helper functions are SECURITY DEFINER to avoid recursive RLS checks when
--   policies need to inspect team membership.
-- =====================================================================

do $$
begin
  create type public.team_member_role as enum ('admin', 'player');
exception
  when duplicate_object then null;
end;
$$;

do $$
begin
  create type public.team_event_type as enum ('match', 'training');
exception
  when duplicate_object then null;
end;
$$;

do $$
begin
  create type public.attendance_status as enum ('going', 'not_going', 'pending');
exception
  when duplicate_object then null;
end;
$$;

create table if not exists public.teams (
  id uuid primary key default gen_random_uuid(),
  name text not null check (length(trim(name)) > 0),
  logo_url text,
  created_by uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

-- Keep this migration safe for databases where an earlier draft of the table
-- may already exist. create table if not exists will not add missing columns.
alter table public.teams add column if not exists name text;
alter table public.teams add column if not exists logo_url text;
alter table public.teams add column if not exists created_by uuid references auth.users(id) on delete cascade;
alter table public.teams add column if not exists user_id uuid references auth.users(id) on delete cascade;
alter table public.teams add column if not exists created_at timestamptz not null default now();

update public.teams
set created_by = coalesce(created_by, user_id)
where created_by is null
  and user_id is not null;

update public.teams
set user_id = coalesce(user_id, created_by)
where user_id is null
  and created_by is not null;

create table if not exists public.team_members (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references public.teams(id) on delete cascade,
  user_id uuid references auth.users(id) on delete set null,
  player_name text not null check (length(trim(player_name)) > 0),
  role public.team_member_role not null default 'player',
  created_at timestamptz not null default now()
);

alter table public.team_members add column if not exists team_id uuid references public.teams(id) on delete cascade;
alter table public.team_members add column if not exists user_id uuid references auth.users(id) on delete set null;
alter table public.team_members add column if not exists player_name text;
alter table public.team_members add column if not exists role public.team_member_role not null default 'player';
alter table public.team_members add column if not exists jersey_number integer;
alter table public.team_members add column if not exists created_at timestamptz not null default now();

-- Compatibility for earlier local schemas where extra member fields were required.
-- The team management flow allows quick-add members with only a display name.
do $$
declare
  legacy_column record;
begin
  for legacy_column in
    select column_name
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'team_members'
      and is_nullable = 'NO'
      and column_name not in ('id', 'team_id', 'player_name', 'role', 'created_at')
  loop
    execute format('alter table public.team_members alter column %I drop not null', legacy_column.column_name);
  end loop;
end;
$$;

create table if not exists public.events (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references public.teams(id) on delete cascade,
  title text not null check (length(trim(title)) > 0),
  event_date timestamptz not null,
  event_type public.team_event_type not null,
  lineup_id uuid references public.lineups(id) on delete set null,
  created_at timestamptz not null default now()
);

alter table public.events add column if not exists team_id uuid references public.teams(id) on delete cascade;
alter table public.events add column if not exists title text;
alter table public.events add column if not exists event_date timestamptz;
alter table public.events add column if not exists event_type public.team_event_type;
alter table public.events add column if not exists lineup_id uuid references public.lineups(id) on delete set null;
alter table public.events add column if not exists created_at timestamptz not null default now();

create table if not exists public.attendance (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete cascade,
  member_id uuid not null references public.team_members(id) on delete cascade,
  status public.attendance_status not null default 'pending',
  updated_at timestamptz not null default now(),
  constraint attendance_event_member_unique unique (event_id, member_id)
);

alter table public.attendance add column if not exists event_id uuid references public.events(id) on delete cascade;
alter table public.attendance add column if not exists member_id uuid references public.team_members(id) on delete cascade;
alter table public.attendance add column if not exists status public.attendance_status not null default 'pending';
alter table public.attendance add column if not exists updated_at timestamptz not null default now();

create index if not exists teams_created_by_idx
on public.teams (created_by);

create index if not exists teams_user_id_idx
on public.teams (user_id)
where user_id is not null;

create index if not exists team_members_team_id_idx
on public.team_members (team_id);

create index if not exists team_members_user_id_idx
on public.team_members (user_id)
where user_id is not null;

create unique index if not exists team_members_team_user_unique_idx
on public.team_members (team_id, user_id)
where user_id is not null;

create index if not exists team_members_team_role_idx
on public.team_members (team_id, role);

create index if not exists events_team_id_idx
on public.events (team_id);

create index if not exists events_lineup_id_idx
on public.events (lineup_id)
where lineup_id is not null;

create index if not exists events_team_date_idx
on public.events (team_id, event_date desc);

create index if not exists attendance_event_id_idx
on public.attendance (event_id);

create index if not exists attendance_member_id_idx
on public.attendance (member_id);

create index if not exists attendance_status_idx
on public.attendance (status);

create or replace function public.is_team_member(p_team_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.team_members tm
    where tm.team_id = p_team_id
      and tm.user_id = auth.uid()
  );
$$;

create or replace function public.is_team_admin(p_team_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.team_members tm
    where tm.team_id = p_team_id
      and tm.user_id = auth.uid()
      and tm.role = 'admin'
  );
$$;

create or replace function public.is_event_team_member(p_event_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.events e
    join public.team_members tm on tm.team_id = e.team_id
    where e.id = p_event_id
      and tm.user_id = auth.uid()
  );
$$;

create or replace function public.is_event_team_admin(p_event_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.events e
    join public.team_members tm on tm.team_id = e.team_id
    where e.id = p_event_id
      and tm.user_id = auth.uid()
      and tm.role = 'admin'
  );
$$;

create or replace function public.is_attendance_owner(p_member_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.team_members tm
    where tm.id = p_member_id
      and tm.user_id = auth.uid()
  );
$$;

create or replace function public.handle_new_team_admin_member()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.team_members (team_id, user_id, player_name, role)
  values (
    new.id,
    coalesce(new.created_by, new.user_id),
    coalesce(
      nullif(trim((auth.jwt() ->> 'email')), ''),
      'Team Admin'
    ),
    'admin'
  )
  on conflict do nothing;

  return new;
end;
$$;

drop trigger if exists on_team_created_create_admin_member on public.teams;
create trigger on_team_created_create_admin_member
after insert on public.teams
for each row execute function public.handle_new_team_admin_member();

create or replace function public.touch_attendance_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists attendance_touch_updated_at on public.attendance;
create trigger attendance_touch_updated_at
before update on public.attendance
for each row execute function public.touch_attendance_updated_at();

create or replace function public.ensure_attendance_member_matches_event_team()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  event_team_id uuid;
  member_team_id uuid;
begin
  select e.team_id into event_team_id
  from public.events e
  where e.id = new.event_id;

  select tm.team_id into member_team_id
  from public.team_members tm
  where tm.id = new.member_id;

  if event_team_id is null or member_team_id is null or event_team_id <> member_team_id then
    raise exception 'ATTENDANCE_MEMBER_TEAM_MISMATCH'
      using errcode = '23514';
  end if;

  return new;
end;
$$;

drop trigger if exists attendance_validate_member_team on public.attendance;
create trigger attendance_validate_member_team
before insert or update of event_id, member_id on public.attendance
for each row execute function public.ensure_attendance_member_matches_event_team();

create or replace function public.prevent_member_attendance_reassignment()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if public.is_event_team_admin(old.event_id) then
    return new;
  end if;

  if new.event_id <> old.event_id or new.member_id <> old.member_id then
    raise exception 'ATTENDANCE_MEMBER_CAN_ONLY_UPDATE_STATUS'
      using errcode = '42501';
  end if;

  return new;
end;
$$;

drop trigger if exists attendance_prevent_member_reassignment on public.attendance;
create trigger attendance_prevent_member_reassignment
before update on public.attendance
for each row execute function public.prevent_member_attendance_reassignment();

revoke all on function public.is_team_member(uuid) from public;
revoke all on function public.is_team_admin(uuid) from public;
revoke all on function public.is_event_team_member(uuid) from public;
revoke all on function public.is_event_team_admin(uuid) from public;
revoke all on function public.is_attendance_owner(uuid) from public;
grant execute on function public.is_team_member(uuid) to authenticated;
grant execute on function public.is_team_admin(uuid) to authenticated;
grant execute on function public.is_event_team_member(uuid) to authenticated;
grant execute on function public.is_event_team_admin(uuid) to authenticated;
grant execute on function public.is_attendance_owner(uuid) to authenticated;

alter table public.teams enable row level security;
alter table public.profiles enable row level security;
alter table public.team_members enable row level security;
alter table public.events enable row level security;
alter table public.attendance enable row level security;

drop policy if exists "Authenticated users can search profiles" on public.profiles;
create policy "Authenticated users can search profiles"
on public.profiles for select
to authenticated
using (true);

drop policy if exists "Team members can view teams" on public.teams;
create policy "Team members can view teams"
on public.teams for select
to authenticated
using (public.is_team_member(id));

drop policy if exists "Authenticated users can create their teams" on public.teams;
create policy "Authenticated users can create their teams"
on public.teams for insert
to authenticated
with check (created_by = auth.uid() or user_id = auth.uid());

drop policy if exists "Team admins can update teams" on public.teams;
create policy "Team admins can update teams"
on public.teams for update
to authenticated
using (public.is_team_admin(id))
with check (public.is_team_admin(id));

drop policy if exists "Team admins can delete teams" on public.teams;
create policy "Team admins can delete teams"
on public.teams for delete
to authenticated
using (public.is_team_admin(id));

drop policy if exists "Team members can view team members" on public.team_members;
create policy "Team members can view team members"
on public.team_members for select
to authenticated
using (public.is_team_member(team_id));

drop policy if exists "Team admins can add team members" on public.team_members;
create policy "Team admins can add team members"
on public.team_members for insert
to authenticated
with check (public.is_team_admin(team_id));

drop policy if exists "Team admins can update team members" on public.team_members;
create policy "Team admins can update team members"
on public.team_members for update
to authenticated
using (public.is_team_admin(team_id))
with check (public.is_team_admin(team_id));

drop policy if exists "Team admins can delete team members" on public.team_members;
create policy "Team admins can delete team members"
on public.team_members for delete
to authenticated
using (public.is_team_admin(team_id));

drop policy if exists "Team members can view events" on public.events;
create policy "Team members can view events"
on public.events for select
to authenticated
using (public.is_team_member(team_id));

drop policy if exists "Team admins can create events" on public.events;
create policy "Team admins can create events"
on public.events for insert
to authenticated
with check (public.is_team_admin(team_id));

drop policy if exists "Team admins can update events" on public.events;
create policy "Team admins can update events"
on public.events for update
to authenticated
using (public.is_team_admin(team_id))
with check (public.is_team_admin(team_id));

drop policy if exists "Team admins can delete events" on public.events;
create policy "Team admins can delete events"
on public.events for delete
to authenticated
using (public.is_team_admin(team_id));

drop policy if exists "Event team members can view attendance" on public.attendance;
create policy "Event team members can view attendance"
on public.attendance for select
to authenticated
using (public.is_event_team_member(event_id));

drop policy if exists "Event admins can create attendance" on public.attendance;
create policy "Event admins can create attendance"
on public.attendance for insert
to authenticated
with check (public.is_event_team_admin(event_id));

drop policy if exists "Members can update own attendance and admins can update all" on public.attendance;
create policy "Members can update own attendance and admins can update all"
on public.attendance for update
to authenticated
using (
  public.is_event_team_admin(event_id)
  or public.is_attendance_owner(member_id)
)
with check (
  public.is_event_team_admin(event_id)
  or public.is_attendance_owner(member_id)
);

drop policy if exists "Event admins can delete attendance" on public.attendance;
create policy "Event admins can delete attendance"
on public.attendance for delete
to authenticated
using (public.is_event_team_admin(event_id));

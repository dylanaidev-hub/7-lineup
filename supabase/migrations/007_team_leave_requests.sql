do $migration$
begin
  if not exists (
    select 1
    from pg_type type_record
    join pg_namespace namespace_record on namespace_record.oid = type_record.typnamespace
    where type_record.typname = 'team_leave_request_status'
      and namespace_record.nspname = 'public'
  ) then
    create type public.team_leave_request_status as enum ('pending', 'approved', 'declined');
  end if;
end;
$migration$;

create table if not exists public.team_leave_requests (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references public.teams(id) on delete cascade,
  member_id uuid references public.team_members(id) on delete set null,
  requested_by uuid not null references auth.users(id) on delete cascade,
  status public.team_leave_request_status not null default 'pending',
  reviewed_by uuid references auth.users(id) on delete set null,
  responded_at timestamptz,
  created_at timestamptz not null default now()
);

do $migration$
begin
  if exists (
    select 1
    from information_schema.table_constraints
    where table_schema = 'public'
      and table_name = 'team_leave_requests'
      and constraint_name = 'team_leave_requests_member_id_fkey'
  ) then
    alter table public.team_leave_requests
      drop constraint team_leave_requests_member_id_fkey;
  end if;

  alter table public.team_leave_requests
    add constraint team_leave_requests_member_id_fkey
    foreign key (member_id)
    references public.team_members(id)
    on delete set null;
exception
  when duplicate_object then null;
end;
$migration$;

create index if not exists team_leave_requests_team_id_idx on public.team_leave_requests(team_id);
create index if not exists team_leave_requests_requested_by_idx on public.team_leave_requests(requested_by);
create index if not exists team_leave_requests_member_id_idx on public.team_leave_requests(member_id);
create index if not exists team_leave_requests_status_idx on public.team_leave_requests(status);
create unique index if not exists team_leave_requests_pending_member_unique_idx
  on public.team_leave_requests(member_id)
  where status = 'pending' and member_id is not null;

alter table public.team_leave_requests enable row level security;
alter table public.team_leave_requests replica identity full;

grant usage on type public.team_leave_request_status to authenticated;
grant select, insert, update, delete on public.team_leave_requests to authenticated;

drop policy if exists "Team admins and requesters can view leave requests" on public.team_leave_requests;
create policy "Team admins and requesters can view leave requests"
  on public.team_leave_requests for select
  using (
    requested_by = auth.uid()
    or public.is_team_admin(team_id)
  );

drop policy if exists "Members can create their own leave requests" on public.team_leave_requests;
create policy "Members can create their own leave requests"
  on public.team_leave_requests for insert
  with check (
    requested_by = auth.uid()
    and public.is_team_member(team_id)
  );

drop policy if exists "Team admins can manage leave requests" on public.team_leave_requests;
create policy "Team admins can manage leave requests"
  on public.team_leave_requests for update
  using (public.is_team_admin(team_id))
  with check (public.is_team_admin(team_id));

create or replace function public.create_team_leave_request(p_team_id uuid)
returns public.team_leave_requests
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  member_record public.team_members%rowtype;
  request_record public.team_leave_requests%rowtype;
begin
  select *
  into member_record
  from public.team_members
  where team_id = p_team_id
    and user_id = auth.uid()
  limit 1;

  if not found then
    raise exception 'TEAM_LEAVE_NOT_MEMBER';
  end if;

  if member_record.role = 'admin' then
    raise exception 'TEAM_ADMIN_CANNOT_LEAVE_BY_REQUEST';
  end if;

  select *
  into request_record
  from public.team_leave_requests
  where member_id = member_record.id
    and status = 'pending'
  limit 1;

  if found then
    raise exception 'TEAM_LEAVE_REQUEST_ALREADY_PENDING';
  end if;

  insert into public.team_leave_requests (team_id, member_id, requested_by)
  values (p_team_id, member_record.id, auth.uid());

  select *
  into request_record
  from public.team_leave_requests
  where member_id = member_record.id
    and status = 'pending'
  order by created_at desc
  limit 1;

  return request_record;
end;
$$;

create or replace function public.approve_team_leave_request(p_request_id uuid)
returns public.team_leave_requests
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  request_record public.team_leave_requests%rowtype;
  target_member_id uuid;
begin
  select *
  into request_record
  from public.team_leave_requests
  where id = p_request_id
    and status = 'pending'
  for update;

  if not found then
    raise exception 'TEAM_LEAVE_REQUEST_INVALID';
  end if;

  if not public.is_team_admin(request_record.team_id) then
    raise exception 'TEAM_LEAVE_NOT_ADMIN';
  end if;

  target_member_id := request_record.member_id;

  update public.team_leave_requests
  set status = 'approved',
      reviewed_by = auth.uid(),
      responded_at = now()
  where id = p_request_id;

  delete from public.team_members
  where id = target_member_id;

  select *
  into request_record
  from public.team_leave_requests
  where id = p_request_id;

  request_record.member_id := target_member_id;

  return request_record;
end;
$$;

create or replace function public.decline_team_leave_request(p_request_id uuid)
returns public.team_leave_requests
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  request_record public.team_leave_requests%rowtype;
begin
  select *
  into request_record
  from public.team_leave_requests
  where id = p_request_id
    and status = 'pending'
  for update;

  if not found then
    raise exception 'TEAM_LEAVE_REQUEST_INVALID';
  end if;

  if not public.is_team_admin(request_record.team_id) then
    raise exception 'TEAM_LEAVE_NOT_ADMIN';
  end if;

  update public.team_leave_requests
  set status = 'declined',
      reviewed_by = auth.uid(),
      responded_at = now()
  where id = p_request_id;

  select *
  into request_record
  from public.team_leave_requests
  where id = p_request_id;

  return request_record;
end;
$$;

do $migration$
begin
  if exists (
    select 1
    from pg_publication
    where pubname = 'supabase_realtime'
  ) then
    begin
      alter publication supabase_realtime add table public.team_leave_requests;
    exception
      when duplicate_object then null;
    end;
  end if;
end;
$migration$;

grant execute on function public.create_team_leave_request(uuid) to authenticated;
grant execute on function public.approve_team_leave_request(uuid) to authenticated;
grant execute on function public.decline_team_leave_request(uuid) to authenticated;

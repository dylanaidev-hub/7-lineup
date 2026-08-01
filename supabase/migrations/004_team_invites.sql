do $migration$
begin
  if not exists (
    select 1
    from pg_type type_record
    join pg_namespace namespace_record on namespace_record.oid = type_record.typnamespace
    where type_record.typname = 'team_invite_status'
      and namespace_record.nspname = 'public'
  ) then
    create type public.team_invite_status as enum ('pending', 'accepted', 'declined', 'expired');
  end if;
end;
$migration$;

create table if not exists public.team_invites (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references public.teams(id) on delete cascade,
  invited_user_id uuid not null references auth.users(id) on delete cascade,
  invited_by uuid not null references auth.users(id) on delete cascade,
  role public.team_member_role not null default 'player',
  status public.team_invite_status not null default 'pending',
  expires_at timestamptz not null default (now() + interval '7 days'),
  responded_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists team_invites_team_id_idx on public.team_invites(team_id);
create index if not exists team_invites_invited_user_id_idx on public.team_invites(invited_user_id);
create index if not exists team_invites_status_idx on public.team_invites(status);
create unique index if not exists team_invites_pending_unique_idx
  on public.team_invites(team_id, invited_user_id)
  where status = 'pending';

alter table public.team_invites enable row level security;

grant usage on type public.team_invite_status to authenticated;
grant select, insert, update, delete on public.team_invites to authenticated;

drop policy if exists "Team members can view team invites" on public.team_invites;
create policy "Team members can view team invites"
  on public.team_invites for select
  using (
    invited_user_id = auth.uid()
    or public.is_team_admin(team_id)
  );

drop policy if exists "Team admins can create team invites" on public.team_invites;
create policy "Team admins can create team invites"
  on public.team_invites for insert
  with check (
    public.is_team_admin(team_id)
    and invited_by = auth.uid()
    and role in ('admin', 'player')
  );

drop policy if exists "Team admins can manage team invites" on public.team_invites;
create policy "Team admins can manage team invites"
  on public.team_invites for update
  using (public.is_team_admin(team_id))
  with check (public.is_team_admin(team_id));

drop policy if exists "Invited users can update their own invites" on public.team_invites;
create policy "Invited users can update their own invites"
  on public.team_invites for update
  using (invited_user_id = auth.uid())
  with check (invited_user_id = auth.uid());

drop policy if exists "Team admins can delete team invites" on public.team_invites;
create policy "Team admins can delete team invites"
  on public.team_invites for delete
  using (public.is_team_admin(team_id));

create or replace function public.accept_team_invite(p_invite_id uuid)
returns public.team_members
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  invite_record public.team_invites%rowtype;
  existing_member public.team_members%rowtype;
  accepted_member public.team_members%rowtype;
  display_name text;
begin
  select *
  into invite_record
  from public.team_invites
  where id = p_invite_id
    and invited_user_id = auth.uid()
    and status = 'pending'
  for update;

  if not found then
    raise exception 'PLAYER_INVITE_INVALID';
  end if;

  if invite_record.expires_at <= now() then
    update public.team_invites
    set status = 'expired', responded_at = now()
    where id = p_invite_id;
    raise exception 'PLAYER_INVITE_EXPIRED';
  end if;

  select *
  into existing_member
  from public.team_members
  where team_id = invite_record.team_id
    and user_id = auth.uid()
  limit 1;

  if found then
    update public.team_invites
    set status = 'accepted', responded_at = now()
    where id = p_invite_id;
    raise exception 'PLAYER_ALREADY_MEMBER';
  end if;

  select coalesce(
    nullif(p.full_name, ''),
    nullif(p.username, ''),
    split_part(u.email, '@', 1),
    'Player'
  )
  into display_name
  from auth.users u
  left join public.profiles p on p.id = u.id
  where u.id = auth.uid();

  insert into public.team_members (team_id, user_id, player_name, role)
  values (invite_record.team_id, auth.uid(), display_name, invite_record.role)
  returning * into accepted_member;

  update public.team_invites
  set status = 'accepted', responded_at = now()
  where id = p_invite_id;

  return accepted_member;
end;
$$;

create or replace function public.send_team_invite(
  p_team_id uuid,
  p_invited_user_id uuid,
  p_role public.team_member_role default 'player'
)
returns public.team_invites
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  invite_record public.team_invites%rowtype;
begin
  if p_role not in ('admin', 'player') then
    raise exception 'INVALID_TEAM_ROLE';
  end if;

  if not public.is_team_admin(p_team_id) then
    raise exception 'TEAM_INVITE_NOT_ADMIN';
  end if;

  if exists (
    select 1
    from public.team_members tm
    where tm.team_id = p_team_id
      and tm.user_id = p_invited_user_id
  ) then
    raise exception 'TEAM_MEMBER_ALREADY_EXISTS';
  end if;

  select *
  into invite_record
  from public.team_invites ti
  where ti.team_id = p_team_id
    and ti.invited_user_id = p_invited_user_id
    and ti.status = 'pending'
  limit 1;

  if found then
    raise exception 'TEAM_INVITE_ALREADY_PENDING';
  end if;

  insert into public.team_invites (team_id, invited_user_id, invited_by, role)
  values (p_team_id, p_invited_user_id, auth.uid(), p_role)
  returning * into invite_record;

  return invite_record;
end;
$$;

create or replace function public.decline_team_invite(p_invite_id uuid)
returns public.team_invites
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  invite_record public.team_invites%rowtype;
begin
  select *
  into invite_record
  from public.team_invites
  where id = p_invite_id
    and invited_user_id = auth.uid()
    and status = 'pending'
  for update;

  if not found then
    raise exception 'PLAYER_INVITE_INVALID';
  end if;

  if invite_record.expires_at <= now() then
    update public.team_invites
    set status = 'expired', responded_at = now()
    where id = p_invite_id;
    raise exception 'PLAYER_INVITE_EXPIRED';
  end if;

  update public.team_invites
  set status = 'declined', responded_at = now()
  where id = p_invite_id
  returning * into invite_record;

  return invite_record;
end;
$$;

grant execute on function public.accept_team_invite(uuid) to authenticated;
grant execute on function public.send_team_invite(uuid, uuid, public.team_member_role) to authenticated;
grant execute on function public.decline_team_invite(uuid) to authenticated;

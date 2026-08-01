-- =====================================================================
-- Team Join Links
-- Allows team admins to create shareable invite links/QR codes and lets
-- authenticated players join a team from a secure token.
-- =====================================================================

create table if not exists public.team_join_links (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references public.teams(id) on delete cascade,
  created_by uuid not null references auth.users(id) on delete cascade,
  token text not null unique,
  role public.team_member_role not null default 'player',
  expires_at timestamptz not null default (now() + interval '30 days'),
  max_uses integer,
  used_count integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  constraint team_join_links_token_not_empty check (length(trim(token)) > 0),
  constraint team_join_links_used_count_non_negative check (used_count >= 0),
  constraint team_join_links_max_uses_positive check (max_uses is null or max_uses > 0),
  constraint team_join_links_role_allowed check (role in ('admin', 'player'))
);

create index if not exists team_join_links_team_id_idx on public.team_join_links(team_id);
create index if not exists team_join_links_created_by_idx on public.team_join_links(created_by);
create index if not exists team_join_links_token_idx on public.team_join_links(token);
create index if not exists team_join_links_active_idx on public.team_join_links(is_active, expires_at);

alter table public.team_join_links enable row level security;

grant select, insert, update, delete on public.team_join_links to authenticated;

drop policy if exists "Team admins can view team join links" on public.team_join_links;
create policy "Team admins can view team join links"
  on public.team_join_links for select
  to authenticated
  using (public.is_team_admin(team_id));

drop policy if exists "Team admins can create team join links" on public.team_join_links;
create policy "Team admins can create team join links"
  on public.team_join_links for insert
  to authenticated
  with check (
    public.is_team_admin(team_id)
    and created_by = auth.uid()
    and role in ('admin', 'player')
  );

drop policy if exists "Team admins can update team join links" on public.team_join_links;
create policy "Team admins can update team join links"
  on public.team_join_links for update
  to authenticated
  using (public.is_team_admin(team_id))
  with check (public.is_team_admin(team_id));

drop policy if exists "Team admins can delete team join links" on public.team_join_links;
create policy "Team admins can delete team join links"
  on public.team_join_links for delete
  to authenticated
  using (public.is_team_admin(team_id));

create or replace function public.create_team_join_link(
  p_team_id uuid,
  p_expires_in_days integer default 30,
  p_max_uses integer default null
)
returns public.team_join_links
language plpgsql
security definer
set search_path = public, auth, extensions
as $$
declare
  link_record public.team_join_links%rowtype;
  generated_token text;
  normalized_days integer;
begin
  if not public.is_team_admin(p_team_id) then
    raise exception 'TEAM_JOIN_LINK_NOT_ADMIN';
  end if;

  normalized_days := greatest(1, least(coalesce(p_expires_in_days, 30), 365));

  loop
    generated_token := replace(replace(rtrim(encode(extensions.gen_random_bytes(18), 'base64'), '='), '+', '-'), '/', '_');
    exit when not exists (
      select 1
      from public.team_join_links
      where token = generated_token
    );
  end loop;

  insert into public.team_join_links (team_id, created_by, token, expires_at, max_uses)
  values (p_team_id, auth.uid(), generated_token, now() + (normalized_days || ' days')::interval, p_max_uses)
  returning * into link_record;

  return link_record;
end;
$$;

create or replace function public.get_team_join_link(p_token text)
returns table (
  id uuid,
  team_id uuid,
  team_name text,
  logo_url text,
  expires_at timestamptz,
  max_uses integer,
  used_count integer,
  is_active boolean
)
language sql
stable
security definer
set search_path = public
as $$
  select
    link.id,
    link.team_id,
    team.name as team_name,
    team.logo_url,
    link.expires_at,
    link.max_uses,
    link.used_count,
    link.is_active
  from public.team_join_links link
  join public.teams team on team.id = link.team_id
  where link.token = p_token
  limit 1;
$$;

create or replace function public.create_team_join_link(p_team_id uuid)
returns public.team_join_links
language sql
security definer
set search_path = public, auth
as $$
  select public.create_team_join_link(p_team_id, 30, null);
$$;

create or replace function public.join_team_by_link(p_token text)
returns public.team_members
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  link_record public.team_join_links%rowtype;
  existing_member public.team_members%rowtype;
  joined_member public.team_members%rowtype;
  display_name text;
begin
  if auth.uid() is null then
    raise exception 'TEAM_JOIN_AUTH_REQUIRED';
  end if;

  select *
  into link_record
  from public.team_join_links
  where token = p_token
  for update;

  if not found or not link_record.is_active then
    raise exception 'TEAM_JOIN_LINK_INVALID';
  end if;

  if link_record.expires_at <= now() then
    update public.team_join_links
    set is_active = false
    where id = link_record.id;
    raise exception 'TEAM_JOIN_LINK_EXPIRED';
  end if;

  if link_record.max_uses is not null and link_record.used_count >= link_record.max_uses then
    raise exception 'TEAM_JOIN_LINK_LIMIT_REACHED';
  end if;

  select *
  into existing_member
  from public.team_members
  where team_id = link_record.team_id
    and user_id = auth.uid()
  limit 1;

  if found then
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
  values (link_record.team_id, auth.uid(), display_name, link_record.role)
  returning * into joined_member;

  update public.team_join_links
  set used_count = used_count + 1
  where id = link_record.id;

  return joined_member;
end;
$$;

grant execute on function public.create_team_join_link(uuid, integer, integer) to authenticated;
grant execute on function public.create_team_join_link(uuid) to authenticated;
grant execute on function public.get_team_join_link(text) to anon, authenticated;
grant execute on function public.join_team_by_link(text) to authenticated;

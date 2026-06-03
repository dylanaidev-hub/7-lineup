create table if not exists public.teams (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  name text not null,
  logo_url text,
  logo_icon text,
  shirt_color text not null default '#f8fafc',
  shorts_color text not null default '#111827',
  socks_color text not null default '#dc2626',
  slogan text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.teams drop constraint if exists teams_user_id_unique;
alter table public.teams enable row level security;

create table if not exists public.team_members (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references public.teams(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  jersey_number integer not null,
  nickname text not null,
  position text not null default 'MF' check (position in ('GK', 'DF', 'MF', 'FW')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.team_members enable row level security;

create table if not exists public.team_invitations (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references public.teams(id) on delete cascade,
  invited_user_id uuid not null references public.profiles(id) on delete cascade,
  invited_by uuid not null references public.profiles(id) on delete cascade,
  status text not null default 'pending' check (status in ('pending', 'accepted', 'declined')),
  jersey_number integer not null,
  nickname text not null,
  position text not null default 'MF' check (position in ('GK', 'DF', 'MF', 'FW')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.team_invitations enable row level security;
alter table public.team_members replica identity full;
alter table public.team_invitations replica identity full;

do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime')
    and not exists (
      select 1
      from pg_publication_tables
      where pubname = 'supabase_realtime'
        and schemaname = 'public'
        and tablename = 'team_members'
    ) then
    alter publication supabase_realtime add table public.team_members;
  end if;
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime')
    and not exists (
      select 1
      from pg_publication_tables
      where pubname = 'supabase_realtime'
        and schemaname = 'public'
        and tablename = 'team_invitations'
    ) then
    alter publication supabase_realtime add table public.team_invitations;
  end if;
end $$;

create or replace function public.is_team_owner(p_team_id uuid)
returns boolean
language sql
security definer
set search_path = public
as 'select exists (select 1 from public.teams where id = p_team_id and user_id = auth.uid())';

create or replace function public.is_team_member(p_team_id uuid)
returns boolean
language sql
security definer
set search_path = public
as 'select exists (select 1 from public.team_members where team_id = p_team_id and user_id = auth.uid())';

create or replace function public.is_team_invited(p_team_id uuid)
returns boolean
language sql
security definer
set search_path = public
as 'select exists (select 1 from public.team_invitations where team_id = p_team_id and invited_user_id = auth.uid() and status = ''pending'')';

grant execute on function public.is_team_owner(uuid) to anon, authenticated;
grant execute on function public.is_team_member(uuid) to anon, authenticated;
grant execute on function public.is_team_invited(uuid) to anon, authenticated;

drop policy if exists "Users can view their teams" on public.teams;
create policy "Users can view their teams"
on public.teams for select
using (
  auth.uid() = user_id
  or public.is_team_member(id)
  or public.is_team_invited(id)
  or auth.role() = 'authenticated'
);

drop policy if exists "Users can insert their teams" on public.teams;
create policy "Users can insert their teams"
on public.teams for insert
with check (auth.uid() = user_id);

drop policy if exists "Users can update their teams" on public.teams;
create policy "Users can update their teams"
on public.teams for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "Users can delete their teams" on public.teams;
create policy "Users can delete their teams"
on public.teams for delete
using (auth.uid() = user_id);

drop policy if exists "Users can view their team members" on public.team_members;
create policy "Users can view their team members"
on public.team_members for select
using (
  auth.uid() = user_id
  or public.is_team_owner(team_id)
  or public.is_team_member(team_id)
);

drop policy if exists "Users can insert their team members" on public.team_members;
create policy "Users can insert their team members"
on public.team_members for insert
with check (
  public.is_team_owner(team_id)
  or auth.uid() = user_id
  or (
    auth.uid() = user_id
    and exists (
      select 1
      from public.team_invitations
      where team_id = team_members.team_id
        and invited_user_id = auth.uid()
        and status in ('pending', 'accepted')
    )
  )
);

drop policy if exists "Users can update their team members" on public.team_members;
create policy "Users can update their team members"
on public.team_members for update
using (public.is_team_owner(team_id))
with check (public.is_team_owner(team_id));

drop policy if exists "Users can delete their team members" on public.team_members;
create policy "Users can delete their team members"
on public.team_members for delete
using (public.is_team_owner(team_id));

drop policy if exists "Users can view their team invitations" on public.team_invitations;
create policy "Users can view their team invitations"
on public.team_invitations for select
using (
  auth.uid() = invited_user_id
  or public.is_team_owner(team_id)
);

drop policy if exists "Team owners can invite members" on public.team_invitations;
create policy "Team owners can invite members"
on public.team_invitations for insert
with check (
  auth.uid() = invited_by
  and public.is_team_owner(team_id)
);

drop policy if exists "Invited users can respond to invitations" on public.team_invitations;
create policy "Invited users can respond to invitations"
on public.team_invitations for update
using (auth.uid() = invited_user_id)
with check (auth.uid() = invited_user_id);

insert into storage.buckets (id, name, public)
values ('team-logos', 'team-logos', true)
on conflict (id) do update set public = true;

drop policy if exists "Team logos are publicly readable" on storage.objects;
create policy "Team logos are publicly readable"
on storage.objects for select
using (bucket_id = 'team-logos');

drop policy if exists "Users can upload their own team logos" on storage.objects;
create policy "Users can upload their own team logos"
on storage.objects for insert
with check (
  bucket_id = 'team-logos'
  and auth.uid()::text = (storage.foldername(name))[1]
);

drop policy if exists "Users can update their own team logos" on storage.objects;
create policy "Users can update their own team logos"
on storage.objects for update
using (
  bucket_id = 'team-logos'
  and auth.uid()::text = (storage.foldername(name))[1]
)
with check (
  bucket_id = 'team-logos'
  and auth.uid()::text = (storage.foldername(name))[1]
);

drop policy if exists "Users can delete their own team logos" on storage.objects;
create policy "Users can delete their own team logos"
on storage.objects for delete
using (
  bucket_id = 'team-logos'
  and auth.uid()::text = (storage.foldername(name))[1]
);

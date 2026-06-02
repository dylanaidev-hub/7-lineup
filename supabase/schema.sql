create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text,
  avatar_url text,
  created_at timestamptz not null default now()
);

-- Extra profile fields (run these even on existing databases; they are idempotent).
alter table public.profiles add column if not exists full_name text;
alter table public.profiles add column if not exists bio text;
alter table public.profiles add column if not exists favorite_team text;
alter table public.profiles add column if not exists favorite_position text;
alter table public.profiles add column if not exists location text;
alter table public.profiles add column if not exists updated_at timestamptz not null default now();

create table if not exists public.lineups (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  name text not null,
  format text not null,
  players_data jsonb not null,
  created_at timestamptz not null default now()
);

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

alter table public.profiles enable row level security;
alter table public.lineups enable row level security;
alter table public.teams enable row level security;
alter table public.team_members enable row level security;

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

grant execute on function public.is_team_owner(uuid) to anon, authenticated;
grant execute on function public.is_team_member(uuid) to anon, authenticated;

create policy "Users can view their profile"
on public.profiles for select
using (auth.uid() = id);

create policy "Users can insert their profile"
on public.profiles for insert
with check (auth.uid() = id);

create policy "Users can update their profile"
on public.profiles for update
using (auth.uid() = id)
with check (auth.uid() = id);

create policy "Users can view their lineups"
on public.lineups for select
using (auth.uid() = user_id);

create policy "Users can insert their lineups"
on public.lineups for insert
with check (auth.uid() = user_id);

create policy "Users can update their lineups"
on public.lineups for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create policy "Users can delete their lineups"
on public.lineups for delete
using (auth.uid() = user_id);

drop policy if exists "Users can view their teams" on public.teams;
create policy "Users can view their teams"
on public.teams for select
using (
  auth.uid() = user_id
  or public.is_team_member(id)
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
);

drop policy if exists "Users can insert their team members" on public.team_members;
create policy "Users can insert their team members"
on public.team_members for insert
with check (public.is_team_owner(team_id));

drop policy if exists "Users can update their team members" on public.team_members;
create policy "Users can update their team members"
on public.team_members for update
using (public.is_team_owner(team_id))
with check (public.is_team_owner(team_id));

drop policy if exists "Users can delete their team members" on public.team_members;
create policy "Users can delete their team members"
on public.team_members for delete
using (public.is_team_owner(team_id));

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, username, avatar_url)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'username', split_part(new.email, '@', 1)),
    new.raw_user_meta_data->>'avatar_url'
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

-- Returns which auth providers an email is registered with, so the client can
-- guide users to the correct sign-in method (e.g. Google accounts have no password).
-- SECURITY DEFINER lets the anon role read auth.identities indirectly. This does
-- expose whether an email exists (user enumeration); that is an intentional trade-off
-- for the "use Google instead" UX.
create or replace function public.email_auth_providers(p_email text)
returns jsonb
language plpgsql
security definer set search_path = public
as $$
declare
  v_email text := lower(trim(p_email));
  result jsonb;
begin
  select jsonb_build_object(
    'account_exists', count(*) > 0,
    'has_password', coalesce(bool_or(i.provider = 'email'), false),
    'has_google', coalesce(bool_or(i.provider = 'google'), false)
  )
  into result
  from auth.identities i
  where lower(coalesce(i.email, i.identity_data->>'email')) = v_email;

  return result;
end;
$$;

revoke all on function public.email_auth_providers(text) from public;
grant execute on function public.email_auth_providers(text) to anon, authenticated;

-- Prevent a single account from mixing email/password and Google sign-in.
-- Fires when Supabase tries to attach a second, different provider to the same
-- user (e.g. signing in with Google on an email that already has a password).
create or replace function public.prevent_mixed_identities()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare
  v_other text;
begin
  if new.provider not in ('email', 'google') then
    return new;
  end if;

  select i.provider
  into v_other
  from auth.identities i
  where i.user_id = new.user_id
    and i.provider <> new.provider
    and i.provider in ('email', 'google')
  limit 1;

  if v_other is not null then
    raise exception 'EMAIL_PROVIDER_CONFLICT: account already uses % sign-in', v_other
      using errcode = 'P0001';
  end if;

  return new;
end;
$$;

drop trigger if exists prevent_mixed_identities_trigger on auth.identities;
create trigger prevent_mixed_identities_trigger
before insert on auth.identities
for each row execute function public.prevent_mixed_identities();

-- =====================================================================
-- Avatar storage. A public bucket so avatar URLs can be rendered without
-- signed URLs; users may only write inside a folder named after their uid.
-- =====================================================================
insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true)
on conflict (id) do update set public = true;

drop policy if exists "Avatar images are publicly readable" on storage.objects;
create policy "Avatar images are publicly readable"
on storage.objects for select
using (bucket_id = 'avatars');

drop policy if exists "Users can upload their own avatar" on storage.objects;
create policy "Users can upload their own avatar"
on storage.objects for insert
with check (
  bucket_id = 'avatars'
  and auth.uid()::text = (storage.foldername(name))[1]
);

drop policy if exists "Users can update their own avatar" on storage.objects;
create policy "Users can update their own avatar"
on storage.objects for update
using (
  bucket_id = 'avatars'
  and auth.uid()::text = (storage.foldername(name))[1]
)
with check (
  bucket_id = 'avatars'
  and auth.uid()::text = (storage.foldername(name))[1]
);

drop policy if exists "Users can delete their own avatar" on storage.objects;
create policy "Users can delete their own avatar"
on storage.objects for delete
using (
  bucket_id = 'avatars'
  and auth.uid()::text = (storage.foldername(name))[1]
);

-- =====================================================================
-- Team logos. Public bucket, with writes scoped to the user's folder.
-- =====================================================================
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


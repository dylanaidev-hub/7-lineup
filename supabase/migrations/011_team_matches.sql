-- Team match / training schedule

do $$
begin
  create type public.team_match_type as enum ('match', 'training');
exception
  when duplicate_object then null;
end;
$$;

create table if not exists public.team_matches (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references public.teams(id) on delete cascade,
  title text not null check (length(trim(title)) > 0),
  match_type public.team_match_type not null default 'match',
  location text,
  starts_at timestamptz not null,
  notes text,
  created_by uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

create index if not exists team_matches_team_starts_at_idx
on public.team_matches (team_id, starts_at);

alter table public.team_matches enable row level security;

drop policy if exists "Team members can view team matches" on public.team_matches;
create policy "Team members can view team matches"
on public.team_matches for select
to authenticated
using (public.is_team_member(team_id));

drop policy if exists "Team admins can insert team matches" on public.team_matches;
create policy "Team admins can insert team matches"
on public.team_matches for insert
to authenticated
with check (public.is_team_admin(team_id) and created_by = auth.uid());

drop policy if exists "Team admins can update team matches" on public.team_matches;
create policy "Team admins can update team matches"
on public.team_matches for update
to authenticated
using (public.is_team_admin(team_id))
with check (public.is_team_admin(team_id));

drop policy if exists "Team admins can delete team matches" on public.team_matches;
create policy "Team admins can delete team matches"
on public.team_matches for delete
to authenticated
using (public.is_team_admin(team_id));

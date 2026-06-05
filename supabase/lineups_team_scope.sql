alter table public.lineups
add column if not exists team_id uuid references public.teams(id) on delete cascade;

drop policy if exists "Users can view their lineups" on public.lineups;
create policy "Users can view their lineups"
on public.lineups for select
using (
  auth.uid() = user_id
  or (team_id is not null and (public.is_team_owner(team_id) or public.is_team_member(team_id)))
);

drop policy if exists "Users can insert their lineups" on public.lineups;
create policy "Users can insert their lineups"
on public.lineups for insert
with check (
  auth.uid() = user_id
  and (team_id is null or public.is_team_owner(team_id))
);

drop policy if exists "Users can update their lineups" on public.lineups;
create policy "Users can update their lineups"
on public.lineups for update
using (auth.uid() = user_id or (team_id is not null and public.is_team_owner(team_id)))
with check (
  auth.uid() = user_id
  and (team_id is null or public.is_team_owner(team_id))
);

drop policy if exists "Users can delete their lineups" on public.lineups;
create policy "Users can delete their lineups"
on public.lineups for delete
using (auth.uid() = user_id or (team_id is not null and public.is_team_owner(team_id)));

create or replace function public.resolve_profile_short_id(p_short_id text)
returns uuid
language sql
security definer
set search_path = public
as $$
  with matches as (
    select id
    from public.profiles
    where replace(id::text, '-', '') ilike regexp_replace(lower(coalesce(p_short_id, '')), '[^a-f0-9]', '', 'g') || '%'
    limit 2
  )
  select case
    when (select count(*) from matches) = 1 then (select id from matches limit 1)
    else null::uuid
  end;
$$;

grant execute on function public.resolve_profile_short_id(text) to authenticated;

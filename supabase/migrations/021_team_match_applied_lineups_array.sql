-- Multiple applied lineups per match

alter table public.team_matches
  add column if not exists applied_lineups jsonb not null default '[]'::jsonb;

comment on column public.team_matches.applied_lineups is 'Array of denormalized lineup snapshots applied to this match';

-- Migrate legacy single snapshot into array
update public.team_matches
set applied_lineups = jsonb_build_array(lineup_snapshot)
where lineup_snapshot is not null
  and applied_lineups = '[]'::jsonb;

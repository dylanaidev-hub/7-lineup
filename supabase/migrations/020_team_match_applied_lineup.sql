-- Applied lineup for team matches (admin selects from saved lineup library)

alter table public.team_matches
  add column if not exists lineup_id uuid references public.lineups(id) on delete set null;

alter table public.team_matches
  add column if not exists lineup_snapshot jsonb;

comment on column public.team_matches.lineup_id is 'Reference to admin saved lineup in locker room';
comment on column public.team_matches.lineup_snapshot is 'Denormalized lineup data for team member visibility';

create index if not exists team_matches_lineup_id_idx
on public.team_matches (lineup_id)
where lineup_id is not null;

-- Prevent duplicate kickoff times within the same team

create unique index if not exists team_matches_team_starts_at_unique_idx
on public.team_matches (team_id, starts_at);

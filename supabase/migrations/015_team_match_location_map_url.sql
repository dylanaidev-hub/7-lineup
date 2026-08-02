-- Optional Google Maps link for match location

alter table public.team_matches
add column if not exists location_map_url text;

comment on column public.team_matches.location_map_url is 'Optional Google Maps URL for directions to the venue';

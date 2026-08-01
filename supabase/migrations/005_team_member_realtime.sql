alter table public.team_members replica identity full;

do $migration$
begin
  if exists (
    select 1
    from pg_publication
    where pubname = 'supabase_realtime'
  ) then
    begin
      alter publication supabase_realtime add table public.team_members;
    exception
      when duplicate_object then null;
    end;
  end if;
end;
$migration$;

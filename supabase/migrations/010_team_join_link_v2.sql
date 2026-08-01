-- =====================================================================
-- Team Join Link RPC v2
-- Uses a non-overloaded function name so Supabase/PostgREST resolves the
-- invite-link RPC reliably even if older create_team_join_link overloads
-- still exist in the database.
--
-- Run this file in Supabase SQL Editor after 008_team_join_links.sql.
-- =====================================================================

create extension if not exists pgcrypto;

create or replace function public.create_team_join_link_v2(
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
  if auth.uid() is null then
    raise exception 'TEAM_JOIN_AUTH_REQUIRED';
  end if;

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
  values (
    p_team_id,
    auth.uid(),
    generated_token,
    now() + (normalized_days || ' days')::interval,
    p_max_uses
  )
  returning * into link_record;

  return link_record;
end;
$$;

grant execute on function public.create_team_join_link_v2(uuid, integer, integer) to authenticated;

notify pgrst, 'reload schema';

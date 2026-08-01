-- =====================================================================
-- Team Management: user omnibar search
-- Allows team admins to search existing accounts by profile name or email.
-- The function exposes only reduced profile data and a masked email.
-- =====================================================================

create or replace function public.mask_user_email(p_email text)
returns text
language sql
immutable
as $$
  select case
    when p_email is null or position('@' in p_email) = 0 then null
    when length(split_part(p_email, '@', 1)) <= 1 then '*@' || split_part(p_email, '@', 2)
    else left(split_part(p_email, '@', 1), 1) || repeat('*', greatest(length(split_part(p_email, '@', 1)) - 1, 1)) || '@' || split_part(p_email, '@', 2)
  end
$$;

create or replace function public.search_users_for_team(search_term text)
returns table (
  user_id uuid,
  name text,
  avatar_url text,
  email text
)
language sql
security definer
set search_path = public, auth
as $$
  select
    u.id as user_id,
    nullif(trim(coalesce(p.full_name, p.username, u.raw_user_meta_data ->> 'full_name', u.raw_user_meta_data ->> 'name')), '') as name,
    p.avatar_url,
    public.mask_user_email(u.email) as email
  from auth.users u
  left join public.profiles p on p.id = u.id
  where auth.uid() is not null
    and length(trim(coalesce(search_term, ''))) >= 2
    and (
      coalesce(p.full_name, '') ilike '%' || trim(search_term) || '%'
      or coalesce(p.username, '') ilike '%' || trim(search_term) || '%'
      or coalesce(u.email, '') ilike '%' || trim(search_term) || '%'
      or coalesce(u.raw_user_meta_data ->> 'full_name', '') ilike '%' || trim(search_term) || '%'
      or coalesce(u.raw_user_meta_data ->> 'name', '') ilike '%' || trim(search_term) || '%'
    )
  order by
    case
      when coalesce(p.full_name, p.username, u.email, '') ilike trim(search_term) || '%' then 0
      else 1
    end,
    coalesce(p.full_name, p.username, u.email)
  limit 8
$$;

revoke all on function public.mask_user_email(text) from public;
revoke all on function public.search_users_for_team(text) from public;
grant execute on function public.search_users_for_team(text) to authenticated;

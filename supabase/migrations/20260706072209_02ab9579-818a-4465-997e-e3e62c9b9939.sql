create or replace function public.get_user_id_by_email(p_email text)
returns table(id uuid)
language sql
security definer
set search_path = public
as $$
  select u.id from auth.users u where lower(u.email) = lower(p_email) limit 1
$$;
revoke all on function public.get_user_id_by_email(text) from public, anon, authenticated;
grant execute on function public.get_user_id_by_email(text) to service_role;
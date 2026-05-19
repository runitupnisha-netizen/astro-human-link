-- 1) Drop overly-broad realtime SELECT on messages (match-scoped policy still applies)
DROP POLICY IF EXISTS "authenticated_only_realtime" ON public.messages;

-- 2) Revoke sensitive profile columns from anon/authenticated
REVOKE SELECT (
  phone,
  current_latitude,
  current_longitude,
  is_suspended,
  boost_until,
  bonus_pro_until,
  referred_by_code,
  referral_redeemed_at,
  briefing_reminder_timezone,
  briefing_reminder_hour,
  briefing_push_reminder,
  briefing_email_reminder,
  briefing_last_reminder_date
) ON public.profiles FROM anon, authenticated;

-- 3) Owner-only RPC to fetch the full profile (bypasses column grants safely)
CREATE OR REPLACE FUNCTION public.get_my_full_profile()
RETURNS SETOF public.profiles
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT * FROM public.profiles WHERE user_id = auth.uid();
$$;

REVOKE EXECUTE ON FUNCTION public.get_my_full_profile() FROM anon;
GRANT EXECUTE ON FUNCTION public.get_my_full_profile() TO authenticated;
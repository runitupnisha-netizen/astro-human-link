GRANT SELECT (
  boost_until, bonus_pro_until, referred_by_code, referral_redeemed_at,
  briefing_reminder_timezone, briefing_reminder_hour,
  briefing_push_reminder, briefing_email_reminder, briefing_last_reminder_date
) ON public.profiles TO authenticated;

DROP FUNCTION IF EXISTS public.get_my_private_profile();

CREATE FUNCTION public.get_my_private_profile()
RETURNS TABLE (
  phone text,
  current_latitude double precision,
  current_longitude double precision,
  is_suspended boolean
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT phone, current_latitude, current_longitude, is_suspended
  FROM public.profiles WHERE user_id = auth.uid();
$$;

REVOKE EXECUTE ON FUNCTION public.get_my_private_profile() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_my_private_profile() TO authenticated;
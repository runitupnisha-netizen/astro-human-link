GRANT SELECT (
  phone, current_latitude, current_longitude, is_suspended
) ON public.profiles TO authenticated;

DROP FUNCTION IF EXISTS public.get_my_private_profile();
DROP VIEW IF EXISTS public.public_profiles;
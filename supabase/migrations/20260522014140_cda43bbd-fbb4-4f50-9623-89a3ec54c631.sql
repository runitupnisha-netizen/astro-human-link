
-- 1. Restrict other-user profile reads to a column-limited view
DROP POLICY IF EXISTS "Users can view other visible profiles" ON public.profiles;

-- Make public_profiles view SECURITY DEFINER so it can be read without the broad policy
ALTER VIEW public.public_profiles SET (security_invoker = false);
ALTER VIEW public.profiles_public SET (security_invoker = false);

GRANT SELECT ON public.public_profiles TO authenticated, anon;
GRANT SELECT ON public.profiles_public TO authenticated, anon;

-- 2. Distance helper so distance can be displayed without exposing coordinates
CREATE OR REPLACE FUNCTION public.distance_to_user(target_user_id uuid)
RETURNS integer
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  my_lat double precision;
  my_lng double precision;
  their_lat double precision;
  their_lng double precision;
  km double precision;
BEGIN
  IF auth.uid() IS NULL THEN RETURN NULL; END IF;

  SELECT current_latitude, current_longitude INTO my_lat, my_lng
  FROM public.profiles WHERE user_id = auth.uid();

  SELECT current_latitude, current_longitude INTO their_lat, their_lng
  FROM public.profiles
  WHERE user_id = target_user_id
    AND is_paused = false
    AND is_incognito = false
    AND onboarding_complete = true;

  IF my_lat IS NULL OR my_lng IS NULL OR their_lat IS NULL OR their_lng IS NULL THEN
    RETURN NULL;
  END IF;

  km := 6371 * acos(
    least(1.0, greatest(-1.0,
      cos(radians(my_lat)) * cos(radians(their_lat)) *
      cos(radians(their_lng) - radians(my_lng)) +
      sin(radians(my_lat)) * sin(radians(their_lat))
    ))
  );

  RETURN round(km)::int;
END;
$$;

GRANT EXECUTE ON FUNCTION public.distance_to_user(uuid) TO authenticated;

-- 3. Tighten chat-media upload policy: require match participation
DROP POLICY IF EXISTS "Users can upload chat media" ON storage.objects;

CREATE POLICY "Users can upload chat media"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'chat-media'
  AND (storage.foldername(name))[1] = auth.uid()::text
  AND EXISTS (
    SELECT 1 FROM public.matches m
    WHERE m.id::text = (storage.foldername(name))[2]
      AND (m.user_a = auth.uid() OR m.user_b = auth.uid())
  )
);

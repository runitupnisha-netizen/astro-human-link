
-- 1. Remove the conflicting blanket voice-messages SELECT policy
DROP POLICY IF EXISTS "Anyone can read voice messages" ON storage.objects;

-- 2. Replace blanket profiles SELECT with a scoped policy:
--    Users can read their own profile fully, OR read other profiles
--    that are not paused, not incognito, and have completed onboarding.
--    This hides paused/incognito users from being queried client-side.
DROP POLICY IF EXISTS "Anyone can view profiles" ON public.profiles;

CREATE POLICY "Users can view own profile"
ON public.profiles
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can view other visible profiles"
ON public.profiles
FOR SELECT
TO authenticated
USING (
  is_paused = false
  AND is_incognito = false
  AND onboarding_complete = true
);

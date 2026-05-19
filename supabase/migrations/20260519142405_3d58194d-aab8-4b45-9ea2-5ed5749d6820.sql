
DROP POLICY IF EXISTS "Matched users can view each other's profile" ON public.profiles;

CREATE POLICY "Users can view other visible profiles"
ON public.profiles
FOR SELECT
TO authenticated
USING (
  is_paused = false
  AND is_incognito = false
  AND onboarding_complete = true
);

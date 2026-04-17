-- Restore the original cross-user SELECT policy on public.profiles.
-- Without this, every page that reads other users' profiles breaks.
CREATE POLICY "Users can view other visible profiles"
ON public.profiles
FOR SELECT
TO authenticated
USING (
  is_paused = false
  AND is_incognito = false
  AND onboarding_complete = true
);

-- 1. Fix photo_verifications: Remove the broad "Anyone can check verification status" policy
-- and replace with a view that only exposes status (not selfie_url)
DROP POLICY IF EXISTS "Anyone can check verification status" ON public.photo_verifications;

-- Create a safe public view for verification status checks
CREATE OR REPLACE VIEW public.verification_status
WITH (security_invoker = on) AS
  SELECT user_id, status
  FROM public.photo_verifications;

-- 2. Fix matches: Change the UPDATE policy from 'public' role to 'authenticated'
DROP POLICY IF EXISTS "Users can update own matches" ON public.matches;
CREATE POLICY "Users can update own matches"
  ON public.matches
  FOR UPDATE
  TO authenticated
  USING ((auth.uid() = user_a) OR (auth.uid() = user_b));

-- 3. Fix voice-messages bucket: Add ownership enforcement to INSERT policy
DROP POLICY IF EXISTS "Authenticated users can upload voice messages" ON storage.objects;
CREATE POLICY "Authenticated users can upload voice messages"
  ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'voice-messages' AND auth.uid()::text = (storage.foldername(name))[1]);

-- 4. Fix rate_limits: Add service-role-only access policies (these are managed by edge functions via service role)
-- No user-facing policies needed since edge functions use service_role key
-- This is intentional - rate_limits should only be accessed via service role

-- 5. Enable leaked password protection is done via auth config, not migration

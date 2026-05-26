
-- 1. Remove permissive realtime SELECT policy on messages
DROP POLICY IF EXISTS "authenticated_only_realtime" ON public.messages;

-- 2. Restrict photo_verifications UPDATE: users can only resubmit as 'pending'
DROP POLICY IF EXISTS "Users can resubmit verification selfie" ON public.photo_verifications;
CREATE POLICY "Users can resubmit verification selfie"
ON public.photo_verifications
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id AND status = 'pending');

-- 3. Remove overly permissive voice-messages INSERT policy (keeps the match-scoped one)
DROP POLICY IF EXISTS "Authenticated users can upload voice messages" ON storage.objects;

-- 4. Convert SECURITY DEFINER views to SECURITY INVOKER
ALTER VIEW public.profiles_public SET (security_invoker = on);
ALTER VIEW public.public_profiles SET (security_invoker = on);

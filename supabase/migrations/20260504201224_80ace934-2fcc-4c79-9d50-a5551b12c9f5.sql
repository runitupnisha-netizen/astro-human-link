-- Drop overly-permissive realtime policy on messages
DROP POLICY IF EXISTS "authenticated_only_realtime" ON public.messages;

-- Restrict referral_codes SELECT to owners only
DROP POLICY IF EXISTS "Authenticated can lookup codes" ON public.referral_codes;

CREATE POLICY "Users can view their own referral code"
ON public.referral_codes
FOR SELECT
TO authenticated
USING (user_id = auth.uid());
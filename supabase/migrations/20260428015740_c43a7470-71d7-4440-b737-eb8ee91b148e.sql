-- Treat already-submitted selfies as completed so users are not stuck in review.
UPDATE public.photo_verifications
SET status = 'approved', reviewed_at = COALESCE(reviewed_at, now())
WHERE status = 'pending';

-- Allow a user to resubmit their own selfie while keeping access scoped to their own record.
DROP POLICY IF EXISTS "Users can resubmit verification selfie" ON public.photo_verifications;

CREATE POLICY "Users can resubmit verification selfie"
ON public.photo_verifications
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (
  auth.uid() = user_id
  AND status IN ('approved', 'pending')
);
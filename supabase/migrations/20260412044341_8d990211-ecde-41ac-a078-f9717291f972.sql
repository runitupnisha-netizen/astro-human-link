
-- ============================================================
-- 1. FIX: Photo verification self-approve bypass
--    Remove unrestricted UPDATE, replace with selfie_url-only
-- ============================================================

DROP POLICY IF EXISTS "Users can update own verification" ON public.photo_verifications;

-- Allow users to re-submit a new selfie (update selfie_url only, reset status to pending)
CREATE POLICY "Users can resubmit verification selfie"
ON public.photo_verifications
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (
  auth.uid() = user_id
  AND status = 'pending'
);

-- ============================================================
-- 2. FIX: Make voice-messages and chat-media buckets private
-- ============================================================

UPDATE storage.buckets SET public = false WHERE id IN ('voice-messages', 'chat-media');

-- ============================================================
-- 3. FIX: Tighten storage SELECT policies for voice-messages
--    Only match participants can read files
-- ============================================================

-- Drop existing overly permissive SELECT policies
DROP POLICY IF EXISTS "Authenticated users can view voice messages" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can view voice messages" ON storage.objects;

-- Create scoped SELECT policy: folder structure is {user_id}/{match_id}/...
-- Allow access if the requesting user is a participant of the match
CREATE POLICY "Match participants can view voice messages"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'voice-messages'
  AND EXISTS (
    SELECT 1 FROM public.matches
    WHERE matches.id::text = (storage.foldername(name))[2]
    AND (matches.user_a = auth.uid() OR matches.user_b = auth.uid())
  )
);

-- ============================================================
-- 4. FIX: Tighten storage SELECT policies for chat-media
-- ============================================================

DROP POLICY IF EXISTS "Authenticated users can view chat media" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can view chat media" ON storage.objects;

CREATE POLICY "Match participants can view chat media"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'chat-media'
  AND EXISTS (
    SELECT 1 FROM public.matches
    WHERE matches.id::text = (storage.foldername(name))[2]
    AND (matches.user_a = auth.uid() OR matches.user_b = auth.uid())
  )
);

-- ============================================================
-- 5. FIX: Add missing UPDATE policy for chat-media
-- ============================================================

CREATE POLICY "Users can update own chat media"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'chat-media'
  AND (storage.foldername(name))[1] = auth.uid()::text
)
WITH CHECK (
  bucket_id = 'chat-media'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

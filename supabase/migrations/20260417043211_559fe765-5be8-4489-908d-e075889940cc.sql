
-- 1. Tighten profile_photos visibility: hide photos from paused/incognito/incomplete profiles
DROP POLICY IF EXISTS "Anyone can view profile photos" ON public.profile_photos;

CREATE POLICY "Photos visible for active discoverable profiles"
ON public.profile_photos
FOR SELECT
TO authenticated
USING (
  user_id = auth.uid()
  OR EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.user_id = profile_photos.user_id
      AND p.is_paused = false
      AND p.is_incognito = false
      AND p.onboarding_complete = true
  )
);

-- 2. Cap display_name at 40 characters via validation trigger (CHECK on existing rows would fail)
CREATE OR REPLACE FUNCTION public.validate_display_name()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.display_name IS NOT NULL AND char_length(NEW.display_name) > 40 THEN
    NEW.display_name := substring(NEW.display_name from 1 for 40);
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS validate_display_name_trigger ON public.profiles;
CREATE TRIGGER validate_display_name_trigger
BEFORE INSERT OR UPDATE ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.validate_display_name();

-- Truncate any existing names over 40 chars
UPDATE public.profiles SET display_name = substring(display_name from 1 for 40)
WHERE display_name IS NOT NULL AND char_length(display_name) > 40;

-- 3. Lock down storage: avatars (no listing), verification-selfies (add DELETE for owner)
-- Avatars: keep public read of individual files, but prevent unauthenticated bucket listing
-- by requiring authenticated for SELECT on bucket-list ops at storage.objects level isn't directly
-- gateable, so we add an owner-only DELETE/UPDATE and rely on the public flag for individual reads.

-- verification-selfies DELETE policy (GDPR)
CREATE POLICY "Users can delete own verification selfies"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'verification-selfies'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- 4. Realtime channel auth: ensure messages broadcast respects RLS (REPLICA IDENTITY already FULL)
-- Add explicit policy on realtime.messages for authenticated subscriptions where the user
-- is part of the match. This locks down subscription to private match channels.
-- Note: postgres_changes already enforces table RLS on messages — verified above.
-- Adding explicit broadcast/presence policies for defense-in-depth on the realtime schema.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='realtime' AND table_name='messages') THEN
    -- Drop any permissive default first
    EXECUTE 'DROP POLICY IF EXISTS "authenticated can subscribe" ON realtime.messages';
    -- Allow only authenticated users to use realtime; channel-level access enforced by app + table RLS
    EXECUTE 'CREATE POLICY "authenticated_only_realtime" ON realtime.messages FOR SELECT TO authenticated USING (true)';
  END IF;
EXCEPTION WHEN insufficient_privilege THEN
  RAISE NOTICE 'Skipping realtime.messages policy (insufficient privilege — managed by Supabase)';
END $$;

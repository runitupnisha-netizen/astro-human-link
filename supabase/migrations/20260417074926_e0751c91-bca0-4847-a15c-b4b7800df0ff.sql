
-- 1. Spotify connections: add owner-scoped SELECT/INSERT/UPDATE/DELETE policies
CREATE POLICY "Users can view own spotify connection"
  ON public.spotify_connections FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own spotify connection"
  ON public.spotify_connections FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own spotify connection"
  ON public.spotify_connections FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own spotify connection"
  ON public.spotify_connections FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- 2. Analytics events: add owner-scoped SELECT policy
CREATE POLICY "Users can view own analytics events"
  ON public.analytics_events FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- 3. Remove overly permissive realtime policy on messages table
-- This was using USING(true) which combined with OR logic bypassed match-scoped restrictions
DROP POLICY IF EXISTS "authenticated_only_realtime" ON public.messages;

-- 4. Voice messages bucket: restrict uploads to matches the user participates in
DROP POLICY IF EXISTS "Users can upload voice messages to their matches" ON storage.objects;

CREATE POLICY "Users can upload voice messages to their matches"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'voice-messages'
    AND (storage.foldername(name))[1] = auth.uid()::text
    AND EXISTS (
      SELECT 1 FROM public.matches m
      WHERE m.id::text = (storage.foldername(name))[2]
        AND (m.user_a = auth.uid() OR m.user_b = auth.uid())
    )
  );

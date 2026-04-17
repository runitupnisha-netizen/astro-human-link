-- Lock down spotify_connections to service-role only
-- Tokens (access_token, refresh_token) must never be readable by clients.
-- The spotify-auth edge function uses the service role key and bypasses RLS.

DROP POLICY IF EXISTS "Users can view own spotify connection" ON public.spotify_connections;
DROP POLICY IF EXISTS "Users can insert own spotify connection" ON public.spotify_connections;
DROP POLICY IF EXISTS "Users can update own spotify connection" ON public.spotify_connections;
DROP POLICY IF EXISTS "Users can delete own spotify connection" ON public.spotify_connections;

-- RLS stays enabled. With no policies, authenticated/anon clients have ZERO access.
-- Only the service role (used by edge functions) can read/write.
ALTER TABLE public.spotify_connections ENABLE ROW LEVEL SECURITY;

-- Add a comment documenting the security model
COMMENT ON TABLE public.spotify_connections IS 'Spotify OAuth tokens. Service-role only. All client access goes through the spotify-auth edge function.';
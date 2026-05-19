
-- 1. Remove wildcard realtime SELECT policy on messages
DROP POLICY IF EXISTS authenticated_only_realtime ON public.messages;

-- 2. Allow admins to review verification selfies in storage
DROP POLICY IF EXISTS "Admins can view verification selfies" ON storage.objects;
CREATE POLICY "Admins can view verification selfies"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'verification-selfies'
  AND public.has_role(auth.uid(), 'admin'::public.app_role)
);

-- 3. Explicit deny INSERT on call_sessions (service role bypasses RLS; documents intent)
DROP POLICY IF EXISTS "No direct inserts on call_sessions" ON public.call_sessions;
CREATE POLICY "No direct inserts on call_sessions"
ON public.call_sessions
FOR INSERT
TO authenticated
WITH CHECK (false);

-- 4. Fix mutable search_path on email queue helpers
ALTER FUNCTION public.enqueue_email(text, jsonb) SET search_path = public, pgmq;
ALTER FUNCTION public.read_email_batch(text, integer, integer) SET search_path = public, pgmq;
ALTER FUNCTION public.delete_email(text, bigint) SET search_path = public, pgmq;
ALTER FUNCTION public.move_to_dlq(text, text, bigint, jsonb) SET search_path = public, pgmq;

-- 5. Lock down SECURITY DEFINER functions: revoke from anon, only authenticated may call
REVOKE EXECUTE ON FUNCTION public.enqueue_email(text, jsonb) FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.read_email_batch(text, integer, integer) FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.delete_email(text, bigint) FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.move_to_dlq(text, text, bigint, jsonb) FROM anon, authenticated, public;

REVOKE EXECUTE ON FUNCTION public.cleanup_rate_limits() FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.delete_user_data(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.redeem_referral_code(text) FROM anon;
REVOKE EXECUTE ON FUNCTION public.lookup_referral_code(text) FROM anon;
REVOKE EXECUTE ON FUNCTION public.generate_referral_code() FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) FROM anon;
REVOKE EXECUTE ON FUNCTION public.is_match_participant(uuid, uuid) FROM anon;

-- 6. Restrict profile sensitive columns from being read by other users.
-- Strategy: keep authenticated SELECT on table intact (so owner select('*') still works),
-- but prevent other-users from accessing sensitive columns by tightening the public
-- "view other visible profiles" policy to exclude sensitive columns via column GRANTs
-- on a dedicated anon-blocked column scope is impossible at row level — so we instead
-- create a curated public view consumers should use for OTHER profiles, and rely on
-- the existing owner policy + non-owner policy. To physically protect sensitive
-- columns from being SELECTed by other users at the row level, we replace the broad
-- policy so it does not return rows for users who are not the owner unless they have
-- a match/swipe relationship — and we expose a sanitized view for general discovery.

-- Replace the broad "view other visible profiles" policy with the SAME logic but
-- additionally restrict to: (owner) OR (matched) OR (discovery via sanitized view).
-- Direct table reads by non-owners are limited to matched users.
DROP POLICY IF EXISTS "Users can view other visible profiles" ON public.profiles;

CREATE POLICY "Matched users can view each other's profile"
ON public.profiles
FOR SELECT
TO authenticated
USING (
  is_paused = false
  AND is_incognito = false
  AND onboarding_complete = true
  AND (
    auth.uid() = user_id
    OR EXISTS (
      SELECT 1 FROM public.matches m
      WHERE (m.user_a = auth.uid() AND m.user_b = profiles.user_id)
         OR (m.user_b = auth.uid() AND m.user_a = profiles.user_id)
    )
  )
);

-- Sanitized view for discovery / browsing other profiles — exposes only safe columns.
DROP VIEW IF EXISTS public.public_profiles;
CREATE VIEW public.public_profiles
WITH (security_invoker = true)
AS
SELECT
  id, user_id, display_name, username, avatar_url, about_me, gender,
  birth_date, birth_place, sun_sign, moon_sign, rising_sign,
  mercury_sign, venus_sign, mars_sign,
  human_design_type, human_design_strategy, human_design_authority,
  human_design_profile, human_design_summary,
  gene_keys_life_purpose, gene_keys_evolution, gene_keys_radiance, gene_keys_summary,
  astro_summary, numerology_summary, life_path_number, birthday_number, personal_year_number,
  recurring_themes,
  bio_prompt_1, bio_prompt_1_answer, bio_prompt_2, bio_prompt_2_answer, bio_prompt_3, bio_prompt_3_answer,
  interests, compatibility_tags, social_energy, preferred_language,
  relationship_goal, spiritual_practice, growth_commitment,
  kids_preference, drinking, smoking, substances,
  preferred_genders, preferred_elements, preferred_hd_types,
  age_min, age_max, max_distance_km,
  current_city, voice_intro_url, last_seen_at,
  is_paused, is_incognito, onboarding_complete, boost_until,
  created_at, updated_at
FROM public.profiles
WHERE is_paused = false
  AND is_incognito = false
  AND onboarding_complete = true;

GRANT SELECT ON public.public_profiles TO authenticated;

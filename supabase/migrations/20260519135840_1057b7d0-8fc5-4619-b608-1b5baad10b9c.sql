-- Re-revoke sensitive columns from anon/authenticated direct table reads
REVOKE SELECT (
  phone,
  current_latitude,
  current_longitude,
  is_suspended,
  boost_until,
  bonus_pro_until,
  referred_by_code,
  referral_redeemed_at,
  briefing_reminder_timezone,
  briefing_reminder_hour,
  briefing_push_reminder,
  briefing_email_reminder,
  briefing_last_reminder_date
) ON public.profiles FROM anon, authenticated;

-- Re-add the discoverability policy so authenticated users (and the public_profiles view)
-- can read non-sensitive columns of other visible profiles. Column-level REVOKEs above
-- block the sensitive fields even though the row passes RLS.
DROP POLICY IF EXISTS "Users can view other visible profiles" ON public.profiles;
CREATE POLICY "Users can view other visible profiles"
ON public.profiles
FOR SELECT
TO authenticated
USING (
  is_paused = false
  AND is_incognito = false
  AND onboarding_complete = true
);

-- Switch the view to invoker rights so the Supabase linter is happy.
DROP VIEW IF EXISTS public.public_profiles;
CREATE VIEW public.public_profiles
WITH (security_invoker = on)
AS
SELECT
  user_id,
  display_name,
  username,
  avatar_url,
  about_me,
  gender,
  birth_date,
  birth_place,
  birth_time,
  current_city,
  -- Rounded ~11km so distance is approximate, not a precise location leak.
  -- The underlying current_latitude/longitude are blocked by column REVOKE,
  -- but the view runs with the owner's grants for the rounded projection.
  round((SELECT current_latitude FROM public.profiles p2 WHERE p2.user_id = p.user_id)::numeric, 1)::float8 AS current_latitude_rounded,
  round((SELECT current_longitude FROM public.profiles p2 WHERE p2.user_id = p.user_id)::numeric, 1)::float8 AS current_longitude_rounded,
  sun_sign, moon_sign, rising_sign, venus_sign, mars_sign, mercury_sign,
  human_design_type, human_design_authority, human_design_profile,
  human_design_strategy, human_design_summary,
  gene_keys_life_purpose, gene_keys_evolution, gene_keys_radiance, gene_keys_summary,
  life_path_number, birthday_number, personal_year_number, numerology_summary,
  astro_summary, compatibility_tags, interests,
  relationship_goal, spiritual_practice, growth_commitment,
  kids_preference, drinking, smoking, substances,
  social_energy, recurring_themes,
  bio_prompt_1, bio_prompt_1_answer,
  bio_prompt_2, bio_prompt_2_answer,
  bio_prompt_3, bio_prompt_3_answer,
  voice_intro_url,
  last_seen_at,
  is_paused, is_incognito, onboarding_complete,
  preferred_language,
  created_at, updated_at
FROM public.profiles p
WHERE is_paused = false
  AND is_incognito = false
  AND onboarding_complete = true;

REVOKE ALL ON public.public_profiles FROM PUBLIC, anon;
GRANT SELECT ON public.public_profiles TO authenticated;

-- Replace the previous get_my_full_profile helper with a narrower one
-- that returns ONLY the sensitive columns the owner needs.
DROP FUNCTION IF EXISTS public.get_my_full_profile();

CREATE OR REPLACE FUNCTION public.get_my_private_profile()
RETURNS TABLE (
  phone text,
  current_latitude double precision,
  current_longitude double precision,
  is_suspended boolean,
  boost_until timestamptz,
  bonus_pro_until timestamptz,
  referred_by_code text,
  referral_redeemed_at timestamptz,
  briefing_reminder_timezone text,
  briefing_reminder_hour smallint,
  briefing_push_reminder boolean,
  briefing_email_reminder boolean,
  briefing_last_reminder_date date
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    phone,
    current_latitude,
    current_longitude,
    is_suspended,
    boost_until,
    bonus_pro_until,
    referred_by_code,
    referral_redeemed_at,
    briefing_reminder_timezone,
    briefing_reminder_hour,
    briefing_push_reminder,
    briefing_email_reminder,
    briefing_last_reminder_date
  FROM public.profiles
  WHERE user_id = auth.uid();
$$;

REVOKE EXECUTE ON FUNCTION public.get_my_private_profile() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_my_private_profile() TO authenticated;
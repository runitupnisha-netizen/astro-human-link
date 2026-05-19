-- Restore the column grants we revoked earlier (owner + admin reads need these)
GRANT SELECT (
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
) ON public.profiles TO authenticated;

-- Drop the overly-broad SELECT policy that exposed all columns of other users
DROP POLICY IF EXISTS "Users can view other visible profiles" ON public.profiles;

-- Create a curated view that only exposes safe, non-sensitive fields.
-- Coordinates are rounded to 1 decimal (~11km) so approximate distance is computable
-- without leaking the user's exact location.
DROP VIEW IF EXISTS public.public_profiles;
CREATE VIEW public.public_profiles
WITH (security_invoker = off)
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
  round(current_latitude::numeric, 1)::float8 AS current_latitude,
  round(current_longitude::numeric, 1)::float8 AS current_longitude,
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
  boost_until,
  preferred_language,
  created_at, updated_at
FROM public.profiles
WHERE is_paused = false
  AND is_incognito = false
  AND onboarding_complete = true;

REVOKE ALL ON public.public_profiles FROM PUBLIC, anon;
GRANT SELECT ON public.public_profiles TO authenticated;
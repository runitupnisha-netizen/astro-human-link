-- Create a privacy-safe view of profiles that excludes precise coordinates and birth details.
-- Other users will read from this view; own-profile access continues via the profiles table.
CREATE OR REPLACE VIEW public.profiles_public
WITH (security_invoker = true)
AS
SELECT
  id,
  user_id,
  display_name,
  username,
  avatar_url,
  about_me,
  gender,
  preferred_genders,
  preferred_language,
  current_city,
  -- Coordinates rounded to ~11km grid for distance display without revealing exact location
  ROUND(current_latitude::numeric, 1)::double precision  AS current_latitude_approx,
  ROUND(current_longitude::numeric, 1)::double precision AS current_longitude_approx,
  max_distance_km,
  age_min,
  age_max,
  -- Astrology / HD / Gene Keys / Numerology summaries (safe derived data)
  sun_sign,
  moon_sign,
  rising_sign,
  astro_summary,
  human_design_type,
  human_design_strategy,
  human_design_authority,
  human_design_profile,
  human_design_summary,
  gene_keys_life_purpose,
  gene_keys_evolution,
  gene_keys_radiance,
  gene_keys_summary,
  life_path_number,
  birthday_number,
  personal_year_number,
  numerology_summary,
  -- Lifestyle / interests / prompts
  interests,
  compatibility_tags,
  preferred_elements,
  preferred_hd_types,
  social_energy,
  kids_preference,
  drinking,
  smoking,
  substances,
  relationship_goal,
  spiritual_practice,
  growth_commitment,
  bio_prompt_1, bio_prompt_1_answer,
  bio_prompt_2, bio_prompt_2_answer,
  bio_prompt_3, bio_prompt_3_answer,
  voice_intro_url,
  is_paused,
  is_incognito,
  onboarding_complete,
  boost_until,
  last_seen_at,
  -- Derived age year only (for display) — no exact birth date
  EXTRACT(YEAR FROM AGE(birth_date))::int AS age,
  created_at,
  updated_at
FROM public.profiles
WHERE is_paused = false
  AND is_incognito = false
  AND onboarding_complete = true;

GRANT SELECT ON public.profiles_public TO authenticated;

-- Tighten the existing "view other visible profiles" policy:
-- restrict it so it only returns rows for the requesting user themselves.
-- All cross-user reads should now go through profiles_public.
DROP POLICY IF EXISTS "Users can view other visible profiles" ON public.profiles;

-- Note: "Users can view own profile" remains in place, so users still see their own full row.
COMMENT ON VIEW public.profiles_public IS
  'Privacy-safe public view of profiles. Excludes exact birth date/time/place and precise coordinates. Use this for any cross-user profile reads.';
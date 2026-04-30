DO $$
DECLARE
  _user_id uuid;
  _existing uuid;
BEGIN
  SELECT id INTO _existing FROM auth.users WHERE email = 'appreview@stellara.app';

  IF _existing IS NOT NULL THEN
    _user_id := _existing;
  ELSE
    _user_id := gen_random_uuid();

    INSERT INTO auth.users (
      id, instance_id, aud, role, email, encrypted_password,
      email_confirmed_at, created_at, updated_at,
      raw_app_meta_data, raw_user_meta_data, is_sso_user, is_anonymous
    ) VALUES (
      _user_id,
      '00000000-0000-0000-0000-000000000000',
      'authenticated',
      'authenticated',
      'appreview@stellara.app',
      crypt('AppleReview2026!', gen_salt('bf')),
      now(), now(), now(),
      jsonb_build_object('provider','email','providers',ARRAY['email']),
      jsonb_build_object('full_name','Apple Reviewer'),
      false, false
    );

    INSERT INTO auth.identities (
      id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at
    ) VALUES (
      gen_random_uuid(),
      _user_id,
      _user_id::text,
      jsonb_build_object('sub', _user_id::text, 'email', 'appreview@stellara.app', 'email_verified', true),
      'email',
      now(), now(), now()
    );
  END IF;

  -- Upsert a fully onboarded profile (handle_new_user trigger may have created a stub row)
  INSERT INTO public.profiles (
    user_id, display_name, username, about_me,
    gender, preferred_genders,
    birth_date, birth_time, birth_place, birth_latitude, birth_longitude,
    current_city, current_latitude, current_longitude, max_distance_km,
    sun_sign, moon_sign, rising_sign, venus_sign,
    human_design_type, human_design_authority, human_design_profile,
    life_path_number, birthday_number, personal_year_number,
    relationship_goal, interests, compatibility_tags,
    age_min, age_max, social_energy,
    onboarding_complete, last_seen_at,
    briefing_email_reminder, briefing_push_reminder,
    briefing_reminder_hour, briefing_reminder_timezone,
    is_paused, is_incognito, is_suspended, push_primer_shown,
    preferred_language
  ) VALUES (
    _user_id,
    'Apple Reviewer', 'apple_reviewer',
    'Demo account for App Store review. Full access to all features — feel free to explore Discover, Lyra, Inner World, and Premium tiers.',
    'non_binary', ARRAY['woman','man','non_binary'],
    '1995-06-15', '12:00:00', 'New York, NY, USA', 40.7128, -74.0060,
    'Cupertino, CA', 37.3230, -122.0322, 500,
    'Gemini', 'Pisces', 'Libra', 'Cancer',
    'Generator', 'Sacral', '5/1',
    5, 6, 9,
    'long_term', ARRAY['astrology','meditation','yoga','reading','travel'],
    ARRAY['spiritual','growth_oriented','curious'],
    25, 45, 6,
    true, now(),
    false, false, 9, 'America/Los_Angeles',
    false, false, false, true,
    'en'
  )
  ON CONFLICT (user_id) DO UPDATE SET
    display_name = EXCLUDED.display_name,
    username = EXCLUDED.username,
    about_me = EXCLUDED.about_me,
    gender = EXCLUDED.gender,
    preferred_genders = EXCLUDED.preferred_genders,
    birth_date = EXCLUDED.birth_date,
    birth_time = EXCLUDED.birth_time,
    birth_place = EXCLUDED.birth_place,
    birth_latitude = EXCLUDED.birth_latitude,
    birth_longitude = EXCLUDED.birth_longitude,
    current_city = EXCLUDED.current_city,
    current_latitude = EXCLUDED.current_latitude,
    current_longitude = EXCLUDED.current_longitude,
    max_distance_km = EXCLUDED.max_distance_km,
    sun_sign = EXCLUDED.sun_sign,
    moon_sign = EXCLUDED.moon_sign,
    rising_sign = EXCLUDED.rising_sign,
    venus_sign = EXCLUDED.venus_sign,
    human_design_type = EXCLUDED.human_design_type,
    human_design_authority = EXCLUDED.human_design_authority,
    human_design_profile = EXCLUDED.human_design_profile,
    life_path_number = EXCLUDED.life_path_number,
    birthday_number = EXCLUDED.birthday_number,
    personal_year_number = EXCLUDED.personal_year_number,
    relationship_goal = EXCLUDED.relationship_goal,
    interests = EXCLUDED.interests,
    compatibility_tags = EXCLUDED.compatibility_tags,
    age_min = EXCLUDED.age_min,
    age_max = EXCLUDED.age_max,
    social_energy = EXCLUDED.social_energy,
    onboarding_complete = true,
    last_seen_at = now(),
    is_paused = false,
    is_incognito = false,
    is_suspended = false,
    updated_at = now();
END $$;
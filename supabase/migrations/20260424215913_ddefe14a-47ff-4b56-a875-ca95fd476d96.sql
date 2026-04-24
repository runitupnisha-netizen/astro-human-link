-- 1. referral_codes: one row per user
CREATE TABLE public.referral_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE,
  code TEXT NOT NULL UNIQUE,
  uses_count INTEGER NOT NULL DEFAULT 0,
  rewards_earned INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_referral_codes_code ON public.referral_codes(code);

ALTER TABLE public.referral_codes ENABLE ROW LEVEL SECURITY;

-- Anyone authenticated can look up a code (needed at signup to validate)
CREATE POLICY "Authenticated can lookup codes"
ON public.referral_codes FOR SELECT
TO authenticated
USING (true);

-- Owner can see their own row (counters etc.)
-- (covered by the broader policy above, but kept explicit for clarity)

-- Only owner can insert their own code row
CREATE POLICY "Users can create own code"
ON public.referral_codes FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- No direct updates — handled by redeem_referral_code() security definer
-- No deletes

-- 2. profiles: bonus_pro_until + referred_by_code
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS bonus_pro_until TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS referred_by_code TEXT,
  ADD COLUMN IF NOT EXISTS referral_redeemed_at TIMESTAMPTZ;

-- 3. Generate a unique 6-char alphanumeric code (A-Z + 0-9, omit 0/O/1/I)
CREATE OR REPLACE FUNCTION public.generate_referral_code()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  alphabet TEXT := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  result TEXT;
  i INT;
  attempt INT := 0;
BEGIN
  LOOP
    result := '';
    FOR i IN 1..6 LOOP
      result := result || substr(alphabet, 1 + floor(random() * length(alphabet))::int, 1);
    END LOOP;
    -- ensure uniqueness
    IF NOT EXISTS (SELECT 1 FROM public.referral_codes WHERE code = result) THEN
      RETURN result;
    END IF;
    attempt := attempt + 1;
    IF attempt > 20 THEN
      RAISE EXCEPTION 'Could not generate unique referral code';
    END IF;
  END LOOP;
END;
$$;

-- 4. Auto-create a referral_codes row on profile insert
CREATE OR REPLACE FUNCTION public.create_referral_code_for_profile()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.referral_codes (user_id, code)
  VALUES (NEW.user_id, public.generate_referral_code())
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_profile_create_referral_code ON public.profiles;
CREATE TRIGGER on_profile_create_referral_code
AFTER INSERT ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.create_referral_code_for_profile();

-- 5. Backfill codes for existing profiles
INSERT INTO public.referral_codes (user_id, code)
SELECT p.user_id, public.generate_referral_code()
FROM public.profiles p
LEFT JOIN public.referral_codes rc ON rc.user_id = p.user_id
WHERE rc.id IS NULL;

-- 6. Redeem function: called once when Friend B hits the reveal step
CREATE OR REPLACE FUNCTION public.redeem_referral_code(_code TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _user_id UUID;
  _inviter_id UUID;
  _already_redeemed TIMESTAMPTZ;
  _new_user_bonus TIMESTAMPTZ;
  _inviter_bonus TIMESTAMPTZ;
BEGIN
  _user_id := auth.uid();
  IF _user_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'not_authenticated');
  END IF;

  -- Has this user already redeemed any code?
  SELECT referral_redeemed_at INTO _already_redeemed
  FROM public.profiles WHERE user_id = _user_id;

  IF _already_redeemed IS NOT NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'already_redeemed');
  END IF;

  -- Look up the inviter
  SELECT user_id INTO _inviter_id
  FROM public.referral_codes
  WHERE code = upper(_code);

  IF _inviter_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'invalid_code');
  END IF;

  IF _inviter_id = _user_id THEN
    RETURN jsonb_build_object('success', false, 'error', 'self_referral');
  END IF;

  -- Grant new user +30 days bonus Pro
  UPDATE public.profiles
  SET bonus_pro_until = GREATEST(COALESCE(bonus_pro_until, now()), now()) + INTERVAL '30 days',
      referred_by_code = upper(_code),
      referral_redeemed_at = now()
  WHERE user_id = _user_id
  RETURNING bonus_pro_until INTO _new_user_bonus;

  -- Grant inviter +30 days bonus Pro
  UPDATE public.profiles
  SET bonus_pro_until = GREATEST(COALESCE(bonus_pro_until, now()), now()) + INTERVAL '30 days'
  WHERE user_id = _inviter_id
  RETURNING bonus_pro_until INTO _inviter_bonus;

  -- Increment inviter counters
  UPDATE public.referral_codes
  SET uses_count = uses_count + 1,
      rewards_earned = rewards_earned + 1
  WHERE user_id = _inviter_id;

  -- Notify inviter
  INSERT INTO public.notifications (user_id, title, body, type)
  VALUES (
    _inviter_id,
    'Your cosmic twin joined! ✦',
    'You earned a free month of Pro.',
    'referral_reward'
  );

  RETURN jsonb_build_object(
    'success', true,
    'bonus_until', _new_user_bonus,
    'inviter_id', _inviter_id
  );
END;
$$;

-- 7. Public lookup function (for signup page) — returns inviter display name only
CREATE OR REPLACE FUNCTION public.lookup_referral_code(_code TEXT)
RETURNS JSONB
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _inviter_name TEXT;
BEGIN
  SELECT p.display_name INTO _inviter_name
  FROM public.referral_codes rc
  JOIN public.profiles p ON p.user_id = rc.user_id
  WHERE rc.code = upper(_code)
  LIMIT 1;

  IF _inviter_name IS NULL THEN
    RETURN jsonb_build_object('valid', false);
  END IF;

  RETURN jsonb_build_object('valid', true, 'inviter_name', _inviter_name);
END;
$$;
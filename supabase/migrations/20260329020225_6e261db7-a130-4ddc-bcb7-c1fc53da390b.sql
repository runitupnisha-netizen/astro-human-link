
-- Profile views tracking table
CREATE TABLE public.profile_views (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  viewer_id uuid NOT NULL,
  viewed_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(viewer_id, viewed_id, created_at)
);

ALTER TABLE public.profile_views ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can insert own views" ON public.profile_views
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = viewer_id);

CREATE POLICY "Users can view who viewed them" ON public.profile_views
  FOR SELECT TO authenticated USING (auth.uid() = viewed_id OR auth.uid() = viewer_id);

-- Referrals table
CREATE TABLE public.referrals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  referrer_id uuid NOT NULL,
  referred_id uuid,
  referral_code text NOT NULL UNIQUE,
  status text NOT NULL DEFAULT 'pending',
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.referrals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own referrals" ON public.referrals
  FOR SELECT TO authenticated USING (auth.uid() = referrer_id OR auth.uid() = referred_id);

CREATE POLICY "Users can insert own referrals" ON public.referrals
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = referrer_id);

CREATE POLICY "Users can update own referrals" ON public.referrals
  FOR UPDATE TO authenticated USING (auth.uid() = referrer_id);

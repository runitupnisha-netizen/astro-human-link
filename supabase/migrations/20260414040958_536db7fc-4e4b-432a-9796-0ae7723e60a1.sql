
-- Add voice_intro_url to profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS voice_intro_url text;

-- Create pinned_matches table
CREATE TABLE IF NOT EXISTS public.pinned_matches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  match_id uuid NOT NULL REFERENCES public.matches(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, match_id)
);

ALTER TABLE public.pinned_matches ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own pins" ON public.pinned_matches FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can pin matches" ON public.pinned_matches FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can unpin matches" ON public.pinned_matches FOR DELETE TO authenticated USING (auth.uid() = user_id);

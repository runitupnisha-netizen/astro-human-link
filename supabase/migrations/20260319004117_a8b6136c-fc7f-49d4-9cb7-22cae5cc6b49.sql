
-- Add boost/incognito columns to profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS is_incognito boolean NOT NULL DEFAULT false;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS boost_until timestamptz DEFAULT NULL;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS age_min integer DEFAULT 18;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS age_max integer DEFAULT 99;

-- Message reactions table
CREATE TABLE IF NOT EXISTS public.message_reactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id uuid NOT NULL REFERENCES public.messages(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  emoji text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(message_id, user_id, emoji)
);

ALTER TABLE public.message_reactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view reactions in their matches" ON public.message_reactions
FOR SELECT TO authenticated
USING (EXISTS (
  SELECT 1 FROM messages m JOIN matches mt ON m.match_id = mt.id
  WHERE m.id = message_reactions.message_id
  AND (mt.user_a = auth.uid() OR mt.user_b = auth.uid())
));

CREATE POLICY "Users can add reactions in their matches" ON public.message_reactions
FOR INSERT TO authenticated
WITH CHECK (
  user_id = auth.uid() AND
  EXISTS (
    SELECT 1 FROM messages m JOIN matches mt ON m.match_id = mt.id
    WHERE m.id = message_reactions.message_id
    AND (mt.user_a = auth.uid() OR mt.user_b = auth.uid())
  )
);

CREATE POLICY "Users can remove own reactions" ON public.message_reactions
FOR DELETE TO authenticated
USING (user_id = auth.uid());

-- Enable realtime for reactions
ALTER PUBLICATION supabase_realtime ADD TABLE public.message_reactions;

-- Streaks table
CREATE TABLE IF NOT EXISTS public.user_streaks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE,
  current_streak integer NOT NULL DEFAULT 0,
  longest_streak integer NOT NULL DEFAULT 0,
  last_login_date date DEFAULT NULL,
  total_logins integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.user_streaks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own streak" ON public.user_streaks
FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own streak" ON public.user_streaks
FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own streak" ON public.user_streaks
FOR UPDATE TO authenticated USING (auth.uid() = user_id);

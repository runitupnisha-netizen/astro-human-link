-- Daily Cosmic Briefing storage
CREATE TABLE public.daily_briefings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  briefing_date DATE NOT NULL DEFAULT CURRENT_DATE,
  energy_theme TEXT NOT NULL,
  mood TEXT NOT NULL,
  focus TEXT NOT NULL,
  lucky_window TEXT,
  affirmation TEXT,
  journal_prompt TEXT NOT NULL,
  cosmic_weather TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, briefing_date)
);

ALTER TABLE public.daily_briefings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own briefings"
  ON public.daily_briefings FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own briefings"
  ON public.daily_briefings FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE INDEX idx_daily_briefings_user_date ON public.daily_briefings(user_id, briefing_date DESC);

-- Track journal reflections on briefings (small value-add for all tiers)
CREATE TABLE public.briefing_reflections (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  briefing_id UUID NOT NULL REFERENCES public.daily_briefings(id) ON DELETE CASCADE,
  reflection TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.briefing_reflections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own reflections"
  ON public.briefing_reflections FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own reflections"
  ON public.briefing_reflections FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own reflections"
  ON public.briefing_reflections FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own reflections"
  ON public.briefing_reflections FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);
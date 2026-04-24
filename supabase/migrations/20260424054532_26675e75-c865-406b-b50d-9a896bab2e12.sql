-- Shadow Work Journal entries (private, edit-only, no delete)
CREATE TABLE public.shadow_journal_entries (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  prompt TEXT NOT NULL,
  prompt_index INTEGER,
  entry TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.shadow_journal_entries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own shadow entries" ON public.shadow_journal_entries
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users insert own shadow entries" ON public.shadow_journal_entries
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update own shadow entries" ON public.shadow_journal_entries
  FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE INDEX idx_shadow_user_created ON public.shadow_journal_entries(user_id, created_at DESC);

-- Moon Cycle entries (intentions + releases, permanent log)
CREATE TABLE public.moon_journal_entries (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  phase TEXT NOT NULL,
  entry_type TEXT NOT NULL CHECK (entry_type IN ('intention', 'release', 'reflection')),
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.moon_journal_entries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own moon entries" ON public.moon_journal_entries
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users insert own moon entries" ON public.moon_journal_entries
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE INDEX idx_moon_user_created ON public.moon_journal_entries(user_id, created_at DESC);

-- Soulmate Sketch generations (cache so re-opens are instant)
CREATE TABLE public.soulmate_sketches (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE,
  sketch_text TEXT NOT NULL,
  generated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.soulmate_sketches ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own sketch" ON public.soulmate_sketches
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users insert own sketch" ON public.soulmate_sketches
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update own sketch" ON public.soulmate_sketches
  FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Trigger to keep updated_at fresh on shadow entries edits
CREATE OR REPLACE FUNCTION public.touch_shadow_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_shadow_updated_at
  BEFORE UPDATE ON public.shadow_journal_entries
  FOR EACH ROW EXECUTE FUNCTION public.touch_shadow_updated_at();
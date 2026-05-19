
CREATE OR REPLACE FUNCTION public.touch_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TABLE public.blueprint_ai_cache (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  section_key TEXT NOT NULL,
  content TEXT NOT NULL,
  model TEXT,
  generated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  cached_until TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, section_key)
);

CREATE INDEX idx_blueprint_ai_cache_user ON public.blueprint_ai_cache(user_id);

ALTER TABLE public.blueprint_ai_cache ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view their own cached sections"
  ON public.blueprint_ai_cache FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users insert their own cached sections"
  ON public.blueprint_ai_cache FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update their own cached sections"
  ON public.blueprint_ai_cache FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users delete their own cached sections"
  ON public.blueprint_ai_cache FOR DELETE USING (auth.uid() = user_id);

CREATE TRIGGER trg_blueprint_ai_cache_touch
  BEFORE UPDATE ON public.blueprint_ai_cache
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

CREATE TABLE public.saved_insights (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  source TEXT NOT NULL,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_saved_insights_user ON public.saved_insights(user_id, created_at DESC);

ALTER TABLE public.saved_insights ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view their own saved insights"
  ON public.saved_insights FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users insert their own saved insights"
  ON public.saved_insights FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users delete their own saved insights"
  ON public.saved_insights FOR DELETE USING (auth.uid() = user_id);

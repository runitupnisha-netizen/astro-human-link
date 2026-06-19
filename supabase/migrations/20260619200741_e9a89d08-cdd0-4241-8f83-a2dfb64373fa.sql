
CREATE TABLE public.time_travel_moments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  moment_date date NOT NULL,
  label text,
  reflection text,
  narrative_excerpt text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.time_travel_moments TO authenticated;
GRANT ALL ON public.time_travel_moments TO service_role;

ALTER TABLE public.time_travel_moments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage their own time travel moments"
  ON public.time_travel_moments
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE INDEX idx_time_travel_moments_user ON public.time_travel_moments(user_id, moment_date DESC);

CREATE TRIGGER touch_time_travel_moments
  BEFORE UPDATE ON public.time_travel_moments
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

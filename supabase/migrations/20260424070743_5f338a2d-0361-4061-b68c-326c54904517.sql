-- Table to persist Check a Connection readings
CREATE TABLE IF NOT EXISTS public.connection_checks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  their_name TEXT,
  their_birth_date DATE NOT NULL,
  their_birth_time TIME,
  their_birth_place TEXT NOT NULL,
  their_sun_sign TEXT,
  their_moon_sign TEXT,
  their_rising_sign TEXT,
  compatibility_score INTEGER,
  summary TEXT,
  highlight TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.connection_checks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own connection checks"
  ON public.connection_checks FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own connection checks"
  ON public.connection_checks FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own connection checks"
  ON public.connection_checks FOR DELETE
  USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS connection_checks_user_id_created_at_idx
  ON public.connection_checks (user_id, created_at DESC);

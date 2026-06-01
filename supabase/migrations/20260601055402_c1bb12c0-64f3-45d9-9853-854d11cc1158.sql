ALTER TABLE public.connection_checks
  ADD COLUMN IF NOT EXISTS synastry_overview text,
  ADD COLUMN IF NOT EXISTS cross_aspects jsonb,
  ADD COLUMN IF NOT EXISTS strengths jsonb,
  ADD COLUMN IF NOT EXISTS friction_points jsonb,
  ADD COLUMN IF NOT EXISTS lessons text;
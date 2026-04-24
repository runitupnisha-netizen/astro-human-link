ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS daily_ritual_last_completed date,
  ADD COLUMN IF NOT EXISTS push_primer_shown boolean NOT NULL DEFAULT false;
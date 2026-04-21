ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS briefing_email_reminder boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS briefing_push_reminder boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS briefing_reminder_hour smallint NOT NULL DEFAULT 8,
  ADD COLUMN IF NOT EXISTS briefing_reminder_timezone text NOT NULL DEFAULT 'UTC',
  ADD COLUMN IF NOT EXISTS briefing_last_reminder_date date;

CREATE INDEX IF NOT EXISTS idx_profiles_briefing_reminder
  ON public.profiles (briefing_reminder_hour)
  WHERE briefing_email_reminder = true OR briefing_push_reminder = true;
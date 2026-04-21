-- Idempotency for briefing reflections: a per-user client-supplied key
ALTER TABLE public.briefing_reflections
  ADD COLUMN IF NOT EXISTS client_key text;

-- Ensure a given user can never store the same client_key twice.
-- NULL client_keys are allowed and are not constrained (legacy rows).
CREATE UNIQUE INDEX IF NOT EXISTS briefing_reflections_user_client_key_uidx
  ON public.briefing_reflections (user_id, client_key)
  WHERE client_key IS NOT NULL;
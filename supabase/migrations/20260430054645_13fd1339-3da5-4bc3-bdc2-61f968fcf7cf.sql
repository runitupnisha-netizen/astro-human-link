
-- Phone OTP storage. Codes are hashed; raw codes never stored.
CREATE TABLE IF NOT EXISTS public.phone_otps (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  phone text NOT NULL,
  code_hash text NOT NULL,
  expires_at timestamptz NOT NULL,
  attempts integer NOT NULL DEFAULT 0,
  used boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  ip text
);

CREATE INDEX IF NOT EXISTS idx_phone_otps_phone_active
  ON public.phone_otps(phone, created_at DESC)
  WHERE used = false;

CREATE INDEX IF NOT EXISTS idx_phone_otps_expires
  ON public.phone_otps(expires_at);

ALTER TABLE public.phone_otps ENABLE ROW LEVEL SECURITY;

-- Deny all by default. Edge functions will use the service role key,
-- which bypasses RLS, so no client-facing policies are needed.
-- Add an explicit deny-all to make intent obvious to scanners.
DROP POLICY IF EXISTS "deny_all_select" ON public.phone_otps;
CREATE POLICY "deny_all_select" ON public.phone_otps
  FOR SELECT TO authenticated, anon USING (false);

DROP POLICY IF EXISTS "deny_all_insert" ON public.phone_otps;
CREATE POLICY "deny_all_insert" ON public.phone_otps
  FOR INSERT TO authenticated, anon WITH CHECK (false);

DROP POLICY IF EXISTS "deny_all_update" ON public.phone_otps;
CREATE POLICY "deny_all_update" ON public.phone_otps
  FOR UPDATE TO authenticated, anon USING (false) WITH CHECK (false);

DROP POLICY IF EXISTS "deny_all_delete" ON public.phone_otps;
CREATE POLICY "deny_all_delete" ON public.phone_otps
  FOR DELETE TO authenticated, anon USING (false);

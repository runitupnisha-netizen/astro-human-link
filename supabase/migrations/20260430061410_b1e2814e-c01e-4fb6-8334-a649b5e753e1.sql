-- SMS verification log: captures every Twilio send attempt with full request/response
-- details so admins can debug delivery failures.
CREATE TABLE public.sms_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  phone TEXT NOT NULL,
  ip TEXT,
  -- Lifecycle
  status TEXT NOT NULL, -- 'queued' | 'sent' | 'failed' | 'twilio_error' | 'internal_error'
  http_status INTEGER,
  duration_ms INTEGER,
  -- Twilio details
  twilio_sid TEXT,
  twilio_status TEXT,           -- queued/sending/sent/delivered/undelivered/failed
  twilio_error_code TEXT,
  twilio_error_message TEXT,
  -- Raw payloads for debugging (no secrets — never include code or code_hash)
  request_payload JSONB,
  response_payload JSONB,
  internal_error TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_sms_logs_created_at ON public.sms_logs (created_at DESC);
CREATE INDEX idx_sms_logs_phone ON public.sms_logs (phone);
CREATE INDEX idx_sms_logs_status ON public.sms_logs (status);

ALTER TABLE public.sms_logs ENABLE ROW LEVEL SECURITY;

-- Only admins can view logs. Inserts happen exclusively from the edge function via
-- the service role key, which bypasses RLS, so no INSERT policy is required.
CREATE POLICY "Admins can view sms logs"
ON public.sms_logs
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete sms logs"
ON public.sms_logs
FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));
CREATE TABLE public.call_provisioning_errors (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  user_id uuid,
  match_id uuid,
  error_category text NOT NULL,
  http_status int,
  message text,
  details jsonb NOT NULL DEFAULT '{}'::jsonb
);

CREATE INDEX call_provisioning_errors_created_at_idx
  ON public.call_provisioning_errors (created_at DESC);

CREATE INDEX call_provisioning_errors_user_idx
  ON public.call_provisioning_errors (user_id, created_at DESC);

CREATE INDEX call_provisioning_errors_category_idx
  ON public.call_provisioning_errors (error_category, created_at DESC);

ALTER TABLE public.call_provisioning_errors ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role can insert provisioning errors"
ON public.call_provisioning_errors
FOR INSERT
TO public
WITH CHECK (auth.role() = 'service_role');

CREATE POLICY "Service role can read provisioning errors"
ON public.call_provisioning_errors
FOR SELECT
TO public
USING (auth.role() = 'service_role');
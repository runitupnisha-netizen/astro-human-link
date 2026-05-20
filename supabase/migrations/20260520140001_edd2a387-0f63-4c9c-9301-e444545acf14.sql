
CREATE OR REPLACE FUNCTION public.set_updated_at_now()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

CREATE TABLE public.iap_subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  platform text NOT NULL CHECK (platform IN ('ios','android')),
  product_id text NOT NULL,
  original_transaction_id text NOT NULL,
  latest_transaction_id text,
  expires_at timestamptz,
  purchased_at timestamptz,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active','expired','refunded','revoked','in_grace')),
  environment text NOT NULL DEFAULT 'production' CHECK (environment IN ('sandbox','production')),
  auto_renew boolean NOT NULL DEFAULT true,
  raw jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (platform, original_transaction_id)
);

CREATE INDEX idx_iap_subs_user ON public.iap_subscriptions(user_id);
CREATE INDEX idx_iap_subs_active ON public.iap_subscriptions(user_id, expires_at) WHERE status = 'active';

ALTER TABLE public.iap_subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own iap subscriptions"
  ON public.iap_subscriptions FOR SELECT
  TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Service role manages iap subscriptions"
  ON public.iap_subscriptions FOR ALL
  TO public USING (auth.role() = 'service_role') WITH CHECK (auth.role() = 'service_role');

CREATE TRIGGER update_iap_subs_updated_at
  BEFORE UPDATE ON public.iap_subscriptions
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at_now();

CREATE OR REPLACE FUNCTION public.has_active_iap(_user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.iap_subscriptions
    WHERE user_id = _user_id
      AND status IN ('active','in_grace')
      AND (expires_at IS NULL OR expires_at > now())
  );
$$;

CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

SELECT cron.schedule(
  'hard-delete-expired-accounts-daily',
  '0 3 * * *',
  $$SELECT public.hard_delete_expired_accounts();$$
);

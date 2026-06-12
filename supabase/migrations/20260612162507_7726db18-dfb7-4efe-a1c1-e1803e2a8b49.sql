
-- 1. iap_subscriptions: retarget service-role policy
DROP POLICY IF EXISTS "Service role manages iap subscriptions" ON public.iap_subscriptions;
CREATE POLICY "Service role manages iap subscriptions"
  ON public.iap_subscriptions
  AS PERMISSIVE
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- 2. daily_reveals: add missing INSERT policy for owner
DROP POLICY IF EXISTS "Users can insert own reveals" ON public.daily_reveals;
CREATE POLICY "Users can insert own reveals"
  ON public.daily_reveals
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

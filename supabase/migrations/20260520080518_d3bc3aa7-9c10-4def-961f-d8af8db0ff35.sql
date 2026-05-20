ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS deletion_scheduled_at timestamptz,
  ADD COLUMN IF NOT EXISTS eula_accepted_at timestamptz,
  ADD COLUMN IF NOT EXISTS eula_version text,
  ADD COLUMN IF NOT EXISTS date_of_birth date,
  ADD COLUMN IF NOT EXISTS is_apple_reviewer boolean NOT NULL DEFAULT false;

ALTER TABLE public.reports
  ADD COLUMN IF NOT EXISTS content_type text,
  ADD COLUMN IF NOT EXISTS content_id text,
  ADD COLUMN IF NOT EXISTS content_snapshot text,
  ADD COLUMN IF NOT EXISTS moderation_status text NOT NULL DEFAULT 'pending';

CREATE TABLE IF NOT EXISTS public.moderation_queue (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reporter_id uuid,
  target_user_id uuid,
  content_type text NOT NULL,
  content_id text,
  content_snapshot text,
  reason text,
  details text,
  ai_provider text,
  ai_flagged boolean,
  ai_categories jsonb,
  ai_score numeric,
  status text NOT NULL DEFAULT 'pending',
  reviewed_at timestamptz,
  reviewed_by uuid,
  action_taken text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.moderation_queue ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can insert into moderation queue" ON public.moderation_queue;
CREATE POLICY "Users can insert into moderation queue"
  ON public.moderation_queue FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = reporter_id OR reporter_id IS NULL);

DROP POLICY IF EXISTS "Admins view moderation queue" ON public.moderation_queue;
CREATE POLICY "Admins view moderation queue"
  ON public.moderation_queue FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));

DROP POLICY IF EXISTS "Admins update moderation queue" ON public.moderation_queue;
CREATE POLICY "Admins update moderation queue"
  ON public.moderation_queue FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

CREATE INDEX IF NOT EXISTS moderation_queue_status_idx
  ON public.moderation_queue(status, created_at DESC);

CREATE OR REPLACE FUNCTION public.request_account_deletion()
RETURNS timestamptz
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  _uid uuid := auth.uid();
  _scheduled timestamptz;
BEGIN
  IF _uid IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  _scheduled := now() + interval '7 days';
  UPDATE public.profiles
     SET deletion_scheduled_at = _scheduled,
         is_paused = true
   WHERE user_id = _uid;
  RETURN _scheduled;
END;
$$;

CREATE OR REPLACE FUNCTION public.cancel_account_deletion()
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE _uid uuid := auth.uid();
BEGIN
  IF _uid IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  UPDATE public.profiles
     SET deletion_scheduled_at = NULL,
         is_paused = false
   WHERE user_id = _uid;
END;
$$;

CREATE OR REPLACE FUNCTION public.hard_delete_expired_accounts()
RETURNS int
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  r record;
  cnt int := 0;
BEGIN
  FOR r IN
    SELECT user_id FROM public.profiles
    WHERE deletion_scheduled_at IS NOT NULL
      AND deletion_scheduled_at <= now()
  LOOP
    DELETE FROM public.profile_photos WHERE user_id = r.user_id;
    DELETE FROM public.messages WHERE sender_id = r.user_id;
    DELETE FROM public.swipes WHERE user_id = r.user_id OR target_user_id = r.user_id;
    DELETE FROM public.post_likes WHERE user_id = r.user_id;
    DELETE FROM public.alignment_posts WHERE user_id = r.user_id;
    DELETE FROM public.notifications WHERE user_id = r.user_id;
    DELETE FROM public.push_subscriptions WHERE user_id = r.user_id;
    DELETE FROM public.daily_reveals WHERE user_id = r.user_id;
    DELETE FROM public.blocks WHERE blocker_id = r.user_id OR blocked_id = r.user_id;
    DELETE FROM public.reports WHERE reporter_id = r.user_id OR reported_id = r.user_id;
    DELETE FROM public.matches WHERE user_a = r.user_id OR user_b = r.user_id;
    DELETE FROM public.profiles WHERE user_id = r.user_id;
    cnt := cnt + 1;
  END LOOP;
  RETURN cnt;
END;
$$;
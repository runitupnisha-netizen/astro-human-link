
-- Add bio prompts to profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS bio_prompt_1 text DEFAULT NULL;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS bio_prompt_1_answer text DEFAULT NULL;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS bio_prompt_2 text DEFAULT NULL;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS bio_prompt_2_answer text DEFAULT NULL;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS bio_prompt_3 text DEFAULT NULL;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS bio_prompt_3_answer text DEFAULT NULL;

-- Create blocks table
CREATE TABLE public.blocks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  blocker_id uuid NOT NULL,
  blocked_id uuid NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(blocker_id, blocked_id)
);
ALTER TABLE public.blocks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own blocks" ON public.blocks FOR SELECT TO authenticated USING (auth.uid() = blocker_id);
CREATE POLICY "Users can insert own blocks" ON public.blocks FOR INSERT TO authenticated WITH CHECK (auth.uid() = blocker_id);
CREATE POLICY "Users can delete own blocks" ON public.blocks FOR DELETE TO authenticated USING (auth.uid() = blocker_id);

-- Create reports table
CREATE TABLE public.reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reporter_id uuid NOT NULL,
  reported_id uuid NOT NULL,
  reason text NOT NULL,
  details text,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);
ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can insert own reports" ON public.reports FOR INSERT TO authenticated WITH CHECK (auth.uid() = reporter_id);
CREATE POLICY "Users can view own reports" ON public.reports FOR SELECT TO authenticated USING (auth.uid() = reporter_id);

-- Create delete_user edge function helper
CREATE OR REPLACE FUNCTION public.delete_user_data(target_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Only allow users to delete their own data
  IF auth.uid() != target_user_id THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;
  
  DELETE FROM public.profile_photos WHERE user_id = target_user_id;
  DELETE FROM public.messages WHERE sender_id = target_user_id;
  DELETE FROM public.swipes WHERE user_id = target_user_id;
  DELETE FROM public.post_likes WHERE user_id = target_user_id;
  DELETE FROM public.alignment_posts WHERE user_id = target_user_id;
  DELETE FROM public.notifications WHERE user_id = target_user_id;
  DELETE FROM public.push_subscriptions WHERE user_id = target_user_id;
  DELETE FROM public.daily_reveals WHERE user_id = target_user_id;
  DELETE FROM public.blocks WHERE blocker_id = target_user_id;
  DELETE FROM public.reports WHERE reporter_id = target_user_id;
  DELETE FROM public.matches WHERE user_a = target_user_id OR user_b = target_user_id;
  DELETE FROM public.profiles WHERE user_id = target_user_id;
END;
$$;

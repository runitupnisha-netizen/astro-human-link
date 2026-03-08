
-- Alignment Feed posts table
CREATE TABLE public.alignment_posts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content text NOT NULL,
  category text NOT NULL DEFAULT 'reflection',
  likes_count integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.alignment_posts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view posts" ON public.alignment_posts
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Users can insert own posts" ON public.alignment_posts
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own posts" ON public.alignment_posts
  FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- Post likes table
CREATE TABLE public.post_likes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id uuid NOT NULL REFERENCES public.alignment_posts(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(post_id, user_id)
);

ALTER TABLE public.post_likes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view likes" ON public.post_likes
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Users can insert own likes" ON public.post_likes
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own likes" ON public.post_likes
  FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- Trigger to update likes_count
CREATE OR REPLACE FUNCTION public.update_post_likes_count()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE alignment_posts SET likes_count = likes_count + 1 WHERE id = NEW.post_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE alignment_posts SET likes_count = likes_count - 1 WHERE id = OLD.post_id;
    RETURN OLD;
  END IF;
END;
$$;

CREATE TRIGGER on_post_like_change
AFTER INSERT OR DELETE ON public.post_likes
FOR EACH ROW EXECUTE FUNCTION public.update_post_likes_count();

-- Daily reveal tracking
CREATE TABLE public.daily_reveals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  revealed_user_id uuid NOT NULL,
  reveal_date date NOT NULL DEFAULT CURRENT_DATE,
  viewed boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, reveal_date)
);

ALTER TABLE public.daily_reveals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own reveals" ON public.daily_reveals
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Users can update own reveals" ON public.daily_reveals
  FOR UPDATE TO authenticated USING (auth.uid() = user_id);

-- Sacred Intention filters on profiles
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS relationship_goal text,
  ADD COLUMN IF NOT EXISTS spiritual_practice text,
  ADD COLUMN IF NOT EXISTS growth_commitment text,
  ADD COLUMN IF NOT EXISTS preferred_elements text[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS preferred_hd_types text[] DEFAULT '{}';

-- Enable realtime for alignment_posts
ALTER PUBLICATION supabase_realtime ADD TABLE public.alignment_posts;

CREATE OR REPLACE FUNCTION public.check_mutual_like()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.action IN ('like', 'super_like') THEN
    -- Check if the other person already liked us
    IF EXISTS (
      SELECT 1 FROM public.swipes 
      WHERE user_id = NEW.target_user_id 
        AND target_user_id = NEW.user_id 
        AND action IN ('like', 'super_like')
    ) THEN
      -- Create match (alphabetically ordered to prevent duplicates)
      INSERT INTO public.matches (user_a, user_b)
      VALUES (
        LEAST(NEW.user_id, NEW.target_user_id),
        GREATEST(NEW.user_id, NEW.target_user_id)
      )
      ON CONFLICT (user_a, user_b) DO NOTHING;
    END IF;
  END IF;
  RETURN NEW;
END;
$$
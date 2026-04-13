
CREATE OR REPLACE FUNCTION public.create_match_notification()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  name_a text;
  name_b text;
BEGIN
  SELECT display_name INTO name_a FROM profiles WHERE user_id = NEW.user_a LIMIT 1;
  SELECT display_name INTO name_b FROM profiles WHERE user_id = NEW.user_b LIMIT 1;

  INSERT INTO notifications (user_id, title, body, type)
  VALUES 
    (NEW.user_a, '💫 New Match!', 'You matched with ' || COALESCE(name_b, 'someone special') || '!', 'match'),
    (NEW.user_b, '💫 New Match!', 'You matched with ' || COALESCE(name_a, 'someone special') || '!', 'match');

  RETURN NEW;
END;
$function$;

CREATE TRIGGER on_match_create_notification
  AFTER INSERT ON public.matches
  FOR EACH ROW
  EXECUTE FUNCTION public.create_match_notification();

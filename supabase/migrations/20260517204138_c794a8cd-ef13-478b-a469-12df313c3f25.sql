DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger
    WHERE tgname = 'on_swipe_check_mutual_like'
      AND tgrelid = 'public.swipes'::regclass
  ) THEN
    CREATE TRIGGER on_swipe_check_mutual_like
      AFTER INSERT ON public.swipes
      FOR EACH ROW
      EXECUTE FUNCTION public.check_mutual_like();
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger
    WHERE tgname = 'on_match_create_notification'
      AND tgrelid = 'public.matches'::regclass
  ) THEN
    CREATE TRIGGER on_match_create_notification
      AFTER INSERT ON public.matches
      FOR EACH ROW
      EXECUTE FUNCTION public.create_match_notification();
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger
    WHERE tgname = 'on_match_notify'
      AND tgrelid = 'public.matches'::regclass
  ) THEN
    CREATE TRIGGER on_match_notify
      AFTER INSERT ON public.matches
      FOR EACH ROW
      EXECUTE FUNCTION public.notify_new_match();
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger
    WHERE tgname = 'on_message_notify'
      AND tgrelid = 'public.messages'::regclass
  ) THEN
    CREATE TRIGGER on_message_notify
      AFTER INSERT ON public.messages
      FOR EACH ROW
      EXECUTE FUNCTION public.notify_new_message();
  END IF;
END $$;
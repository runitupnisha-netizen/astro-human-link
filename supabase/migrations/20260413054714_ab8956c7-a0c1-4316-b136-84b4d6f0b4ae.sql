CREATE TRIGGER on_swipe_check_mutual_like
  AFTER INSERT ON public.swipes
  FOR EACH ROW
  EXECUTE FUNCTION public.check_mutual_like();
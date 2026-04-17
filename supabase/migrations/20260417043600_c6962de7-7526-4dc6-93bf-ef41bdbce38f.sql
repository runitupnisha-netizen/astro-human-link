
-- Re-attach the display_name truncation trigger that didn't persist
DROP TRIGGER IF EXISTS validate_display_name_trigger ON public.profiles;

CREATE TRIGGER validate_display_name_trigger
BEFORE INSERT OR UPDATE OF display_name ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.validate_display_name();

CREATE OR REPLACE FUNCTION public.notify_new_match()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'extensions'
AS $function$
DECLARE
  supabase_url text;
  service_role_key text;
BEGIN
  SELECT decrypted_secret INTO supabase_url FROM vault.decrypted_secrets WHERE name = 'SUPABASE_URL' LIMIT 1;
  SELECT decrypted_secret INTO service_role_key FROM vault.decrypted_secrets WHERE name = 'SUPABASE_SERVICE_ROLE_KEY' LIMIT 1;

  -- Skip notification if secrets are not configured
  IF supabase_url IS NULL OR service_role_key IS NULL THEN
    RETURN NEW;
  END IF;

  BEGIN
    PERFORM net.http_post(
      url := supabase_url || '/functions/v1/send-push-notification',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || service_role_key
      ),
      body := jsonb_build_object(
        'type', 'new_match',
        'record', jsonb_build_object(
          'id', NEW.id,
          'user_a', NEW.user_a,
          'user_b', NEW.user_b
        )
      )
    );
  EXCEPTION WHEN OTHERS THEN
    -- Log but don't block match creation
    RAISE WARNING 'notify_new_match failed: %', SQLERRM;
  END;

  RETURN NEW;
END;
$function$;
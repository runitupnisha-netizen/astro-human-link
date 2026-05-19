-- 1. Add session lifecycle columns to guide_conversations
ALTER TABLE public.guide_conversations
  ADD COLUMN IF NOT EXISTS ended_at timestamptz,
  ADD COLUMN IF NOT EXISTS summary text,
  ADD COLUMN IF NOT EXISTS message_count integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS seed_topic text,
  ADD COLUMN IF NOT EXISTS is_active boolean NOT NULL DEFAULT true;

-- Backfill: existing rows become active sessions (we'll deactivate older ones below)
-- Mark only the most recent conversation per user as active; older ones get ended_at = last_message_at, is_active = false
WITH ranked AS (
  SELECT id, user_id,
         row_number() OVER (PARTITION BY user_id ORDER BY last_message_at DESC) AS rn,
         last_message_at
  FROM public.guide_conversations
)
UPDATE public.guide_conversations gc
SET is_active = false,
    ended_at = r.last_message_at
FROM ranked r
WHERE gc.id = r.id AND r.rn > 1;

-- Backfill message_count from existing guide_messages
UPDATE public.guide_conversations gc
SET message_count = sub.cnt
FROM (
  SELECT conversation_id, COUNT(*)::int AS cnt
  FROM public.guide_messages
  GROUP BY conversation_id
) sub
WHERE gc.id = sub.conversation_id;

-- 2. Partial unique index: only one active session per user
CREATE UNIQUE INDEX IF NOT EXISTS guide_conversations_one_active_per_user
  ON public.guide_conversations (user_id) WHERE is_active;

-- 3. Index for fast Recent Chats pagination
CREATE INDEX IF NOT EXISTS guide_conversations_user_last_msg_idx
  ON public.guide_conversations (user_id, last_message_at DESC);

-- 4. Add recurring_themes summary to profiles
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS recurring_themes text;

-- 5. Extend message-insert trigger to also bump message_count
CREATE OR REPLACE FUNCTION public.touch_guide_conversation()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
BEGIN
  UPDATE public.guide_conversations
  SET last_message_at = now(),
      updated_at = now(),
      message_count = message_count + 1
  WHERE id = NEW.conversation_id;
  RETURN NEW;
END;
$function$;
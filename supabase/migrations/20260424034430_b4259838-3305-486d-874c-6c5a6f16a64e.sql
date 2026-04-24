-- Conversations table for Lyra (cosmic guide) chats
CREATE TABLE public.guide_conversations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  title text NOT NULL DEFAULT 'New conversation',
  last_message_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_guide_conversations_user ON public.guide_conversations(user_id, last_message_at DESC);

ALTER TABLE public.guide_conversations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own guide conversations"
  ON public.guide_conversations FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own guide conversations"
  ON public.guide_conversations FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own guide conversations"
  ON public.guide_conversations FOR UPDATE TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own guide conversations"
  ON public.guide_conversations FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

-- Messages table for Lyra
CREATE TABLE public.guide_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid NOT NULL REFERENCES public.guide_conversations(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  role text NOT NULL CHECK (role IN ('user','assistant','system')),
  content text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_guide_messages_conversation ON public.guide_messages(conversation_id, created_at);

ALTER TABLE public.guide_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own guide messages"
  ON public.guide_messages FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own guide messages"
  ON public.guide_messages FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid() = user_id
    AND EXISTS (
      SELECT 1 FROM public.guide_conversations c
      WHERE c.id = conversation_id AND c.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete own guide messages"
  ON public.guide_messages FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

-- Trigger to bump conversation last_message_at + updated_at when a message is inserted
CREATE OR REPLACE FUNCTION public.touch_guide_conversation()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.guide_conversations
  SET last_message_at = now(), updated_at = now()
  WHERE id = NEW.conversation_id;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_touch_guide_conversation
AFTER INSERT ON public.guide_messages
FOR EACH ROW EXECUTE FUNCTION public.touch_guide_conversation();
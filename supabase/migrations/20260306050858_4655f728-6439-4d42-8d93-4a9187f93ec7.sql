
-- Messages table for real-time chat between matched users
CREATE TABLE public.messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  match_id UUID REFERENCES public.matches(id) ON DELETE CASCADE NOT NULL,
  sender_id UUID NOT NULL,
  content TEXT NOT NULL,
  message_type TEXT NOT NULL DEFAULT 'text',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

-- Users can view messages in their matches
CREATE POLICY "Users can view messages in their matches"
ON public.messages FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.matches
    WHERE matches.id = messages.match_id
    AND (matches.user_a = auth.uid() OR matches.user_b = auth.uid())
  )
);

-- Users can insert messages in their matches
CREATE POLICY "Users can send messages in their matches"
ON public.messages FOR INSERT TO authenticated
WITH CHECK (
  sender_id = auth.uid()
  AND EXISTS (
    SELECT 1 FROM public.matches
    WHERE matches.id = messages.match_id
    AND (matches.user_a = auth.uid() OR matches.user_b = auth.uid())
  )
);

-- Enable realtime for messages
ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;

-- Index for fast message retrieval
CREATE INDEX idx_messages_match_id ON public.messages(match_id, created_at);

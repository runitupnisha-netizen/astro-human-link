
CREATE TABLE public.call_sessions (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  match_id uuid NOT NULL,
  user_id uuid NOT NULL,
  room_name text NOT NULL,
  call_type text NOT NULL DEFAULT 'video',
  started_at timestamp with time zone NOT NULL DEFAULT now(),
  ended_at timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.call_sessions ENABLE ROW LEVEL SECURITY;

-- Participants of the related match can view their own sessions
CREATE POLICY "Participants can view their call sessions"
ON public.call_sessions
FOR SELECT
TO authenticated
USING (
  auth.uid() = user_id
  OR EXISTS (
    SELECT 1 FROM public.matches m
    WHERE m.id = call_sessions.match_id
      AND (m.user_a = auth.uid() OR m.user_b = auth.uid())
  )
);

-- Allow the participating user to mark their own session as ended
CREATE POLICY "Users can end their own call session"
ON public.call_sessions
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE INDEX idx_call_sessions_match ON public.call_sessions(match_id);
CREATE INDEX idx_call_sessions_user ON public.call_sessions(user_id);
CREATE INDEX idx_call_sessions_room ON public.call_sessions(room_name);

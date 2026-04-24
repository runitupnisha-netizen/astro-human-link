CREATE TABLE IF NOT EXISTS public.call_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid REFERENCES public.call_sessions(id) ON DELETE SET NULL,
  room_name text NOT NULL,
  event_type text NOT NULL,
  participant_id text,
  occurred_at timestamptz NOT NULL DEFAULT now(),
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS call_events_room_idx ON public.call_events (room_name, occurred_at DESC);
CREATE INDEX IF NOT EXISTS call_events_session_idx ON public.call_events (session_id, occurred_at DESC);

ALTER TABLE public.call_events ENABLE ROW LEVEL SECURITY;

-- Users can only see events for sessions they participated in
CREATE POLICY "Users can view events for their own sessions"
  ON public.call_events
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.call_sessions s
      WHERE s.id = call_events.session_id
        AND s.user_id = auth.uid()
    )
  );

-- No client-side writes — webhook handler uses service role to insert
CREATE POLICY "No direct inserts from clients"
  ON public.call_events
  FOR INSERT
  TO authenticated
  WITH CHECK (false);
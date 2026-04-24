-- Securely associate Daily.co rooms with matches so room names can be
-- random/unguessable while still being reusable by the same two participants
-- within their session window.
CREATE TABLE IF NOT EXISTS public.call_rooms (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  match_id uuid NOT NULL REFERENCES public.matches(id) ON DELETE CASCADE,
  room_name text NOT NULL UNIQUE,
  room_url text NOT NULL,
  created_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL,
  ended_at timestamptz
);

CREATE INDEX IF NOT EXISTS call_rooms_match_active_idx
  ON public.call_rooms (match_id, expires_at DESC)
  WHERE ended_at IS NULL;

ALTER TABLE public.call_rooms ENABLE ROW LEVEL SECURITY;

-- Helper: is the calling user a participant of this match?
CREATE OR REPLACE FUNCTION public.is_match_participant(_match_id uuid, _user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.matches m
    WHERE m.id = _match_id
      AND (m.user_a = _user_id OR m.user_b = _user_id)
  );
$$;

-- Only the two participants of the match can read the room record
CREATE POLICY "Participants can view their match's call rooms"
  ON public.call_rooms
  FOR SELECT
  TO authenticated
  USING (public.is_match_participant(match_id, auth.uid()));

-- Only participants can create a room for the match
CREATE POLICY "Participants can create call rooms for their match"
  ON public.call_rooms
  FOR INSERT
  TO authenticated
  WITH CHECK (
    public.is_match_participant(match_id, auth.uid())
    AND created_by = auth.uid()
  );

-- Only participants can update (e.g. mark ended). No deletes allowed.
CREATE POLICY "Participants can update their match's call rooms"
  ON public.call_rooms
  FOR UPDATE
  TO authenticated
  USING (public.is_match_participant(match_id, auth.uid()))
  WITH CHECK (public.is_match_participant(match_id, auth.uid()));
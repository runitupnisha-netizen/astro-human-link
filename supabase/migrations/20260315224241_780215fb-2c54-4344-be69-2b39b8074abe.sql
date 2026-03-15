-- Allow users to update messages in their matches (for read receipts)
CREATE POLICY "Users can update messages in their matches"
ON public.messages
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM matches
    WHERE matches.id = messages.match_id
    AND (matches.user_a = auth.uid() OR matches.user_b = auth.uid())
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM matches
    WHERE matches.id = messages.match_id
    AND (matches.user_a = auth.uid() OR matches.user_b = auth.uid())
  )
);
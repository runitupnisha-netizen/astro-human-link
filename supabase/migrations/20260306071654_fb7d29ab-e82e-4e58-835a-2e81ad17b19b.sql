ALTER TABLE public.swipes DROP CONSTRAINT swipes_action_check;
ALTER TABLE public.swipes ADD CONSTRAINT swipes_action_check CHECK (action = ANY (ARRAY['like'::text, 'pass'::text, 'super_like'::text]))
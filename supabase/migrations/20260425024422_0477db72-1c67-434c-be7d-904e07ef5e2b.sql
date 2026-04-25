ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS mars_sign text,
ADD COLUMN IF NOT EXISTS mercury_sign text;
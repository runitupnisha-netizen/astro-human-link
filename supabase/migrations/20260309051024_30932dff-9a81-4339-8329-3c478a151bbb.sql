ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS gender text,
ADD COLUMN IF NOT EXISTS preferred_genders text[] DEFAULT '{}'::text[];
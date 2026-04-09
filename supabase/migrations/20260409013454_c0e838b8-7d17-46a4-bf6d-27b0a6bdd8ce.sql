
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS username text UNIQUE,
ADD COLUMN IF NOT EXISTS about_me text,
ADD COLUMN IF NOT EXISTS preferred_language text DEFAULT 'English';

CREATE UNIQUE INDEX IF NOT EXISTS idx_profiles_username ON public.profiles (username) WHERE username IS NOT NULL;

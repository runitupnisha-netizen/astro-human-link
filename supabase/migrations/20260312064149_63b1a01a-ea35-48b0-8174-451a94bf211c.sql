ALTER TABLE public.profiles 
  ADD COLUMN IF NOT EXISTS current_city text,
  ADD COLUMN IF NOT EXISTS current_latitude double precision,
  ADD COLUMN IF NOT EXISTS current_longitude double precision,
  ADD COLUMN IF NOT EXISTS max_distance_km integer DEFAULT 100;
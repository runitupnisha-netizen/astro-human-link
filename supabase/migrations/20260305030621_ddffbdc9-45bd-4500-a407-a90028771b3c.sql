
ALTER TABLE public.profiles
  ADD COLUMN kids_preference text DEFAULT NULL,
  ADD COLUMN drinking text DEFAULT NULL,
  ADD COLUMN smoking text DEFAULT NULL,
  ADD COLUMN substances text DEFAULT NULL;

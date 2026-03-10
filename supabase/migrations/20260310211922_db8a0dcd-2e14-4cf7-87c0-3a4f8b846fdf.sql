
-- Create profile_photos table
CREATE TABLE public.profile_photos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  photo_url text NOT NULL,
  display_order integer NOT NULL DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.profile_photos ENABLE ROW LEVEL SECURITY;

-- Authenticated users can view any profile photos
CREATE POLICY "Anyone can view profile photos"
  ON public.profile_photos FOR SELECT
  TO authenticated
  USING (true);

-- Users can insert their own photos
CREATE POLICY "Users can insert own photos"
  ON public.profile_photos FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Users can update their own photos
CREATE POLICY "Users can update own photos"
  ON public.profile_photos FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id);

-- Users can delete their own photos
CREATE POLICY "Users can delete own photos"
  ON public.profile_photos FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

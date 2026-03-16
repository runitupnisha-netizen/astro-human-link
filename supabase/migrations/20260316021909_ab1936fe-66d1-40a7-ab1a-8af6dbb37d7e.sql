
-- Create photo_verifications table
CREATE TABLE public.photo_verifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  selfie_url text NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  created_at timestamptz NOT NULL DEFAULT now(),
  reviewed_at timestamptz,
  UNIQUE(user_id)
);

ALTER TABLE public.photo_verifications ENABLE ROW LEVEL SECURITY;

-- Users can view their own verification
CREATE POLICY "Users can view own verification"
ON public.photo_verifications FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- Users can insert their own verification
CREATE POLICY "Users can insert own verification"
ON public.photo_verifications FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- Users can update their own verification (resubmit)
CREATE POLICY "Users can update own verification"
ON public.photo_verifications FOR UPDATE
TO authenticated
USING (auth.uid() = user_id);

-- Allow all authenticated users to read verification status of others (for badge display)
CREATE POLICY "Anyone can check verification status"
ON public.photo_verifications FOR SELECT
TO authenticated
USING (true);

-- Create verification-selfies storage bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('verification-selfies', 'verification-selfies', false)
ON CONFLICT (id) DO NOTHING;

-- Only authenticated users can upload selfies to their own folder
CREATE POLICY "Users can upload verification selfies"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'verification-selfies' AND (storage.foldername(name))[1] = auth.uid()::text);

-- Users can view their own selfies
CREATE POLICY "Users can view own verification selfies"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'verification-selfies' AND (storage.foldername(name))[1] = auth.uid()::text);

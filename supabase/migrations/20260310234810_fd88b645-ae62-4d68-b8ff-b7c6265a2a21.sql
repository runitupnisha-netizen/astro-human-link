-- Drop restrictive policies and recreate as permissive
DROP POLICY IF EXISTS "Anyone can view profile photos" ON public.profile_photos;
DROP POLICY IF EXISTS "Users can delete own photos" ON public.profile_photos;
DROP POLICY IF EXISTS "Users can insert own photos" ON public.profile_photos;
DROP POLICY IF EXISTS "Users can update own photos" ON public.profile_photos;

CREATE POLICY "Anyone can view profile photos"
ON public.profile_photos FOR SELECT TO authenticated
USING (true);

CREATE POLICY "Users can insert own photos"
ON public.profile_photos FOR INSERT TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own photos"
ON public.profile_photos FOR UPDATE TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own photos"
ON public.profile_photos FOR DELETE TO authenticated
USING (auth.uid() = user_id);
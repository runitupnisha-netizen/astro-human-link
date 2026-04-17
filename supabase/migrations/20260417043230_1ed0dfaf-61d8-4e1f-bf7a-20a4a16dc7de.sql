
-- Restrict avatar bucket listing: individual files stay publicly readable via getPublicUrl,
-- but listing the entire bucket is owner-only. We do this by replacing any blanket SELECT
-- policy on storage.objects for bucket_id='avatars' with a scoped one.

-- Drop any existing permissive avatar SELECT policies
DO $$
DECLARE pol record;
BEGIN
  FOR pol IN
    SELECT policyname FROM pg_policies
    WHERE schemaname = 'storage' AND tablename = 'objects'
      AND (qual ILIKE '%avatars%' OR policyname ILIKE '%avatar%')
      AND cmd = 'SELECT'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON storage.objects', pol.policyname);
  END LOOP;
END $$;

-- Owner can list/read their own avatar files
CREATE POLICY "Owners can list own avatar files"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'avatars'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Owner can upload/update/delete their own avatar files
CREATE POLICY "Owners can upload own avatar files"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'avatars'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Owners can update own avatar files"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'avatars'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Owners can delete own avatar files"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'avatars'
  AND auth.uid()::text = (storage.foldername(name))[1]
);
-- Note: bucket remains public=true so getPublicUrl() continues to serve individual avatar files
-- via the CDN without requiring a SELECT policy. Listing the bucket is now owner-only.

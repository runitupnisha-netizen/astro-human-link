-- Voice intro storage policy fix for paths like voice-intros/{user_id}/file.webm
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage'
      AND tablename = 'objects'
      AND policyname = 'Users can upload own voice intros'
  ) THEN
    CREATE POLICY "Users can upload own voice intros"
    ON storage.objects
    FOR INSERT
    TO authenticated
    WITH CHECK (
      bucket_id = 'voice-messages'
      AND (storage.foldername(name))[1] = 'voice-intros'
      AND (storage.foldername(name))[2] = auth.uid()::text
    );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage'
      AND tablename = 'objects'
      AND policyname = 'Users can update own voice intros'
  ) THEN
    CREATE POLICY "Users can update own voice intros"
    ON storage.objects
    FOR UPDATE
    TO authenticated
    USING (
      bucket_id = 'voice-messages'
      AND (storage.foldername(name))[1] = 'voice-intros'
      AND (storage.foldername(name))[2] = auth.uid()::text
    )
    WITH CHECK (
      bucket_id = 'voice-messages'
      AND (storage.foldername(name))[1] = 'voice-intros'
      AND (storage.foldername(name))[2] = auth.uid()::text
    );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage'
      AND tablename = 'objects'
      AND policyname = 'Users can delete own voice intros'
  ) THEN
    CREATE POLICY "Users can delete own voice intros"
    ON storage.objects
    FOR DELETE
    TO authenticated
    USING (
      bucket_id = 'voice-messages'
      AND (storage.foldername(name))[1] = 'voice-intros'
      AND (storage.foldername(name))[2] = auth.uid()::text
    );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage'
      AND tablename = 'objects'
      AND policyname = 'Public can play profile voice intros'
  ) THEN
    CREATE POLICY "Public can play profile voice intros"
    ON storage.objects
    FOR SELECT
    TO anon, authenticated
    USING (
      bucket_id = 'voice-messages'
      AND (storage.foldername(name))[1] = 'voice-intros'
    );
  END IF;
END $$;

-- Ensure avatar/profile photo storage remains correctly configured.
UPDATE storage.buckets
SET public = true
WHERE id = 'avatars';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage'
      AND tablename = 'objects'
      AND policyname = 'Public can view avatar files'
  ) THEN
    CREATE POLICY "Public can view avatar files"
    ON storage.objects
    FOR SELECT
    TO anon, authenticated
    USING (bucket_id = 'avatars');
  END IF;
END $$;
-- =====================================================
-- FILE VAULT FIX — Run this in Supabase SQL Editor
-- Dashboard > SQL Editor > New query > Paste > Run
-- =====================================================

-- 1. Remove any old storage policies
DROP POLICY IF EXISTS "Users can upload to own folder" ON storage.objects;
DROP POLICY IF EXISTS "Public read access for user-files" ON storage.objects;
DROP POLICY IF EXISTS "Users can update own files" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete own files" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload files" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can view own files" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can update own files" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can delete own files" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated uploads" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated reads" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated deletes" ON storage.objects;

-- 2. Create storage policies for user-files bucket
-- INSERT: authenticated users upload to their own folder
CREATE POLICY "Users can upload to own folder"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'user-files'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- SELECT: anyone can read (public bucket)
CREATE POLICY "Public read access for user-files"
ON storage.objects FOR SELECT TO public
USING (bucket_id = 'user-files');

-- UPDATE: authenticated users can update their own files
CREATE POLICY "Users can update own files"
ON storage.objects FOR UPDATE TO authenticated
USING (
  bucket_id = 'user-files'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- DELETE: authenticated users can delete their own files
CREATE POLICY "Users can delete own files"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'user-files'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- 3. Fix the category constraint (add 'doc' and 'image')
ALTER TABLE public.user_files DROP CONSTRAINT IF EXISTS user_files_category_check;
ALTER TABLE public.user_files ADD CONSTRAINT user_files_category_check
  CHECK (category IN ('cad', 'drawing', 'specification', 'nda', 'certificate', 'general', 'doc', 'image'));

-- 4. Clean up orphaned records (files that failed to upload to storage)
DELETE FROM public.user_files WHERE storage_path IS NULL;

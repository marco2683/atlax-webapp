-- ============================================================
-- Create rfq-uploads storage bucket for bulk RFQ uploads
-- Run this in Supabase SQL Editor
-- ============================================================

-- Create the storage bucket
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'rfq-uploads',
  'rfq-uploads',
  false,  -- private bucket, files accessed via signed URLs
  104857600, -- 100MB max file size
  NULL  -- allow all MIME types (CAD files have varying types)
)
ON CONFLICT (id) DO NOTHING;

-- Storage policies: allow authenticated users to upload/read their own files
CREATE POLICY "Users can upload RFQ files"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'rfq-uploads'
    AND (storage.foldername(name))[1] = 'rfq'
    AND (storage.foldername(name))[2] = auth.uid()::text
  );

CREATE POLICY "Users can read their own RFQ files"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'rfq-uploads'
    AND (storage.foldername(name))[1] = 'rfq'
    AND (storage.foldername(name))[2] = auth.uid()::text
  );

CREATE POLICY "Users can delete their own RFQ files"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'rfq-uploads'
    AND (storage.foldername(name))[1] = 'rfq'
    AND (storage.foldername(name))[2] = auth.uid()::text
  );

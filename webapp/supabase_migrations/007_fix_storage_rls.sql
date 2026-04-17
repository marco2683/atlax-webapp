-- =============================================================================
-- 007_fix_storage_rls.sql
-- Fix: "new row violates row-level security policy" on product_assets uploads
-- =============================================================================
-- The previous 005_storage_policies.sql may not have been applied, or existing
-- conflicting policies are blocking uploads. This migration is idempotent.
-- Run in Supabase Dashboard > SQL Editor
-- =============================================================================

-- ── 1. Ensure bucket exists and is public ─────────────────────────────────────
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'product_assets',
  'product_assets',
  true,
  52428800,
  ARRAY[
    'image/jpeg','image/jpg','image/png','image/webp','image/gif','image/svg+xml',
    'application/pdf',
    'video/mp4','video/webm',
    'application/octet-stream',
    'model/stl',
    'application/x-step',
    'application/STEP',
    'application/vnd.ms-pki.stl'
  ]
)
ON CONFLICT (id) DO UPDATE SET
  public = true,
  file_size_limit = 52428800;


-- ── 2. Drop ALL existing policies on storage.objects for this bucket ──────────
-- (drop by known names from 005 and any others)
DO $$
DECLARE
  pol record;
BEGIN
  FOR pol IN
    SELECT policyname
    FROM pg_policies
    WHERE schemaname = 'storage' AND tablename = 'objects'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON storage.objects', pol.policyname);
  END LOOP;
END $$;


-- ── 3. Allow full public access to product_assets (SELECT) ───────────────────
CREATE POLICY "product_assets_select"
ON storage.objects FOR SELECT
USING ( bucket_id = 'product_assets' );


-- ── 4. Allow INSERT for authenticated users ───────────────────────────────────
CREATE POLICY "product_assets_insert_auth"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK ( bucket_id = 'product_assets' );


-- ── 5. Allow INSERT for anon users (supplier dashboard using anon key) ────────
CREATE POLICY "product_assets_insert_anon"
ON storage.objects FOR INSERT
TO anon
WITH CHECK ( bucket_id = 'product_assets' );


-- ── 6. Allow UPDATE for authenticated ─────────────────────────────────────────
CREATE POLICY "product_assets_update_auth"
ON storage.objects FOR UPDATE
TO authenticated
USING ( bucket_id = 'product_assets' );


-- ── 7. Allow UPDATE for anon ──────────────────────────────────────────────────
CREATE POLICY "product_assets_update_anon"
ON storage.objects FOR UPDATE
TO anon
USING ( bucket_id = 'product_assets' );


-- ── 8. Allow DELETE for authenticated ────────────────────────────────────────
CREATE POLICY "product_assets_delete_auth"
ON storage.objects FOR DELETE
TO authenticated
USING ( bucket_id = 'product_assets' );

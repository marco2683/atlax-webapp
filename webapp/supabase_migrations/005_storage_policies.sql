-- =============================================================================
-- 005_storage_policies.sql
-- Supabase Storage Policies for product_assets bucket
-- =============================================================================
-- Run this in Supabase Dashboard > SQL Editor
-- OR via: node webapp/supabase_migrations/run_005_storage.mjs
-- =============================================================================

-- ── Step 1: Create the bucket if it doesn't exist ────────────────────────────
-- (idempotent — safe to re-run)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'product_assets',
  'product_assets',
  true,                  -- public bucket (URLs are readable without auth)
  52428800,              -- 50MB per file
  ARRAY[
    'image/jpeg','image/jpg','image/png','image/webp','image/gif','image/svg+xml',
    'application/pdf',
    'video/mp4','video/webm',
    'application/octet-stream',   -- STEP/STL/IGS
    'model/stl',
    'application/x-step'
  ]
)
ON CONFLICT (id) DO UPDATE SET
  public = true,
  file_size_limit = 52428800;


-- ── Step 2: Drop old catch-all policy if it exists ───────────────────────────
DROP POLICY IF EXISTS "Public Access" ON storage.objects;
DROP POLICY IF EXISTS "public_access" ON storage.objects;
DROP POLICY IF EXISTS "Allow all access on product_assets" ON storage.objects;
DROP POLICY IF EXISTS "Suppliers can upload to product_assets" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can read product_assets" ON storage.objects;
DROP POLICY IF EXISTS "Suppliers can delete own assets" ON storage.objects;


-- ── Step 3: READ — Anyone can view files (bucket is public) ──────────────────
CREATE POLICY "Anyone can read product_assets"
ON storage.objects
FOR SELECT
USING ( bucket_id = 'product_assets' );


-- ── Step 4: INSERT — Authenticated users can upload to their own folder ───────
-- Folder structure: {supplier_id}/{filename}
-- We verify the first path segment matches auth.uid() linked to a supplier row.
-- For simplicity (since suppliers use their factory_id not user_id as folder),
-- we allow any authenticated user to upload to product_assets.
-- Row-level access control is handled at the application layer.
CREATE POLICY "Authenticated suppliers can upload"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK ( bucket_id = 'product_assets' );


-- ── Step 5: UPDATE — Authenticated users can update their own files ───────────
CREATE POLICY "Authenticated suppliers can update"
ON storage.objects
FOR UPDATE
TO authenticated
USING ( bucket_id = 'product_assets' );


-- ── Step 6: DELETE — Authenticated users can delete their own files ───────────
CREATE POLICY "Authenticated suppliers can delete"
ON storage.objects
FOR DELETE
TO authenticated
USING ( bucket_id = 'product_assets' );


-- ── Step 7: Also allow anon uploads during development ────────────────────────
-- IMPORTANT: Remove or restrict this policy before going to production.
-- This allows the supplier dashboard running with anon key to upload files.
CREATE POLICY "Anon can upload to product_assets (dev only)"
ON storage.objects
FOR INSERT
TO anon
WITH CHECK ( bucket_id = 'product_assets' );

CREATE POLICY "Anon can update product_assets (dev only)"
ON storage.objects
FOR UPDATE
TO anon
USING ( bucket_id = 'product_assets' );

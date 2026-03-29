"""
Fix File Vault - Supabase Storage + Database Repair Script
==========================================================
Addresses:
1. Storage bucket creation with public access policies
2. Storage RLS policies for authenticated upload/download/delete
3. Database category constraint fix (adds 'doc' to allowed values)
4. Cleanup of orphaned records (storage_path = null)
"""

import os
import sys
import json
import requests

# Force UTF-8 output on Windows
if sys.platform == 'win32':
    sys.stdout.reconfigure(encoding='utf-8')
    sys.stderr.reconfigure(encoding='utf-8')

SUPABASE_URL = 'https://qvxrwbcmyrugjevgvujb.supabase.co'
SERVICE_KEY = 'YOUR_SUPABASE_SERVICE_ROLE_KEY'

HEADERS = {
    'apikey': SERVICE_KEY,
    'Authorization': f'Bearer {SERVICE_KEY}',
    'Content-Type': 'application/json',
    'Prefer': 'return=minimal',
}

HEADERS_JSON = {
    'apikey': SERVICE_KEY,
    'Authorization': f'Bearer {SERVICE_KEY}',
    'Content-Type': 'application/json',
}


def log(msg, level='INFO'):
    symbols = {'INFO': '[OK]', 'WARN': '[!!]', 'ERROR': '[ERR]', 'STEP': '[>>]'}
    print(f"  {symbols.get(level, '[--]')} {msg}")


def step(title):
    print(f"\n{'='*60}")
    print(f"  {title}")
    print(f"{'='*60}")


# -------------------------------------------------------
# STEP 1: Create storage bucket
# -------------------------------------------------------
def setup_storage_bucket():
    step("STEP 1: Storage Bucket Setup")
    
    # Check if bucket exists
    resp = requests.get(f'{SUPABASE_URL}/storage/v1/bucket', headers=HEADERS_JSON)
    
    if resp.status_code == 200:
        buckets = resp.json()
        bucket_names = [b['name'] for b in buckets]
        log(f"Existing buckets: {bucket_names}")
        
        if 'user-files' in bucket_names:
            log("Bucket 'user-files' already exists")
            # Update it to be public
            resp = requests.put(
                f'{SUPABASE_URL}/storage/v1/bucket/user-files',
                headers=HEADERS_JSON,
                json={
                    'public': True,
                    'file_size_limit': 52428800,
                    'allowed_mime_types': None
                }
            )
            if resp.status_code in (200, 204):
                log("Updated bucket to public access with 50MB limit")
            else:
                log(f"Bucket update response: {resp.status_code} - {resp.text}", 'WARN')
            return True
    
    # Create bucket
    log("Creating 'user-files' bucket...", 'STEP')
    resp = requests.post(
        f'{SUPABASE_URL}/storage/v1/bucket',
        headers=HEADERS_JSON,
        json={
            'id': 'user-files',
            'name': 'user-files',
            'public': True,
            'file_size_limit': 52428800,
            'allowed_mime_types': None
        }
    )
    
    if resp.status_code in (200, 201):
        log("Bucket 'user-files' created successfully!")
        return True
    else:
        log(f"Failed to create bucket: {resp.status_code} - {resp.text}", 'ERROR')
        return False


# -------------------------------------------------------
# STEP 2: Check existing DB records
# -------------------------------------------------------
def check_db_records():
    step("STEP 2: Check Existing DB Records")
    
    resp = requests.get(
        f'{SUPABASE_URL}/rest/v1/user_files?select=id,file_name,storage_path,meta,category&order=created_at.desc&limit=20',
        headers=HEADERS_JSON
    )
    
    if resp.status_code == 200:
        records = resp.json()
        log(f"Found {len(records)} file records in DB")
        
        orphaned = [r for r in records if not r.get('storage_path')]
        healthy = [r for r in records if r.get('storage_path')]
        
        log(f"  Healthy (with storage_path): {len(healthy)}")
        log(f"  Orphaned (no storage_path):  {len(orphaned)}")
        
        for r in records:
            status = 'OK' if r.get('storage_path') else 'ORPHAN'
            log(f"  [{status}] {r['file_name']} | cat={r.get('category')} | path={r.get('storage_path', 'NULL')}")
        
        return records, orphaned
    else:
        log(f"Failed to query records: {resp.status_code} - {resp.text}", 'ERROR')
        return [], []


# -------------------------------------------------------
# STEP 3: Clean up orphaned records
# -------------------------------------------------------
def cleanup_orphaned(orphaned):
    step("STEP 3: Cleanup Orphaned Records")
    
    if not orphaned:
        log("No orphaned records to clean up!")
        return
    
    log(f"Deleting {len(orphaned)} orphaned records...", 'STEP')
    
    for record in orphaned:
        resp = requests.delete(
            f'{SUPABASE_URL}/rest/v1/user_files?id=eq.{record["id"]}',
            headers=HEADERS
        )
        if resp.status_code in (200, 204):
            log(f"Deleted: {record['file_name']}")
        else:
            log(f"Failed to delete {record['file_name']}: {resp.status_code} - {resp.text}", 'ERROR')


# -------------------------------------------------------
# STEP 4: Test upload flow
# -------------------------------------------------------
def test_upload():
    step("STEP 4: Test Storage Upload (dummy file)")
    
    # Get user info - we need a real user ID
    resp = requests.get(
        f'{SUPABASE_URL}/rest/v1/user_files?select=user_id&limit=1',
        headers=HEADERS_JSON
    )
    
    if resp.status_code == 200 and resp.json():
        user_id = resp.json()[0].get('user_id')
        log(f"Test user ID: {user_id}")
    else:
        log("No users found to test with - skipping upload test", 'WARN')
        return
    
    # Try uploading a test file via service key
    test_content = b"test file content for storage verification"
    test_path = f"{user_id}/test_verification.txt"
    
    resp = requests.post(
        f'{SUPABASE_URL}/storage/v1/object/user-files/{test_path}',
        headers={
            'apikey': SERVICE_KEY,
            'Authorization': f'Bearer {SERVICE_KEY}',
            'Content-Type': 'text/plain',
        },
        data=test_content
    )
    
    if resp.status_code in (200, 201):
        log(f"Test upload SUCCESS! Path: {test_path}")
        
        # Verify it's accessible
        public_url = f'{SUPABASE_URL}/storage/v1/object/public/user-files/{test_path}'
        verify = requests.get(public_url)
        if verify.status_code == 200:
            log(f"Public URL accessible: {public_url}")
        else:
            log(f"Public URL not accessible ({verify.status_code})", 'WARN')
        
        # Clean up test file
        resp = requests.delete(
            f'{SUPABASE_URL}/storage/v1/object/user-files/{test_path}',
            headers={
                'apikey': SERVICE_KEY,
                'Authorization': f'Bearer {SERVICE_KEY}',
            }
        )
        if resp.status_code in (200, 204):
            log("Test file cleaned up")
    else:
        log(f"Test upload FAILED: {resp.status_code} - {resp.text}", 'ERROR')
        log("The storage bucket is not properly configured!", 'ERROR')


# -------------------------------------------------------
# MAIN
# -------------------------------------------------------
if __name__ == '__main__':
    print("\n" + "="*60)
    print("  FILE VAULT FIX - Supabase Storage + DB Repair")
    print("="*60)
    print(f"  URL: {SUPABASE_URL}")
    
    # Step 1: Create/update storage bucket
    bucket_ok = setup_storage_bucket()
    
    # Step 2: Check DB records
    records, orphaned = check_db_records()
    
    # Step 3: Clean up orphaned records (auto-yes)
    if orphaned:
        cleanup_orphaned(orphaned)
    
    # Step 4: Test upload
    test_upload()
    
    # Print the SQL that needs to be run manually
    step("MANUAL SQL REQUIRED")
    print("""
  The following SQL MUST be run in Supabase SQL Editor
  (Dashboard > SQL Editor > New query > Paste > Run):

  --------------------------------------------------------
""")
    
    manual_sql = """
-- =====================================================
-- STORAGE POLICIES for user-files bucket
-- =====================================================

-- Remove any old policies
DROP POLICY IF EXISTS "Users can upload to own folder" ON storage.objects;
DROP POLICY IF EXISTS "Users can read own files" ON storage.objects;
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

-- INSERT: authenticated users upload to their folder (uid/filename)
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

-- UPDATE: authenticated users update their own files
CREATE POLICY "Users can update own files"
ON storage.objects FOR UPDATE TO authenticated
USING (
  bucket_id = 'user-files'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- DELETE: authenticated users delete their own files
CREATE POLICY "Users can delete own files"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'user-files'
  AND (storage.foldername(name))[1] = auth.uid()::text
);


-- =====================================================
-- FIX category constraint (add 'doc' and 'image')
-- =====================================================
ALTER TABLE public.user_files DROP CONSTRAINT IF EXISTS user_files_category_check;
ALTER TABLE public.user_files ADD CONSTRAINT user_files_category_check
  CHECK (category IN ('cad', 'drawing', 'specification', 'nda', 'certificate', 'general', 'doc', 'image'));
"""
    print(manual_sql)
    print("  --------------------------------------------------------")
    print()
    log("DONE! Run the SQL above, then test uploading a file.")
    print()

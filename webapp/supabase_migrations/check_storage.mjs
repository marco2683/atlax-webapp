/**
 * check_storage.mjs
 * Directly checks if:
 * 1. The product_assets bucket exists
 * 2. We can list files (READ works)
 * 3. We can upload a tiny test file (WRITE works)
 * 
 * Run: node webapp/supabase_migrations/check_storage.mjs
 */
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://qvxrwbcmyrugjevgvujb.supabase.co';
const ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InF2eHJ3YmNteXJ1Z2pldmd2dWpiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDQwMjM0MDAsImV4cCI6MjA1OTU5OTQwMH0.9BRa36pBaQ7n5kkKHC21n2v_-4T_AcQobcGBtWq3EkY';
const SERVICE_KEY = 'sb_secret_QwAOOiRap1J4bxj2PErckw_3blffr40';

const sb_anon = createClient(SUPABASE_URL, ANON_KEY);
// For service-role tests we'd need the actual service_role JWT, not the secret
// Let's just use anon since that's what the browser client uses

console.log('\n🔍 Checking Supabase Storage...\n');

// 1. Check bucket list
const { data: buckets, error: bucketsErr } = await sb_anon.storage.listBuckets();
if (bucketsErr) {
  console.log('❌ Cannot list buckets:', bucketsErr.message);
} else {
  const found = buckets?.find(b => b.id === 'product_assets');
  if (found) {
    console.log('✅ product_assets bucket EXISTS:', JSON.stringify({ id: found.id, public: found.public, file_size_limit: found.file_size_limit }));
  } else {
    console.log('❌ product_assets bucket NOT FOUND');
    console.log('   Available buckets:', buckets?.map(b => b.id).join(', ') || 'none');
  }
}

// 2. Test READ (list root)
const { data: listData, error: listErr } = await sb_anon.storage.from('product_assets').list('', { limit: 5 });
if (listErr) {
  console.log('❌ READ failed:', listErr.message);
} else {
  console.log('✅ READ works. Files in root:', listData?.length || 0);
}

// 3. Test WRITE (upload a tiny test file)
const testContent = new Blob(['atlasdt_storage_test'], { type: 'text/plain' });
const testPath = `_test/connectivity_check_${Date.now()}.txt`;
const { data: uploadData, error: uploadErr } = await sb_anon.storage
  .from('product_assets')
  .upload(testPath, testContent, { upsert: true });

if (uploadErr) {
  console.log('❌ WRITE failed:', uploadErr.message);
  console.log('\n── Action Required ─────────────────────────────────────────────────────');
  console.log('   Go to: https://supabase.com/dashboard/project/qvxrwbcmyrugjevgvujb/storage/buckets');
  console.log('   1. Create bucket "product_assets" if it doesn\'t exist (set Public = true)');
  console.log('   2. Go to Policies → add policy: INSERT for anon with check: bucket_id = \'product_assets\'');
  console.log('   OR run 005_storage_policies.sql in the SQL Editor');
  console.log('────────────────────────────────────────────────────────────────────────\n');
} else {
  console.log('✅ WRITE works! Test file uploaded:', uploadData?.path);
  // Clean up
  await sb_anon.storage.from('product_assets').remove([testPath]);
  console.log('✅ Storage fully functional. Image and file uploads will work.\n');
}

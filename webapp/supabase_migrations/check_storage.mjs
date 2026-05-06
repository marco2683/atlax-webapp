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
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dir = dirname(fileURLToPath(import.meta.url));
const env = Object.fromEntries(
  readFileSync(join(__dir, '../.env'), 'utf-8')
    .split('\n').filter(l => l.includes('=') && !l.startsWith('#'))
    .map(l => { const [k, ...vs] = l.split('='); return [k.trim(), vs.join('=').trim()]; })
);

const SUPABASE_URL = env.VITE_SUPABASE_URL;
const ANON_KEY = env.VITE_SUPABASE_ANON_KEY;
const SERVICE_KEY = env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !ANON_KEY) {
  console.error('❌ Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY in .env');
  process.exit(1);
}

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

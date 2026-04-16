/**
 * apply_storage_policies.mjs
 * Uses the Supabase Management API (pg/sql endpoint) via the service role secret
 * to apply storage RLS policies.
 */
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
// Extract project ref from URL: https://<ref>.supabase.co
const PROJECT_REF = SUPABASE_URL.replace('https://', '').split('.')[0];
const SERVICE_SECRET = env.SUPABASE_SERVICE_ROLE_KEY;

console.log('\n🔧 Applying storage RLS policies via Management API');
console.log('   Project:', PROJECT_REF);

// The policies we need in the storage.objects table
// Using the Supabase Management API: POST /v1/projects/{ref}/database/query
const policies = [
  // Drop old policies first
  `DROP POLICY IF EXISTS "Public Access" ON storage.objects`,
  `DROP POLICY IF EXISTS "Anon can upload to product_assets (dev only)" ON storage.objects`,
  `DROP POLICY IF EXISTS "Anon can update product_assets (dev only)" ON storage.objects`,
  `DROP POLICY IF EXISTS "Authenticated suppliers can upload" ON storage.objects`,
  `DROP POLICY IF EXISTS "Anyone can read product_assets" ON storage.objects`,

  // Create new policies
  `CREATE POLICY "Anyone can read product_assets" ON storage.objects FOR SELECT USING (bucket_id = 'product_assets')`,
  `CREATE POLICY "Anon can upload to product_assets" ON storage.objects FOR INSERT TO anon WITH CHECK (bucket_id = 'product_assets')`,
  `CREATE POLICY "Authenticated can upload to product_assets" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'product_assets')`,
  `CREATE POLICY "Authenticated can update product_assets" ON storage.objects FOR UPDATE TO authenticated USING (bucket_id = 'product_assets')`,
  `CREATE POLICY "Authenticated can delete product_assets" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'product_assets')`,
];

// Try via Management API
for (const sql of policies) {
  const preview = sql.substring(0, 70);
  
  const res = await fetch(`https://api.supabase.com/v1/projects/${PROJECT_REF}/database/query`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${SERVICE_SECRET}`,
    },
    body: JSON.stringify({ query: sql + ';' })
  });

  const body = await res.text();
  if (res.ok) {
    console.log('  ✅', preview);
  } else {
    // Already exists or "does not exist" errors are OK
    if (body.includes('already exists') || body.includes('does not exist')) {
      console.log('  ⚠️  (skipped, OK):', preview.substring(0,50));
    } else {
      console.log(`  ❌ (${res.status}):`, preview);
      console.log('     ', body.substring(0, 150));
    }
  }
}

console.log('\n✅ Done. Now re-testing upload...');

// Test upload with image/png
import { createClient } from '@supabase/supabase-js';
const sb = createClient(SUPABASE_URL, env.VITE_SUPABASE_ANON_KEY);
const fakeImg = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==', 'base64');
const testPath = `_test/policy_test_${Date.now()}.png`;

const { data, error } = await sb.storage.from('product_assets').upload(testPath, fakeImg, { contentType: 'image/png' });
if (error) {
  console.log('\n❌ Anon upload still failing:', error.message);
  console.log('\n   MANUAL STEP NEEDED:');
  console.log('   1. Go to https://supabase.com/dashboard/project/' + PROJECT_REF + '/storage/buckets');
  console.log('   2. Click "product_assets" → Policies');  
  console.log('   3. Add policy: FOR INSERT, role = anon, WITH CHECK: bucket_id = \'product_assets\'');
  console.log('\n   OR go to SQL Editor and paste this:');
  console.log('   CREATE POLICY "Anon upload" ON storage.objects FOR INSERT TO anon WITH CHECK (bucket_id = \'product_assets\');');
} else {
  console.log('\n✅ Upload works! Path:', data?.path);
  await sb.storage.from('product_assets').remove([testPath]);
  console.log('✅ Storage is fully operational. Image uploads will work in the browser!\n');
}

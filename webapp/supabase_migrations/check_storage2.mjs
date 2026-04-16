/**
 * check_storage2.mjs — Uses correct keys from .env
 */
import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dir = dirname(fileURLToPath(import.meta.url));
const env = Object.fromEntries(
  readFileSync(join(__dir, '../.env'), 'utf-8')
    .split('\n')
    .filter(l => l.includes('=') && !l.startsWith('#'))
    .map(l => { const [k,...vs] = l.split('='); return [k.trim(), vs.join('=').trim()]; })
);

const URL  = env.VITE_SUPABASE_URL;
const ANON = env.VITE_SUPABASE_ANON_KEY;
const SVC  = env.SUPABASE_SERVICE_ROLE_KEY;

const sbAnon = createClient(URL, ANON);
const sbSvc  = createClient(URL, SVC);

console.log('\n🔍 Storage check with env keys\n   URL:', URL);
console.log('   Anon key:', ANON?.substring(0,20)+'...');

// 1. List buckets (service role)
const { data: buckets, error: bErr } = await sbSvc.storage.listBuckets();
console.log('\n1. Bucket list:', bErr ? '❌ '+bErr.message : '✅ '+JSON.stringify(buckets?.map(b=>({id:b.id,public:b.public}))));

const bucket = 'product_assets';
const found = buckets?.find(b => b.id === bucket);
if (!found) {
  console.log('   ➡️  Creating bucket...');
  const { error: cErr } = await sbSvc.storage.createBucket(bucket, { public: true, fileSizeLimit: 52428800 });
  console.log('   Create result:', cErr ? '❌ '+cErr.message : '✅ Created');
} else {
  console.log('   Bucket exists, public:', found.public);
}

// 2. Anon READ
const { error: rErr } = await sbAnon.storage.from(bucket).list('', { limit: 3 });
console.log('\n2. Anon READ:', rErr ? '❌ '+rErr.message : '✅ OK');

// 3. Anon WRITE
const blob = new Blob(['test'], { type: 'text/plain' });
const testPath = `_test/check_${Date.now()}.txt`;
const { data: uData, error: uErr } = await sbAnon.storage.from(bucket).upload(testPath, blob);
console.log('3. Anon WRITE:', uErr ? '❌ '+uErr.message : '✅ OK → '+uData?.path);

if (!uErr) {
  await sbAnon.storage.from(bucket).remove([testPath]);
  console.log('   Test file cleaned up.');
}

if (rErr || uErr) {
  console.log('\n━━━ ACTION REQUIRED ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('Copy and run 005_storage_policies.sql in:');
  console.log(URL.replace('.co', '.co/dashboard/project/').replace('https://','https://supabase.com/dashboard/project/').split('supabase.co')[0]+'supabase.co > SQL Editor');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
} else {
  console.log('\n✅ Storage fully functional — uploads will work!\n');
}

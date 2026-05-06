/**
 * Run migration 004: Add 'priority' column to category_parameters
 * Usage: node supabase_migrations/run_004_priority.mjs
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
const SERVICE_ROLE_KEY = env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error('❌ Missing VITE_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env');
  process.exit(1);
}

async function run() {
  // First, check if the column already exists by querying
  const checkRes = await fetch(`${SUPABASE_URL}/rest/v1/category_parameters?select=priority&limit=1`, {
    headers: {
      'apikey': SERVICE_ROLE_KEY,
      'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
    }
  });

  if (checkRes.ok) {
    const data = await checkRes.json();
    console.log('✅ "priority" column already exists on category_parameters.');
    console.log('   Sample row:', JSON.stringify(data[0] || '(no rows)'));
    
    // Now set all NULL priorities to 'optional'
    const patchRes = await fetch(`${SUPABASE_URL}/rest/v1/category_parameters?priority=is.null`, {
      method: 'PATCH',
      headers: {
        'apikey': SERVICE_ROLE_KEY,
        'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
        'Content-Type': 'application/json',
        'Prefer': 'return=representation'
      },
      body: JSON.stringify({ priority: 'optional' })
    });
    
    if (patchRes.ok) {
      const patched = await patchRes.json();
      console.log(`   Patched ${patched.length} rows with NULL priority → 'optional'`);
    }
    
    return;
  }

  // Column doesn't exist — we need to add it via SQL Editor manually
  // The REST API can't run ALTER TABLE, so let's try the RPC approach
  console.log('❌ "priority" column does NOT exist yet.');
  console.log('');
  console.log('Please run this SQL in Supabase Dashboard → SQL Editor:');
  console.log('');
  console.log(`ALTER TABLE category_parameters ADD COLUMN IF NOT EXISTS priority TEXT NOT NULL DEFAULT 'optional';`);
  console.log('');
  console.log('Then re-run this script to verify.');
}

run().catch(console.error);

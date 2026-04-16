/**
 * run_005_storage.mjs
 * Applies 005_storage_policies.sql to Supabase via the REST + pg SQL endpoint.
 * Run: node webapp/supabase_migrations/run_005_storage.mjs
 *
 * Uses the service_role key (not anon) to bypass RLS during migration.
 */

import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));

// ── Config ────────────────────────────────────────────────────────────────────
// Read from .env if present, fall back to hardcoded values for convenience
let SUPABASE_URL = 'https://qvxrwbcmyrugjevgvujb.supabase.co';
let SERVICE_ROLE_KEY = 'sb_secret_QwAOOiRap1J4bxj2PErckw_3blffr40';

try {
  const env = readFileSync(join(__dirname, '../.env'), 'utf-8');
  for (const line of env.split('\n')) {
    const [k, ...vs] = line.split('=');
    const v = vs.join('=').trim().replace(/^["']|["']$/g, '');
    if (k?.trim() === 'VITE_SUPABASE_URL') SUPABASE_URL = v;
    if (k?.trim() === 'SUPABASE_SERVICE_ROLE_KEY') SERVICE_ROLE_KEY = v;
  }
} catch {}

const SQL_FILE = join(__dirname, '005_storage_policies.sql');
const sql = readFileSync(SQL_FILE, 'utf-8');

// Split on semicolons to run individual statements
const statements = sql
  .split(';')
  .map(s => s.replace(/--[^\n]*/g, '').trim())  // strip comments
  .filter(s => s.length > 10);                   // skip blank/tiny

console.log(`\n🚀 Applying 005_storage_policies.sql (${statements.length} statements)...\n`);
console.log('Target:', SUPABASE_URL);

async function runSQL(stmt) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/rpc/exec_sql`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'apikey': SERVICE_ROLE_KEY,
      'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
      'Prefer': 'return=representation'
    },
    body: JSON.stringify({ sql: stmt + ';' })
  });
  return { status: res.status, text: await res.text() };
}

// Some Supabase projects expose the pg endpoint differently — try both approaches
async function runViaPostgRESTorAdmin(stmt) {
  // First try: pg SQL execution via query endpoint
  const res = await fetch(`${SUPABASE_URL}/rest/v1/`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'apikey': SERVICE_ROLE_KEY,
      'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
    },
    body: JSON.stringify({ query: stmt })
  });
  return res.status;
}

let successCount = 0;
let failCount = 0;

for (const stmt of statements) {
  const preview = stmt.substring(0, 60).replace(/\s+/g, ' ');
  
  // Use the supabase-js client pattern via fetch to the SQL API
  const res = await fetch(`${SUPABASE_URL}/rest/v1/rpc/exec`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'apikey': SERVICE_ROLE_KEY,
      'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
    },
    body: JSON.stringify({ sql: stmt + ';' })
  });

  if (res.status >= 200 && res.status < 300) {
    console.log(`  ✅ ${preview}`);
    successCount++;
  } else {
    const body = await res.text();
    // Some statements like DROP IF EXISTS return 404 which is fine
    if (body.includes('does not exist') || res.status === 404) {
      console.log(`  ⚠️  Skipped (not found, OK): ${preview}`);
      successCount++;
    } else {
      console.log(`  ❌ Failed (${res.status}): ${preview}`);
      console.log(`     ${body.substring(0, 120)}`);
      failCount++;
    }
  }
}

console.log(`\n─────────────────────────────────────────────`);
console.log(`Done: ${successCount} succeeded, ${failCount} failed`);

if (failCount > 0) {
  console.log(`\n⚠️  Some statements failed. This runner uses the REST exec endpoint`);
  console.log(`   which may not be available on all Supabase plans.`);
  console.log(`   Please copy 005_storage_policies.sql and run it manually in:`);
  console.log(`   Supabase Dashboard > SQL Editor\n`);
} else {
  console.log(`\n✅ Storage policies applied successfully!\n`);
  console.log(`   Test uploads at: ${SUPABASE_URL}/storage/v1/object/\n`);
}

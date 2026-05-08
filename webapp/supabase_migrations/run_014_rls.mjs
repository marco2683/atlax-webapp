/**
 * Run migration 014: Add RLS policies for marketplace tables
 * 
 * Usage: node supabase_migrations/run_014_rls.mjs
 */
import 'dotenv/config';
import { readFileSync } from 'fs';

const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SERVICE_KEY  = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error('Missing VITE_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env');
  process.exit(1);
}

const sql = readFileSync('./supabase_migrations/014_marketplace_rls_policies.sql', 'utf8');

// Split into individual statements
const statements = sql
  .split(';')
  .map(s => s.trim())
  .filter(s => s && !s.startsWith('--'));

console.log(`Running ${statements.length} statements...`);

let success = 0;
let failed = 0;

for (const stmt of statements) {
  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/rpc/`, {
      method: 'POST',
      headers: {
        'apikey': SERVICE_KEY,
        'Authorization': `Bearer ${SERVICE_KEY}`,
        'Content-Type': 'application/json',
        'Prefer': 'return=minimal'
      },
      // We can't run raw SQL via REST, so use the SQL endpoint instead
    });
  } catch(e) {
    // REST API can't run DDL — use pg endpoint
  }
}

// Use the Supabase Management API SQL endpoint
const sqlEndpoint = SUPABASE_URL.replace('.supabase.co', '.supabase.co') + '/pg';

// Actually, we need to run each statement via the Supabase SQL Editor API or direct pg connection
// The simplest approach is to use the `pg` endpoint with service role

// Run the full SQL as a single batch
const fullSql = sql;
console.log('\nExecuting migration via Supabase SQL...\n');

const res = await fetch(`${SUPABASE_URL}/rest/v1/rpc/exec_sql`, {
  method: 'POST',
  headers: {
    'apikey': SERVICE_KEY,
    'Authorization': `Bearer ${SERVICE_KEY}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({ query: fullSql })
});

if (res.ok) {
  console.log('✅ Migration completed successfully!');
} else {
  const err = await res.text();
  console.log('⚠️  RPC exec_sql not available (expected). You need to run the SQL manually.');
  console.log('\nPlease run this SQL in your Supabase Dashboard → SQL Editor:\n');
  console.log('File: supabase_migrations/014_marketplace_rls_policies.sql');
  console.log('\nOr copy-paste the following:\n');
  console.log(fullSql);
}

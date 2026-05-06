/**
 * Run migration 011: Add supplier type column
 *
 * Usage: node supabase_migrations/run_011_supplier_type.mjs
 */
import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: join(__dirname, '..', '.env') });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceKey) {
  console.error('Missing VITE_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false }
});

const sql = readFileSync(join(__dirname, '011_supplier_type_column.sql'), 'utf8');

// Split into individual statements and run each
const statements = sql
  .split(';')
  .map(s => s.trim())
  .filter(s => s.length > 0 && !s.startsWith('--'));

console.log(`Running ${statements.length} SQL statements...\n`);

for (const stmt of statements) {
  const preview = stmt.substring(0, 80).replace(/\n/g, ' ');
  process.stdout.write(`  → ${preview}... `);
  const { error } = await supabase.rpc('exec_sql', { sql_string: stmt + ';' }).single();
  if (error) {
    console.log('(using fallback)');
  } else {
    console.log('OK');
  }
}

// Fallback: run via postgres direct if exec_sql isn't available
console.log('\nAttempting full SQL block via rpc...');
const { error: fullErr } = await supabase.rpc('exec_sql', { sql_string: sql });
if (fullErr) {
  console.log('exec_sql not available. Please run the SQL manually in Supabase SQL Editor:');
  console.log('File: supabase_migrations/011_supplier_type_column.sql');
} else {
  console.log('✅ Migration 011 complete!');
}

import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const envPath = path.join(__dirname, '.env');
const envContent = fs.readFileSync(envPath, 'utf8');
const env = {};
envContent.split('\n').forEach(line => {
  const [key, ...vals] = line.trim().split('=');
  if (key) env[key] = vals.join('=');
});

const supabaseUrl = env.VITE_SUPABASE_URL?.trim();
const supabaseKey = env.SUPABASE_SERVICE_ROLE_KEY?.trim(); // Use SERVICE ROLE KEY to update schema if possible

if (!supabaseUrl || !supabaseKey) {
  console.error("Supabase credentials not found in .env");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function fixSchema() {
  console.log('Fixing Profiles schema and buckets using Service Role Key...');

  // Supabase JS doesn't allow ALTER TABLE easily. Let's try HTTP RPC to the SQL executor if we can,
  // Or just tell the user what to run. Let's try calling a pg_graphql execute, or just warn the user.
  console.log("I cannot run ALTER TABLE from the JS client directly without pgmeta plugin or a function.");
  console.log("Please run the following SQL in your Supabase dashboard > SQL Editor:");
  console.log(`
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS age INTEGER,
ADD COLUMN IF NOT EXISTS gender TEXT;
`);
  
  // Actually, wait, sometimes inserting with an unknown column is blocked by Postgrest.
  // We MUST run the SQL in the dashboard.
}

fixSchema();

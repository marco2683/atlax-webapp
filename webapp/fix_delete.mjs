import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '.env') });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("Missing Supabase credentials in .env");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  const query = `
    DROP POLICY IF EXISTS "products_delete_all" ON products;
    CREATE POLICY "products_delete_all" ON products FOR DELETE USING (true);
  `;
  
  // NOTE: This assumes 'exec_sql' exists, which is not guaranteed. 
  // If it doesn't, we will know.
  const { data, error } = await supabase.rpc('exec_sql', { query });
  
  if (error) {
    console.error('RPC failed, you might not have exec_sql. Error:', error);
  } else {
    console.log('Success!', data);
  }
}

run();

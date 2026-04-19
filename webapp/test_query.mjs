import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const env = fs.readFileSync('.env', 'utf8');
const urlMatch = env.match(/VITE_SUPABASE_URL=(.*)/);
const keyMatch = env.match(/VITE_SUPABASE_ANON_KEY=(.*)/);

if (!urlMatch || !keyMatch) {
  console.error("Missing supabase credentials in .env");
  process.exit(1);
}

const supabase = createClient(urlMatch[1].trim(), keyMatch[1].trim());

async function run() {
  const { data: cats } = await supabase.from('component_categories').select('*');
  console.log('Categories:', cats);
}

run();

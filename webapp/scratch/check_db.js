import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

async function checkTable() {
  const { data, error } = await supabase.from('pricing_configs').select('id').limit(1);
  if (error) {
    if (error.code === '42P01') {
      console.log('Table "pricing_configs" does not exist.');
    } else {
      console.log('Error:', error.message);
    }
  } else {
    console.log('Table "pricing_configs" exists.');
  }
}

checkTable();

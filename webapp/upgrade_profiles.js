import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function upgradeAll() {
  console.log("Upgrading all profiles to professional...");
  const { data, error } = await supabase
    .from('profiles')
    .update({ tier: 'professional' })
    .neq('tier', 'foo'); // Dummy condition to update all rows

  if (error) {
    console.error("Error:", error);
  } else {
    console.log("Success! Profiles updated.");
  }
}

upgradeAll();

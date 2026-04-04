import fs from 'fs';
import path from 'path';

// Parse .env manually
const envPath = path.join(process.cwd(), '.env');
const envStr = fs.readFileSync(envPath, 'utf8');
const keyMatch = envStr.match(/SUPABASE_SERVICE_ROLE_KEY=(.+)/);
if (!keyMatch) throw new Error("No key");
const key = keyMatch[1].trim();

const url = "https://qvxrwbcmyrugjevgvujb.supabase.co/rest/v1/profiles";

async function checkProfiles() {
  const res = await fetch(url + "?select=*", {
    headers: {
      "apikey": key,
      "Authorization": `Bearer ${key}`
    }
  });
  const data = await res.json();
  console.log(JSON.stringify(data, null, 2));
}

checkProfiles();

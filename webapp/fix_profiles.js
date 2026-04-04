import fs from 'fs';
import path from 'path';

const envPath = path.join(process.cwd(), '.env');
const envStr = fs.readFileSync(envPath, 'utf8');
const keyMatch = envStr.match(/SUPABASE_SERVICE_ROLE_KEY=(.+)/);
const key = keyMatch[1].trim();

const url = "https://qvxrwbcmyrugjevgvujb.supabase.co/rest/v1/profiles";

async function patch() {
  const c1 = "cus_UGvhkXODim2s5d";
  const c2 = "cus_UGsk3WJEy9WqOR";

  const res1 = await fetch(url + "?id=eq.bfdbd577-c29c-484b-86ac-e7fe2652c7e0", {
    method: "PATCH",
    headers: {
      "apikey": key,
      "Authorization": `Bearer ${key}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ tier: "professional", stripe_customer_id: c1 })
  });

  const res2 = await fetch(url + "?id=eq.9c96a10a-83da-43a0-a12e-6471d23c8350", {
    method: "PATCH",
    headers: {
       "apikey": key,
      "Authorization": `Bearer ${key}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ tier: "professional", stripe_customer_id: c2 })
  });

  console.log("Status 1:", res1.status);
  console.log("Status 2:", res2.status);
}

patch();

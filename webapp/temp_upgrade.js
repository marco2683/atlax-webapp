import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const envFile = fs.readFileSync('.env', 'utf8');
const env = {};
envFile.split('\n').forEach(line => {
  const [key, ...vals] = line.split('=');
  if (key && vals.length) env[key.trim()] = vals.join('=').trim();
});

const sb = createClient(env.VITE_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

async function run() {
  const { data: users, error } = await sb.auth.admin.listUsers();
  if (error) { console.error(error); return; }

  for (const u of users.users) {
    const { data: profile } = await sb.from('profiles').select('tier').eq('id', u.id).single();
    if (u.email === 'marco@mjsproducts.com.au' || u.email === 'support@mjsproducts.com.au' || u.email === 'info@woodylands.com' || u.email.includes('marco')) {
       console.log(`Setting ${u.email} to professional`);
       await sb.from('profiles').update({ tier: 'professional' }).eq('id', u.id);
    }
    console.log(u.email, profile ? profile.tier : 'NO_PROFILE');
  }
}
run();

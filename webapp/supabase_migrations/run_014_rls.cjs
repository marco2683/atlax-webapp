const fs = require('fs');

// Parse .env manually
const envText = fs.readFileSync('.env', 'utf8');
const env = {};
envText.split(/\r?\n/).forEach(line => {
  const idx = line.indexOf('=');
  if (idx > 0) {
    const key = line.slice(0, idx).trim();
    const val = line.slice(idx + 1).trim().replace(/^"|"$/g, '');
    env[key] = val;
  }
});

const sql = fs.readFileSync('./supabase_migrations/014_marketplace_rls_policies.sql', 'utf8');
const url = env.VITE_SUPABASE_URL;
const key = env.SUPABASE_SERVICE_ROLE_KEY;

console.log('Supabase URL:', url);
console.log('SQL length:', sql.length, 'chars');

// Try the exec_sql RPC (may not exist)
fetch(url + '/rest/v1/rpc/exec_sql', {
  method: 'POST',
  headers: {
    'apikey': key,
    'Authorization': 'Bearer ' + key,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({ query: sql })
}).then(async r => {
  console.log('Status:', r.status);
  const body = await r.text();
  if (r.ok) {
    console.log('Migration completed successfully!');
  } else {
    console.log('exec_sql RPC not available.');
    console.log('Response:', body.slice(0, 200));
    console.log('\n========================================');
    console.log('Please run the SQL manually in Supabase Dashboard > SQL Editor.');
    console.log('File: supabase_migrations/014_marketplace_rls_policies.sql');
    console.log('========================================\n');
  }
}).catch(e => console.error('Fetch error:', e));

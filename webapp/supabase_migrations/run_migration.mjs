/**
 * One-time migration script to create the taxonomy_images table in Supabase.
 * Run: node webapp/supabase_migrations/run_migration.mjs
 */

const SUPABASE_URL = 'https://qvxrwbcmyrugjevgvujb.supabase.co';
const SERVICE_ROLE_KEY = 'sb_secret_QwAOOiRap1J4bxj2PErckw_3blffr40';

async function runMigration() {
  // Use the Supabase Management API / SQL endpoint
  const response = await fetch(`${SUPABASE_URL}/rest/v1/`, {
    method: 'GET',
    headers: {
      'apikey': SERVICE_ROLE_KEY,
      'Authorization': `Bearer ${SERVICE_ROLE_KEY}`
    }
  });
  
  console.log('Supabase connection test:', response.status);
  
  // Try creating the table via raw SQL through the query endpoint
  // Since we can't use exec_sql, let's check if the table exists first
  const checkRes = await fetch(`${SUPABASE_URL}/rest/v1/taxonomy_images?select=*&limit=1`, {
    headers: {
      'apikey': SERVICE_ROLE_KEY,
      'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
    }
  });
  
  if (checkRes.status === 200) {
    console.log('✅ taxonomy_images table already exists!');
    const data = await checkRes.json();
    console.log('Current rows:', data.length);
  } else if (checkRes.status === 404) {
    console.log('❌ Table does not exist yet. Please create it manually in Supabase Dashboard > SQL Editor.');
    console.log('SQL:');
    console.log(`
CREATE TABLE IF NOT EXISTS taxonomy_images (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    tech_id text NOT NULL,
    image_url text NOT NULL,
    created_at timestamptz DEFAULT now(),
    UNIQUE(tech_id, image_url)
);

ALTER TABLE taxonomy_images ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read taxonomy images" ON taxonomy_images
    FOR SELECT USING (true);

CREATE POLICY "Service role full access" ON taxonomy_images
    FOR ALL USING (true) WITH CHECK (true);
    `);
  } else {
    console.log('Unexpected response:', checkRes.status, await checkRes.text());
  }
}

runMigration().catch(console.error);

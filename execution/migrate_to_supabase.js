import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

// Parse the .env file in the webapp directory
const envPath = path.join(process.cwd(), '../webapp/.env');
const envContent = fs.readFileSync(envPath, 'utf8');
const env = {};
envContent.split('\n').forEach(line => {
  const [key, ...vals] = line.trim().split('=');
  if (key) env[key] = vals.join('=');
});

const supabaseUrl = env.VITE_SUPABASE_URL;
const supabaseKey = env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("Supabase credentials not found in ../webapp/.env");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function migrate() {
  console.log('Beginning Supabase Migration...');
  
  // 1. Migrate Staff
  console.log('Loading staff.json...');
  const staffPath = path.join(process.cwd(), '../webapp/public/cms/staff.json');
  if (fs.existsSync(staffPath)) {
    const rawStaff = fs.readFileSync(staffPath, 'utf8');
    const staff = JSON.parse(rawStaff);
    
    console.log(`Pushing ${staff.length} staff members to Supabase...`);
    const { error } = await supabase.from('staff').upsert(staff);
    if (error) {
      console.error('Error inserting staff:', error.message);
    } else {
      console.log('✅ Staff migration complete');
    }
  }

  // 2. Migrate Suppliers
  console.log('Loading suppliers.json...');
  const supPath = path.join(process.cwd(), '../webapp/public/cms/suppliers.json');
  if (fs.existsSync(supPath)) {
    const rawSup = fs.readFileSync(supPath, 'utf8');
    const suppliers = JSON.parse(rawSup);
    
    // Convert suppliers to the Supabase JSONB schema format
    const dbSuppliers = suppliers.map(s => {
      // The Supabase schema creates a main id, name, segment, and techGroup.
      // EVERYTHING else goes into the `data` JSONB column.
      const clone = { ...s };
      delete clone.id;
      delete clone.name;
      delete clone.segment;
      delete clone.techGroup;

      return {
        id: s.id,
        name: s.name,
        segment: s.segment,
        tech_group: s.techGroup || '', // Re-mapped for SQL
        data: clone // JSONB payload
      };
    });

    console.log(`Pushing ${dbSuppliers.length} suppliers to Supabase in batches...`);
    
    // Batch inserts into exactly 100 rows per request to avoid payload limits
    const BATCH_SIZE = 100;
    for (let i = 0; i < dbSuppliers.length; i += BATCH_SIZE) {
      const batch = dbSuppliers.slice(i, i + BATCH_SIZE);
      const { error } = await supabase.from('suppliers').upsert(batch);
      if (error) {
        console.error(`Error inserting batch ${i / BATCH_SIZE}:`, error.message);
      } else {
        process.stdout.write(`✅ Uploaded batch ${Math.ceil(i / BATCH_SIZE) + 1} / ${Math.ceil(dbSuppliers.length / BATCH_SIZE)}\r`);
      }
    }
    console.log('\n✅ Supplier migration complete.');
  }

  console.log('\n🎉 All local data mapped to Supabase!');
}

migrate();

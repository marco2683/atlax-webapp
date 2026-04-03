import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const envPath = path.join(__dirname, '.env');
const envContent = fs.readFileSync(envPath, 'utf8');
const env = {};
envContent.split('\n').forEach(line => {
  const [key, ...vals] = line.trim().split('=');
  if (key) env[key] = vals.join('=');
});

const supabaseUrl = env.VITE_SUPABASE_URL?.trim();
const supabaseKey = env.VITE_SUPABASE_ANON_KEY?.trim();

if (!supabaseUrl || !supabaseKey) {
  console.error("Supabase credentials not found in ../webapp/.env");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function migrate() {
  console.log('Beginning Supabase Migration...');
  console.log('Using URL:', supabaseUrl);
  
  // 1. Migrate Staff
  console.log('Loading staff.json...');
  const staffPath = path.join(__dirname, 'public/cms/staff.json');
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
  } else {
      console.log('staff.json missing');
  }

  // 2. Migrate Suppliers
  console.log('Loading suppliers.json...');
  const supPath = path.join(__dirname, 'public/cms/suppliers.json');
  if (fs.existsSync(supPath)) {
    const rawSup = fs.readFileSync(supPath, 'utf8');
    const suppliers = JSON.parse(rawSup);
    
    const dbSuppliers = suppliers.map(s => {
      const clone = { ...s };
      delete clone.id;
      delete clone.name;
      delete clone.segment;
      delete clone.techGroup;

      return {
        id: s.id,
        name: s.name,
        segment: s.segment,
        tech_group: s.techGroup || '',
        data: clone
      };
    });

    console.log(`Pushing ${dbSuppliers.length} suppliers to Supabase in batches...`);
    
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
  } else {
      console.log('suppliers.json missing');
  }

  console.log('\n🎉 All local data mapped to Supabase!');
}

migrate();

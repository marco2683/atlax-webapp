import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

// For downloading images
const downloadImage = async (url) => {
  const proxyUrl = `https://images.weserv.nl/?url=${encodeURIComponent(url)}`;
  const res = await fetch(proxyUrl);
  if (!res.ok) throw new Error(`Failed to fetch ${url} via proxy: ${res.statusText}`);
  const arrayBuffer = await res.arrayBuffer();
  return { buffer: Buffer.from(arrayBuffer), contentType: res.headers.get('content-type') || 'image/jpeg' };
};

const envPath = path.join(process.cwd(), '.env');
const envContent = fs.readFileSync(envPath, 'utf8');
const env = {};
envContent.split('\n').forEach(line => {
  const [key, ...vals] = line.trim().split('=');
  if (key) env[key.trim()] = vals.join('=').trim().replace(/"/g, '');
});

const supabaseUrl = env.VITE_SUPABASE_URL;
const supabaseKey = env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("Missing supabase credentials");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function migrate() {
  console.log("Fetching suppliers...");
  const { data: suppliers, error } = await supabase.from('suppliers').select('id, data');
  if (error) {
    console.error("Error fetching suppliers:", error);
    return;
  }

  const bucket = 'supplier-assets';
  
  // ensure bucket exists or just assume it does. Usually it's 'supplier-assets' or similar.
  // let's list buckets to be sure.
  const { data: buckets } = await supabase.storage.listBuckets();
  console.log("Available buckets:", buckets?.map(b => b.name));

  let totalUpdated = 0;

  for (const sup of suppliers) {
    let updated = false;
    const data = sup.data;
    if (!data.images) continue;

    for (const [cat, imgs] of Object.entries(data.images)) {
      if (!Array.isArray(imgs)) continue;
      
      for (let i = 0; i < imgs.length; i++) {
        const url = imgs[i];
        if (typeof url === 'string' && (url.includes('thefastimg.com') || url.includes('1688.com'))) {
          console.log(`[${sup.id}] Migrating ${url}...`);
          try {
            const { buffer, contentType } = await downloadImage(url);
            let filename = url.split('/').pop().split('?')[0];
            if (!filename || filename.length < 3) filename = `img_${Date.now()}.jpg`;
            const filePath = `migrated/${sup.id}/${filename}`;

            const { error: uploadError } = await supabase.storage.from(bucket).upload(filePath, buffer, { contentType, upsert: true });
            if (uploadError) {
              console.error(`  -> Upload error: ${uploadError.message}`);
              // Try creating bucket if it failed because bucket doesn't exist?
            } else {
              const { data: { publicUrl } } = supabase.storage.from(bucket).getPublicUrl(filePath);
              console.log(`  -> New URL: ${publicUrl}`);
              data.images[cat][i] = publicUrl;
              updated = true;
            }
          } catch (e) {
            console.error(`  -> Failed to migrate:`, e.message);
          }
        }
      }
    }

    if (updated) {
      const { error: updateError } = await supabase.from('suppliers').update({ data }).eq('id', sup.id);
      if (updateError) console.error(`Failed to update DB for ${sup.id}:`, updateError.message);
      else {
        console.log(`✅ Updated supplier ${sup.id} in DB.`);
        totalUpdated++;
      }
    }
  }

  console.log(`\n🎉 Migration complete! Updated ${totalUpdated} suppliers.`);
}

migrate();

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

// Simple script to ensure 'product_assets' bucket exists and is public
const supabaseUrl = 'https://qvxrwbcmyrugjevgvujb.supabase.co';
const serviceKey = 'sb_secret_QwAOOiRap1J4bxj2PErckw_3blffr40';

const supabase = createClient(supabaseUrl, serviceKey);

async function run() {
  console.log('Checking buckets...');
  const { data: buckets, error: listErr } = await supabase.storage.listBuckets();
  if (listErr) {
    console.error('Failed to list buckets:', listErr);
    return;
  }
  
  const hasAssets = buckets.find(b => b.name === 'product_assets');
  if (!hasAssets) {
    console.log('Creating product_assets bucket...');
    const { data, error } = await supabase.storage.createBucket('product_assets', {
      public: true,
      allowedMimeTypes: ['image/png', 'image/jpeg', 'image/gif', 'image/webp', 'image/svg+xml', 'video/mp4', 'application/pdf'],
      fileSizeLimit: 50 * 1024 * 1024 // 50MB
    });
    console.log(error ? error : 'Created successfully!');
  } else {
    console.log('product_assets bucket already exists. Updating to public just in case...');
    await supabase.storage.updateBucket('product_assets', {
      public: true,
      allowedMimeTypes: ['image/png', 'image/jpeg', 'image/gif', 'image/webp', 'image/svg+xml', 'video/mp4', 'application/pdf']
    });
  }
  console.log('Done!');
}

run();

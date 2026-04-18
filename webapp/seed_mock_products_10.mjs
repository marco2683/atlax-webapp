import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const env = fs.readFileSync('.env', 'utf8');
const urlMatch = env.match(/VITE_SUPABASE_URL=(.*)/);
const keyMatch = env.match(/VITE_SUPABASE_ANON_KEY=(.*)/);

const supabase = createClient(urlMatch[1].trim(), keyMatch[1].trim());

async function run() {
  console.log('Seeding MORE mock data for Marketplace UI...');

  // 1. Get or Create a category
  let { data: cat } = await supabase.from('component_categories')
    .select('id')
    .eq('name', 'Microdisplays & Optics')
    .single();

  // 2. Get a valid supplier or make a mock one
  let { data: sup } = await supabase.from('suppliers').select('id').limit(1).single();
  let supplierId = sup?.id || 'sup-mock-999';

  const generatedImages = [
    '/products/img_1.png', 
    '/products/img_2.png', 
    '/products/img_3.png'
  ];

  // 3. Create 10 new products with permutations of generated images
  const mockProducts = [];
  for(let i=0; i<10; i++) {
    // Shuffle the three images so they look slightly different and the thumbnail selection varies
    const shuffledImages = [...generatedImages].sort(() => 0.5 - Math.random());
    mockProducts.push({
      supplier_id: supplierId,
      category_id: cat.id,
      mpn: `OPTO-SYS-${1000 + i}`,
      description: `Precision Optical Engine Assembly Variant V${i+1}.0. Features multi-lens pancake optics and micro-display technology.`,
      stock_quantity: Math.floor(Math.random() * 5000) + 100,
      moq: Math.floor(Math.random() * 10) + 1,
      base_price: (Math.random() * 200 + 50).toFixed(2),
      specs: {
         images: shuffledImages,
         "Resolution": ["1920 x 1080", "3840 x 3840", "1280 x 720"][i % 3],
         "Refresh Rate": ["60Hz", "90Hz", "120Hz"][i % 3],
         "FOV": `${Math.floor(Math.random()*40 + 30)} degrees`
      }
    });
  }

  // Insert products
  for (const p of mockProducts) {
    const { error } = await supabase.from('products').insert(p);
    if (error) {
      console.error("Failed to insert:", p.mpn, error.message);
    } else {
      console.log("Successfully inserted:", p.mpn);
    }
  }

  console.log("Done seeding new 10 products!");
}

run();

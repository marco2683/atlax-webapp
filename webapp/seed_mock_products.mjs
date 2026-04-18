import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const env = fs.readFileSync('.env', 'utf8');
const urlMatch = env.match(/VITE_SUPABASE_URL=(.*)/);
const keyMatch = env.match(/VITE_SUPABASE_ANON_KEY=(.*)/);

const supabase = createClient(urlMatch[1].trim(), keyMatch[1].trim());

async function run() {
  console.log('Seeding mock data for Marketplace UI...');

  // 1. Get or Create a category
  let { data: cat } = await supabase.from('component_categories')
    .select('id')
    .eq('name', 'Microdisplays & Optics')
    .single();

  if (!cat) {
    const { data: newCat, error } = await supabase.from('component_categories')
      .insert({
        name: 'Microdisplays & Optics',
        slug: 'microdisplays_optics'
      })
      .select('id')
      .single();
    if (error) throw error;
    cat = newCat;
  }

  // 2. Get a valid supplier or make a mock one
  let { data: sup } = await supabase.from('suppliers').select('id').limit(1).single();
  let supplierId = sup?.id;

  if (!supplierId) {
    supplierId = 'sup-mock-999';
    await supabase.from('suppliers').insert({
      id: supplierId,
      name: 'Shenzhen Advanced Optics Mfg',
      segment: 'TIER 1',
      tech_group: 'Optoelectronics',
      data: { lat: 22.543, lng: 114.057, country: 'China' }
    });
  }

  // 3. Create 3 products with 3 images each
  const mockProducts = [
    {
      supplier_id: supplierId,
      category_id: cat.id,
      mpn: 'OPTO-X1-PRO',
      description: '0.4" Micro-OLED Display Module 1920x1080 3000nits',
      stock_quantity: 12500,
      moq: 100,
      base_price: 45.50,
      specs: {
         images: [
           "https://images.unsplash.com/photo-1620912189868-30788ee5a51e?auto=format&fit=crop&q=80&w=600&h=600",
           "https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&q=80&w=600&h=600",
           "https://images.unsplash.com/photo-1591461947814-1e5b85a36372?auto=format&fit=crop&q=80&w=600&h=600"
         ],
         "Resolution": "1920 x 1080",
         "Brightness": "3000 cd/m2",
         "Interface": "MIPI DSI"
      }
    },
    {
      supplier_id: supplierId,
      category_id: cat.id,
      mpn: 'OPTO-VR-8K',
      description: '1.03" Dual Micro-OLED VR Display 4K per eye 90Hz',
      stock_quantity: 5000,
      moq: 10,
      base_price: 185.00,
      specs: {
         images: [
           "https://images.unsplash.com/photo-1535223289827-42f1e9919769?auto=format&fit=crop&q=80&w=600&h=600",
           "https://images.unsplash.com/photo-1621644754714-c8c7d605eb80?auto=format&fit=crop&q=80&w=600&h=600",
           "https://images.unsplash.com/photo-1628102491629-778571d893a3?auto=format&fit=crop&q=80&w=600&h=600"
         ],
         "Resolution": "3840 x 3840",
         "Refresh Rate": "90Hz",
         "Interface": "eDP"
      }
    },
    {
      supplier_id: supplierId,
      category_id: cat.id,
      mpn: 'OPTO-HUD-MINI',
      description: '0.23" Micro-LED HUD Engine for AR Smart Glasses',
      stock_quantity: 450,
      moq: 50,
      base_price: 85.00,
      specs: {
         image_url: "https://images.unsplash.com/photo-1550751827-4bd374c3f58b?auto=format&fit=crop&q=80&w=600&h=600",
         images: [
           "https://images.unsplash.com/photo-1550751827-4bd374c3f58b?auto=format&fit=crop&q=80&w=600&h=600",
           "https://images.unsplash.com/photo-1517420704952-d9f397417fc0?auto=format&fit=crop&q=80&w=600&h=600",
           "https://images.unsplash.com/photo-1581092160562-40aa08e78837?auto=format&fit=crop&q=80&w=600&h=600"
         ],
         "Type": "Micro-LED",
         "Peak Brightness": "2,000,000 nits",
         "Field of View": "35 degrees"
      }
    }
  ];

  // Insert products
  for (const p of mockProducts) {
    const { error } = await supabase.from('products').insert(p);
    if (error) {
      console.error("Failed to insert:", p.mpn, error.message);
    } else {
      console.log("Successfully inserted:", p.mpn);
    }
  }

  console.log("Done seeding products!");
}

run();

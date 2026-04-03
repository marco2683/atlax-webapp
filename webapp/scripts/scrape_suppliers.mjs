import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createClient } from '@supabase/supabase-js';
import FirecrawlApp from '@mendable/firecrawl-js';
import dotenv from 'dotenv';

// Use node's built-in fetch if Node >= 18, otherwise you may need node-fetch.
dotenv.config();

// Setup Paths
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const SUPPLIERS_DB_PATH = path.join(__dirname, '..', 'public', 'cms', 'suppliers.json');

// Supabase Configuration
// Ensure these are in your .env file in the webapp directory
const SUPABASE_URL = process.env.SUPABASE_URL || 'YOUR_SUPABASE_URL';
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || 'YOUR_SUPABASE_KEY';
const BUCKET_NAME = 'supplier-media';

// Clients
const firecrawl = new FirecrawlApp({ apiKey: process.env.FIRECRAWL_API_KEY });
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const extractSchema = {
  type: 'object',
  properties: {
    productImages: {
      type: 'array',
      items: { type: 'string' },
      description: 'URLs to exactly 3 high-quality product images demonstrating manufacturing capabilities. Prioritize direct image URLs (.jpg, .png).'
    },
    facilityMedia: {
      type: 'array',
      items: { type: 'string' },
      description: 'URLs to images or videos showing the physical factory floor, equipment, or facility exterior.'
    },
    certifications: {
      type: 'array',
      items: { type: 'string' },
      description: 'Specific names of manufacturing certifications found (e.g. ISO 9001, IATF 16949, RoHS)'
    },
    realAddress: {
      type: 'string',
      description: 'The complete physical factory/headquarters address found on the site.'
    }
  }
};

/**
 * Downloads an image from a URL and uploads it to Supabase Storage.
 * Returns the Supabase public URL on success, or null on failure.
 */
async function downloadAndUploadMedia(url, supplierId, prefix) {
  try {
    const response = await fetch(url, { headers: { 'User-Agent': 'ATLAX-Crawler/1.0' } });
    if (!response.ok) return null;
    
    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    
    const contentType = response.headers.get('content-type') || 'image/jpeg';
    const ext = contentType.split('/')[1] || 'jpg';
    const fileName = `${supplierId}_${prefix}_${Date.now()}.${ext}`;
    
    const { data, error } = await supabase.storage
      .from(BUCKET_NAME)
      .upload(fileName, buffer, {
        contentType,
        upsert: true
      });
      
    if (error) {
      console.error(`[Upload Error] ${fileName}: ${error.message}`);
      return null;
    }
    
    const { data: publicUrlData } = supabase.storage.from(BUCKET_NAME).getPublicUrl(fileName);
    return publicUrlData.publicUrl;
  } catch (err) {
    console.warn(`[Download Error] Failed to process ${url}: ${err.message}`);
    return null;
  }
}

async function runPipeline() {
  console.log('=======================================================');
  console.log(' ATLAX TIER 1 SUPPLIER DATA ENRICHMENT PIPELINE');
  console.log('=======================================================');
  console.log(`Target DB: ${SUPPLIERS_DB_PATH}`);
  
  if (!fs.existsSync(SUPPLIERS_DB_PATH)) {
    console.error('ERROR: `public/cms/suppliers.json` not found!');
    return;
  }
  
  let db = JSON.parse(fs.readFileSync(SUPPLIERS_DB_PATH, 'utf-8'));
  
  // Target: Tier 1 suppliers with a valid website that haven't been enriched yet.
  const targetSuppliers = db.filter(s => 
    s.website && 
    !s.website.includes('example.com') && 
    (s.segment === 'TIER 1' || (s.tags && s.tags.includes('Tier 1'))) &&
    !s.enrichedViaFirecrawl
  );
  
  console.log(`Found ${targetSuppliers.length} pending Tier 1 suppliers to enrich.`);
  if (targetSuppliers.length === 0) return;

  for (let i = 0; i < targetSuppliers.length; i++) {
    const supplier = targetSuppliers[i];
    console.log(`\n[${i+1}/${targetSuppliers.length}] Processing: ${supplier.name}`);
    console.log(`    URL: ${supplier.website}`);
    
    try {
      // 1. Scrape with Firecrawl Extractor
      const response = await firecrawl.scrapeUrl(supplier.website, {
        formats: ['json'],
        jsonOptions: {
            prompt: `Extract manufacturing-related information for the company ${supplier.name}. We specifically need product images, facility media, certifications, and their physical address.`,
            schema: extractSchema
        }
      });
      
      if (!response.success || !response.json) {
        console.warn(`    ⚠️ Failed to scrape. Skipping...`);
        continue;
      }
      
      const data = response.json;
      const uploadedProds = [];
      const uploadedFacs = [];
      
      // 2. Download and Upload Media to Supabase
      if (data.productImages && Array.isArray(data.productImages)) {
        for (const url of data.productImages.slice(0, 3)) { // Max 3
          console.log(`    Downloading Product Image...`);
          const sUrl = await downloadAndUploadMedia(url, supplier.id, 'prod');
          if (sUrl) uploadedProds.push(sUrl);
        }
      }
      
      if (data.facilityMedia && Array.isArray(data.facilityMedia)) {
        for (const url of data.facilityMedia.slice(0, 2)) { // Max 2
          console.log(`    Downloading Facility Media...`);
          const sUrl = await downloadAndUploadMedia(url, supplier.id, 'fac');
          if (sUrl) uploadedFacs.push(sUrl);
        }
      }
      
      // 3. Update the Master JSON DB
      const idx = db.findIndex(s => s.id === supplier.id);
      if (idx !== -1) {
        // Map product images to the portfolio array
        if (uploadedProds.length > 0) {
          db[idx].portfolio = [
            ...(db[idx].portfolio || []),
            ...uploadedProds.map((img, index) => ({ title: `Sample Component ${index+1}`, img }))
          ];
        }
        
        if (uploadedFacs.length > 0) {
          db[idx].facilityImages = uploadedFacs;
          // Set standard cover image if not exists
          if (!db[idx].cover) db[idx].cover = uploadedFacs[0];
        }
        
        if (data.certifications && data.certifications.length > 0) {
           db[idx].certifications = [...new Set([...(db[idx].certifications || []), ...data.certifications])];
        }
        
        if (data.realAddress) {
           db[idx].address = data.realAddress;
        }
        
        db[idx].enrichedViaFirecrawl = true; // Mark as complete
        
        // Save immediately after each success to prevent data loss on crash
        fs.writeFileSync(SUPPLIERS_DB_PATH, JSON.stringify(db, null, 2));
        console.log(`    ✅ Successfully enriched and saved.`);
      }
      
    } catch(err) {
      console.error(`    ❌ Error processing ${supplier.name}:`, err.message);
    }
    
    // Slight delay to prevent rate limits
    await new Promise(r => setTimeout(r, 2000));
  }
  
  console.log('\n=======================================================');
  console.log(' PIPELINE COMPLETE');
  console.log('=======================================================');
}

runPipeline();

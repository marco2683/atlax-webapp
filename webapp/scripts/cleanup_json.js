const fs = require('fs/promises');
const path = require('path');

async function run() {
  const cmsFilePath = path.join(__dirname, '../public/cms/suppliers.json');
  try {
    const raw = await fs.readFile(cmsFilePath, 'utf-8');
    let data = JSON.parse(raw);

    data = data.map(s => {
      // 1. Enforce specific tag case (tags instead of Tags)
      if (s.Tags) {
        s.tags = [...(s.tags || []), ...s.Tags];
        delete s.Tags;
      }

      // 2. Normalize Segment/Tiers
      let tier = (s.segment || '').toString().trim().toUpperCase();
      if (tier.includes('TIA1') || tier.includes('TIER1')) tier = 'TIER 1';
      else if (tier.includes('TIA2') || tier.includes('TIER2')) tier = 'TIER 2';
      else if (tier.includes('OEM') || tier.includes('0EM')) tier = 'OEM';
      else if (tier.includes('CONTRACT') || tier.includes('CM')) tier = 'CM';
      else if (tier.includes('DISTRIBUTOR') || tier.includes('DIST')) tier = 'DISTRIBUTOR';
      s.segment = tier || 'TIER 1'; // default fallback

      // 3. Deduplicate 
      let cleanTech = [...new Set((s.technologies || []).map(t => typeof t === 'string' ? t.trim() : ''))].filter(Boolean);
      let cleanTags = [...new Set((s.tags || []).map(t => typeof t === 'string' ? t.trim() : ''))].filter(Boolean);

      // Clean tech overlaps from tags if they are literally named the exact same thing
      cleanTags = cleanTags.filter(t => !cleanTech.includes(t));

      s.technologies = cleanTech;
      s.tags = cleanTags;

      return s;
    });

    await fs.writeFile(cmsFilePath, JSON.stringify(data, null, 2));
    console.log('[SUCCESS] Cleaned up suppliers.json');

    // Also process all legacy dummy JS files...
    const dataDir = path.join(__dirname, '../src/js/data/Suppliers');
    const files = await fs.readdir(dataDir);
    let jsCount = 0;
    for(const f of files) {
      if(f.endsWith('.js')) {
        const fp = path.join(dataDir, f);
        let cont = await fs.readFile(fp, 'utf-8');
        let oldCont = cont;
        // Simple regex replace for Tags: to tags:
        cont = cont.replace(/Tags:/g, 'tags:');
        
        // Normalize segment values (basic regex for Tier 1)
        cont = cont.replace(/segment:\s*["'](Tier 1|TIA1)["']/gi, 'segment: "TIER 1"');
        cont = cont.replace(/segment:\s*["'](Tier 2|TIA2)["']/gi, 'segment: "TIER 2"');
        cont = cont.replace(/segment:\s*["']OEM["']/gi, 'segment: "OEM"');

        if(oldCont !== cont) {
          await fs.writeFile(fp, cont);
          jsCount++;
        }
      }
    }
    console.log(`[SUCCESS] Updated ${jsCount} dummy JS files`);

  } catch (err) {
    console.error('Error:', err);
  }
}

run();

import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function run() {
  const cmsFilePath = path.join(__dirname, '../public/cms/suppliers.json');
  try {
    const raw = await fs.readFile(cmsFilePath, 'utf-8');
    let data = JSON.parse(raw);

    data = data.map(s => {
      if (s.Tags) {
        s.tags = [...(s.tags || []), ...s.Tags];
        delete s.Tags;
      }

      let tier = (s.segment || '').toString().trim().toUpperCase();
      if (tier.includes('TIA1') || tier.includes('TIER1') || tier === 'TIER 1') tier = 'TIER 1';
      else if (tier.includes('TIA2') || tier.includes('TIER2') || tier === 'TIER 2') tier = 'TIER 2';
      else if (tier.includes('OEM') || tier.includes('0EM')) tier = 'OEM';
      else if (tier.includes('CONTRACT') || tier.includes('CM')) tier = 'CM';
      else if (tier.includes('DISTRIBUTOR') || tier.includes('DIST')) tier = 'DISTRIBUTOR';
      s.segment = tier || 'TIER 1'; 

      let cleanTech = [...new Set((s.technologies || []).map(t => typeof t === 'string' ? t.trim() : ''))].filter(Boolean);
      let cleanTags = [...new Set((s.tags || []).map(t => typeof t === 'string' ? t.trim() : ''))].filter(Boolean);

      cleanTags = cleanTags.filter(t => !cleanTech.includes(t));

      s.technologies = cleanTech;
      if (!s.techGroup && cleanTech.length > 0) {
        s.techGroup = cleanTech[0];
      }
      s.tags = cleanTags;

      return s;
    });

    await fs.writeFile(cmsFilePath, JSON.stringify(data, null, 2));
    console.log('[SUCCESS] Cleaned up suppliers.json');

    const dataDir = path.join(__dirname, '../src/js/data/Suppliers');
    const files = await fs.readdir(dataDir);
    let jsCount = 0;
    for(const f of files) {
      if(f.endsWith('.js')) {
        const fp = path.join(dataDir, f);
        let cont = await fs.readFile(fp, 'utf-8');
        let oldCont = cont;
        cont = cont.replace(/Tags:/g, 'tags:');
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

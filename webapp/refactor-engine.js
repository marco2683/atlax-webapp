import fs from 'fs';

const enginePath = 'src/js/supplier-engine.js';
let content = fs.readFileSync(enginePath, 'utf8');

if (!content.includes('./supabase.js')) {
    content = "import { supabase } from './supabase.js';\n" + content;
}

const fetchRegex = /fetch\('\/cms\/suppliers\.json.*?\'\)/;
// Usually it's: const res = await fetch('/cms/suppliers.json?_t=' + Date.now()); const rawSuppliers = await res.json();
const fullLoadRegex = /try \{[\s\S]*?const res = await fetch\('\/cms\/suppliers\.json.*?\'\);[\s\S]*?const rawSuppliers = await res\.json\(\);[\s\S]*?window\.SUPPLIERS_CACHE = rawSuppliers\.map\(s =>/m;

const newLoad = `try {
    const { data: supData, error } = await supabase.from('suppliers').select('*');
    if (error) throw error;
    
    // Reconstruct legacy objects
    const rawSuppliers = (supData || []).map(row => {
      const s = { ...row.data, id: row.id, name: row.name, segment: row.segment, techGroup: row.tech_group };
      if (!s.techGroup && s.technologies && s.technologies.length > 0) {
        s.techGroup = s.technologies[0];
      }
      return s;
    });
    
    window.SUPPLIERS_CACHE = rawSuppliers.map(s =>`;

content = content.replace(fullLoadRegex, newLoad);
fs.writeFileSync(enginePath, content, 'utf8');
console.log('supplier-engine.js refactored');

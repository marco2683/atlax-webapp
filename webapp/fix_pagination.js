import fs from 'fs';

// 1. Fix admin.js pagination
let adminPath = 'src/js/admin.js';
let adminContent = fs.readFileSync(adminPath, 'utf8');

const adminLoadRegex = /const \{ data: supData \} = await supabase\.from\('suppliers'\)\.select\('\*'\);\s*loadedSuppliers = \(supData \|\| \[\]\)\.map\(row => \{/m;

const adminPaginated = `let allSupData = [];
      let from = 0;
      const size = 1000;
      while(true) {
          const { data, error } = await supabase.from('suppliers').select('*').range(from, from + size - 1);
          if (error) break;
          if (data) allSupData = allSupData.concat(data);
          if (!data || data.length < size) break;
          from += size;
      }
      loadedSuppliers = allSupData.map(row => {`;

adminContent = adminContent.replace(adminLoadRegex, adminPaginated);
fs.writeFileSync(adminPath, adminContent, 'utf8');

// 2. Fix supplier-engine.js pagination
let enginePath = 'src/js/supplier-engine.js';
let engineContent = fs.readFileSync(enginePath, 'utf8');

const engineLoadRegex = /const \{ data: supData, error \} = await supabase\.from\('suppliers'\)\.select\('\*'\);\s*if \(error\) throw error;\s*\/\/ Reconstruct legacy objects\s*const rawSuppliers = \(supData \|\| \[\]\)\.map\(row => \{/m;

const enginePaginated = `let allSupData = [];
    let from = 0;
    const size = 1000;
    while(true) {
        const { data, err } = await supabase.from('suppliers').select('*').range(from, from + size - 1);
        if (err) throw err;
        if (data) allSupData = allSupData.concat(data);
        if (!data || data.length < size) break;
        from += size;
    }
    
    // Reconstruct legacy objects
    const rawSuppliers = allSupData.map(row => {`;

engineContent = engineContent.replace(engineLoadRegex, enginePaginated);
fs.writeFileSync(enginePath, engineContent, 'utf8');

console.log('Pagination fixes applied directly');

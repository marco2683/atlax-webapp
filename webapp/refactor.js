import fs from 'fs';

const adminPath = 'src/js/admin.js';
let content = fs.readFileSync(adminPath, 'utf8');

// 1. Add import
if (!content.includes('./supabase.js')) {
    content = content.replace("import { MOCK_DESIGNERS } from './data/mock-designers.js';", 
        "import { MOCK_DESIGNERS } from './data/mock-designers.js';\nimport { supabase } from './supabase.js';");
}

// 2. Replace Login Logic
const loginRegex = /try \{\s*\/\/ First try the API[\s\S]*?\} catch\(err\) \{/m;
const newLoginLogic = `try {
      const { data: staffMembers, error } = await supabase.from('staff').select('*');
      if (error) throw error;
      const user = staffMembers.find(s => 
        (s.email || '').trim().toLowerCase() === (data.email || '').trim().toLowerCase() && 
        s.password === data.password
      );
      const result = user ? { success: true, user } : { success: false, error: 'Invalid credentials' };

      if (result.success) {
        sessionStorage.setItem('atlasdt_admin_auth', 'true');
        sessionStorage.setItem('atlasdt_admin_user', JSON.stringify(result.user));
        applyThemePreference();
        showDashboard();
      } else {
        alert(result.error || 'Authentication failed');
      }
    } catch(err) {`;
content = content.replace(loginRegex, newLoginLogic);

// 3. Replace loadCRMData
const loadDataRegex = /async function loadCRMData\(\) \{[\s\S]*?catch\(err\) \{[\s\S]*?\}\s*\}/m;
const newLoadData = `async function loadCRMData() {
    try {
      const { data: staffData } = await supabase.from('staff').select('*');
      loadedStaff = staffData || [];

      const { data: supData } = await supabase.from('suppliers').select('*');
      loadedSuppliers = (supData || []).map(row => {
        const s = { ...row.data, id: row.id, name: row.name, segment: row.segment, techGroup: row.tech_group };
        if (!s.techGroup && s.technologies && s.technologies.length > 0) {
          s.techGroup = s.technologies[0];
        }
        return s;
      });
      TECH_GROUPS = [...new Set(loadedSuppliers.map(s => s.techGroup).filter(Boolean))].sort();
    } catch(err) {
      console.error("Failed to fetch Supabase data", err);
      loadedSuppliers = [];
    }
  }`;
content = content.replace(loadDataRegex, newLoadData);

// 4. Replace Supplier Deletion
// fetch(`/api/suppliers?id=${btn.dataset.id}`, { method: 'DELETE' })
const delSupRegex1 = /const res = await fetch\(`\/api\/suppliers\?id=\$\{btn\.dataset\.id\}`,\s*\{\s*method:\s*'DELETE'\s*\}\);/;
const newDelSup1 = `const { error } = await supabase.from('suppliers').delete().eq('id', btn.dataset.id);`;
content = content.replace(delSupRegex1, newDelSup1);
const delSupRegex2 = /if \(res\.ok\) \{/g;
// We actually need to fix if(res.ok) for the deletion
// Since we used { error }, let's replace "if (res.ok) {" with "if (!error) {" but only inside the supplier deletion

// Let's replace the whole Supplier deletion block
const fullDelSupRegex = /if \(confirm\('Are you sure you want to delete this supplier\?'\)\) \{[\s\S]*?const res = await fetch\(\`\/api\/suppliers\?id=\$\{btn\.dataset\.id\}\`,\s*\{\s*method:\s*'DELETE'\s*\}\);[\s\S]*?if \(res\.ok\) \{[\s\S]*?loadedSuppliers = loadedSuppliers\.filter\(s => s\.id !== btn\.dataset\.id\);[\s\S]*?renderSuppliersDirectory\(\);[\s\S]*?\} else \{[\s\S]*?alert\('Failed to delete supplier'\);[\s\S]*?\}[\s\S]*?\}/m;
const newFullDel = `if (confirm('Are you sure you want to delete this supplier?')) {
        const { error } = await supabase.from('suppliers').delete().eq('id', btn.dataset.id);
        if (!error) {
          loadedSuppliers = loadedSuppliers.filter(s => s.id !== btn.dataset.id);
          renderSuppliersDirectory();
        } else {
          alert('Failed to delete supplier');
        }
      }`;
content = content.replace(fullDelSupRegex, newFullDel);

// 5. Replace Supplier Save (POST)
// "const res = await fetch('/api/suppliers', { method: 'POST', ..."
// Wait, we have this inside Save Supplier logic. Let's find it.
const fullSupSaveRegex = /const res = await fetch\('\/api\/suppliers',\s*\{\s*method:\s*'POST',\s*headers:\s*\{\s*'Content-Type':\s*'application\/json'\s*\},\s*body:\s*JSON\.stringify\(payload\)\s*\}\);[\s\S]*?if \(res\.ok\) \{/m;

const newSupSave = `const dbPayload = {
            id: payload.id,
            name: payload.name,
            segment: payload.segment,
            tech_group: payload.techGroup || '',
            data: (() => {
               const clone = { ...payload };
               delete clone.id; delete clone.name; delete clone.segment; delete clone.techGroup;
               return clone;
            })()
          };
          const { error } = await supabase.from('suppliers').upsert(dbPayload);
          if (!error) {`;
content = content.replace(fullSupSaveRegex, newSupSave);

// 6. Replace Staff Delete
const fullDelStaffRegex = /if \(confirm\(`Remove staff member \$\{name\}\?`\)\) \{[\s\S]*?await fetch\('\/api\/staff\?id=' \+ id,\s*\{\s*method:\s*'DELETE'\s*\}\);[\s\S]*?loadedStaff = loadedStaff\.filter\(s => s\.id !== id\);[\s\S]*?renderStaffDirectory\(\);[\s\S]*?\}[\s\S]*?catch\(err\)/m;
const newDelStaff = `if (confirm(\`Remove staff member \$\{name\}?\`)) {
              await supabase.from('staff').delete().eq('id', id);
              loadedStaff = loadedStaff.filter(s => s.id !== id);
              renderStaffDirectory();
            }
          } catch(err)`;
content = content.replace(fullDelStaffRegex, newDelStaff);

// 7. Replace Staff Save
const fullStaffSaveRegex = /await fetch\('\/api\/staff',\s*\{\s*method:\s*'POST',\s*headers:\s*\{\s*'Content-Type':\s*'application\/json'\s*\},\s*body:\s*JSON\.stringify\(payload\)\s*\}\);/m;
const newStaffSave = `await supabase.from('staff').upsert(payload);`;
content = content.replace(fullStaffSaveRegex, newStaffSave);

fs.writeFileSync(adminPath, content, 'utf8');
console.log('admin.js refactored with Supabase integration');


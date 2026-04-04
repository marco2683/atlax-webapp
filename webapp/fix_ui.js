import fs from 'fs';

// 1. Fix CSS for Funnel
const engineCssPath = 'src/css/supplier-engine.css';
let engineCss = fs.readFileSync(engineCssPath, 'utf8');

// Center text in sales-value-item
engineCss = engineCss.replace(/\.sales-value-item \{/g, '.sales-value-item {\n  text-align: center;');

// Fix overlap in pricing grid
const pricingGridRegex = /\.pricing-grid \{/g;
if (engineCss.match(pricingGridRegex)) {
  engineCss = engineCss.replace(pricingGridRegex, '.pricing-grid {\n  padding-top: 24px;');
} else {
  // If not found, append it
  engineCss += '\n\n.pricing-grid { padding-top: 24px; }\n';
}

fs.writeFileSync(engineCssPath, engineCss, 'utf8');
console.log('Fixed CSS for funnel overlaps and center text.');


// 2. Fix CSS for Admin Modal
const adminCssPath = 'src/css/admin.css';
let adminCss = fs.readFileSync(adminCssPath, 'utf8');

if (!adminCss.includes('.admin-modal-overlay')) {
  adminCss += `
/* Customer CRM Modal Styles */
.admin-modal-overlay {
  position: fixed;
  top: 0; left: 0; right: 0; bottom: 0;
  background: rgba(0,0,0,0.6);
  backdrop-filter: blur(4px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 9999;
}
.admin-modal-content {
  background: var(--color-slate-900);
  border: 1px solid var(--color-slate-800);
  border-radius: var(--radius-lg);
  width: 100%;
  max-width: 600px;
  color: var(--text-primary);
  display: flex;
  flex-direction: column;
  box-shadow: 0 20px 40px rgba(0,0,0,0.5);
  max-height: 90vh;
  overflow-y: auto;
}
body.theme-light .admin-modal-content {
  background: var(--color-white);
  border: 1px solid var(--color-slate-200);
  color: var(--color-slate-900);
}
.admin-modal-header {
  padding: 20px 24px;
  border-bottom: 1px solid var(--color-slate-800);
  display: flex;
  justify-content: space-between;
  align-items: center;
}
body.theme-light .admin-modal-header {
  border-bottom: 1px solid var(--color-slate-200);
}
.admin-modal-header h3 {
  margin: 0;
  font-size: 18px;
}
.admin-modal-close {
  background: transparent;
  border: none;
  font-size: 24px;
  color: var(--color-steel-400);
  cursor: pointer;
  line-height: 1;
}
.admin-modal-body {
  padding: 24px;
}
.admin-modal-footer {
  padding: 16px 24px;
  border-top: 1px solid var(--color-slate-800);
  display: flex;
  background: rgba(0,0,0,0.2);
}
body.theme-light .admin-modal-footer {
  border-top: 1px solid var(--color-slate-200);
  background: rgba(0,0,0,0.02);
}
`;
  fs.writeFileSync(adminCssPath, adminCss, 'utf8');
  console.log('Injected admin modal styling.');
}

// 3. Update admin.js to include more profile fields
const adminJsPath = 'src/js/admin.js';
let adminJs = fs.readFileSync(adminJsPath, 'utf8');

const profileInfoRegex = /<!-- Profile Info -->[\s\S]*?<\/div>\s+<!-- Activity -->/;
if (adminJs.match(profileInfoRegex)) {
  const newProfileInfoBlock = `<!-- Profile Info -->
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px; background: rgba(0,0,0,0.1); padding: 16px; border-radius: 8px;">
              <div><strong>Email:</strong> <span style="color:var(--color-slate-400);">\${cust.email || '—'}</span></div>
              <div><strong>Phone:</strong> <span style="color:var(--color-slate-400);">\${cust.phone || '—'}</span></div>
              <div><strong>Company:</strong> <span style="color:var(--color-slate-400);">\${cust.company || '—'}</span></div>
              <div><strong>Job Title:</strong> <span style="color:var(--color-slate-400);">\${cust.job_title || '—'}</span></div>
              <div><strong>Address:</strong> <span style="color:var(--color-slate-400);">\${cust.address || '—'}</span></div>
              <div><strong>Age:</strong> <span style="color:var(--color-slate-400);">\${cust.age || '—'}</span></div>
              <div><strong>Gender:</strong> <span style="color:var(--color-slate-400); text-transform: capitalize;">\${cust.gender || '—'}</span></div>
            </div>
            <!-- Activity -->`;
  
  adminJs = adminJs.replace(profileInfoRegex, newProfileInfoBlock);
  fs.writeFileSync(adminJsPath, adminJs, 'utf8');
  console.log('Injected new customer fields into modal.');
}

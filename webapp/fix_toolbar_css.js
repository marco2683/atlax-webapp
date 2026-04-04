import fs from 'fs';

const adminCssPath = 'src/css/admin.css';
let adminCss = fs.readFileSync(adminCssPath, 'utf8');

if (!adminCss.includes('.admin-toolbar {')) {
  adminCss += `
/* Customer CRM Toolbar Styles */
.admin-toolbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24px;
}

.admin-toolbar-search {
  display: flex;
  align-items: center;
  gap: 12px;
  background: rgba(0, 0, 0, 0.2);
  border: 1px solid var(--color-slate-700);
  border-radius: var(--radius-sm);
  padding: 8px 16px;
  width: 320px;
}

body.theme-light .admin-toolbar-search {
  background: var(--color-white);
  border: 1px solid var(--color-slate-300);
}

.admin-toolbar-search svg {
  color: var(--color-slate-400);
}

.admin-toolbar-search input {
  background: transparent;
  border: none;
  color: #fff;
  width: 100%;
  font-family: inherit;
  font-size: 14px;
  outline: none;
}

.admin-toolbar-search input::placeholder {
  color: var(--color-slate-500);
}

body.theme-light .admin-toolbar-search input {
  color: var(--color-slate-900);
}

body.theme-light .admin-toolbar-search input::placeholder {
  color: var(--color-slate-400);
}
`;
  fs.writeFileSync(adminCssPath, adminCss, 'utf8');
  console.log('Injected toolbar search styling');
} else {
  console.log('Toolbar search styles already exist');
}

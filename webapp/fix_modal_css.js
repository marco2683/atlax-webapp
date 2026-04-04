import fs from 'fs';

const adminCssPath = 'src/css/admin.css';
let adminCss = fs.readFileSync(adminCssPath, 'utf8');

if (!adminCss.includes('.admin-form-group')) {
  adminCss += `

/* Extracted Form styles for Modals */
.admin-form-group {
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.admin-form-group label {
  font-weight: 600;
  font-size: 14px;
}
.admin-input {
  width: 100%;
  padding: 10px 12px;
  border-radius: var(--radius-sm);
  border: 1px solid var(--color-slate-700);
  background: var(--color-slate-900);
  color: #fff;
  font-family: inherit;
  font-size: 14px;
  box-sizing: border-box; /* To prevent overflow from padding */
}
body.theme-light .admin-input {
  background: var(--color-white);
  border: 1px solid var(--color-slate-300);
  color: var(--color-slate-900);
}
.admin-input:focus {
  outline: none;
  border-color: var(--color-primary);
}
`;
  fs.writeFileSync(adminCssPath, adminCss, 'utf8');
  console.log('Injected form group styling');
} else {
  console.log('Already injected formula group styles');
}

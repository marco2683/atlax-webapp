import fs from 'fs';

const htmlPath = 'admin.html';
let content = fs.readFileSync(htmlPath, 'utf8');

const navRegex = /<button class="admin-nav-item" data-tab="suppliers">Suppliers CRM<\/button>/;
if (content.match(navRegex) && !content.includes('data-tab="customers"')) {
   content = content.replace(navRegex, `$&
        <button class="admin-nav-item" data-tab="customers">Customers CRM</button>`);
   fs.writeFileSync(htmlPath, content, 'utf8');
   console.log('Nav item inserted into admin.html');
} else {
   console.log('Skipped nav item insertion');
}

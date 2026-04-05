import fs from 'fs';
import path from 'path';

const htmlPath = path.join(process.cwd(), 'profile.html');
let html = fs.readFileSync(htmlPath, 'utf8');

// Replace .profile-content-pane block with exactly strict fixed height properties
html = html.replace(/\.profile-content-pane\s*\{[\s\S]*?box-shadow:[^}]*?\}/, 
`.profile-content-pane {
      height: 700px !important;
      overflow-y: auto;
      background: rgba(20,20,20,0.4);
      backdrop-filter: blur(12px);
      border: 1px solid rgba(255,255,255,0.08);
      border-radius: 20px;
      padding: 40px;
      display: none;
      box-shadow: 0 20px 40px rgba(0,0,0,0.2);
    }`);

fs.writeFileSync(htmlPath, html);
console.log('Fixed HTML layout height constraint.');

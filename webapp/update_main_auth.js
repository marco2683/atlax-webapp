import fs from 'fs';

const jsPath = 'src/main.js';
let content = fs.readFileSync(jsPath, 'utf8');

const regex = /function switchView\(view, globe\) \{/m;
const replacement = `function switchView(view, globe) {
  // ZERO-TRUST AUTHORIZATION GUARD
  const sysTier = sessionStorage.getItem('atlasdt_tier') || 'basic';
  const restrictedViews = ['suppliers', 'product-builder', 'tariff'];
  if (sysTier === 'basic' && restrictedViews.includes(view)) {
    console.warn(\`[Auth] Blocked restricted view attempt: \${view} on \${sysTier} tier.\`);
    return;
  }`;

if (content.match(regex) && !content.includes('ZERO-TRUST AUTHORIZATION GUARD')) {
  content = content.replace(regex, replacement);
  fs.writeFileSync(jsPath, content, 'utf8');
  console.log('Main.js auth guard injected');
} else {
  console.log('Skipped Main.js auth guard');
}


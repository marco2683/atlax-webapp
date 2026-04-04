import fs from 'fs';

const engineCssPath = 'src/css/supplier-engine.css';
let engineCss = fs.readFileSync(engineCssPath, 'utf8');

// I will replace any existing `.pricing-grid { padding-top: 24px; }` with something larger
const gridPaddingRegex = /\.pricing-grid \{\s*padding-top: 24px;\s*\}/g;
if (engineCss.match(gridPaddingRegex)) {
  engineCss = engineCss.replace(gridPaddingRegex, '.pricing-grid {\n  padding-top: 64px;\n  margin-top: 32px;');
} else {
  // Try matching just the block if it exists
  const gridBlockRegex = /\.pricing-grid \{/g;
  engineCss = engineCss.replace(gridBlockRegex, '.pricing-grid {\n  padding-top: 64px;\n  margin-top: 32px;');
}

fs.writeFileSync(engineCssPath, engineCss, 'utf8');
console.log('Fixed pricing grid margin and padding.');

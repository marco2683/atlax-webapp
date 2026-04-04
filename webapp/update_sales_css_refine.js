import fs from 'fs';

const cssPath = 'src/css/supplier-engine.css';
let content = fs.readFileSync(cssPath, 'utf8');

// 1. Fix overlapping condition
const headerRegex = /\.sales-section-subtitle \{[\s\S]*?margin-bottom: 56px;/m;
if (content.match(headerRegex)) {
  content = content.replace(headerRegex, `.sales-section-subtitle {\n  font-size: 18px;\n  color: var(--color-slate-400);\n  margin-bottom: 80px; /* INCREASED from 56px to fix badge overlap */`);
}

// 2. Increase image size
const imgRegex = /\.sales-marquee-img \{[\s\S]*?height: 300px;/m;
if (content.match(imgRegex)) {
  content = content.replace(imgRegex, `.sales-marquee-img {\n  width: 700px;\n  height: 420px;`);
}

fs.writeFileSync(cssPath, content, 'utf8');
console.log('CSS overlay overlap fixed and images enlarged');

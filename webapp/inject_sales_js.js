import fs from 'fs';

const jsPath = 'src/js/supplier-engine.js';
let content = fs.readFileSync(jsPath, 'utf8');

const oldRegex = /\/\/ --- CAROUSEL LOGIC ---[\s\S]*?openTabularView\(\);\s*}\);\s*}/m;

const newLogic = `// --- SALES FUNNEL LOGIC ---
  const salesFunnel = document.getElementById('sales-funnel');
  const enterBtns = document.querySelectorAll('.btn-enter-platform');
  
  enterBtns.forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      if (salesFunnel) salesFunnel.classList.add('hidden');
      openTabularView();
    });
  });`;

content = content.replace(oldRegex, newLogic);

// Also need to fix the initialization logic. The init logic is:
// selectionScreen = document.getElementById('supplier-selection'); -> we deleted this.
// So let's replace supplier-selection with sales-funnel

content = content.replace(/selectionScreen = document\.getElementById\('supplier-selection'\);/g, "selectionScreen = document.getElementById('sales-funnel');");

fs.writeFileSync(jsPath, content, 'utf8');

console.log('JS Sales Funnel logic injected');

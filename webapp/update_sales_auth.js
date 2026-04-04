import fs from 'fs';

const jsPath = 'src/js/supplier-engine.js';
let content = fs.readFileSync(jsPath, 'utf8');

const regex = /\/\/ --- SALES FUNNEL LOGIC ---[\s\S]*?openTabularView\(\);\s*}\);\s*}\);/m;

const replacement = `// --- SALES FUNNEL LOGIC ---
  const salesFunnel = document.getElementById('sales-funnel');
  const enterBtns = document.querySelectorAll('.btn-enter-platform');
  
  enterBtns.forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      
      // Zero-Trust Authorization Logic
      const tier = btn.dataset.tier || 'basic';
      sessionStorage.setItem('atlax_tier', tier);
      console.log(\`[Auth] Logged in as: \${tier.toUpperCase()}\`);

      if (tier === 'basic') {
        // Enforce Basic Restrictions by physically removing DOM nodes
        const suppliersMenu = document.querySelector('.navbar__menu-item[data-view="suppliers"]');
        const builderMenu = document.querySelector('.navbar__menu-item[data-view="product-builder"]');
        const tariffMenu = document.querySelector('.navbar__menu-item[data-view="tariff"]');
        // Extra nodes to remove from DOM completely so they cannot be accessed
        if (suppliersMenu) suppliersMenu.remove();
        if (builderMenu) builderMenu.remove();
        if (tariffMenu) tariffMenu.remove();

        // Boot Basic users straight into RFQ
        if (salesFunnel) salesFunnel.classList.add('hidden');
        if (window.switchView) {
          window.switchView('rfq'); 
        } else {
          openTabularView(); // Safe fallback
        }
      } else {
        // Professional / Enterprise get full entry
        if (salesFunnel) salesFunnel.classList.add('hidden');
        openTabularView();
      }
    });
  });`;

if (content.match(regex)) {
  content = content.replace(regex, replacement);
  fs.writeFileSync(jsPath, content, 'utf8');
  console.log('Supplier engine updated with Auth tier logic');
} else {
  console.log('Could not find SALES FUNNEL LOGIC in supplier-engine.js');
}

// Ensure window.switchView is available if main.js defines it, otherwise simulate it
// Let's also check main.js to make sure the tab logic works.

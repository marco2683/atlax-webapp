import { TECHNOLOGY_TAXONOMY } from '../data/technologies.js';

const GROUP_COLORS = [
  '#3b82f6', '#8b5cf6', '#10b981', '#f59e0b',
  '#ef4444', '#ec4899', '#06b6d4', '#84cc16',
  '#a78bfa', '#f97316',
];

/**
 * Render supplier groups in a stacked/inline layout at the bottom.
 * @param {Array} suppliers - All matching suppliers
 * @param {Function} onGroupClick - Callback(techName, suppliersInGroup)
 * @param {Object} options - Grouping options { groupingMode, groupTitle, mainTech }
 */
export function renderStackedResults(suppliers, onGroupClick, options = {}) {
  const container = document.getElementById('bottom-results-container');
  if (!container) return;

  const { groupingMode = 'default', groupTitle = 'Results', mainTech = null } = options;

  // 1. Grouping logic based on mode
  let groups = {};

  if (groupingMode === 'sub-categories' && mainTech) {
    const subCategories = TECHNOLOGY_TAXONOMY[mainTech] || [];
    subCategories.forEach(sub => {
      const subNorm = sub.toLowerCase().replace(/moulding/g, 'molding');
      const matching = suppliers.filter(s => {
        const sTechs = (s.technologies || []).map(t => t.toLowerCase().replace(/moulding/g, 'molding'));
        return sTechs.includes(subNorm) || sTechs.includes(sub.toLowerCase());
      });
      groups[sub] = matching;
    });
    const other = suppliers.filter(s => !subCategories.some(sub => {
      const subNorm = sub.toLowerCase().replace(/moulding/g, 'molding');
      const sTechs = (s.technologies || []).map(t => t.toLowerCase().replace(/moulding/g, 'molding'));
      return sTechs.includes(subNorm) || sTechs.includes(sub.toLowerCase());
    }));
    if (other.length > 0) groups[`Other ${mainTech}`] = other;

  } else if (groupingMode === 'fixed-group') {
    groups[groupTitle] = suppliers;

  } else {
    suppliers.forEach(s => {
      const g = s.country || 'Other';
      if (!groups[g]) groups[g] = [];
      groups[g].push(s);
    });
  }

  const groupNames = Object.keys(groups);
  
  // 2. Clear container and rebuild
  container.innerHTML = '';

  // 3. "SEE ALL RESULTS" button — above the carousel
  const headerLabel = mainTech || groupTitle || 'Search';
  const seeAllBtn = document.createElement('button');
  seeAllBtn.className = 'see-all-results-btn';
  seeAllBtn.innerHTML = `SEE ALL RESULTS <span class="see-all-results-btn__count">${suppliers.length}</span>`;
  seeAllBtn.addEventListener('click', () => {
    // Open the grid modal with ALL suppliers under this search
    import('./supplier-grid.js').then(m => {
      m.openSupplierGrid(headerLabel, suppliers);
    });
  });
  
  const headerWrapper = document.createElement('div');
  headerWrapper.style.display = 'flex';
  headerWrapper.style.justifyContent = 'center';
  headerWrapper.style.gap = '16px';
  headerWrapper.style.width = '100%';
  headerWrapper.style.marginBottom = '20px';
  headerWrapper.style.pointerEvents = 'auto'; // allow click through container
  
  const clearBtn = document.createElement('button');
  clearBtn.className = 'see-all-results-btn';
  clearBtn.style.color = '#f87171';
  clearBtn.style.borderColor = 'rgba(248,113,113,0.3)';
  clearBtn.innerHTML = `CLEAR ALL <svg style="margin-left:6px; margin-bottom:-2px;" xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>`;
  clearBtn.addEventListener('click', () => {
    window.dispatchEvent(new CustomEvent('prd-clear-results'));
  });
  
  headerWrapper.appendChild(seeAllBtn);
  headerWrapper.appendChild(clearBtn);
  
  container.appendChild(headerWrapper);

  // 4. DOM Rendering — carousel wrapper
  const wrapper = document.createElement('div');
  wrapper.className = 'results-grid';
  
  groupNames.forEach((techName, i) => {
    const sups = groups[techName];
    const color = GROUP_COLORS[i % GROUP_COLORS.length];
    
    const card = document.createElement('div');
    card.className = 'stacked-group';
    card.style.setProperty('--group-color', color);
    card.style.animationDelay = `${i * 100}ms`;

    const supplierLines = sups.slice(0, 4).map((s, idx) => `
      <div class="stacked-group__line" data-idx="${idx}" style="cursor: pointer;">
        <button class="stacked-group__add-btn" data-id="${s.id || s.name}" title="Add to Shortlist">
          <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
        </button>
        <span class="stacked-group__name" title="${s.name}">${s.name}</span>
        <span class="stacked-group__city">${s.city}</span>
      </div>
    `).join('');

    card.innerHTML = `
      <div class="stacked-group__header">
        <span class="stacked-group__title" title="${techName}">${techName}</span>
        <span class="stacked-group__count">${sups.length}</span>
      </div>
      <div class="stacked-group__lines">
        ${supplierLines}
        ${sups.length > 4 ? `<div class="stacked-group__more">• +${sups.length - 4} more</div>` : ''}
      </div>
    `;

    card.addEventListener('click', (e) => {
      if (e.target.closest('.stacked-group__add-btn')) return;
      
      const line = e.target.closest('.stacked-group__line');
      if (line) {
        const idx = parseInt(line.dataset.idx, 10);
        const supplier = sups[idx];
        import('./supplier-carousel.js').then(m => m.openSupplierCarousel(techName, [supplier]));
        return;
      }
      
      if (onGroupClick) onGroupClick(techName, sups);
    });

    card.querySelectorAll('.stacked-group__add-btn').forEach((btn, idx) => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const supplier = sups[idx];
        window.dispatchEvent(new CustomEvent('prd-add-to-shortlist', { 
          detail: { supplier, techName } 
        }));
        
        btn.innerHTML = '✓';
        btn.style.background = 'var(--color-emerald)';
        setTimeout(() => {
          btn.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>';
          btn.style.background = '';
        }, 1500);
      });
    });

    wrapper.appendChild(card);
  });

  // 5. Mobile vs Desktop layout
  const isMobile = window.innerWidth <= 768;

  if (isMobile) {
    // Mobile: vertical stack, centered — apply inline to guarantee override
    wrapper.style.display = 'flex';
    wrapper.style.flexDirection = 'column';
    wrapper.style.alignItems = 'center';
    wrapper.style.overflowX = 'hidden';
    wrapper.style.width = '100%';
    wrapper.style.padding = '0';
    wrapper.style.gap = '8px';
    wrapper.style.maskImage = 'none';
    wrapper.style.webkitMaskImage = 'none';

    // Set each card to 90% width, centered
    wrapper.querySelectorAll('.stacked-group').forEach(card => {
      card.style.flex = '0 0 auto';
      card.style.width = '90%';
      card.style.maxWidth = '90%';
      card.style.margin = '0 auto';
      card.style.boxSizing = 'border-box';
    });
  } else {
    // Desktop: horizontal scroll with spacers
    const startSpacer = document.createElement('div');
    startSpacer.className = 'grid-spacer';
    startSpacer.style.flex = '0 0 calc(15vw - 8px)';
    wrapper.prepend(startSpacer);

    const endSpacer = document.createElement('div');
    endSpacer.className = 'grid-spacer';
    endSpacer.style.flex = '0 0 calc(15vw - 8px)';
    wrapper.appendChild(endSpacer);

    requestAnimationFrame(() => {
      wrapper.scrollLeft = 0;
    });
  }

  container.appendChild(wrapper);

  container.style.display = '';
  container.classList.remove('hidden');
}

/**
 * Hide stacked results.
 */
export function hideStackedResults() {
  const container = document.getElementById('bottom-results-container');
  if (container) {
    container.classList.add('hidden');
    container.innerHTML = '';
  }
}

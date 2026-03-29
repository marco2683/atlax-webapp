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
    // Group by sub-categories of the main tech
    const subCategories = TECHNOLOGY_TAXONOMY[mainTech] || [];
    subCategories.forEach(sub => {
      const subNorm = sub.toLowerCase().replace(/moulding/g, 'molding');
      const matching = suppliers.filter(s => {
        const sTechs = (s.technologies || []).map(t => t.toLowerCase().replace(/moulding/g, 'molding'));
        return sTechs.includes(subNorm) || sTechs.includes(sub.toLowerCase());
      });
      groups[sub] = matching;
    });
    // Add "Other" for anything that didn't match a specific sub-category
    const other = suppliers.filter(s => !subCategories.some(sub => {
      const subNorm = sub.toLowerCase().replace(/moulding/g, 'molding');
      const sTechs = (s.technologies || []).map(t => t.toLowerCase().replace(/moulding/g, 'molding'));
      return sTechs.includes(subNorm) || sTechs.includes(sub.toLowerCase());
    }));
    if (other.length > 0) groups[`Other ${mainTech}`] = other;

  } else if (groupingMode === 'fixed-group') {
    // All in one group
    groups[groupTitle] = suppliers;

  } else {
    // Default: Group by techGroup
    suppliers.forEach(s => {
      const tech = s.techGroup || s.technologies?.[0] || 'Other';
      if (!groups[tech]) groups[tech] = [];
      groups[tech].push(s);
    });
  }

  const groupNames = Object.keys(groups);
  
  // 2. DOM Rendering
  let wrapper = container.querySelector('.results-grid');
  if (!wrapper) {
    wrapper = document.createElement('div');
    wrapper.className = 'results-grid';
    container.appendChild(wrapper);
  }
  wrapper.innerHTML = '';
  
  groupNames.forEach((techName, i) => {
    const sups = groups[techName];
    const color = GROUP_COLORS[i % GROUP_COLORS.length];
    
    // Create card element
    const card = document.createElement('div');
    card.className = 'stacked-group';
    card.style.setProperty('--group-color', color);
    card.style.animationDelay = `${i * 100}ms`;

    // Render suppliers with Add (+) button
    const supplierLines = sups.slice(0, 4).map(s => `
      <div class="stacked-group__line">
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

    // Add click listener for detail view (clicking header or card body, excluding buttons)
    card.addEventListener('click', (e) => {
      if (e.target.closest('.stacked-group__add-btn')) return;
      if (onGroupClick) onGroupClick(techName, sups);
    });

    // Add event listeners for the + buttons
    card.querySelectorAll('.stacked-group__add-btn').forEach((btn, idx) => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const supplier = sups[idx];
        window.dispatchEvent(new CustomEvent('prd-add-to-shortlist', { 
          detail: { supplier, techName } 
        }));
        
        // Visual feedback
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

  // 3. Add spacers for centering
  const startSpacer = document.createElement('div');
  startSpacer.className = 'grid-spacer';
  startSpacer.style.flex = '0 0 calc(50vw - 140px)'; // 140px is half of 280px card width
  wrapper.prepend(startSpacer);

  const endSpacer = document.createElement('div');
  endSpacer.className = 'grid-spacer';
  endSpacer.style.flex = '0 0 calc(50vw - 140px)';
  wrapper.appendChild(endSpacer);

  // Initial scroll position: offset slightly so first card is visible but not perfectly centered
  requestAnimationFrame(() => {
    // Offset by 160px moves the first card slightly to the left of center screen
    wrapper.scrollLeft = 160; 
  });

  // Show container
  container.classList.remove('hidden');
}

/**
 * Hide stacked results.
 */
export function hideStackedResults() {
  const container = document.getElementById('bottom-results-container');
  if (container) {
    container.classList.add('hidden');
    const wrapper = container.querySelector('.results-grid');
    if (wrapper) wrapper.innerHTML = '';
  }
}

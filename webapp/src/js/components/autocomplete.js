import { ALL_TECHNOLOGIES, TECHNOLOGY_TAXONOMY } from '../data/technologies.js';

export function initAutocomplete() {
  const input = document.getElementById('search-input');
  const searchBar = document.getElementById('search-bar');
  const submitBtn = document.getElementById('search-submit');
  
  if (!input || !searchBar) return;

  // Create Dropdown UI
  const dropdown = document.createElement('div');
  dropdown.className = 'search-autocomplete hidden';
  searchBar.appendChild(dropdown);

  input.addEventListener('input', (e) => {
    // Only apply autocomplete if Technology is selected
    const activeType = document.querySelector('#step-type .selector-btn--active');
    if (activeType && activeType.dataset.type !== 'technology') {
      dropdown.classList.add('hidden');
      return;
    }

    const val = e.target.value.toLowerCase().trim();
    dropdown.innerHTML = '';
    
    if (!val) {
      dropdown.classList.add('hidden');
      return;
    }

    const matches = ALL_TECHNOLOGIES.filter(t => t.toLowerCase().includes(val)).slice(0, 10);
    
    if (matches.length > 0) {
      dropdown.classList.remove('hidden');
      matches.forEach(m => {
        const item = document.createElement('div');
        item.className = 'search-autocomplete__item';
        
        // Check if it's a sub-category and find parent
        let parentCategory = null;
        for (const [parent, subs] of Object.entries(TECHNOLOGY_TAXONOMY)) {
          if (subs.includes(m)) parentCategory = parent;
        }

        const label = parentCategory ? `${m} <span style="color:var(--color-steel-400); font-size:11px; margin-left:8px; opacity: 0.6;">in ${parentCategory}</span>` : `<strong>${m}</strong>`;
        item.innerHTML = label;
        
        item.addEventListener('click', () => {
          input.value = m;
          dropdown.classList.add('hidden');
          // Dispatch enter event to submit or click the button
          if (submitBtn) submitBtn.click();
        });
        dropdown.appendChild(item);
      });
    } else {
      dropdown.classList.add('hidden');
    }
  });

  // Hide dropdown when clicking outside
  document.addEventListener('click', (e) => {
    if (!searchBar.contains(e.target)) {
      dropdown.classList.add('hidden');
    }
  });
}

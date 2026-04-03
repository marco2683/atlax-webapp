export function initAutocomplete(suppliersData = []) {
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

    // Extract live searchable terms from data (names, groups, technologies)
    const terms = new Set();
    (suppliersData || []).forEach(s => {
      if (s.name) terms.add(s.name);
      if (s.group) terms.add(s.group);
      if (s.techGroup) terms.add(s.techGroup);
      if (Array.isArray(s.technologies)) {
        s.technologies.forEach(t => terms.add(t));
      }
    });
    
    const activeTerms = [...terms].filter(Boolean);
    const matches = activeTerms.filter(t => t.toLowerCase().includes(val)).slice(0, 10);
    
    if (matches.length > 0) {
      dropdown.classList.remove('hidden');
      matches.forEach(m => {
        const item = document.createElement('div');
        item.className = 'search-autocomplete__item';
        item.innerHTML = `<strong>${m}</strong>`;
        
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

export function initAutocomplete(suppliersData = []) {
  const input = document.getElementById('search-input');
  const searchBar = document.getElementById('search-bar');
  const submitBtn = document.getElementById('search-submit');
  
  if (!input || !searchBar) return;

  // Create Dropdown UI
  const dropdown = document.createElement('div');
  dropdown.className = 'search-autocomplete hidden';
  searchBar.appendChild(dropdown);

  const tier1Categories = [
    "3D Printing",
    "Adhesives / Tapes / Foams / Seals / Bonding / Lamination",
    "CNC Machining",
    "Cables / Harness / Looms / Wiring",
    "Casting & Forging",
    "Compression Moulding",
    "Die Casting",
    "Die-Cut",
    "HMI Membranes / Overlays / Keypads / Screens",
    "Injection Molding",
    "Laser Cutting",
    "Liquid Silicone Rubber Moulding",
    "Metal Extrusions",
    "Metal Stamping",
    "Optics",
    "PCB PCBA Electronics",
    "Packaging",
    "RIM (Reaction Injection Moulding)",
    "Rapid Prototyping"
  ];

  function showDropdown(val = "") {
    dropdown.innerHTML = '';
    const matches = tier1Categories.filter(t => t.toLowerCase().includes(val.toLowerCase()));
    
    if (matches.length > 0) {
      dropdown.classList.remove('hidden');
      matches.forEach(m => {
        const item = document.createElement('div');
        item.className = 'search-autocomplete__item';
        
        let displayHtml = m;
        if (val) {
          const regex = new RegExp(`(${val})`, 'gi');
          displayHtml = m.replace(regex, '<span style="color:var(--color-primary);font-weight:bold;">$1</span>');
        }
        item.innerHTML = `<span>${displayHtml}</span>`;
        
        item.addEventListener('mousedown', (e) => {
          e.preventDefault(); // Prevent input on blur before click registers
          input.value = m;
          dropdown.classList.add('hidden');
          if (submitBtn) submitBtn.click();
        });
        dropdown.appendChild(item);
      });
    } else {
      dropdown.classList.add('hidden');
    }
  }

  input.addEventListener('focus', () => {
    // Only apply autocomplete if in supplier discovery mode
    const activeType = document.querySelector('#step-type .selector-btn--active');
    if (activeType && activeType.dataset.type !== 'technology') return;
    
    showDropdown(input.value.trim());
  });

  input.addEventListener('input', (e) => {
    // Only apply autocomplete if in supplier discovery mode
    const activeType = document.querySelector('#step-type .selector-btn--active');
    if (activeType && activeType.dataset.type !== 'technology') {
      dropdown.classList.add('hidden');
      return;
    }

    showDropdown(e.target.value.trim());
  });

  document.addEventListener('click', (e) => {
    if (!searchBar.contains(e.target)) {
      dropdown.classList.add('hidden');
    }
  });
}

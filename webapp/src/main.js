/* ============================================================
   PRD — Main Entry Point v3 — Radial results + cascading selector
   ============================================================ */

import './css/design-system.css';
import './css/components.css';
import './css/layout.css';
import './css/rfq-engine.css';
import './css/profile.css';

import { initGlobe } from './js/globe/globe-engine.js';
import { initNavbar } from './js/components/navbar.js';
import { initTierCards } from './js/components/tier-cards.js';
import { renderStackedResults, hideStackedResults } from './js/components/results-panel.js';
import { initSupplierCarousel, openSupplierCarousel } from './js/components/supplier-carousel.js';
import { MOCK_SUPPLIERS } from './js/data/mock-suppliers.js';
import { TECHNOLOGY_TAXONOMY } from './js/data/technologies.js';
import { initAutocomplete } from './js/components/autocomplete.js';
import { initTechModal } from './js/components/tech-modal.js';

import { renderShortlist } from './js/components/shortlist.js';
import { getCurrentUser } from './js/services/auth.js';
import { saveShortlist } from './js/services/workspace.js';

// ── App State ────────────────────────────────────────────
const appState = {
  hasSearched: false,
  searchType: 'suppliers',
  mode: 'find-supplier',
  regions: [],
  query: '',
  lastSearchResults: [], // Cache results to filter by region locally
  shortlist: [],
  currentTier: 'free'
};

// ── Boot Sequence ────────────────────────────────────────
document.addEventListener('DOMContentLoaded', async () => {
  console.log('[PRD] Booting PRD Dashboard...');
  
  // 0. Auth Guard — protect the engine
  const user = await getCurrentUser();
  if (!user) {
    console.warn('[PRD] Unauthenticated. Redirecting to login...');
    window.location.href = '/index.html';
    return;
  }
  console.log('[PRD] Authenticated as:', user.email);

  window.scrollTo(0, 0); // Enforce top scroll on load
  // 1. Navigation (async — loads profile panel + auth state)
  await initNavbar();

  // 2. 3D Globe
  const globe = initGlobe('globe-container', MOCK_SUPPLIERS);

  // 2b. Restore shortlist from workspace (if navigating via "Open in Engine")
  try {
    const savedListJSON = sessionStorage.getItem('prd-load-shortlist');
    if (savedListJSON) {
      sessionStorage.removeItem('prd-load-shortlist'); // Consume it
      const savedList = JSON.parse(savedListJSON);
      if (savedList.items && savedList.items.length > 0) {
        appState.shortlist = savedList.items.map(item => ({
          supplier: item.supplier || item,
          techName: item.techName || item.supplier?.technologies?.[0] || '—'
        }));
        console.log(`[PRD] Restored shortlist "${savedList.name}" with ${appState.shortlist.length} suppliers`);
        // Defer rendering until after full init
        setTimeout(() => {
          renderShortlist(appState.shortlist, appState.currentTier);
          globe.updateShortlistNetwork(appState.shortlist);
        }, 500);
      }
    }
  } catch (err) {
    console.warn('[PRD] Failed to restore shortlist:', err);
  }

  // 4. View Switching Logic
  window.addEventListener('prd-nav-switch', (e) => {
    switchView(e.detail.view, globe);
  });

  // Handle initial state or URL hash if needed
  // ...




  // 5. Region chips (Relocated from filter-pills.js)
  document.querySelectorAll('.region-chip').forEach(chip => {
    chip.addEventListener('click', () => {
      const region = chip.dataset.region;
      const idx = appState.regions.indexOf(region);

      if (idx >= 0) {
        appState.regions.splice(idx, 1);
        chip.classList.remove('region-chip--active');
      } else {
        appState.regions.push(region);
        chip.classList.add('region-chip--active');
      }
      
      if (appState.hasSearched) {
        updateStackedResultsOnly(globe);
      }
    });
  });

  // 6. Tier Cards (modal)
  initTierCards((selectedTier) => {
    appState.currentTier = selectedTier;
    import('./js/components/supplier-carousel.js').then(m => m.setCurrentTier(selectedTier));
    renderShortlist(appState.shortlist, appState.currentTier);
  });



  // 6. Autocomplete
  initAutocomplete();

  // 7. Tech Modal
  initTechModal();

  // Attach search event
  document.getElementById('search-submit')?.addEventListener('click', () => handleSearch(globe));
  document.getElementById('search-input')?.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') handleSearch(globe);
  });

  // 7. Supplier Carousel
  initSupplierCarousel();

  // 9. Shortlist Event Listeners
  window.addEventListener('prd-open-supplier', (e) => {
    const { techName, supplier } = e.detail;
    openSupplierCarousel(techName, [supplier]);
  });

  window.addEventListener('prd-add-to-shortlist', (e) => {
    const { supplier, techName } = e.detail;
    const exists = appState.shortlist.some(s => (s.supplier.id || s.supplier.name) === (supplier.id || supplier.name));
    if (!exists) {
      appState.shortlist.push({ supplier, techName });
      renderShortlist(appState.shortlist, appState.currentTier);
      globe.updateShortlistNetwork(appState.shortlist);
    }
  });

  window.addEventListener('prd-remove-from-shortlist', (e) => {
    const { index } = e.detail;
    appState.shortlist.splice(index, 1);
    renderShortlist(appState.shortlist, appState.currentTier);
    globe.updateShortlistNetwork(appState.shortlist);
  });

  // Close shortlist panel button
  document.getElementById('shortlist-close')?.addEventListener('click', () => {
    const panel = document.getElementById('shortlist-panel');
    if (panel) panel.classList.add('hidden');
  });

  // Save shortlist to workspace
  document.getElementById('shortlist-save')?.addEventListener('click', async () => {
    if (appState.shortlist.length === 0) return;
    const name = prompt('Name this shortlist:', `Shortlist — ${new Date().toLocaleDateString()}`);
    if (!name) return;

    const btn = document.getElementById('shortlist-save');
    const originalHTML = btn.innerHTML;
    btn.innerHTML = 'Saving...';
    btn.style.pointerEvents = 'none';

    const { error } = await saveShortlist(name, appState.shortlist, { query: appState.query });
    
    if (error) {
      btn.innerHTML = '❌ Error';
      btn.style.color = '#f87171';
      setTimeout(() => { btn.innerHTML = originalHTML; btn.style.color = ''; btn.style.pointerEvents = ''; }, 2000);
    } else {
      btn.innerHTML = '✓ Saved!';
      btn.style.color = '#34d399';
      setTimeout(() => { btn.innerHTML = originalHTML; btn.style.color = ''; btn.style.pointerEvents = ''; }, 2000);
    }
  });


  window.addEventListener('prd-download-doc', (e) => {
    const { action, supplierId } = e.detail;
    const docNames = { ppt: 'Supplier Presentation.pptx', form: 'Onboarding Form.pdf', cert: 'Quality Certificates.zip' };
    console.log(`[PRD] Downloading ${docNames[action]} for ${supplierId}...`);
    
    // Simulate a download
    const btn = document.querySelector(`.shortlist-item[data-id="${supplierId}"] .shortlist-item__action-btn[data-action="${action}"]`);
    if (btn) {
      const originalHTML = btn.innerHTML;
      btn.innerHTML = '✅';
      setTimeout(() => btn.innerHTML = originalHTML, 2000);
    }
  });

  window.addEventListener('prd-email-shortlist', (e) => {
    const { shortlist } = e.detail;
    console.log('[PRD] Emailing shortlist summary and documents:', shortlist);
    
    const emailBtn = document.querySelector('.shortlist-panel__email-btn');
    if (emailBtn) {
      const originalText = emailBtn.innerHTML;
      emailBtn.innerHTML = '<span>Sent to your Email!</span>';
      emailBtn.style.background = 'var(--color-emerald)';
      setTimeout(() => {
        emailBtn.innerHTML = originalText;
        emailBtn.style.background = '';
      }, 3000);
    }
  });

  // 10. Entrance animations
  requestAnimationFrame(() => {
    document.body.classList.add('loaded');
    animateEntrance();
  });
});

// ── Search Handler ───────────────────────────────────────
function handleSearch(globe) {
  const searchInput = document.getElementById('search-input');
  appState.query = searchInput ? searchInput.value.trim() : '';

  if (!appState.query) return;

  console.log('[PRD] Searching:', appState.query);

  // Stop globe rotation
  globe.stopRotation();

  // Show bottom results container
  const bottomResults = document.getElementById('bottom-results-container');
  if (bottomResults) bottomResults.classList.remove('hidden');

  appState.hasSearched = true;

  // Hide scroll hint
  document.getElementById('scroll-hint')?.style.setProperty('opacity', '0');

  // Cache results for region filtering
  appState.lastSearchResults = [...MOCK_SUPPLIERS];

  // Render results
  updateStackedResultsOnly(globe);
}

function updateStackedResultsOnly(globe) {
  let results = [...appState.lastSearchResults];
  const query = appState.query.toLowerCase();

  // 1. Filter by region first (if any)
  if (appState.regions.length > 0) {
    const regionMap = {
      cn: 'China', vn: 'Vietnam', th: 'Thailand',
      tw: 'Taiwan', in: 'India', us: 'USA', au: 'Australia',
    };
    const allowed = appState.regions.map(r => regionMap[r]);
    results = results.filter(s => allowed.includes(s.country));
  }

  // 2. Identify search context (MainCategory vs SubCategory)
  let matchingMainCat = null;
  let matchingSubCat = null;
  
  // Normalize query for matching ('molding' -> 'moulding')
  const normQuery = query.replace(/molding/g, 'moulding');

  // Check main categories
  for (const mainCat in TECHNOLOGY_TAXONOMY) {
    if (mainCat.toLowerCase() === normQuery) {
      matchingMainCat = mainCat;
      break;
    }
    // Check sub categories
    const subCategories = TECHNOLOGY_TAXONOMY[mainCat];
    const subIdx = subCategories.findIndex(sub => sub.toLowerCase() === normQuery);
    if (subIdx !== -1) {
      matchingSubCat = subCategories[subIdx];
      break;
    }
  }

  // 3. Filter and Group
  let filteredResults = [];
  let groupingMode = 'default'; // 'sub-categories' or 'fixed-group'
  let groupTitle = matchingSubCat || matchingMainCat || appState.query;

  if (matchingMainCat) {
    // If searching for main category, get all suppliers that match this category ANYWHERE
    filteredResults = results.filter(s => {
      const sTechs = (s.technologies || []).map(t => t.toLowerCase().replace(/molding/g, 'moulding'));
      const sGroup = (s.techGroup || '').toLowerCase().replace(/molding/g, 'moulding');
      return sGroup === normQuery || sTechs.includes(normQuery);
    });
    groupingMode = 'sub-categories';
  } else if (matchingSubCat) {
    // If searching for sub-category, only show suppliers with that specific tag
    filteredResults = results.filter(s => {
      const sTechs = (s.technologies || []).map(t => t.toLowerCase().replace(/molding/g, 'moulding'));
      return sTechs.includes(normQuery);
    });
    groupingMode = 'fixed-group';
  } else {
    // General text search fallback
    filteredResults = results.filter(s => {
      const text = `${s.name} ${s.techGroup} ${(s.technologies || []).join(' ')}`.toLowerCase();
      return text.includes(query);
    });
    groupingMode = 'default';
  }

  // 4. Render
  renderStackedResults(filteredResults, (techName, suppliers) => {
    openSupplierCarousel(techName, suppliers);
  }, { groupingMode, groupTitle, mainTech: matchingMainCat });

  // Update globe dots
  globe.showSuppliers(filteredResults);
}

// ── View Switching Logic ────────────────────────────────
function switchView(view, globe) {
  const rfqEngine = document.getElementById('rfq-engine');
  const rfqRight = document.getElementById('rfq-engine-right');
  const searchBar = document.getElementById('search-bar');
  const tagline = document.getElementById('search-tagline');
  const bottomResults = document.getElementById('bottom-results-container');
  const globeContainer = document.getElementById('globe-container');
  const heroOverlay = document.querySelector('.hero__overlay');
  const modeToggles = document.getElementById('search-mode-toggles');

  console.log('[PRD] Switching to view:', view);

  // Reset defaults
  rfqEngine?.classList.add('hidden');
  rfqRight?.classList.add('hidden');
  if (searchBar) { searchBar.style.opacity = '1'; searchBar.style.pointerEvents = 'auto'; }
  if (tagline) tagline.style.opacity = '1';
  if (globeContainer) globeContainer.style.opacity = '1';
  if (heroOverlay) heroOverlay.style.opacity = '1';

  if (view === 'rfq') {
    appState.searchType = 'rfq';
    rfqEngine?.classList.remove('hidden');
    rfqRight?.classList.remove('hidden');
    if (searchBar) { searchBar.style.opacity = '0'; searchBar.style.pointerEvents = 'none'; }
    if (tagline) tagline.style.opacity = '0';
    bottomResults?.classList.add('hidden');


    if (!appState._rfqInitialized) {
      import('./js/components/rfq-controller.js').then(m => {
        m.initRFQController();
        appState._rfqInitialized = true;
      });
    }
  } else if (view === 'suppliers') {
    appState.searchType = 'suppliers';
    if (appState.hasSearched) {
      bottomResults?.classList.remove('hidden');
      updateStackedResultsOnly(globe);
    }
  } else if (view === 'home') {
    // Marketing focus — hide engine specific results but keep hero
    bottomResults?.classList.add('hidden');
    // Maybe dim the globe or something?
  }
}

// ── Entrance Animations ──────────────────────────────────
function animateEntrance() {
  const elements = [
    { el: document.querySelector('.search-area__tagline'), delay: 200 },
    { el: document.querySelector('.selector-flow'), delay: 350 },
    { el: document.querySelector('.region-row'), delay: 450 },
    { el: document.querySelector('.search-bar'), delay: 550 },
    { el: document.querySelector('.pricing-fab'), delay: 800 },
    { el: document.querySelector('.hero__scroll-hint'), delay: 1100 },
  ];

  elements.forEach(({ el, delay }) => {
    if (!el) return;
    el.style.opacity = '0';
    el.style.transform = 'translateY(16px)';
    el.style.transition = `opacity 0.7s var(--ease-out-expo) ${delay}ms, transform 0.7s var(--ease-out-expo) ${delay}ms`;

    requestAnimationFrame(() => {
      el.style.opacity = '1';
      el.style.transform = 'translateY(0)';
    });
  });
}

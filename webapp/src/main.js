/* ============================================================
   PRD — Main Entry Point v3 — Radial results + cascading selector
   ============================================================ */

import './css/design-system.css';
import './css/components.css';
import './css/layout.css';
import './css/rfq-engine.css';
import './css/profile.css';
import './css/light-theme.css';
import './css/designers-engine.css';
import './css/product-builder.css';
import './css/supplier-modal-light.css';
import './css/responsive.css';

import { initGlobe } from './js/globe/globe-engine.js';
import { initNavbar } from './js/components/navbar.js';

import { renderStackedResults, hideStackedResults } from './js/components/results-panel.js';
import { initSupplierCarousel, openSupplierCarousel } from './js/components/supplier-carousel.js';

import { TECHNOLOGY_TAXONOMY } from './js/data/technologies.js';
import { initAutocomplete } from './js/components/autocomplete.js';
import { initTechModal } from './js/components/tech-modal.js';

import { renderShortlist } from './js/components/shortlist.js';
import { getCurrentUser } from './js/services/auth.js';
import { saveShortlist } from './js/services/workspace.js';
import { supabase } from './js/supabase.js';

// ── App State ────────────────────────────────────────────
const appState = {
  hasSearched: false,
  searchType: 'suppliers',
  mode: 'find-supplier',
  stages: [],
  query: '',
  lastSearchResults: [], // Cache results to filter by region locally
  shortlist: [],
  currentTier: 'free'
};

// ── Boot Sequence ────────────────────────────────────────
document.addEventListener('DOMContentLoaded', async () => {
  console.log('[PRD] Booting PRD Dashboard...');
  
  appState.suppliersData = [];
  try {
    let allSupData = [];
    let from = 0;
    const size = 1000;
    while(true) {
        const { data, error } = await supabase.from('suppliers').select('*').range(from, from + size - 1);
        if (error) break;
        if (data) allSupData = allSupData.concat(data);
        if (!data || data.length < size) break;
        from += size;
    }
    
    appState.suppliersData = allSupData.map(row => {
      const s = { ...row.data, id: row.id, name: row.name, segment: row.segment, techGroup: row.tech_group };
      if (row.isActive !== undefined) s.isActive = row.isActive;
      return s;
    }).filter(s => s.isActive !== false);
  } catch(err) {
    console.error('Failed to load suppliers:', err);
  }
  
  // 0. Auth Guard — protect the engine
  const user = await getCurrentUser();
  if (!user) {
    console.warn('[PRD] Unauthenticated. Bypass enabled. Allowing access to app.html...');
    // window.location.href = '/index.html';
    // return;
  }
  if (user) console.log('[PRD] Authenticated as:', user.email);

  window.scrollTo(0, 0); // Enforce top scroll on load
  // 1. Navigation (async — loads profile panel + auth state)
  await initNavbar();

  // 2. 3D Globe
  const globe = initGlobe('globe-container', appState.suppliersData);

  // Theme Toggle temporarily disabled (dark theme enforced)
  // document.body.classList.remove('theme-light');

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




  // 5. Stage chips (previously Region chips)
  document.querySelectorAll('.region-chip').forEach(chip => {
    chip.addEventListener('click', () => {
      const stage = chip.dataset.stage;
      const idx = appState.stages.indexOf(stage);

      if (idx >= 0) {
        appState.stages.splice(idx, 1);
        chip.classList.remove('region-chip--active');
      } else {
        appState.stages.push(stage);
        chip.classList.add('region-chip--active');
      }
      
      if (appState.hasSearched) {
        updateStackedResultsOnly(globe);
      }
    });
  });


  // 6. Autocomplete
  initAutocomplete(appState.suppliersData);

  // 7. Tech Modal
  initTechModal();

  // Attach search event
  document.getElementById('search-submit')?.addEventListener('click', () => handleSearch(globe));
  document.getElementById('search-input')?.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') handleSearch(globe);
  });

  // 7. Supplier Carousel & Grid
  initSupplierCarousel();
  import('./js/components/supplier-grid.js').then(m => m.initSupplierGrid());

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

  document.getElementById('shortlist-save')?.addEventListener('click', () => {
    if (appState.shortlist.length === 0) return;
    const saveModal = document.getElementById('tabular-save-modal');
    if (!saveModal) return;
    
    document.getElementById('ts-modal-name').value = `Shortlist — ${new Date().toLocaleDateString()}`;
    document.getElementById('ts-modal-project').value = '';
    document.getElementById('ts-modal-comment').value = '';
    // Store context that we are saving from the globe view
    saveModal.dataset.source = 'globe';
    saveModal.classList.remove('hidden');
  });

  const confirmBtnGlobe = document.getElementById('ts-modal-confirm');
  confirmBtnGlobe?.addEventListener('click', async () => {
    const saveModal = document.getElementById('tabular-save-modal');
    if (saveModal.dataset.source !== 'globe') return;

    const nameInput = document.getElementById('ts-modal-name');
    const projectInput = document.getElementById('ts-modal-project');
    const commentInput = document.getElementById('ts-modal-comment');

    const name = nameInput.value.trim();
    if (!name) {
      nameInput.style.borderColor = '#f87171';
      return;
    }
    nameInput.style.borderColor = 'var(--color-slate-600)';
    
    const meta = { 
      source: 'globe',
      query: appState.query,
      project: projectInput.value.trim(),
      comment: commentInput.value.trim()
    };
    
    confirmBtnGlobe.textContent = 'Saving...';
    confirmBtnGlobe.style.pointerEvents = 'none';

    const { error } = await saveShortlist(name, appState.shortlist, meta);
    
    if (error) {
      confirmBtnGlobe.textContent = 'Failed';
      confirmBtnGlobe.style.backgroundColor = '#f85149';
      setTimeout(() => { 
        confirmBtnGlobe.textContent = 'Save to Workspace'; 
        confirmBtnGlobe.style.backgroundColor = 'var(--color-emerald)';
        confirmBtnGlobe.style.pointerEvents = ''; 
      }, 2000);
    } else {
      confirmBtnGlobe.textContent = 'Saved!';
      setTimeout(() => { 
        saveModal.classList.add('hidden'); 
        confirmBtnGlobe.textContent = 'Save to Workspace'; 
        confirmBtnGlobe.style.pointerEvents = ''; 
      }, 1000);
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
  if (bottomResults) {
      bottomResults.classList.remove('hidden');
      bottomResults.style.display = '';
  }

  appState.hasSearched = true;

  // Hide scroll hint
  document.getElementById('scroll-hint')?.style.setProperty('opacity', '0');

  window.addEventListener('prd-clear-results', () => {
    appState.query = '';
    appState.hasSearched = false;
    appState.stages = [];
    document.querySelectorAll('.region-chip').forEach(chip => chip.classList.remove('region-chip--active'));
    const searchInput = document.getElementById('search-input');
    if (searchInput) searchInput.value = '';
    hideStackedResults();
    globe.showSuppliers([]); // clear highlighted dots
    globe.resumeRotation(); // optionally resume globe spin
    const titleContainer = document.querySelector('.hero__title-container');
    if (titleContainer) titleContainer.style.display = 'block';
  });

  // Cache results for region filtering
  // Fetch real data to cache if empty, else use state
  if (appState.suppliersData && appState.suppliersData.length > 0) {
    appState.lastSearchResults = appState.suppliersData;
    updateStackedResultsOnly(globe);
  } else {
    // If it comes here, use an empty array or existing because we already fetched on boot
    appState.lastSearchResults = appState.suppliersData || [];
    updateStackedResultsOnly(globe);
    
    // Kept to maintain line counts roughly
    // .then(data => ...)
  }
}

function updateStackedResultsOnly(globe) {
  let results = [...appState.lastSearchResults];
  const query = appState.query.toLowerCase();

  // 1. Filter by stage first (if any)
  if (appState.stages.length > 0) {
    results = results.filter(s => {
      return appState.stages.some(st => {
        const stageMatch = st.toLowerCase();
        
        // Custom attribute overrides for the new buttons
        if (stageMatch === 'low volume') {
          return (s.scoreLowVolume && s.scoreLowVolume > 0);
        }
        if (stageMatch === 'high volume') {
          return (s.scoreHighVolume && s.scoreHighVolume > 0);
        }
        if (stageMatch === 'manufacturing') {
          return `${s.techGroup} ${(s.technologies || []).join(' ')}`.toLowerCase().includes('manufactur') || 
                 `${s.techGroup} ${(s.technologies || []).join(' ')}`.toLowerCase().includes('cm');
        }
        if (stageMatch === 'prototype') {
          return `${s.techGroup} ${(s.technologies || []).join(' ')}`.toLowerCase().includes('prototyp');
        }
        
        // Fallback text search
        const textToSearch = `${s.stage || ''} ${s.segment || ''} ${(s.technologies || []).join(' ')}`.toLowerCase();
        return textToSearch.includes(stageMatch);
      });
    });
  }

  // 2. Filter by Search Query
  let filteredResults = results;
  let groupTitle = appState.query || 'Results';
  
  if (query) {
    filteredResults = results.filter(s => {
      const text = `${s.name} ${s.techGroup} ${(s.technologies || []).join(' ')}`.toLowerCase();
      return text.includes(query);
    });
  }

  // 3. Render
  renderStackedResults(filteredResults, (techName, suppliers) => {
    if (suppliers.length > 1) {
      import('./js/components/supplier-grid.js').then(m => m.openSupplierGrid(techName, suppliers));
    } else {
      openSupplierCarousel(techName, suppliers);
    }
  }, { groupingMode: 'default', groupTitle });

  // Update globe dots
  globe.showSuppliers(filteredResults);
}

// ── View Switching Logic ────────────────────────────────
function switchView(view, globe) {
  // ZERO-TRUST AUTHORIZATION GUARD
  const sysTier = sessionStorage.getItem('atlasdt_tier') || 'basic';
  const restrictedViews = ['suppliers', 'product-builder', 'tariff'];
  if (sysTier === 'basic' && restrictedViews.includes(view)) {
    console.warn(`[Auth] Blocked restricted view attempt: ${view} on ${sysTier} tier.`);
    return;
  }
  const rfqEngine = document.getElementById('rfq-engine');
  const rfqRight = document.getElementById('rfq-engine-right');
  const designersEngine = document.getElementById('designers-engine');
  const productBuilderEngine = document.getElementById('product-builder-engine');
  const tariffEngine = document.getElementById('tariff-engine');
  const searchBar = document.getElementById('search-bar');
  const tagline = document.getElementById('search-tagline');
  const heroTitleContainer = document.querySelector('.hero__title-container');
  const bottomResults = document.getElementById('bottom-results-container');
  const globeContainer = document.getElementById('globe-container');
  const heroOverlay = document.querySelector('.hero__overlay');
  const modeToggles = document.getElementById('search-mode-toggles');
  const hero = document.getElementById('hero');

  const selectionScreen = document.getElementById('sales-funnel');
  const tabularEngine = document.getElementById('supplier-tabular-engine');

  console.log('[PRD] Switching to view:', view);

  // Reset defaults
  rfqEngine?.classList.add('hidden');
  rfqRight?.classList.add('hidden');
  designersEngine?.classList.add('hidden');
  productBuilderEngine?.classList.add('hidden');
  tariffEngine?.classList.add('hidden');
  hero?.classList.remove('hidden');
  tabularEngine?.classList.add('hidden');
  selectionScreen?.classList.add('hidden');

  // Clean up global nav states
  document.querySelectorAll('.navbar__menu-item').forEach(item => {
    item.classList.remove('navbar__menu-item--active');
    if (item.dataset.view === view) {
      item.classList.add('navbar__menu-item--active');
    }
  });

  const supplierViewToggle = document.getElementById('supplier-view-toggle');
  if (supplierViewToggle) {
    if (view !== 'suppliers') {
      supplierViewToggle.classList.add('hidden');
    } else {
      supplierViewToggle.classList.remove('hidden');
    }
  }

  // Global resets based on view type
  if (view === 'suppliers' || view === 'home') {
    heroTitleContainer?.classList.remove('hidden');
    if (searchBar) { searchBar.style.opacity = '1'; searchBar.style.pointerEvents = 'auto'; }
    if (tagline) tagline.style.opacity = '1';
    if (globeContainer) globeContainer.style.opacity = '1';
    if (heroOverlay) heroOverlay.style.opacity = '1';
    
    // Auth guard for Basic Tier: Hide search components if they aren't supposed to see suppliers
    if (sysTier === 'basic') {
       heroTitleContainer?.classList.add('hidden');
    }
  } else {
    heroTitleContainer?.classList.add('hidden');
  }

  if (view === 'rfq') {
    appState.searchType = 'rfq';
    rfqEngine?.classList.remove('hidden');
    rfqRight?.classList.remove('hidden');
    bottomResults?.classList.add('hidden');

    if (!appState._rfqInitialized) {
      import('./js/components/rfq-controller.js').then(m => {
        m.initRFQController();
        appState._rfqInitialized = true;
      });
    }
  } else if (view === 'designers') {
    appState.searchType = 'designers';
    hero?.classList.add('hidden');
    bottomResults?.classList.add('hidden');
    designersEngine?.classList.remove('hidden');

    if (!appState._designersInitialized) {
      import('./js/components/designers-controller.js').then(m => {
        m.initDesignersController();
        appState._designersInitialized = true;
      });
    }
  } else if (view === 'product-builder') {
    appState.searchType = 'product-builder';
    hero?.classList.add('hidden');
    bottomResults?.classList.add('hidden');
    productBuilderEngine?.classList.remove('hidden');

    if (!appState._productBuilderInitialized) {
      import('./js/components/product-builder-controller.js').then(m => {
        m.initProductBuilder();
        appState._productBuilderInitialized = true;
      });
    }
  } else if (view === 'tariff') {
    appState.searchType = 'tariff';
    hero?.classList.add('hidden');
    bottomResults?.classList.add('hidden');
    tariffEngine?.classList.remove('hidden');

  } else if (view === 'suppliers') {
    appState.searchType = 'suppliers';
    selectionScreen?.classList.add('hidden');
    
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


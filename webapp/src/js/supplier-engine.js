import { supabase } from './supabase.js';
import { getCurrentUser } from './services/auth.js';
import { saveShortlist } from './services/workspace.js';

let isAuthenticated = false;
let suppliersData = [];
let filteredData = [];
let tabularShortlist = new Map();

// DOM Elements
let selectionScreen, tabularEngine, globeContainer, viewToggle;
let searchInput, tableBody, techGroupFilter, tagInput, certPillContainer, countryFilter, segmentPills, resultsInfo;

document.addEventListener('DOMContentLoaded', async () => {
  selectionScreen = document.getElementById('sales-funnel');
  tabularEngine = document.getElementById('supplier-tabular-engine');
  globeContainer = document.getElementById('globe-container');
  viewToggle = document.getElementById('supplier-view-toggle');
  
  if (!selectionScreen || !tabularEngine) return;

  const authUser = await getCurrentUser();
  isAuthenticated = !!authUser;

  // Cache tabular DOM
  searchInput = document.getElementById('tabular-search-input');
  tableBody = document.getElementById('tabular-table-body');
  techGroupFilter = document.getElementById('tabular-techgroup-filter');
  tagInput = document.getElementById('tabular-tag-input');
  certPillContainer = document.getElementById('tabular-cert-pills');
  countryFilter = document.getElementById('tabular-country-filter');
  segmentPills = document.querySelectorAll('#tabular-segment-pills .segment-pill');
  resultsInfo = document.getElementById('tabular-results-info');

  let userTier = sessionStorage.getItem('atlasdt_tier') || 'basic';
  if (authUser) {
    const { data: profile } = await supabase.from('profiles').select('tier').eq('id', authUser.id).single();
    if (profile && profile.tier) userTier = profile.tier;
  }
  
  // Sync to session storage for synchronous auth guards across the app
  sessionStorage.setItem('atlasdt_tier', userTier);

  const urlParams = new URLSearchParams(window.location.search);
  const justSubscribed = urlParams.get('success') === 'true';

  const tierCheck = String(userTier).toLowerCase().trim();
  const isProAccess = ['professional', 'pro', 'enterprise'].includes(tierCheck);

  if (isAuthenticated || justSubscribed) {
    if (isProAccess || justSubscribed) {
      openGlobeView();
    } else {
      window.dispatchEvent(new CustomEvent('prd-nav-switch', { detail: { view: 'rfq' } }));
      document.getElementById('sales-funnel')?.classList.add('hidden');
    }
  } else {
    // Hide the globe elements initially to show selection screen
    const searchBar = document.getElementById('search-bar');
    const tagline = document.getElementById('search-tagline');
    const regionRow = document.getElementById('region-row-hero');
    
    if (globeContainer) {
      globeContainer.style.transition = 'opacity 0.6s ease';
      globeContainer.style.opacity = '0.2';
    }
    if (searchBar) searchBar.style.display = 'none';
    if (tagline) tagline.style.display = 'none';
    if (regionRow) regionRow.style.display = 'none';
    
    selectionScreen.classList.remove('hidden');
  }

  // Load unified data
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

    suppliersData = allSupData.map(row => {
      const s = { ...row.data, id: row.id, name: row.name, segment: row.segment, techGroup: row.tech_group };
      if (row.isActive !== undefined) s.isActive = row.isActive;
      if (!s.techGroup && s.technologies && s.technologies.length > 0) {
        s.techGroup = s.technologies[0];
      }
      if (!s.segment) {
        s.segment = 'TIER 1';
      }
      return s;
    }).sort((a, b) => {
        let nameA = (a.name || '').toLowerCase();
        let nameB = (b.name || '').toLowerCase();
        if (nameA < nameB) return -1;
        if (nameA > nameB) return 1;
        return 0;
    }).filter(s => s.isActive !== false);
    
    filteredData = [...suppliersData];
    initTabularEngine();
  } catch (err) {
    console.error('[Supplier Engine] Error loading unified suppliers:', err);
    if(resultsInfo) resultsInfo.textContent = 'Error loading supplier data. File might be missing.';
  }

  // ── Event Listeners ──

  // --- SALES FUNNEL LOGIC ---
  const salesFunnel = document.getElementById('sales-funnel');
  const enterBtns = document.querySelectorAll('.btn-enter-platform');
  
  enterBtns.forEach(btn => {
    btn.addEventListener('click', async (e) => {
      e.preventDefault();
      
      // Check if user is actually authenticated
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        // Enforce Authentication
        const authModal = document.getElementById('auth-modal');
        if (authModal) {
          authModal.classList.remove('hidden');
          // Switch to signup view
          const btnSignupToggle = document.getElementById('toggle-to-signup');
          if (btnSignupToggle) btnSignupToggle.click();
          
          // Pre-select the tier in dropdown
          const pendingTier = btn.dataset.tier || 'basic';
          const signupTierSelect = document.getElementById('signup-tier');
          if (signupTierSelect) {
            signupTierSelect.value = pendingTier;
          }
        } else {
          window.location.href = '/index.html';
        }
        return;
      }
      
      // If they are logged in but somehow see this, let check if they clicked Pro
      const tier = btn.dataset.tier || 'basic';
      if (tier === 'professional' || tier === 'enterprise') {
        const originalText = btn.textContent;
        btn.textContent = 'Loading Stripe...';
        btn.disabled = true;
        try {
          const response = await fetch('/.netlify/functions/create-checkout', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userId: session.user.id })
          });
          const data = await response.json();
          if (data.url) {
            window.location.href = data.url;
          } else {
            alert("Checkout Error: " + JSON.stringify(data));
            btn.textContent = originalText;
            btn.disabled = false;
          }
        } catch(e) {
          alert("Network/Fetch Error: " + e.message);
          btn.textContent = originalText;
          btn.disabled = false;
        }
      } else {
        openGlobeView();
      }
    });
  });

  document.querySelectorAll('.view-toggle-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const mode = e.currentTarget.dataset.view;
      if (mode === 'table') openTabularView();
      if (mode === 'globe') openGlobeView();
    });
  });

  // Table Searching and Filtering
  if(searchInput) {
    searchInput.addEventListener('input', applyFilters);
  }
  if(techGroupFilter) {
    techGroupFilter.addEventListener('change', applyFilters);
  }
  if(tagInput) {
    tagInput.addEventListener('input', applyFilters);
  }
  if(countryFilter) {
    countryFilter.addEventListener('change', () => {
      rebuildTechGroupFilter();
      applyFilters();
    });
  }
  
  segmentPills.forEach(pill => {
    pill.addEventListener('click', () => {
      const isAll = pill.dataset.segment === 'ALL';
      const containerPills = document.querySelectorAll('#tabular-segment-pills .segment-pill');
      
      if (isAll) {
        containerPills.forEach(p => p.classList.remove('active'));
        pill.classList.add('active');
      } else {
        document.querySelector('#tabular-segment-pills .segment-pill[data-segment="ALL"]').classList.remove('active');
        pill.classList.toggle('active');
        
        // If nothing active, activate ALL
        const activeCount = document.querySelectorAll('#tabular-segment-pills .segment-pill.active').length;
        if (activeCount === 0) {
          document.querySelector('#tabular-segment-pills .segment-pill[data-segment="ALL"]').classList.add('active');
        }
      }
      rebuildTechGroupFilter();
      applyFilters();
    });
  });

  // Tabular Shortlist Controls
  document.getElementById('tabular-shortlist-toggle')?.addEventListener('change', applyFilters);
  document.getElementById('tabular-shortlist-clear')?.addEventListener('click', () => {
    tabularShortlist.clear();
    updateShortlistControls();
    
    // Clear styles on all currently visible buttons
    document.querySelectorAll('.tabular-shortlist-btn.added').forEach(btn => {
      btn.classList.remove('added');
      btn.style.color = 'var(--color-steel-400)';
      btn.title = 'Add to Shortlist';
      btn.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><line x1="12" y1="8" x2="12" y2="16"></line><line x1="8" y1="12" x2="16" y2="12"></line></svg>`;
    });
    
    if (document.getElementById('tabular-shortlist-toggle')?.checked) {
      document.getElementById('tabular-shortlist-toggle').checked = false;
      applyFilters();
    }
  });
  
  document.getElementById('tabular-shortlist-export')?.addEventListener('click', () => {
    if (tabularShortlist.size === 0) return;
    const items = Array.from(tabularShortlist.values());
    const header = "Name,Country,Tech Group,Technologies,Technical Cap,Ownership Ethos,Quality System,Verified\n";
    const rows = items.map(s => {
      const techs = (s.technologies || []).join('; ');
      return `"${s.name}","${s.country || ''}","${s.techGroup || ''}","${techs}",${s.scoreTc || 0},${s.scoreOe || 0},${s.scoreQs || 0},${s.scoreV || 0}`;
    }).join('\n');
    
    const blob = new Blob([header + rows], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", "atlasdt-shortlist.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  });
  
  const saveModal = document.getElementById('tabular-save-modal');
  const cancelBtn = document.getElementById('ts-modal-cancel');
  const confirmBtn = document.getElementById('ts-modal-confirm');
  const nameInput = document.getElementById('ts-modal-name');
  const projectInput = document.getElementById('ts-modal-project');
  const commentInput = document.getElementById('ts-modal-comment');

  document.getElementById('tabular-shortlist-save')?.addEventListener('click', () => {
    if (tabularShortlist.size === 0) return;
    nameInput.value = `Tabular List — ${new Date().toLocaleDateString()}`;
    projectInput.value = '';
    commentInput.value = '';
    saveModal.dataset.source = 'tabular';
    saveModal.classList.remove('hidden');
  });

  cancelBtn?.addEventListener('click', () => {
    saveModal.classList.add('hidden');
  });

  confirmBtn?.addEventListener('click', async () => {
    if (saveModal.dataset.source !== 'tabular') return;

    const name = nameInput.value.trim();
    if (!name) {
      nameInput.style.borderColor = '#f87171';
      return;
    }
    nameInput.style.borderColor = 'var(--color-slate-600)';
    
    const items = Array.from(tabularShortlist.values());
    const meta = { 
      source: 'tabular',
      project: projectInput.value.trim(),
      comment: commentInput.value.trim()
    };
    
    confirmBtn.textContent = 'Saving...';
    confirmBtn.style.pointerEvents = 'none';

    const { error } = await saveShortlist(name, items, meta);
    
    if (error) {
      confirmBtn.textContent = 'Failed';
      confirmBtn.style.backgroundColor = '#f85149';
      setTimeout(() => { 
        confirmBtn.textContent = 'Save to Workspace'; 
        confirmBtn.style.backgroundColor = 'var(--color-emerald)';
        confirmBtn.style.pointerEvents = ''; 
      }, 2000);
    } else {
      confirmBtn.textContent = 'Saved!';
      setTimeout(() => { 
        saveModal.classList.add('hidden'); 
        confirmBtn.textContent = 'Save to Workspace'; 
        confirmBtn.style.pointerEvents = ''; 
      }, 1000);
    }
  });
  
  function updateShortlistControls() {
    const controls = document.getElementById('tabular-shortlist-controls');
    const countBadge = document.getElementById('tabular-shortlist-badge');
    if (tabularShortlist.size > 0) {
      if(controls) controls.style.display = 'flex';
      if(countBadge) countBadge.textContent = `${tabularShortlist.size} Shortlisted`;
    } else {
      if(controls) controls.style.display = 'none';
    }
  }

  window.addEventListener('prd-tabular-shortlist-add', (e) => {
    const { supplier } = e.detail;
    tabularShortlist.set(supplier.id || supplier.name, supplier);
    updateShortlistControls();
    if (document.getElementById('tabular-shortlist-toggle')?.checked) applyFilters();
  });

  window.addEventListener('prd-tabular-shortlist-remove', (e) => {
    const { supplierId } = e.detail;
    tabularShortlist.delete(supplierId);
    updateShortlistControls();
    if (document.getElementById('tabular-shortlist-toggle')?.checked) applyFilters();
  });


  // Sorting
  document.querySelectorAll('.tabular-table th.sortable').forEach(th => {
    th.addEventListener('click', () => {
      const column = th.dataset.column;
      const isAsc = th.classList.contains('sort-asc');
      
      // Reset all
      document.querySelectorAll('.tabular-table th.sortable').forEach(t => {
        t.classList.remove('sort-asc', 'sort-desc');
      });

      // Toggle sort dir
      const dir = isAsc ? 'desc' : 'asc';
      th.classList.add(`sort-${dir}`);

      sortTable(column, dir === 'asc');
    });
  });
});

// ── Views ──

function openTabularView() {
  selectionScreen.classList.add('hidden');
  if (globeContainer) globeContainer.style.opacity = '0.3';
  tabularEngine.classList.remove('hidden');
  viewToggle.classList.remove('hidden');
  
  const titleContainer = document.querySelector('.hero__title-container');
  if (titleContainer) titleContainer.style.display = 'none';
  
  const radialResults = document.getElementById('radial-results');
  if (radialResults) radialResults.style.display = 'none';

  const bottomResults = document.getElementById('bottom-results-container');
  if (bottomResults) bottomResults.style.display = 'none';

  document.querySelector('.view-toggle-btn[data-view="table"]')?.classList.add('active');
  document.querySelector('.view-toggle-btn[data-view="globe"]')?.classList.remove('active');
}

function openGlobeView() {
  selectionScreen.classList.add('hidden');
  tabularEngine.classList.add('hidden');
  if (globeContainer) globeContainer.style.opacity = '1';
  
  const titleContainer = document.querySelector('.hero__title-container');
  if (titleContainer) titleContainer.style.display = 'block';

  const radialResults = document.getElementById('radial-results');
  if (radialResults && radialResults.innerHTML.trim() !== '') {
    radialResults.style.display = 'flex';
  }

  const bottomResults = document.getElementById('bottom-results-container');
  if (bottomResults && bottomResults.innerHTML.trim() !== '') {
    bottomResults.style.display = '';
  }
  
  const searchBar = document.getElementById('search-bar');
  const tagline = document.getElementById('search-tagline');
  const regionRow = document.getElementById('region-row-hero');

  if (searchBar) searchBar.style.display = 'flex';
  if (tagline) tagline.style.display = 'block';
  if (regionRow) regionRow.style.display = 'flex';
  
  viewToggle.classList.remove('hidden');
  
  document.querySelector('.view-toggle-btn[data-view="globe"]')?.classList.add('active');
  document.querySelector('.view-toggle-btn[data-view="table"]')?.classList.remove('active');
}

// ── Tabular Engine Logic ──

function initTabularEngine() {
  const countries = [...new Set(suppliersData.map(s => s.country).filter(Boolean))].sort();

  const topCerts = [
    "ISO 9001",
    "ISO 14001",
    "ISO 13485",
    "IATF 16949",
    "AS9100",
    "UL Listed",
    "CE Marked",
    "RoHS",
    "REACH",
    "FDA Registered"
  ];

  countries.forEach(country => {
    const option = document.createElement('option');
    option.value = country; option.textContent = country;
    countryFilter?.appendChild(option);
  });
  
  rebuildTechGroupFilter();

  if (certPillContainer) {
    certPillContainer.innerHTML = '<div class="segment-pill active" data-segment="ALL">ALL</div>';
    topCerts.forEach(cert => {
      const pill = document.createElement('div');
      pill.className = 'segment-pill';
      pill.dataset.segment = cert;
      pill.textContent = cert;
      certPillContainer.appendChild(pill);
    });

    certPillContainer.querySelectorAll('.segment-pill').forEach(pill => {
      pill.addEventListener('click', () => {
        const isAll = pill.dataset.segment === 'ALL';
        const pills = certPillContainer.querySelectorAll('.segment-pill');
        if (isAll) {
          pills.forEach(p => p.classList.remove('active'));
          pill.classList.add('active');
        } else {
          certPillContainer.querySelector('[data-segment="ALL"]').classList.remove('active');
          pill.classList.toggle('active');
          if (certPillContainer.querySelectorAll('.segment-pill.active').length === 0) {
            certPillContainer.querySelector('[data-segment="ALL"]').classList.add('active');
          }
        }
        applyFilters();
      });
    });
  }

  renderTable(filteredData);
}

function rebuildTechGroupFilter() {
  if (!techGroupFilter) return;

  const currentSelect = techGroupFilter.value;
  
  const activeSegments = Array.from(document.querySelectorAll('#tabular-segment-pills .segment-pill.active')).map(p => p.dataset.segment);
  const showAllSegments = activeSegments.includes('ALL') || activeSegments.length === 0;

  let validData = suppliersData;
  if (!showAllSegments) {
     validData = validData.filter(s => activeSegments.includes((s.segment || '').toUpperCase()));
  }
  
  const selectedCountry = countryFilter?.value;
  if (selectedCountry) {
     validData = validData.filter(s => s.country === selectedCountry);
  }

  const activeTechGroups = [...new Set(validData.map(s => s.techGroup).filter(Boolean))].sort();

  techGroupFilter.innerHTML = '<option value="">All Tech Groups</option>';
  
  activeTechGroups.forEach(tech => {
    const option = document.createElement('option');
    option.value = tech; 
    option.textContent = tech;
    techGroupFilter.appendChild(option);
  });

  // Preserve user selection if it's still a valid group
  if (activeTechGroups.includes(currentSelect)) {
    techGroupFilter.value = currentSelect;
  }
}

function applyFilters() {
  const query = searchInput.value.toLowerCase().trim();
  const techGroup = techGroupFilter?.value;
  const tagQuery = tagInput?.value.toLowerCase().trim();
  const country = countryFilter?.value;

  const activeSegments = Array.from(document.querySelectorAll('#tabular-segment-pills .segment-pill.active')).map(p => p.dataset.segment);
  const showAllSegments = activeSegments.includes('ALL');

  const activeCerts = Array.from(document.querySelectorAll('#tabular-cert-pills .segment-pill.active')).map(p => p.dataset.segment);
  const showAllCerts = activeCerts.includes('ALL');
  
  const viewShortsOnly = document.getElementById('tabular-shortlist-toggle')?.checked;

  filteredData = suppliersData.filter(s => {
    // 1. Search Query
    if (query) {
      const texts = [
        s.name, 
        s.nameZh,
        s.country, 
        s.techGroup,
        ...(s.technologies || []), 
        ...(s.tags || [])
      ].filter(Boolean).map(t => String(t).toLowerCase());
      
      const match = texts.some(t => t.includes(query));
      if (!match) return false;
    }

    // 2. Tag Query
    if (tagQuery) {
      const tagTexts = (s.tags || []).filter(Boolean).map(t => String(t).toLowerCase());
      const matchTag = tagTexts.some(t => t.includes(tagQuery));
      if (!matchTag) return false;
    }

    // 3. Tech Group
    if (techGroup && s.techGroup !== techGroup) return false;

    // 4. Certifications
    if (!showAllCerts) {
        const cleanCerts = (s.certifications || []).filter(c => !c.match(/^\d{4}-\d{2}-\d{2}/));
        const validTags = (s.tags || []).filter(t => /ISO|IATF|AS\d{4}/i.test(t));
        const finalObjCerts = [...cleanCerts, ...validTags];
        const hasActiveCert = activeCerts.some(c => finalObjCerts.includes(c));
        if (!hasActiveCert) return false;
    }

    // 5. Country
    if (country && s.country !== country) return false;

    // 6. Segment
    if (!showAllSegments) {
      const seg = (s.segment || '').toUpperCase();
      if (!activeSegments.includes(seg)) return false;
    }

    // 7. Shortlist view
    if (viewShortsOnly) {
      const sid = s.id || s.name;
      if (!tabularShortlist.has(sid)) return false;
    }

    return true;
  });

  renderTable(filteredData);
}

function sortTable(column, isAsc) {
  filteredData.sort((a, b) => {
    let valA = a[column] || '';
    let valB = b[column] || '';
    
    if (typeof valA === 'string') valA = valA.toLowerCase();
    if (typeof valB === 'string') valB = valB.toLowerCase();

    if (valA < valB) return isAsc ? -1 : 1;
    if (valA > valB) return isAsc ? 1 : -1;
    return 0;
  });
  renderTable(filteredData);
}

function renderTable(data) {
  if(!tableBody) return;
  tableBody.innerHTML = '';
  
  const resultsCountSpan = document.getElementById('tabular-results-count');
  if (resultsCountSpan) {
    resultsCountSpan.innerHTML = `Found <strong style="color: white; font-size: 15px;">${data.length}</strong> suppliers matching your criteria.`;
  }

  data.forEach((supplier, index) => {
    const tr = document.createElement('tr');
    tr.dataset.id = supplier.id;
    
    // Blurring mechanism for unauthenticated users
    let nameHtml = supplier.name || 'Unknown Supplier';
    if (!isAuthenticated) {
      nameHtml = `<span class="blurred-name" title="Sign up to view full supplier list">${supplier.name}</span>`;
    }

    // Segment styling
    let segClass = 'tag-tier1';
    const seg = (supplier.segment || '').toUpperCase();
    if(seg.includes('TIER 2')) segClass = 'tag-tier2';
    if(seg.includes('OEM')) segClass = 'tag-oem';

    // Certifications styling (removing injected dates and aggregating from tags)
    const cleanCerts = (supplier.certifications || []).filter(c => !c.match(/^\d{4}-\d{2}-\d{2}/));
    const validTags = (supplier.tags || []).filter(t => /ISO|IATF|AS\d{4}/i.test(t));
    const finalCerts = [...new Set([...cleanCerts, ...validTags])];

    const certsHtml = finalCerts.map(c => 
      `<div style="white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 60px; font-size:11px; margin-bottom:4px; display:block;" title="${c}"><span class="cert-indicator"></span>${c}</div>`
    ).join('');

    const getTrafficLightSvg = (score) => {
      const val = parseInt(score || 0);
      if (val === 2) {
         return `<svg width="8" height="8" viewBox="0 0 10 10" fill="#10b981" style="margin:0 auto;display:block;"><circle cx="5" cy="5" r="5"></circle></svg>`;
      }
      if (val === 1) {
         return `<svg width="8" height="8" viewBox="0 0 10 10" fill="#f59e0b" style="margin:0 auto;display:block;"><circle cx="5" cy="5" r="5"></circle></svg>`;
      }
      return `<svg width="8" height="8" viewBox="0 0 10 10" fill="#30363d" style="margin:0 auto;display:block;"><circle cx="5" cy="5" r="5"></circle></svg>`;
    };
    
    const docsHtml = `
      <div style="display:flex; gap:6px;">
        <button title="Supplier Presentation" style="background:transparent; border:none; cursor:pointer; color:var(--color-steel-400); padding:2px;"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/><polyline points="14 2 14 8 20 8"/></svg></button>
        <button title="Onboarding Form" style="background:transparent; border:none; cursor:pointer; color:var(--color-steel-400); padding:2px;"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/><rect x="8" y="2" width="8" height="4" rx="1" ry="1"/></svg></button>
        <button title="Certificates" style="background:transparent; border:none; cursor:pointer; color:var(--color-steel-400); padding:2px;"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg></button>
      </div>
    `;

    // Technologies styling
    const maxTechs = 3;
    const techs = supplier.technologies || [];
    let techsHtml = techs.slice(0, maxTechs).map(t => 
      `<span style="display:inline-block; margin-right: 4px; color: #8b949e; background: rgba(255,255,255,0.05); padding: 2px 6px; border-radius: 4px; font-size: 11px;">${t}</span>`
    ).join('');
    if(techs.length > maxTechs) {
      techsHtml += `<span style="font-size: 11px; color: #58a6ff;">+${techs.length - maxTechs} more</span>`;
    }

    const supplierId = supplier.id || supplier.name;
    const isShortlisted = tabularShortlist.has(supplierId);
    const shortlistHtml = isShortlisted
      ? `<button class="tabular-shortlist-btn added" data-id="${supplierId}" title="In Shortlist" style="background:transparent; border:none; color:#10b981; cursor:pointer; padding:4px;">
           <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
         </button>`
      : `<button class="tabular-shortlist-btn" data-id="${supplierId}" title="Add to Shortlist" style="background:transparent; border:none; color:var(--color-steel-400); cursor:pointer; padding:4px; transition:color 0.2s;">
           <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><line x1="12" y1="8" x2="12" y2="16"></line><line x1="8" y1="12" x2="16" y2="12"></line></svg>
         </button>`;

    tr.innerHTML = `
      <td style="font-weight: 500;">
        <div style="display: flex; align-items: center; gap: 8px;">
          ${nameHtml}
          ${!isAuthenticated ? '<svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.4)" stroke-width="2"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>' : ''}
        </div>
      </td>
      <td>${supplier.country || '—'}</td>
      <td><span class="tag-segment ${segClass}">${supplier.segment || 'TIER 1'}</span></td>
      <td style="color: #7ee787;">${supplier.techGroup || '—'}</td>
      <td>${techsHtml || '—'}</td>
      <td style="text-align:center; padding:12px 2px;">${getTrafficLightSvg(supplier.scoreTc)}</td>
      <td style="text-align:center; padding:12px 2px;">${getTrafficLightSvg(supplier.scoreOe)}</td>
      <td style="text-align:center; padding:12px 2px;">${getTrafficLightSvg(supplier.scoreQs)}</td>
      <td style="text-align:center; padding:12px 2px;">${getTrafficLightSvg(supplier.scoreV)}</td>
      <td><div style="display:flex; flex-direction:column; justify-content:center;">${certsHtml || '—'}</div></td>
      <td>${docsHtml}</td>
      <td style="text-align:center;" class="shortlist-cell">${shortlistHtml}</td>
    `;

    // Click handler to show details later
    tr.addEventListener('click', (e) => {
       // Prevent opening Details Modal if clicking Shortlist or Docs
       if (e.target.closest('button[title]')) {
         const btn = e.target.closest('button[title]');
         if (btn.classList.contains('tabular-shortlist-btn')) {
           if (!btn.classList.contains('added')) {
             // Add logic without relying purely on sidebar popout
             window.dispatchEvent(new CustomEvent('prd-tabular-shortlist-add', { detail: { supplier } }));
             
             btn.classList.add('added');
             btn.style.color = '#10b981';
             btn.title = 'In Shortlist';
             btn.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>`;
           } else {
             // Remove logic
             window.dispatchEvent(new CustomEvent('prd-tabular-shortlist-remove', { detail: { supplierId: supplier.id || supplier.name } }));
             
             btn.classList.remove('added');
             btn.style.color = 'var(--color-steel-400)';
             btn.title = 'Add to Shortlist';
             btn.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><line x1="12" y1="8" x2="12" y2="16"></line><line x1="8" y1="12" x2="16" y2="12"></line></svg>`;
           }
         }
         return;
       }

       if (!isAuthenticated) {
         const authModal = document.getElementById('auth-modal');
         if (authModal) {
           authModal.classList.remove('hidden');
         } else {
           alert('Please create an account or sign in to view detailed supplier profiles.');
         }
       } else {
         window.dispatchEvent(new CustomEvent('prd-open-supplier', {
           detail: { techName: supplier.techGroup || 'Manufacturing Partner', supplier }
         }));
       }
    });

    // Staggered animation effect
    tr.style.opacity = '0';
    tr.style.transform = 'translateY(10px)';
    tr.style.transition = 'all 0.3s ease';
    
    tableBody.appendChild(tr);

    setTimeout(() => {
      tr.style.opacity = '1';
      tr.style.transform = 'translateY(0)';
    }, index * 20); // 20ms stagger
  });

  if (data.length === 0) {
    tableBody.innerHTML = `<tr><td colspan="7" style="text-align: center; padding: 40px; color: #8b949e;">No suppliers found matching the criteria.</td></tr>`;
  }
}



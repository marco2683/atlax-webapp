
import { MOCK_DESIGNERS } from './data/mock-designers.js';
import { supabase } from './supabase.js';
import { renderPricingConfigurator } from './admin-pricing.js';
import { renderMarketplaceTaxonomy } from './admin-taxonomy.js';

/* ================================================================
   Atlas DT Admin Panel — Full CRM with Add/Edit Forms
   ================================================================ */

document.addEventListener('DOMContentLoaded', () => {

  const loginView = document.getElementById('admin-login-view');
  const dashboardView = document.getElementById('admin-dashboard-view');
  const loginForm = document.getElementById('admin-login-form');
  const logoutBtn = document.getElementById('admin-logout-btn');
  const pageTitle = document.getElementById('admin-page-title');
  const contentRouting = document.getElementById('admin-content-routing');
  const navItems = document.querySelectorAll('.admin-nav-item');

  // ─── Auth ──────────────────────────────────────────────────
  const isAuth = sessionStorage.getItem('atlasdt_admin_auth') === 'true';
  if (isAuth) {
    showDashboard();
  } else { 
    document.body.classList.remove('theme-light'); // Force dark mode for login screen
    loginView.classList.remove('hidden'); dashboardView.classList.add('hidden'); 
  }

  function applyThemePreference() {
    if (localStorage.getItem('atlasdt_admin_theme') === 'dark') {
      document.body.classList.remove('theme-light');
    } else if (localStorage.getItem('atlasdt_admin_theme') === 'light' || !localStorage.getItem('atlasdt_admin_theme')) {
      document.body.classList.add('theme-light');
    }
  }

  loginForm?.addEventListener('submit', async e => {
    e.preventDefault();
    const btn = loginForm.querySelector('button[type="submit"]');
    const ogText = btn.textContent;
    btn.textContent = 'Authenticating...';
    btn.style.pointerEvents = 'none';

    const fd = new FormData(loginForm);
    const data = Object.fromEntries(fd.entries());
    
    try {
      const { data: staffMembers, error } = await supabase.from('staff').select('*');
      if (error) throw error;
      const user = staffMembers.find(s => 
        (s.email || '').trim().toLowerCase() === (data.email || '').trim().toLowerCase() && 
        s.password === data.password
      );
      const result = user ? { success: true, user } : { success: false, error: 'Invalid credentials' };

      if (result.success) {
        sessionStorage.setItem('atlasdt_admin_auth', 'true');
        sessionStorage.setItem('atlasdt_admin_user', JSON.stringify(result.user));
        applyThemePreference();
        showDashboard();
      } else {
        alert(result.error || 'Authentication failed');
      }
    } catch(err) {
      console.error(err);
      alert('Network error during authentication');
    } finally {
        btn.textContent = ogText;
        btn.style.pointerEvents = 'auto';
    }
  });

  logoutBtn?.addEventListener('click', () => {
    sessionStorage.removeItem('atlasdt_admin_auth');
    document.body.classList.remove('theme-light'); // Revert to dark for login screen
    dashboardView.classList.add('hidden');
    loginView.classList.remove('hidden');
  });

  // ─── Theme Toggle ───────────────────────────────────────────
  const themeToggle = document.getElementById('admin-theme-toggle');
  if (themeToggle) {
    if (isAuth) applyThemePreference();
    
    themeToggle.addEventListener('click', () => {
      document.body.classList.toggle('theme-light');
      localStorage.setItem('atlasdt_admin_theme', 
        document.body.classList.contains('theme-light') ? 'light' : 'dark'
      );
    });
  }

  function showDashboard() {
    loginView.classList.add('hidden');
    dashboardView.classList.remove('hidden');
    initDashboard();
  }

  let loadedSuppliers = [];
  let loadedDesigners = [...MOCK_DESIGNERS];
  let loadedStaff = [];
  let loadedCustomers = [];

  async function loadCRMData() {
    try {
      const { data: staffData } = await supabase.from('staff').select('*');
      
      let customerData = [];
      try {
        const _res = await fetch('/.netlify/functions/admin-profiles');
        if (_res.ok) customerData = await _res.json();
      } catch (e) {
        console.error('Failed to run bypass RLS for profiles:', e);
      }
      loadedCustomers = customerData || [];
      loadedStaff = staffData || [];

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
      loadedSuppliers = allSupData.map(row => {
        const s = { ...row.data, id: row.id, name: row.name, segment: row.segment, techGroup: row.tech_group };
        if (!s.techGroup && s.technologies && s.technologies.length > 0) {
          s.techGroup = s.technologies[0];
        }
        return s;
      });
      TECH_GROUPS = [...new Set(loadedSuppliers.map(s => s.techGroup).filter(Boolean))].sort();
    } catch(err) {
      console.error("Failed to fetch Supabase data", err);
      loadedSuppliers = [];
    }
  }

  // ─── Available Tech Groups & Technologies ──────────────────
  // This builds dynamically once loadedSuppliers is populated.
  let TECH_GROUPS = [];

  const STAGES = ['Prototyping', 'Mass Production', 'Design', 'Contract Manufacturing', 'Box Build', 'Tooling Fabrication', 'Assembly & Pack-out'];

  const CERTIFICATIONS = [
    'ISO 9001', 'ISO 14001', 'ISO 13485', 'IATF 16949',
    'AS9100', 'UL Listed', 'CE Marked', 'RoHS', 'REACH', 'FDA Registered'
  ];

  // ─── Sort State ────────────────────────────────────────────
  let supplierSort = { key: 'name', dir: 'asc' };
  let designerSort  = { key: 'name', dir: 'asc' };

  function sortArrow(currentKey, sortState) {
    if (sortState.key !== currentKey) return '<span class="sort-arrow">⇅</span>';
    return sortState.dir === 'asc'
      ? '<span class="sort-arrow active">↑</span>'
      : '<span class="sort-arrow active">↓</span>';
  }

  function compareValues(a, b, key, dir) {
    let valA = a[key], valB = b[key];
    // Handle nested / computed keys
    if (key === 'location_display') { valA = (a.city || '') + (a.country || ''); valB = (b.city || '') + (b.country || ''); }
    if (key === 'rateNum') { valA = parseFloat((a.rate || '0').replace(/[^0-9.]/g, '')); valB = parseFloat((b.rate || '0').replace(/[^0-9.]/g, '')); }
    if (key === 'ratingNum') { valA = parseFloat(a.rating || 0); valB = parseFloat(b.rating || 0); }
    // Normalise
    if (typeof valA === 'string') valA = valA.toLowerCase();
    if (typeof valB === 'string') valB = valB.toLowerCase();
    if (valA == null) valA = '';
    if (valB == null) valB = '';
    if (valA < valB) return dir === 'asc' ? -1 : 1;
    if (valA > valB) return dir === 'asc' ? 1 : -1;
    return 0;
  }

  // ─── Dashboard Init ────────────────────────────────────────
  async function initDashboard() {
    await loadCRMData();
    renderOverview();
    navItems.forEach(tab => {
      // Clone to remove old listeners
      const fresh = tab.cloneNode(true);
      tab.parentNode.replaceChild(fresh, tab);
      fresh.addEventListener('click', e => {
        document.querySelectorAll('.admin-nav-item').forEach(t => t.classList.remove('active'));
        e.currentTarget.classList.add('active');
        const t = e.currentTarget.dataset.tab;
        if (t === 'overview')  { pageTitle.textContent = 'Platform Overview';        renderOverview(); }
        if (t === 'suppliers') { pageTitle.textContent = 'Suppliers CRM Directory';  renderSuppliersTable(); }
        if (t === 'customers') { pageTitle.textContent = 'Customers Data CRM';       renderCustomersTable(); }
        if (t === 'designers') { pageTitle.textContent = 'Talent Hub (Designers)';   renderDesignersTable(); }
        if (t === 'rfqs')      { pageTitle.textContent = 'RFQ \u0026 Project Tracker';    renderRFQs(); }
        if (t === 'pricing') { pageTitle.textContent = 'Pricing Engine Configurator'; renderPricingConfigurator(contentRouting); }
        if (t === 'website')   { pageTitle.textContent = 'Website Content Manager';  renderWebsiteContent(); }
        if (t === 'staff')     { pageTitle.textContent = 'Staff Directory';  renderStaffTable(); }
        if (t === 'taxonomy-images') { pageTitle.textContent = 'Taxonomy Image Curator'; renderTaxonomyImages(); }
        if (t === 'marketplace-taxonomy') { pageTitle.textContent = 'Marketplace Taxonomy'; renderMarketplaceTaxonomy(contentRouting); }
      });
    });
  }

  // ═══════════════════════════════════════════════════════════
  //  O V E R V I E W
  // ═══════════════════════════════════════════════════════════
  function renderOverview() {
    contentRouting.innerHTML = `
      <div class="admin-metrics-grid">
        <div class="admin-metric-card">
          <div class="admin-metric-value">${loadedSuppliers.length}</div>
          <div class="admin-metric-label">Verified Suppliers</div>
        </div>
        <div class="admin-metric-card">
          <div class="admin-metric-value">${loadedDesigners.length}</div>
          <div class="admin-metric-label">Approved Designers</div>
        </div>
        <div class="admin-metric-card">
          <div class="admin-metric-value">12</div>
          <div class="admin-metric-label">Active RFQs</div>
        </div>
      </div>
      <p style="color:var(--color-steel-400); font-size:var(--text-md);">Select a section from the sidebar to manage your CRM data.</p>
    `;
  }

  // ═══════════════════════════════════════════════════════════
  //  S U P P L I E R S   T A B L E
  // ═══════════════════════════════════════════════════════════
  let adminSupplierFilters = {
    search: '',
    techGroup: '',
    country: '',
    segment: '',
    hideDisabled: true
  };

  function renderSuppliersTable(preserveUI = false) {
    let filtered = loadedSuppliers.filter(s => {
      let match = true;
      if (adminSupplierFilters.search) {
        const q = adminSupplierFilters.search;
        match = match && (
          (s.name && s.name.toLowerCase().includes(q)) ||
          (s.nameZh && s.nameZh.includes(q)) ||
          (s.id && s.id.toLowerCase().includes(q)) ||
          (s.tags && (Array.isArray(s.tags) ? s.tags.join(' ') : String(s.tags)).toLowerCase().includes(q)) ||
          (s.technologies && (Array.isArray(s.technologies) ? s.technologies.join(' ') : String(s.technologies)).toLowerCase().includes(q))
        );
      }
      if (adminSupplierFilters.techGroup) {
        match = match && s.techGroup === adminSupplierFilters.techGroup;
      }
      if (adminSupplierFilters.country) {
        match = match && s.country === adminSupplierFilters.country;
      }
      if (adminSupplierFilters.segment) {
        let seg = (s.segment || '').toUpperCase();
        match = match && seg.includes(adminSupplierFilters.segment);
      }
      if (adminSupplierFilters.hideDisabled && s.isActive === false) {
        match = false;
      }
      return match;
    });

    const sorted = filtered.sort((a, b) => compareValues(a, b, supplierSort.key, supplierSort.dir));

    const rows = sorted.map(s => {
      const url = s.website || s.url;
      const urlLink = url ? (url.startsWith('http') ? url : 'https://' + url) : null;
      return `
      <tr class="${s.isActive === false ? 'row-disabled' : ''}">
        <td style="width:40px;"><input type="checkbox" class="admin-sup-row-select" data-id="${s.id || s.name}"></td>
        <td style="width:40px; text-align:center;">
          ${urlLink ? `<a href="${urlLink}" target="_blank" title="${urlLink}" style="color:var(--color-electric);"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path><polyline points="15 3 21 3 21 9"></polyline><line x1="10" y1="14" x2="21" y2="3"></line></svg></a>` : '<span style="opacity:0.2;">—</span>'}
        </td>
        <td class="admin-supplier-name" data-id="${s.id || s.name}">
          <strong>${s.name}</strong><br>
          <span style="font-size:12px; color:var(--color-steel-400);">${s.nameZh || '—'}</span>
        </td>
        <td>${[s.city, s.country].filter(Boolean).join(', ')}</td>
        <td>
          <span class="tag-segment ${s.segment === 'TIER 1' ? 'tag-tier1' : s.segment === 'TIER 2' ? 'tag-tier2' : s.segment === 'OEM' ? 'tag-oem' : ''}">
            ${s.segment || '—'}
          </span>
        </td>
        <td>
          <span class="tag-tech-group">
            ${s.techGroup || '—'}
          </span>
        </td>
        <td class="admin-tooltip-container">
          <span class="admin-tooltip-label">${(s.technologies || []).slice(0,2).join(', ') || '—'}</span>
          ${(s.technologies || []).length > 0 ? `<div class="admin-tooltip-box">${(s.technologies || []).join(', ')}</div>` : ''}
        </td>
        <td>${s.factoryScore || '—'}</td>
        <td style="max-width: 150px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;" title="${(s.certifications || []).filter(c=>!c.match(/^\d{4}-\d{2}-\d{2}/)).join(', ')}">${(s.certifications || []).filter(c=>!c.match(/^\d{4}-\d{2}-\d{2}/)).slice(0,2).join(', ') || '—'}</td>
        <td>
          <label class="admin-toggle-switch">
            <input type="checkbox" class="admin-status-toggle" data-id="${s.id || s.name}" ${s.isActive !== false ? 'checked' : ''}>
            <span class="admin-toggle-slider"></span>
          </label>
        </td>
        <td class="admin-table-actions"><div class="admin-table-actions-wrapper">
          <button class="admin-action-btn admin-edit-supplier" data-id="${s.id || s.name}">Edit</button>
          <button class="admin-action-btn admin-delete-supplier" data-id="${s.id || s.name}" style="color:#ef4444;border-color:rgba(239,68,68,.2);">Delete</button>
        </div></td>
      </tr>`;
    }).join('');

    const tableHTML = `
        <table class="admin-table">
          <thead><tr>
            <th style="width:40px;"><input type="checkbox" id="admin-sup-select-all" title="Select all visible rows"></th>
            <th style="width:40px;" title="Website URL">🔗</th>
            <th class="sortable" data-sort-key="name">Manufacturer Name ${sortArrow('name', supplierSort)}</th>
            <th class="sortable" data-sort-key="location_display">Location ${sortArrow('location_display', supplierSort)}</th>
            <th class="sortable" data-sort-key="segment">Tier ${sortArrow('segment', supplierSort)}</th>
            <th class="sortable" data-sort-key="techGroup">Tech Group ${sortArrow('techGroup', supplierSort)}</th>
            <th>Specific Techs</th>
            <th class="sortable" data-sort-key="factoryScore">Factory Score ${sortArrow('factoryScore', supplierSort)}</th>
            <th>Certifications</th>
            <th>Status</th>
            <th>Actions</th>
          </tr></thead>
          <tbody>${rows}</tbody>
        </table>`;

    if (preserveUI && document.getElementById('admin-sup-table-wrapper')) {
      document.getElementById('admin-sup-table-wrapper').innerHTML = tableHTML;
      
      // Dynamically update the tech dropdown options based on the newly selected segment
      const techSelect = document.getElementById('admin-filter-tech');
      if (techSelect) {
        let dynamicSupList = loadedSuppliers;
        if (adminSupplierFilters.segment) {
          const seg = adminSupplierFilters.segment;
          dynamicSupList = dynamicSupList.filter(s => (s.segment || '').toUpperCase().includes(seg));
        }
        const availableTechGroups = [...new Set(dynamicSupList.map(s=>s.techGroup).filter(Boolean))].sort();
        if (adminSupplierFilters.techGroup && !availableTechGroups.includes(adminSupplierFilters.techGroup)) {
          adminSupplierFilters.techGroup = '';
        }
        techSelect.innerHTML = `<option value="">All Technologies...</option>` + availableTechGroups.map(t => `<option value="${t}" ${adminSupplierFilters.techGroup === t ? 'selected':''}>${t}</option>`).join('');
      }
    } else {
      contentRouting.innerHTML = `
        <div style="margin-bottom:24px;display:flex;justify-content:space-between;align-items:center;">
          <div style="display:flex;gap:12px;">
            <input type="text" id="admin-filter-search" class="admin-input-filter" placeholder="Search suppliers..." value="${adminSupplierFilters.search}">
            <select id="admin-filter-segment" class="admin-input-filter">
              <option value="">All Tiers...</option>
              <option value="TIER 1" ${adminSupplierFilters.segment === 'TIER 1' ? 'selected':''}>Tier 1</option>
              <option value="TIER 2" ${adminSupplierFilters.segment === 'TIER 2' ? 'selected':''}>Tier 2</option>
              <option value="OEM" ${adminSupplierFilters.segment === 'OEM' ? 'selected':''}>OEM</option>
            </select>
            <select id="admin-filter-tech" class="admin-input-filter">
              ${(() => {
                let dynamicSupList = loadedSuppliers;
                if (adminSupplierFilters.segment) {
                  const seg = adminSupplierFilters.segment;
                  dynamicSupList = dynamicSupList.filter(s => (s.segment || '').toUpperCase().includes(seg));
                }
                const availableTechGroups = [...new Set(dynamicSupList.map(s=>s.techGroup).filter(Boolean))].sort();
                return `<option value="">All Technologies...</option>` + availableTechGroups.map(t => `<option value="${t}" ${adminSupplierFilters.techGroup === t ? 'selected':''}>${t}</option>`).join('');
              })()}
            </select>
            <select id="admin-filter-country" class="admin-input-filter">
              <option value="">All Countries...</option>
              ${[...new Set(loadedSuppliers.map(s=>s.country).filter(Boolean))].map(c => `<option value="${c}" ${adminSupplierFilters.country === c ? 'selected':''}>${c}</option>`).join('')}
            </select>
            <label style="display:flex; align-items:center; gap:6px; color:var(--color-steel-300); font-size:12px; cursor:pointer; margin-left:8px;" title="Hide/Show explicitly deactivated suppliers">
              <input type="checkbox" id="admin-filter-hide-disabled" ${adminSupplierFilters.hideDisabled ? 'checked' : ''} style="cursor:pointer; accent-color:var(--color-electric);">
              Hide Disabled
            </label>
            <button class="btn btn-secondary" id="admin-filter-clear" style="padding: 6px 12px; font-size:12px; margin-left:8px;">Clear All</button>
          </div>
          <div style="display:flex;gap:12px;align-items:center;">
             <div id="admin-bulk-actions" style="display:none; gap:8px; align-items:center;">
               <span id="admin-bulk-count" style="font-size:var(--text-sm);font-weight:var(--weight-bold);color:var(--color-electric);margin-right:8px;">0 selected</span>
               <button class="btn btn-secondary" id="admin-bulk-deactivate" style="padding: 8px 12px; font-size:12px;">Deactivate</button>
               <button class="btn btn-secondary" id="admin-bulk-delete" style="color:#ef4444; border-color:rgba(239,68,68,0.2); padding: 8px 12px; font-size:12px;">Delete</button>
             </div>
             <button class="btn btn-primary" id="admin-add-supplier-btn">+ Add New Supplier</button>
          </div>
        </div>
        <div class="admin-table-container" id="admin-sup-table-wrapper">
          ${tableHTML}
        </div>`;

      document.getElementById('admin-filter-search')?.addEventListener('input', e => { adminSupplierFilters.search = e.target.value.toLowerCase(); renderSuppliersTable(true); });
      document.getElementById('admin-filter-segment')?.addEventListener('change', e => { 
        adminSupplierFilters.segment = e.target.value; 
        // Reset tech group filter since options might change and become invalid
        adminSupplierFilters.techGroup = '';
        renderSuppliersTable(true); 
      });
      document.getElementById('admin-filter-tech')?.addEventListener('change', e => { adminSupplierFilters.techGroup = e.target.value; renderSuppliersTable(true); });
      document.getElementById('admin-filter-country')?.addEventListener('change', e => { adminSupplierFilters.country = e.target.value; renderSuppliersTable(true); });
      document.getElementById('admin-filter-hide-disabled')?.addEventListener('change', e => { adminSupplierFilters.hideDisabled = e.target.checked; renderSuppliersTable(true); });

      document.getElementById('admin-filter-clear')?.addEventListener('click', () => {
        adminSupplierFilters = {
          search: '',
          techGroup: '',
          country: '',
          segment: '',
          hideDisabled: true
        };
        renderSuppliersTable(false);
      });

      document.getElementById('admin-bulk-deactivate')?.addEventListener('click', async () => {
        const selectedIds = Array.from(document.querySelectorAll('.admin-sup-row-select:checked')).map(cb => cb.dataset.id);
        if (selectedIds.length === 0) return;
        if (!confirm(`Deactivate ${selectedIds.length} suppliers? They won't appear in user lists.`)) return;
        
        let successCount = 0;
        const btn = document.getElementById('admin-bulk-deactivate');
        const ogText = btn.textContent;
        btn.textContent = 'Deactivating...';
        btn.style.pointerEvents = 'none';

        for (const id of selectedIds) {
          const sup = loadedSuppliers.find(s => String(s.id || s.name) === String(id));
          if (!sup) continue;
          sup.isActive = false;
          try {
            const dbPayload = {
              id: sup.id, name: sup.name, segment: sup.segment, tech_group: sup.techGroup || '',
              data: (() => { const c = { ...sup }; delete c.id; delete c.name; delete c.segment; delete c.techGroup; return c; })()
            };
            const { error } = await supabase.from('suppliers').upsert(dbPayload);
            if (!error) successCount++;
          } catch(e) { console.error(e); }
        }

        btn.textContent = ogText;
        btn.style.pointerEvents = '';
        await loadCRMData();
        renderSuppliersTable(true);
      });

      document.getElementById('admin-bulk-delete')?.addEventListener('click', async () => {
        const selectedIds = Array.from(document.querySelectorAll('.admin-sup-row-select:checked')).map(cb => cb.dataset.id);
        if (selectedIds.length === 0) return;
        if (!confirm(`Are you sure you want to permanently delete ${selectedIds.length} suppliers?`)) return;
        
        let successCount = 0;
        const btn = document.getElementById('admin-bulk-delete');
        btn.textContent = 'Deleting...';
        btn.style.pointerEvents = 'none';
        
        for (const id of selectedIds) {
          try {
            const { error } = await supabase.from('suppliers').delete().eq('id', id);
            if (!error) successCount++;
          } catch(e) { console.error(e); }
        }
        
        await loadCRMData();
        renderSuppliersTable();
        alert(`Successfully deleted ${successCount} out of ${selectedIds.length} suppliers.`);
      });
    }

    // --- REBIND TABLE-SPECIFIC EVENTS EVERY RENDER ---
    
    // Bulk Selection
    const masterCheckbox = document.getElementById('admin-sup-select-all');
    const rowCheckboxes = document.querySelectorAll('.admin-sup-row-select');
    const bulkActions = document.getElementById('admin-bulk-actions');
    const bulkCount = document.getElementById('admin-bulk-count');
    
    function updateBulkActions() {
      if (!bulkActions || !bulkCount) return;
      const selected = document.querySelectorAll('.admin-sup-row-select:checked');
      const count = selected.length;
      if (count > 0) {
        bulkActions.style.display = 'flex';
        bulkCount.textContent = `${count} selected`;
      } else {
        bulkActions.style.display = 'none';
      }
      if (masterCheckbox) {
        masterCheckbox.checked = rowCheckboxes.length > 0 && count === rowCheckboxes.length;
      }
    }

    if (masterCheckbox) {
      masterCheckbox.addEventListener('change', (e) => {
        rowCheckboxes.forEach(cb => cb.checked = e.target.checked);
        updateBulkActions();
      });
    }

    rowCheckboxes.forEach(cb => {
      cb.addEventListener('change', updateBulkActions);
    });

    // Sort header clicks
    contentRouting.querySelectorAll('.sortable').forEach(th => {
      th.addEventListener('click', () => {
        const key = th.dataset.sortKey;
        if (supplierSort.key === key) {
          supplierSort.dir = supplierSort.dir === 'asc' ? 'desc' : 'asc';
        } else {
          supplierSort = { key, dir: 'asc' };
        }
        renderSuppliersTable();
      });
    });

    document.getElementById('admin-add-supplier-btn')?.addEventListener('click', () => renderSupplierForm());

    contentRouting.querySelectorAll('.admin-edit-supplier').forEach(btn => {
      btn.addEventListener('click', () => {
        const supId = btn.dataset.id;
        const sup = loadedSuppliers.find(s => String(s.id || s.name) === String(supId));
        if (sup) renderSupplierForm(sup);
      });
    });

    contentRouting.querySelectorAll('.admin-supplier-name').forEach(cell => {
      cell.addEventListener('dblclick', () => {
        const supId = cell.dataset.id;
        const sup = loadedSuppliers.find(s => String(s.id || s.name) === String(supId));
        if (sup) renderSupplierForm(sup);
      });
    });

    contentRouting.querySelectorAll('.admin-delete-supplier').forEach(btn => {
      btn.addEventListener('click', async () => {
        if (!confirm('Are you sure you want to permanently delete this supplier?')) return;
        btn.textContent = 'Deleting...';
        btn.style.pointerEvents = 'none';
        try {
          const { error } = await supabase.from('suppliers').delete().eq('id', btn.dataset.id);
          if (!error) {
            await loadCRMData();
            renderSuppliersTable();
          } else {
            alert('Failed to delete supplier');
            btn.textContent = 'Delete';
            btn.style.pointerEvents = '';
          }
        } catch (e) {
          console.error(e);
          alert('Network Error');
          btn.textContent = 'Delete';
          btn.style.pointerEvents = '';
        }
      });
    });

    contentRouting.querySelectorAll('.admin-status-toggle').forEach(toggle => {
      toggle.addEventListener('change', async (e) => {
        const id = e.target.dataset.id;
        // In the table it might be dataset.id as id or name, we should find by id or name
        const sup = loadedSuppliers.find(s => String(s.id || s.name) === String(id));
        if (!sup) return;
        
        sup.isActive = e.target.checked;
        const row = e.target.closest('tr');
        if (e.target.checked) row.classList.remove('row-disabled');
        else row.classList.add('row-disabled');

        try {
          const dbPayload = {
            id: sup.id, name: sup.name, segment: sup.segment, tech_group: sup.techGroup || '',
            data: (() => { const c = { ...sup }; delete c.id; delete c.name; delete c.segment; delete c.techGroup; return c; })()
          };
          const { error } = await supabase.from('suppliers').upsert(dbPayload);
          if (error) throw new Error(error.message);
        } catch(err) {
          console.error(err);
          alert('Failed to update status');
          e.target.checked = !e.target.checked; // revert UI
          if (e.target.checked) row.classList.remove('row-disabled');
          else row.classList.add('row-disabled');
        }
      });
    });
  }

  // ═══════════════════════════════════════════════════════════
  //  A D D / E D I T   S U P P L I E R   F O R M
  // ═══════════════════════════════════════════════════════════
  function renderSupplierForm(existing = null) {
    pageTitle.textContent = existing ? `Edit Supplier — ${existing.name}` : 'Add New Supplier';
    const s = existing || {};

    contentRouting.innerHTML = `
    <div class="admin-form-page">
      <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom: 24px; padding-bottom: 16px; border-bottom: 1px solid rgba(255,255,255,0.05);">
        <button type="button" class="admin-back-btn" id="admin-sup-back" style="margin-bottom:0;">← Back to Suppliers</button>
        <div class="admin-form-actions-top" style="display:flex; gap:12px;">
          <button type="button" class="btn btn-secondary" id="admin-sup-cancel-top">Cancel</button>
          <button type="submit" form="admin-supplier-form" class="btn btn-primary" id="admin-sup-save-top">${existing ? 'Save Changes' : 'Create Supplier'}</button>
        </div>
      </div>

      <form id="admin-supplier-form" class="admin-form">

        <!-- ─── SECTION 1: Core Identity ─── -->
        <div class="admin-form-section">
          <div class="admin-form-section-title">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M8 14s1.5 2 4 2 4-2 4-2"/><line x1="9" y1="9" x2="9.01" y2="9"/><line x1="15" y1="9" x2="15.01" y2="9"/></svg>
            Core Identity
          </div>
          <div class="admin-form-grid cols-2">
            <div class="admin-field">
              <label>Manufacturer / Company Name <span class="req">*</span></label>
              <input type="text" name="name" value="${s.name || ''}" required placeholder="e.g. Shenzhen Precision Mold Co.">
            </div>
            <div class="admin-field">
              <label>Supplier ID</label>
              <input type="text" name="id" value="${s.id || ''}" placeholder="Auto-generated if blank">
            </div>
          </div>
          <div class="admin-form-grid cols-2">
            <div class="admin-field">
              <label>Company Name (Chinese) <span class="hint">Optional</span></label>
              <input type="text" name="nameZh" value="${s.nameZh || ''}" placeholder="e.g. 深圳市精密模具有限公司">
            </div>
            <div class="admin-field">
              <label>Supplier Tier <span class="req">*</span></label>
              <select name="segment" id="admin-form-segment" required>
                <option value="TIER 1" ${s.segment === 'TIER 1' ? 'selected' : ''}>Tier 1</option>
                <option value="TIER 2" ${s.segment === 'TIER 2' ? 'selected' : ''}>Tier 2</option>
                <option value="OEM" ${s.segment === 'OEM' ? 'selected' : ''}>OEM</option>
                <option value="CM" ${s.segment === 'CM' ? 'selected' : ''}>Contract Man. (CM)</option>
                <option value="DISTRIBUTOR" ${s.segment === 'DISTRIBUTOR' ? 'selected' : ''}>Distributor</option>
              </select>
            </div>
          </div>
          <div class="admin-form-grid cols-2">
            <div class="admin-field">
              <label>Primary Tech Group <span class="req">*</span></label>
              <select name="techGroup" id="admin-form-techgroup" required>
                <option value="">Select…</option>
                ${TECH_GROUPS.map(tg => `<option value="${tg}" ${s.techGroup === tg ? 'selected' : ''}>${tg}</option>`).join('')}
              </select>
              <input type="text" id="admin-form-new-techgroup" name="newTechGroup" style="display:none; margin-top:8px; width:100%; box-sizing:border-box;" class="admin-input-filter" placeholder="e.g. Advanced Assembly">
            </div>
            <div class="admin-field">
              <label>General Tags <span class="hint">(comma-separated)</span></label>
              <input type="text" name="tags" value="${(s.tags || []).join(', ')}" placeholder="Consumer Electronics, Medical, ISO 9001…">
            </div>
          </div>
          <div class="admin-field" style="margin-top: 10px; flex-grow: 1;">
            <label>Description / Overview <span class="req">*</span></label>
            <textarea name="description" style="flex-grow: 1; resize: none;" required placeholder="Tier-1 injection molding facility with 8,000sqm workshop...">${s.description || ''}</textarea>
          </div>
          <div class="admin-field" style="margin-top: 10px;">
            <label>Website URL</label>
            <input type="url" name="website" value="${s.website || s.url || ''}" placeholder="https://www.example.com">
          </div>
        </div>

        <!-- ─── SECTION 2: Location, Geography & Contacts ─── -->
        <div class="admin-form-section">
          <div class="admin-form-section-title">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
            Location, Geography & Contacts
          </div>
          <div class="admin-form-grid cols-3">
            <div class="admin-field">
              <label>City</label>
              <input type="text" name="city" value="${s.city || ''}" placeholder="Shenzhen">
            </div>
            <div class="admin-field">
              <label>Region / Province</label>
              <input type="text" name="region" value="${s.region || ''}" placeholder="Guangdong">
            </div>
            <div class="admin-field">
              <label>Country</label>
              <input type="text" name="country" value="${s.country || ''}" placeholder="China">
            </div>
          </div>
          <!-- Reduce Lat/Lng Width by making them part of a 4-col grid with address -->
          <div style="display: grid; grid-template-columns: 1fr 1fr 2fr 2fr; gap: 10px; margin-bottom: 10px;">
            <div class="admin-field">
              <label>Latitude</label>
              <input type="number" step="any" name="lat" value="${s.lat || ''}" placeholder="22.5431">
            </div>
            <div class="admin-field">
              <label>Longitude</label>
              <input type="number" step="any" name="lng" value="${s.lng || ''}" placeholder="114.0579">
            </div>
            <div class="admin-field">
              <label>Full Address (English)</label>
              <input type="text" name="address" value="${s.address || ''}" placeholder="Building 12, Bao'an...">
            </div>
            <div class="admin-field">
              <label>Full Address (Chinese)</label>
              <input type="text" name="addressZh" value="${s.addressZh || ''}" placeholder="深圳市宝安区工业园12栋...">
            </div>
          </div>
          
          <div style="margin: 16px 0 8px 0; font-size: 11px; font-weight: bold; color: var(--color-electric); text-transform: uppercase;">Primary Contacts</div>
          
          <!-- Contact 1: Account Manager -->
          <div class="admin-form-grid cols-3">
            <div class="admin-field">
              <label>Acc. Mgr Name</label>
              <input type="text" name="contactName" value="${s.contactName || ''}" placeholder="John Li">
            </div>
            <div class="admin-field">
              <label>Acc. Mgr Email</label>
              <input type="email" name="email" value="${s.email || ''}" placeholder="john@example.com">
            </div>
            <div class="admin-field">
              <label>Acc. Mgr Phone</label>
              <input type="text" name="phone" value="${s.phone || ''}" placeholder="+86 1380000000">
            </div>
          </div>

          <!-- Contact 2: GM / Legal -->
          <div class="admin-form-grid cols-3" style="margin-top: 8px;">
            <div class="admin-field">
              <label>GM / Legal Person</label>
              <input type="text" name="gmName" value="${s.gmName || ''}" placeholder="Wang Wei">
            </div>
            <div class="admin-field">
              <label>GM Email</label>
              <input type="email" name="gmEmail" value="${s.gmEmail || ''}" placeholder="wang@example.com">
            </div>
            <div class="admin-field">
              <label>GM Phone</label>
              <input type="text" name="gmPhone" value="${s.gmPhone || ''}" placeholder="+86 1390000000">
            </div>
          </div>

          <!-- Contact 3: Quality -->
          <div class="admin-form-grid cols-3" style="margin-top: 8px;">
            <div class="admin-field">
              <label>Quality Manager Name</label>
              <input type="text" name="qualityName" value="${s.qualityName || ''}" placeholder="Chen Hua">
            </div>
            <div class="admin-field">
              <label>Quality Manager Email</label>
              <input type="email" name="qualityEmail" value="${s.qualityEmail || ''}" placeholder="chen@example.com">
            </div>
            <div class="admin-field">
              <label>Tax ID / VAT No.</label>
              <input type="text" name="taxId" value="${s.taxId || ''}" placeholder="9144000...">
            </div>
          </div>
        </div>

        <!-- ─── SECTION 3: Technical Capabilities & Certifications ─── -->
        <div class="admin-form-section">
          <div class="admin-form-section-title">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>
            Technical Capabilities & Certifications
          </div>
          
          <div style="margin: 8px 0 8px 0; font-size: 11px; font-weight: bold; color: var(--color-electric); text-transform: uppercase;">Manufacturing Stages</div>
          <div class="admin-checkbox-grid">
            ${STAGES.map(st => `
              <label class="admin-checkbox">
                <input type="checkbox" name="stages" value="${st}" ${(s.stages || []).includes(st) ? 'checked' : ''}>
                <span>${st}</span>
              </label>`).join('')}
          </div>

          <div style="margin: 20px 0 8px 0; font-size: 11px; font-weight: bold; color: var(--color-electric); text-transform: uppercase;">Specific Technologies</div>
          <div class="admin-field">
            <label>Specific Technologies <span class="hint">(comma-separated)</span></label>
            <input type="text" name="technologies" value="${(s.technologies || []).join(', ')}" placeholder="Injection Molding, PVD plating, CNC Machining, Anodizing…">
          </div>

          <div style="margin: 20px 0 8px 0; font-size: 11px; font-weight: bold; color: var(--color-electric); text-transform: uppercase;">Certifications & Metrics</div>
          <div class="admin-checkbox-grid">
            ${CERTIFICATIONS.map(c => `
              <label class="admin-checkbox">
                <input type="checkbox" name="certifications" value="${c}" ${(s.certifications || []).includes(c) ? 'checked' : ''}>
                <span>${c}</span>
              </label>`).join('')}
          </div>
          <div class="admin-form-grid cols-2" style="margin-top:16px;">
            <div class="admin-field">
              <label>Other Certifications <span class="hint">(comma-separated)</span></label>
              <input type="text" name="otherCertifications" value="${(s.otherCertifications || []).join(', ')}" placeholder="Specific Industry Standards...">
            </div>
            <div class="admin-field">
              <label>Factory Score <span class="hint">(0–100)</span></label>
              <div class="admin-range-row">
                <input type="range" name="factoryScore" min="0" max="100" value="${s.factoryScore || 50}" id="admin-sup-score-range">
                <span class="admin-range-val" id="admin-sup-score-val">${s.factoryScore || 50}</span>
              </div>
            </div>
          </div>
          
          <div class="admin-form-grid cols-3" style="margin-top:16px; padding-top:16px; border-top:1px solid rgba(255,255,255,0.05);">
            <div class="admin-field">
              <label>Free Capacity (%)</label>
              <input type="number" name="freeCapacity" value="${s.freeCapacity || ''}" placeholder="25">
            </div>
            <div class="admin-field">
              <label>Outsourcing Ratio (%)</label>
              <input type="number" name="outsourcingRatio" value="${s.outsourcingRatio || ''}" placeholder="10">
            </div>
            <div class="admin-field">
              <label>Outsourcing Ratio (%)</label>
              <input type="number" name="outsourcingRatio" value="${s.outsourcingRatio || ''}" placeholder="10">
            </div>
            <div class="admin-field">
              <label title="Verified Status (0=No, 1=Partial, 2=Yes)">Verified (0-2)</label>
              <input type="number" name="scoreV" min="0" max="2" value="${s.scoreV || 0}">
            </div>
            <div class="admin-field">
              <label>Speed Score (0-10)</label>
              <input type="number" name="scoreSpeed" min="0" max="10" value="${s.scoreSpeed || 0}">
            </div>
            <div class="admin-field">
              <label>Complexity Score (0-10)</label>
              <input type="number" name="scoreComplexity" min="0" max="10" value="${s.scoreComplexity || 0}">
            </div>
            <div class="admin-field">
              <label>Low Volume (0-10)</label>
              <input type="number" name="scoreLowVol" min="0" max="10" value="${s.scoreLowVol || 0}">
            </div>
            <div class="admin-field">
              <label>High Precision (0-10)</label>
              <input type="number" name="scorePrecision" min="0" max="10" value="${s.scorePrecision || 0}">
            </div>
          </div>
        </div>

        <!-- ─── SECTION 3.5: Atlas Factory Qualification Matrix ─── -->
        <div class="admin-form-section">
          <div class="admin-form-section-title">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
            Atlas Qualification Matrix
          </div>
          <div class="admin-form-grid cols-4">
            <div class="admin-field">
              <label>Technical Capability (0-2)</label>
              <input type="number" name="scoreTc" min="0" max="2" value="${s.scoreTc || 0}">
            </div>
            <div class="admin-field">
              <label>Ownership Ethos (0-2)</label>
              <input type="number" name="scoreOe" min="0" max="2" value="${s.scoreOe || 0}">
            </div>
            <div class="admin-field">
              <label>Quality Assurance (0-2)</label>
              <input type="number" name="scoreQs" min="0" max="2" value="${s.scoreQs || 0}">
            </div>
            <div class="admin-field">
              <label>Cost Competitiveness (0-10)</label>
              <input type="number" name="scoreCost" min="0" max="10" value="${s.scoreCost || 0}">
            </div>
          </div>
          <div class="admin-form-grid cols-2" style="margin-top: 12px;">
            <div class="admin-field">
              <label>Primary Advantage Type</label>
              <select name="primaryAdvantageType">
                <option value="none" ${(!s.primaryAdvantageType || s.primaryAdvantageType === 'none') ? 'selected' : ''}>Not Specified</option>
                <option value="technical" ${s.primaryAdvantageType === 'technical' ? 'selected' : ''}>Technical Capability</option>
                <option value="ethos" ${s.primaryAdvantageType === 'ethos' ? 'selected' : ''}>Ownership Ethos</option>
                <option value="quality" ${s.primaryAdvantageType === 'quality' ? 'selected' : ''}>Quality Assurance</option>
                <option value="cost" ${s.primaryAdvantageType === 'cost' ? 'selected' : ''}>Cost & Speed Profile</option>
              </select>
            </div>
            <div class="admin-field">
              <label>Best For (Product Type / Fit)</label>
              <input type="text" name="bestFor" value="${s.bestFor || ''}" placeholder="e.g. Consumer Electronics, Medical Plastics...">
            </div>
          </div>
          <div class="admin-field" style="margin-top: 12px;">
            <label>Main Advantage Summary</label>
            <textarea name="mainAdvantage" rows="2" placeholder="e.g. We selected them for their excellent balance of rapid tooling deployment...">${s.mainAdvantage || ''}</textarea>
          </div>
        </div>

        <!-- ─── SECTION 4: Company Legal & Operational Information ─── -->
        <div class="admin-form-section">
          <div class="admin-form-section-title">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>
            Company Legal & Operational Information
          </div>
          <div class="admin-form-grid cols-3">
            <div class="admin-field">
              <label>Business License ID</label>
              <input type="text" name="businessLicense" value="${s.businessLicense || ''}" placeholder="914440300...">
            </div>
            <div class="admin-field">
              <label>Incorporated Date / Year</label>
              <input type="text" name="yearEstablished" value="${s.yearEstablished || ''}" placeholder="2005 / 2005-08-12">
            </div>
            <div class="admin-field">
              <label>Company Type</label>
              <select name="companyType">
                <option value="">Select...</option>
                <option value="Private" ${s.companyType === 'Private' ? 'selected' : ''}>Private</option>
                <option value="State Owned" ${s.companyType === 'State Owned' ? 'selected' : ''}>State Owned</option>
                <option value="Foreign Invested" ${s.companyType === 'Foreign Invested' ? 'selected' : ''}>Foreign Invested</option>
              </select>
            </div>
          </div>
          <div class="admin-form-grid cols-2">
            <div class="admin-field">
              <label>Export License ID</label>
              <input type="text" name="exportLicense" value="${s.exportLicense || ''}" placeholder="Num or 'Auto if omitted'">
            </div>
            <div class="admin-field">
              <label>Export Ratio (%)</label>
              <input type="number" name="exportRatio" value="${s.exportRatio || ''}" placeholder="80">
            </div>
          </div>
          
          <div style="margin: 16px 0 8px 0; font-size: 11px; font-weight: bold; color: var(--color-electric); text-transform: uppercase;">Revenue Progression (M USD)</div>
          <div class="admin-form-grid cols-5">
            <div class="admin-field">
              <label>FY - 4</label>
              <input type="number" step="any" name="revFY4" value="${s.revFY4 || ''}" placeholder="8.5">
            </div>
            <div class="admin-field">
              <label>FY - 3</label>
              <input type="number" step="any" name="revFY3" value="${s.revFY3 || ''}" placeholder="10.2">
            </div>
            <div class="admin-field">
              <label>FY - 2</label>
              <input type="number" step="any" name="revFY2" value="${s.revFY2 || ''}" placeholder="12.0">
            </div>
            <div class="admin-field">
              <label>FY - 1</label>
              <input type="number" step="any" name="revFY1" value="${s.revFY1 || ''}" placeholder="15.5">
            </div>
            <div class="admin-field">
              <label>FY (Current)</label>
              <input type="number" step="any" name="revFY" value="${s.revFY || ''}" placeholder="18.0">
            </div>
          </div>
          <div class="admin-form-grid cols-2">
            <div class="admin-field">
              <label>Total Employees</label>
              <input type="text" name="employees" value="${s.employees || ''}" placeholder="200+">
            </div>
            <div class="admin-field">
              <label>Factory Area (sqm)</label>
              <input type="text" name="factoryArea" value="${s.factoryArea || ''}" placeholder="8,000 sqm">
            </div>
          </div>

          <div style="margin: 16px 0 8px 0; font-size: 11px; font-weight: bold; color: var(--color-electric); text-transform: uppercase;">Employee Split by Department</div>
          <div class="admin-form-grid cols-5">
            <div class="admin-field">
              <label>Engineering / R&D</label>
              <input type="number" name="empEngineering" value="${s.empEngineering || ''}" placeholder="15">
            </div>
            <div class="admin-field">
              <label>Design</label>
              <input type="number" name="empDesign" value="${s.empDesign || ''}" placeholder="5">
            </div>
            <div class="admin-field">
              <label>Manufacturing / Assy</label>
              <input type="number" name="empManufacturing" value="${s.empManufacturing || ''}" placeholder="120">
            </div>
            <div class="admin-field">
              <label>Quality Sys (QA/QC)</label>
              <input type="number" name="empQuality" value="${s.empQuality || ''}" placeholder="15">
            </div>
            <div class="admin-field">
              <label>Sales / Admin</label>
              <input type="number" name="empOthers" value="${s.empOthers || ''}" placeholder="20">
            </div>
          </div>
        </div>

        <!-- ─── SECTION 5: Media / Gallery ─── -->
        <div class="admin-form-section">
          <div class="admin-form-section-title">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>
            Image Gallery & Media
          </div>
          <p class="admin-form-hint">Supply URLs for images and walkthroughs. These populate the supplier profile cards.</p>

          <div class="admin-image-category">
            <h5>Product Samples</h5>
            <div class="admin-image-url-list" id="admin-sup-img-products">
              ${(s.images?.product?.length ? s.images.product : ['']).map(url => `
                <div class="admin-img-url-row">
                  <input type="text" name="img_product" value="${url}" placeholder="https://example.com/product-1.jpg">
                  <label class="admin-action-btn" style="cursor:pointer; display:flex; align-items:center;">
                    📤 <input type="file" style="display:none;" class="admin-s3-upload" accept="image/*">
                  </label>
                  <button type="button" class="admin-remove-row-btn">✕</button>
                </div>
              `).join('')}
            </div>
            <button type="button" class="admin-add-row-btn" data-target="admin-sup-img-products" data-name="img_product" data-accept="image/*">+ Add Product Image</button>
          </div>

          <div class="admin-image-category">
            <h5>Facility / Factory Floor</h5>
            <div class="admin-image-url-list" id="admin-sup-img-facility">
              ${(s.images?.facility?.length ? s.images.facility : ['']).map(url => `
                <div class="admin-img-url-row">
                  <input type="text" name="img_facility" value="${url}" placeholder="https://example.com/factory-1.jpg">
                  <label class="admin-action-btn" style="cursor:pointer; display:flex; align-items:center;">
                    📤 <input type="file" style="display:none;" class="admin-s3-upload" accept="image/*">
                  </label>
                  <button type="button" class="admin-remove-row-btn">✕</button>
                </div>
              `).join('')}
            </div>
            <button type="button" class="admin-add-row-btn" data-target="admin-sup-img-facility" data-name="img_facility" data-accept="image/*">+ Add Facility Image</button>
          </div>

          <div class="admin-image-category">
            <h5>Equipment / Machinery</h5>
            <div class="admin-image-url-list" id="admin-sup-img-equipment">
              ${(s.images?.equipment?.length ? s.images.equipment : ['']).map(url => `
                <div class="admin-img-url-row">
                  <input type="text" name="img_equipment" value="${url}" placeholder="https://example.com/cnc-machine.jpg">
                  <label class="admin-action-btn" style="cursor:pointer; display:flex; align-items:center;">
                    📤 <input type="file" style="display:none;" class="admin-s3-upload" accept="image/*">
                  </label>
                  <button type="button" class="admin-remove-row-btn">✕</button>
                </div>
              `).join('')}
            </div>
            <button type="button" class="admin-add-row-btn" data-target="admin-sup-img-equipment" data-name="img_equipment" data-accept="image/*">+ Add Equipment Image</button>
          </div>

          <div class="admin-image-category">
            <h5>Certificates Images</h5>
            <div class="admin-image-url-list" id="admin-sup-img-certs">
              ${(s.certificates?.length ? s.certificates : ['']).map(url => `
                <div class="admin-img-url-row">
                  <input type="text" name="img_certificate" value="${url}" placeholder="Paste an image here (Ctrl+V) or type URL">
                  <label class="admin-action-btn" style="cursor:pointer; display:flex; align-items:center;">
                    📤 <input type="file" style="display:none;" class="admin-s3-upload" accept="image/*">
                  </label>
                  <button type="button" class="admin-remove-row-btn">✕</button>
                </div>
              `).join('')}
            </div>
            <button type="button" class="admin-add-row-btn" data-target="admin-sup-img-certs" data-name="img_certificate" data-accept="image/*">+ Add Certificate Image</button>
          </div>
          
          <div class="admin-field" style="margin-top:24px;">
            <label>Video Walkthrough URL <span class="hint">(YouTube, Vimeo, or MP4)</span></label>
            <input type="url" name="videoWalkthrough" value="${s.videoWalkthrough || ''}" placeholder="https://www.youtube.com/watch?v=...">
          </div>

          <div class="admin-field" style="margin-top:16px;">
            <label>Company Logo URL</label>
            <input type="url" name="logo" value="${s.logo || ''}" placeholder="https://example.com/logo.png">
          </div>
          
          <div class="admin-field">
            <label>Banner / Cover Image URL</label>
            <input type="url" name="banner" value="${s.banner || ''}" placeholder="https://example.com/factory-aerial.jpg">
          </div>
        </div>

        <!-- ─── SECTION 6: Documents & Catalogues ─── -->
        <div class="admin-form-section">
          <div class="admin-form-section-title">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>
            Documents & Catalogues
          </div>
          <p class="admin-form-hint">Links to PDF brochures or zipped documentation portfolios.</p>

          <div class="admin-image-category">
            <h5>Downloadable Documents</h5>
            <div class="admin-image-url-list" id="admin-sup-img-docs">
              ${(s.documents?.length ? s.documents : ['']).map(url => `
                <div class="admin-img-url-row">
                  <input type="text" name="doc_url" value="${url}" placeholder="https://example.com/brochure.pdf">
                  <label class="admin-action-btn" style="cursor:pointer; display:flex; align-items:center;">
                    📤 <input type="file" style="display:none;" class="admin-s3-upload" accept=".pdf,.doc,.docx,.zip">
                  </label>
                  <button type="button" class="admin-remove-row-btn">✕</button>
                </div>
              `).join('')}
            </div>
            <button type="button" class="admin-add-row-btn" data-target="admin-sup-img-docs" data-name="doc_url" data-accept=".pdf,.doc,.docx,.zip">+ Add Document URL</button>
          </div>
        </div>

        <!-- ─── SECTION 7: Internal Notes ─── -->
        <div class="admin-form-section">
          <div class="admin-form-section-title">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
            Internal Staff Notes
          </div>
          <div class="admin-field">
            <label>Private Notes <span class="hint">(not visible to users)</span></label>
            <textarea name="internalNotes" rows="3" placeholder="Payment terms: NET 30. Contact prefers WeChat.">${s.internalNotes || ''}</textarea>
          </div>
        </div>

        <!-- ─── Submit ─── -->
        <div class="admin-form-actions">
          <button type="button" class="btn btn-secondary" id="admin-sup-cancel">Cancel</button>
          <button type="submit" class="btn btn-primary">${existing ? 'Save Changes' : 'Create Supplier'}</button>
        </div>
      </form>
    </div>`;

    // Wire interactive bits
    wireFormDynamics();

    // Tech Group Dynamics
    const segmentSelect = document.getElementById('admin-form-segment');
    const techGroupSelect = document.getElementById('admin-form-techgroup');
    const newTechGroupInput = document.getElementById('admin-form-new-techgroup');
    
    function updateTechGroupOptions() {
      if (!segmentSelect || !techGroupSelect) return;
      const selectedTier = segmentSelect.value;
      let validGroups = [...TECH_GROUPS];
      
      if (selectedTier) {
        validGroups = [...new Set(loadedSuppliers
          .filter(sup => (sup.segment || '').toUpperCase() === selectedTier)
          .map(sup => sup.techGroup)
          .filter(Boolean)
        )].sort();
      }

      const currentSupTech = s.techGroup;
      if (currentSupTech && !validGroups.includes(currentSupTech)) {
        validGroups.push(currentSupTech);
      }
      
      const isNewMode = techGroupSelect.value === '__NEW__';
      const previouslySelected = isNewMode ? '__NEW__' : (techGroupSelect.value || currentSupTech);

      techGroupSelect.innerHTML = '<option value="">Select...</option>';
      validGroups.forEach(tg => {
        const opt = document.createElement('option');
        opt.value = tg;
        opt.textContent = tg;
        if (tg === previouslySelected) opt.selected = true;
        techGroupSelect.appendChild(opt);
      });

      const newOpt = document.createElement('option');
      newOpt.value = '__NEW__';
      newOpt.textContent = '+ Add New Tech Group...';
      newOpt.style.fontWeight = 'bold';
      if (previouslySelected === '__NEW__') newOpt.selected = true;
      techGroupSelect.appendChild(newOpt);

      handleToggleNewTech();
    }

    function handleToggleNewTech() {
      if (techGroupSelect.value === '__NEW__') {
        newTechGroupInput.style.display = 'block';
        newTechGroupInput.required = true;
        techGroupSelect.required = false;
      } else {
        newTechGroupInput.style.display = 'none';
        newTechGroupInput.required = false;
        newTechGroupInput.value = '';
        techGroupSelect.required = true;
      }
    }

    segmentSelect?.addEventListener('change', updateTechGroupOptions);
    techGroupSelect?.addEventListener('change', handleToggleNewTech);
    updateTechGroupOptions();

    document.getElementById('admin-sup-back')?.addEventListener('click', () => { pageTitle.textContent = 'Suppliers CRM Directory'; renderSuppliersTable(); });
    document.getElementById('admin-sup-cancel')?.addEventListener('click', () => { pageTitle.textContent = 'Suppliers CRM Directory'; renderSuppliersTable(); });
    document.getElementById('admin-sup-cancel-top')?.addEventListener('click', () => { pageTitle.textContent = 'Suppliers CRM Directory'; renderSuppliersTable(); });
    document.getElementById('admin-sup-score-range')?.addEventListener('input', e => {
      document.getElementById('admin-sup-score-val').textContent = e.target.value;
    });
    document.getElementById('admin-supplier-form')?.addEventListener('submit', async e => {
      e.preventDefault();
      const form = e.target;
      const btn = e.submitter || form.querySelector('button[type="submit"]');
      const ogText = btn.textContent;
      btn.textContent = 'Saving...';
      btn.style.pointerEvents = 'none';

      const fd = new FormData(form);
      const payload = {
        id: fd.get('id') || `sup-${Date.now()}`,
        isActive: s.isActive !== undefined ? s.isActive : true,
        name: fd.get('name'),
        nameZh: fd.get('nameZh'),
        description: fd.get('description'),
        city: fd.get('city'),
        country: fd.get('country'),
        region: fd.get('region'),
        lat: parseFloat(fd.get('lat') || 0),
        lng: parseFloat(fd.get('lng') || 0),
        address: fd.get('address'),
        addressZh: fd.get('addressZh'),
        segment: fd.get('segment'),
        stages: fd.getAll('stages'),
        techGroup: fd.get('techGroup') === '__NEW__' ? fd.get('newTechGroup').trim() : fd.get('techGroup'),
        tags: fd.get('tags') ? fd.get('tags').split(',').map(s => s.trim()).filter(Boolean) : [],
        technologies: fd.get('technologies') ? fd.get('technologies').split(',').map(s => s.trim()).filter(Boolean) : [],
        certifications: fd.getAll('certifications'),
        otherCertifications: fd.get('otherCertifications') ? fd.get('otherCertifications').split(',').map(s => s.trim()).filter(Boolean) : [],
        factoryScore: parseInt(fd.get('factoryScore') || 0),
        scoreTc: parseInt(fd.get('scoreTc') || 0),
        scoreOe: parseInt(fd.get('scoreOe') || 0),
        scoreQs: parseInt(fd.get('scoreQs') || 0),
        scoreV: parseInt(fd.get('scoreV') || 0),
        scoreSpeed: parseInt(fd.get('scoreSpeed') || 0),
        scoreCost: parseInt(fd.get('scoreCost') || 0),
        primaryAdvantageType: fd.get('primaryAdvantageType'),
        mainAdvantage: fd.get('mainAdvantage'),
        bestFor: fd.get('bestFor'),
        scoreLowVol: parseInt(fd.get('scoreLowVol') || 0),
        scoreComplexity: parseInt(fd.get('scoreComplexity') || 0),
        scorePrecision: parseInt(fd.get('scorePrecision') || 0),
        contactName: fd.get('contactName'),
        contactTitle: fd.get('contactTitle'),
        email: fd.get('email'),
        phone: fd.get('phone'),
        gmName: fd.get('gmName'),
        gmTitle: fd.get('gmTitle'),
        gmEmail: fd.get('gmEmail'),
        gmPhone: fd.get('gmPhone'),
        qualityName: fd.get('qualityName'),
        qualityEmail: fd.get('qualityEmail'),
        taxId: fd.get('taxId'),
        businessLicense: fd.get('businessLicense'),
        exportLicense: fd.get('exportLicense'),
        companyType: fd.get('companyType'),
        yearEstablished: fd.get('yearEstablished'),
        employees: fd.get('employees'),
        empEngineering: parseInt(fd.get('empEngineering') || 0),
        empDesign: parseInt(fd.get('empDesign') || 0),
        empManufacturing: parseInt(fd.get('empManufacturing') || 0),
        empQuality: parseInt(fd.get('empQuality') || 0),
        empOthers: parseInt(fd.get('empOthers') || 0),
        revFY4: parseFloat(fd.get('revFY4') || 0),
        revFY3: parseFloat(fd.get('revFY3') || 0),
        revFY2: parseFloat(fd.get('revFY2') || 0),
        revFY1: parseFloat(fd.get('revFY1') || 0),
        revFY: parseFloat(fd.get('revFY') || 0),
        exportRatio: parseInt(fd.get('exportRatio') || 0),
        freeCapacity: parseInt(fd.get('freeCapacity') || 0),
        outsourcingRatio: parseInt(fd.get('outsourcingRatio') || 0),
        factoryArea: fd.get('factoryArea'),
        website: fd.get('website'),
        url: fd.get('website'),
        logo: fd.get('logo'),
        banner: fd.get('banner'),
        internalNotes: fd.get('internalNotes'),
        videoWalkthrough: fd.get('videoWalkthrough'),
        documents: fd.getAll('doc_url').filter(Boolean),
        images: {
          product: fd.getAll('img_product').filter(Boolean),
          facility: fd.getAll('img_facility').filter(Boolean),
          equipment: fd.getAll('img_equipment').filter(Boolean)
        },
        certificates: fd.getAll('img_certificate').filter(Boolean)
      };

      try {
        const dbPayload = {
          id: payload.id,
          name: payload.name,
          segment: payload.segment,
          tech_group: payload.techGroup || '',
          data: (() => {
             const clone = { ...payload };
             delete clone.id; delete clone.name; delete clone.segment; delete clone.techGroup;
             return clone;
          })()
        };
        const { error } = await supabase.from('suppliers').upsert(dbPayload);
        if (error) throw error;
        
        btn.textContent = '✓ Saved!';
        btn.style.background = '#10b981';
        
        // Reload data and redirect after a short delay
        await loadCRMData();
        setTimeout(() => {
          pageTitle.textContent = 'Suppliers CRM Directory';
          renderSuppliersTable();
        }, 1000);
      } catch(err) {
        console.error(err);
        btn.textContent = '❌ Error';
        btn.style.background = '#ef4444';
        setTimeout(() => {
          btn.textContent = ogText;
          btn.style.background = '';
          btn.style.pointerEvents = '';
        }, 2000);
      }
    });
  }


  // ═══════════════════════════════════════════════════════════
  //  D E S I G N E R S   T A B L E
  // ═══════════════════════════════════════════════════════════
  function renderDesignersTable() {
    const sorted = [...loadedDesigners].sort((a, b) => compareValues(a, b, designerSort.key, designerSort.dir));

    const rows = sorted.map(d => `
      <tr>
        <td style="display:flex;align-items:center;gap:12px;">
          <div style="width:32px;height:32px;background-size:cover;background-position:center;background-image:url(${d.avatar});border-radius:50%;flex-shrink:0;"></div>
          <strong>${d.name}</strong>
        </td>
        <td>${d.title}</td>
        <td>${d.rate}/hr</td>
        <td>${d.rating} ★ <span style="color:var(--color-steel-400)">(${d.reviews})</span></td>
        <td><span class="admin-badge active">${d.availability}</span></td>
        <td class="admin-table-actions"><div class="admin-table-actions-wrapper">
          <button class="admin-action-btn admin-edit-designer" data-id="${d.id}">Edit</button>
          <button class="admin-action-btn" style="color:#ef4444;border-color:rgba(239,68,68,.2);">Deactivate</button>
        </div></td>
      </tr>`).join('');

    contentRouting.innerHTML = `
      <div style="margin-bottom:24px;display:flex;justify-content:flex-end;">
        <button class="btn btn-primary" id="admin-add-designer-btn">+ Onboard Designer</button>
      </div>
      <div class="admin-table-container">
        <table class="admin-table">
          <thead><tr>
            <th class="sortable" data-sort-key="name">Identity ${sortArrow('name', designerSort)}</th>
            <th class="sortable" data-sort-key="title">Title ${sortArrow('title', designerSort)}</th>
            <th class="sortable" data-sort-key="rateNum">Rate ${sortArrow('rateNum', designerSort)}</th>
            <th class="sortable" data-sort-key="ratingNum">Rating ${sortArrow('ratingNum', designerSort)}</th>
            <th class="sortable" data-sort-key="availability">Availability ${sortArrow('availability', designerSort)}</th>
            <th>Actions</th>
          </tr></thead>
          <tbody>${rows}</tbody>
        </table>
      </div>`;

    // Sort header clicks
    contentRouting.querySelectorAll('.sortable').forEach(th => {
      th.addEventListener('click', () => {
        const key = th.dataset.sortKey;
        if (designerSort.key === key) {
          designerSort.dir = designerSort.dir === 'asc' ? 'desc' : 'asc';
        } else {
          designerSort = { key, dir: 'asc' };
        }
        renderDesignersTable();
      });
    });

    document.getElementById('admin-add-designer-btn')?.addEventListener('click', () => renderDesignerForm());
  }


  // ═══════════════════════════════════════════════════════════
  //  A D D / E D I T   D E S I G N E R   F O R M
  // ═══════════════════════════════════════════════════════════
  function renderDesignerForm(existing = null) {
    pageTitle.textContent = existing ? `Edit Designer — ${existing.name}` : 'Onboard New Designer';
    const d = existing || {};

    contentRouting.innerHTML = `
    <div class="admin-form-page">
      <button class="admin-back-btn" id="admin-des-back">← Back to Designers</button>

      <form id="admin-designer-form" class="admin-form">

        <!-- ─── SECTION 1: Personal Identity ─── -->
        <div class="admin-form-section">
          <div class="admin-form-section-title">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
            Personal Identity
          </div>
          <div class="admin-form-grid cols-2">
            <div class="admin-field">
              <label>Full Name <span class="req">*</span></label>
              <input type="text" name="name" value="${d.name || ''}" required placeholder="Elena Rodriguez">
            </div>
            <div class="admin-field">
              <label>Designer ID</label>
              <input type="text" name="id" value="${d.id || ''}" placeholder="Auto-generated if blank">
            </div>
          </div>
          <div class="admin-form-grid cols-2">
            <div class="admin-field">
              <label>Title / Role <span class="req">*</span></label>
              <input type="text" name="title" value="${d.title || ''}" required placeholder="Senior Industrial Designer">
            </div>
            <div class="admin-field">
              <label>Location <span class="req">*</span></label>
              <input type="text" name="location" value="${d.location || ''}" required placeholder="San Francisco, CA">
            </div>
          </div>
          <div class="admin-field">
            <label>Bio / About <span class="req">*</span></label>
            <textarea name="bio" rows="4" required placeholder="I help hardware startups bring consumer electronics to market...">${d.bio || ''}</textarea>
          </div>
        </div>

        <!-- ─── SECTION 2: Professional Profile ─── -->
        <div class="admin-form-section">
          <div class="admin-form-section-title">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="7" width="20" height="14" rx="2" ry="2"/><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/></svg>
            Professional Profile
          </div>
          <div class="admin-form-grid cols-3">
            <div class="admin-field">
              <label>Hourly Rate ($) <span class="req">*</span></label>
              <input type="text" name="rate" value="${d.rate || ''}" required placeholder="$85">
            </div>
            <div class="admin-field">
              <label>Availability</label>
              <select name="availability">
                <option value="Available now" ${(d.availability || '') === 'Available now' ? 'selected' : ''}>Available now</option>
                <option value="Available in 1 week" ${(d.availability || '') === 'Available in 1 week' ? 'selected' : ''}>Available in 1 week</option>
                <option value="Available in 2 weeks" ${(d.availability || '') === 'Available in 2 weeks' ? 'selected' : ''}>Available in 2 weeks</option>
                <option value="Unavailable" ${(d.availability || '') === 'Unavailable' ? 'selected' : ''}>Unavailable</option>
              </select>
            </div>
            <div class="admin-field">
              <label>Success Rate</label>
              <input type="text" name="successRate" value="${d.successRate || ''}" placeholder="98%">
            </div>
          </div>
          <div class="admin-field">
            <label>Skill Tags <span class="hint">(comma-separated)</span></label>
            <input type="text" name="tags" value="${(d.tags || []).join(', ')}" placeholder="Consumer Electronics, Wearables, CAD, SolidWorks">
          </div>
          <div class="admin-form-grid cols-2">
            <div class="admin-field">
              <label>Years of Experience</label>
              <input type="number" name="experience" value="${d.experience || ''}" placeholder="8">
            </div>
            <div class="admin-field">
              <label>Languages Spoken</label>
              <input type="text" name="languages" value="${d.languages || ''}" placeholder="English, Mandarin, Spanish">
            </div>
          </div>
        </div>

        <!-- ─── SECTION 3: Contact Information ─── -->
        <div class="admin-form-section">
          <div class="admin-form-section-title">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>
            Contact Details
          </div>
          <div class="admin-form-grid cols-2">
            <div class="admin-field">
              <label>Email Address <span class="req">*</span></label>
              <input type="email" name="email" value="${d.email || ''}" required placeholder="elena@designstudio.com">
            </div>
            <div class="admin-field">
              <label>Phone</label>
              <input type="text" name="phone" value="${d.phone || ''}" placeholder="+1 415 555 1234">
            </div>
          </div>
          <div class="admin-form-grid cols-2">
            <div class="admin-field">
              <label>Website / Behance / Dribbble</label>
              <input type="url" name="website" value="${d.website || ''}" placeholder="https://dribbble.com/elena">
            </div>
            <div class="admin-field">
              <label>LinkedIn URL</label>
              <input type="url" name="linkedin" value="${d.linkedin || ''}" placeholder="https://linkedin.com/in/elena-rodriguez">
            </div>
          </div>
        </div>

        <!-- ─── SECTION 4: Profile Images ─── -->
        <div class="admin-form-section">
          <div class="admin-form-section-title">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>
            Profile Images
          </div>
          <div class="admin-form-grid cols-2">
            <div class="admin-field">
              <label>Avatar / Headshot URL <span class="req">*</span></label>
              <input type="url" name="avatar" value="${d.avatar || ''}" required placeholder="https://i.pravatar.cc/150?u=elena">
            </div>
            <div class="admin-field">
              <label>Cover / Banner Image URL</label>
              <input type="url" name="cover" value="${d.cover || ''}" placeholder="https://example.com/cover.jpg">
            </div>
          </div>
        </div>

        <!-- ─── SECTION 5: Portfolio ─── -->
        <div class="admin-form-section">
          <div class="admin-form-section-title">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/></svg>
            Portfolio Pieces
          </div>
          <p class="admin-form-hint">Add up to 6 portfolio items. Each item needs a project title and an image URL.</p>
          <div id="admin-des-portfolio-list">
            ${(d.portfolio && d.portfolio.length > 0)
              ? d.portfolio.map((p, i) => `
                <div class="admin-portfolio-row">
                  <input type="text" name="portfolio_title_${i}" value="${p.title}" placeholder="Project Title">
                  <input type="url" name="portfolio_img_${i}" value="${p.img}" placeholder="Image URL">
                  <button type="button" class="admin-remove-row-btn">✕</button>
                </div>`).join('')
              : `<div class="admin-portfolio-row">
                  <input type="text" name="portfolio_title_0" placeholder="Project Title">
                  <input type="url" name="portfolio_img_0" placeholder="Image URL">
                  <button type="button" class="admin-remove-row-btn">✕</button>
                </div>`}
          </div>
          <button type="button" class="admin-add-row-btn" id="admin-des-add-portfolio">+ Add Portfolio Item</button>
        </div>

        <!-- ─── SECTION 6: Reviews (Staff Managed) ─── -->
        <div class="admin-form-section">
          <div class="admin-form-section-title">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
            Ratings & Reviews
          </div>
          <div class="admin-form-grid cols-2">
            <div class="admin-field">
              <label>Rating (0–5)</label>
              <input type="number" step="0.1" min="0" max="5" name="rating" value="${d.rating || ''}" placeholder="4.9">
            </div>
            <div class="admin-field">
              <label>Total Review Count</label>
              <input type="number" name="reviews" value="${d.reviews || ''}" placeholder="124">
            </div>
          </div>
          <p class="admin-form-hint">Seed reviews (optional):</p>
          <div id="admin-des-reviews-list">
            ${(d.reviewList && d.reviewList.length > 0)
              ? d.reviewList.map((r, i) => `
                <div class="admin-review-row">
                  <input type="text" name="review_author_${i}" value="${r.author}" placeholder="Author Name">
                  <input type="number" name="review_rating_${i}" value="${r.rating}" min="1" max="5" placeholder="5">
                  <input type="text" name="review_text_${i}" value="${r.text}" placeholder="Review text…">
                  <button type="button" class="admin-remove-row-btn">✕</button>
                </div>`).join('')
              : `<div class="admin-review-row">
                  <input type="text" name="review_author_0" placeholder="Author Name">
                  <input type="number" name="review_rating_0" min="1" max="5" placeholder="5">
                  <input type="text" name="review_text_0" placeholder="Review text…">
                  <button type="button" class="admin-remove-row-btn">✕</button>
                </div>`}
          </div>
          <button type="button" class="admin-add-row-btn" id="admin-des-add-review">+ Add Review</button>
        </div>

        <!-- ─── SECTION 7: Internal Notes ─── -->
        <div class="admin-form-section">
          <div class="admin-form-section-title">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
            Internal Staff Notes
          </div>
          <div class="admin-field">
            <label>Private Notes <span class="hint">(not visible to designers or users)</span></label>
            <textarea name="internalNotes" rows="3" placeholder="Vetted via portfolio review. Strong DFM skills.">${d.internalNotes || ''}</textarea>
          </div>
        </div>

        <!-- ─── Submit ─── -->
        <div class="admin-form-actions">
          <button type="button" class="btn btn-secondary" id="admin-des-cancel">Cancel</button>
          <button type="submit" class="btn btn-primary">${existing ? 'Save Changes' : 'Onboard Designer'}</button>
        </div>
      </form>
    </div>`;

    // Wire interactive bits
    wireFormDynamics();
    let portfolioIdx = (d.portfolio || [{ title: '', img: '' }]).length;
    let reviewIdx = (d.reviewList || [{ author: '', rating: 5, text: '' }]).length;

    document.getElementById('admin-des-back')?.addEventListener('click', () => { pageTitle.textContent = 'Talent Hub (Designers)'; renderDesignersTable(); });
    document.getElementById('admin-des-cancel')?.addEventListener('click', () => { pageTitle.textContent = 'Talent Hub (Designers)'; renderDesignersTable(); });

    document.getElementById('admin-des-add-portfolio')?.addEventListener('click', () => {
      const list = document.getElementById('admin-des-portfolio-list');
      const row = document.createElement('div');
      row.className = 'admin-portfolio-row';
      row.innerHTML = `
        <input type="text" name="portfolio_title_${portfolioIdx}" placeholder="Project Title">
        <input type="url" name="portfolio_img_${portfolioIdx}" placeholder="Image URL">
        <button type="button" class="admin-remove-row-btn">✕</button>`;
      list.appendChild(row);
      portfolioIdx++;
      wireRemoveButtons(list);
    });

    document.getElementById('admin-des-add-review')?.addEventListener('click', () => {
      const list = document.getElementById('admin-des-reviews-list');
      const row = document.createElement('div');
      row.className = 'admin-review-row';
      row.innerHTML = `
        <input type="text" name="review_author_${reviewIdx}" placeholder="Author Name">
        <input type="number" name="review_rating_${reviewIdx}" min="1" max="5" placeholder="5">
        <input type="text" name="review_text_${reviewIdx}" placeholder="Review text…">
        <button type="button" class="admin-remove-row-btn">✕</button>`;
      list.appendChild(row);
      reviewIdx++;
      wireRemoveButtons(list);
    });

    document.getElementById('admin-designer-form')?.addEventListener('submit', e => {
      e.preventDefault();
      alert('Designer saved successfully (prototype — data not persisted).');
      pageTitle.textContent = 'Talent Hub (Designers)';
      renderDesignersTable();
    });
  }


  // ═══════════════════════════════════════════════════════════
  //  R F Q s   T A B L E
  // ═══════════════════════════════════════════════════════════
  function renderRFQs() {
    contentRouting.innerHTML = `
      <div class="admin-table-container">
        <table class="admin-table">
          <thead><tr><th>Project ID</th><th>Requester</th><th>Budget</th><th>Status</th><th>Actions</th></tr></thead>
          <tbody>
            <tr><td>PRJ-A8012</td><td>Sarah Connor (InnovateX)</td><td>$45,000</td><td><span class="admin-badge pending">Quoting</span></td><td class="admin-table-actions"><div class="admin-table-actions-wrapper"><button class="admin-action-btn">Review</button></div></td></tr>
            <tr><td>PRJ-B9921</td><td>John Doe (TechCorp)</td><td>$12,500</td><td><span class="admin-badge active">In Production</span></td><td class="admin-table-actions"><div class="admin-table-actions-wrapper"><button class="admin-action-btn">Manage</button></div></td></tr>
          </tbody>
        </table>
      </div>`;
  }


  // ═══════════════════════════════════════════════════════════
  //  S H A R E D   F O R M   U T I L I T I E S
  // ═══════════════════════════════════════════════════════════
  function wireFormDynamics() {
    // Collapse all sections except the first two by default
    document.querySelectorAll('.admin-form-section').forEach((section, idx) => {
      if (idx > 1) {
        section.classList.add('collapsed');
      }
    });

    // Accordion/collapsible logic
    document.querySelectorAll('.admin-form-section-title').forEach(title => {
      // Add accordion arrow if not present
      if (!title.querySelector('.admin-section-toggle')) {
        const arrow = document.createElement('span');
        arrow.className = 'admin-section-toggle';
        arrow.innerHTML = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="6 9 12 15 18 9"></polyline></svg>`;
        title.appendChild(arrow);
        title.style.cursor = 'pointer';
        title.style.display = 'flex';
        title.style.justifyContent = 'space-between';
        title.style.alignItems = 'center';
      }
      
      const clone = title.cloneNode(true);
      title.parentNode.replaceChild(clone, title);
      clone.addEventListener('click', () => {
        const section = clone.closest('.admin-form-section');
        section.classList.toggle('collapsed');
      });
    });

    // "Add row" buttons for image URL lists
    document.querySelectorAll('.admin-add-row-btn[data-target]').forEach(btn => {
      btn.addEventListener('click', () => {
        const list = document.getElementById(btn.dataset.target);
        if (!list) return;
        const row = document.createElement('div');
        row.className = 'admin-img-url-row';
        row.innerHTML = `<input type="text" name="${btn.dataset.name}" placeholder="https://example.com/image.jpg">
          <label class="admin-action-btn" style="cursor:pointer; display:flex; align-items:center;">
            📤 <input type="file" style="display:none;" class="admin-s3-upload" accept="${btn.dataset.accept || 'image/*'}">
          </label>
          <button type="button" class="admin-remove-row-btn">✕</button>`;
        list.appendChild(row);
        wireRemoveButtons(list);
        wireS3Uploaders();
      });
    });

    // Wire all remove buttons globally
    document.querySelectorAll('.admin-remove-row-btn').forEach(btn => {
      btn.addEventListener('click', () => btn.parentElement.remove());
    });
    
    wireS3Uploaders();

    // Global Paste Listener for Image Uploads
    document.querySelectorAll('.admin-image-url-list').forEach(list => {
      // Prevent multiple listeners
      const _list = list.cloneNode(true);
      list.parentNode.replaceChild(_list, list);
      _list.addEventListener('paste', async (e) => {
        const items = (e.clipboardData || e.originalEvent.clipboardData).items;
        for (const item of items) {
          if (item.type.indexOf('image') === 0) {
            e.preventDefault();
            const file = item.getAsFile();
            if (!file) continue;
            
            const target = e.target;
            const row = target.closest('.admin-img-url-row');
            if (!row) return;
            const textInput = row.querySelector('input[type="text"], input[type="url"]');
            if (textInput) {
              const ext = file.type.split('/')[1] || 'png';
              const fileName = `admin_${Date.now()}_${Math.random().toString(36).substring(2, 8)}.${ext}`;
              textInput.value = 'Uploading...';
              textInput.disabled = true;
              try {
                if (!window.supabase) throw new Error('Supabase client not found.');
                const { data, error } = await supabase.storage.from('supplier-assets').upload(fileName, file);
                if (error) throw error;
                const { data: publicData } = supabase.storage.from('supplier-assets').getPublicUrl(fileName);
                textInput.value = publicData.publicUrl;
              } catch(err) {
                console.error(err);
                textInput.value = '';
                alert('Pasted Image Upload failed: ' + err.message);
              } finally {
                textInput.disabled = false;
              }
            }
          }
        }
      });
      
      // Re-wire add buttons which map to this new list
      document.querySelectorAll('.admin-add-row-btn[data-target="' + _list.id + '"]').forEach(btn => {
        const freshBtn = btn.cloneNode(true);
        btn.parentNode.replaceChild(freshBtn, btn);
        freshBtn.addEventListener('click', () => {
          const targetList = document.getElementById(freshBtn.dataset.target);
          if (!targetList) return;
          const row = document.createElement('div');
          row.className = 'admin-img-url-row';
          row.innerHTML = `<input type="text" name="${freshBtn.dataset.name}" placeholder="https://example.com/image.jpg">
            <label class="admin-action-btn" style="cursor:pointer; display:flex; align-items:center;">
              📤 <input type="file" style="display:none;" class="admin-s3-upload" accept="${freshBtn.dataset.accept || 'image/*'}">
            </label>
            <button type="button" class="admin-remove-row-btn">✕</button>`;
          targetList.appendChild(row);
          wireRemoveButtons(row);
          wireS3Uploaders();
        });
      });
      
      // Wire remove buttons exactly within the new list
      wireRemoveButtons(_list);
    });
  }

  function wireRemoveButtons(container) {
    container.querySelectorAll('.admin-remove-row-btn').forEach(btn => {
      // Prevent duplicate event binding
      const fresh = btn.cloneNode(true);
      btn.parentNode.replaceChild(fresh, btn);
      fresh.addEventListener('click', () => fresh.parentElement.remove());
    });
  }

  function wireS3Uploaders() {
    document.querySelectorAll('.admin-s3-upload').forEach(input => {
      // Avoid duplicate bindings
      const _new = input.cloneNode(true);
      input.parentNode.replaceChild(_new, input);
      _new.addEventListener('change', async (e) => {
        const file = e.target.files[0];
        if (!file) return;
        
        // Find adjacent text input
        const row = _new.closest('.admin-img-url-row');
        const textInput = row.querySelector('input[type="text"], input[type="url"]');
        if (!textInput) return;
        
        const ogLabel = _new.parentElement.innerHTML;
        _new.parentElement.innerHTML = '⏳...';
        
        try {
          const ext = file.name.split('.').pop();
          const fileName = `admin_${Date.now()}_${Math.random().toString(36).substring(2, 8)}.${ext}`;
          
          if (!window.supabase) {
             throw new Error('Supabase client not found.');
          }
          const { data, error } = await supabase.storage.from('supplier-assets').upload(fileName, file);
          if (error) throw error;
          
          const { data: publicData } = supabase.storage.from('supplier-assets').getPublicUrl(fileName);
          textInput.value = publicData.publicUrl;
          
          _new.parentElement.innerHTML = '✅ Add';
          setTimeout(() => {
            _new.parentElement.innerHTML = `📤 <input type="file" style="display:none;" class="admin-s3-upload" accept="${_new.accept}">`;
            wireS3Uploaders();
          }, 2000);
        } catch(err) {
          console.error('Upload Failed', err);
          _new.parentElement.innerHTML = '❌ Err';
          setTimeout(() => {
            _new.parentElement.innerHTML = `📤 <input type="file" style="display:none;" class="admin-s3-upload" accept="${_new.accept}">`;
            wireS3Uploaders();
          }, 2000);
        }
      });
    });
  }

  // ═══════════════════════════════════════════════════════════
  //  W E B S I T E   C O N T E N T   M A N A G E R
  // ═══════════════════════════════════════════════════════════
  const CMS_LS_KEY = 'atlasdt_cms_content';
  let cmsData = null;
  let cmsDraft = null; // working copy
  let cmsActivePage = 'portfolio';

  async function loadCMSContent() {
    // Prefer localStorage draft
    const stored = localStorage.getItem(CMS_LS_KEY);
    if (stored) {
      try { cmsData = JSON.parse(stored); } catch(e) { cmsData = null; }
    }
    // Fallback to static file
    if (!cmsData) {
      try {
        const res = await fetch('/cms/site-content.json');
        if (res.ok) cmsData = await res.json();
      } catch(e) { /* silent */ }
    }
    if (!cmsData) {
      cmsData = { version: 1, lastUpdated: new Date().toISOString(), pages: {} };
    }
    cmsDraft = JSON.parse(JSON.stringify(cmsData)); // deep clone
  }

  function saveCMSDraft() {
    cmsDraft.lastUpdated = new Date().toISOString();
    localStorage.setItem(CMS_LS_KEY, JSON.stringify(cmsDraft));
  }

  function publishCMS() {
    saveCMSDraft();
    cmsData = JSON.parse(JSON.stringify(cmsDraft));
  }

  function discardCMSChanges() {
    cmsDraft = JSON.parse(JSON.stringify(cmsData));
    renderCMSPage();
  }

  async function renderWebsiteContent() {
    await loadCMSContent();

    const pages = [
      { id: 'portfolio', label: 'Portfolio', icon: '📸' },
      { id: 'home',      label: 'Home', icon: '🏠' },
      { id: 'services',  label: 'Capabilities', icon: '⚙️' },
      { id: 'about',     label: 'About Us', icon: '🏢' }
    ];

    contentRouting.innerHTML = `
      <div class="cms-page-selector">
        ${pages.map(p => `
          <button class="cms-page-btn ${p.id === cmsActivePage ? 'active' : ''} ${p.disabled ? 'disabled' : ''}"
                  data-page="${p.id}" ${p.disabled ? 'disabled' : ''}>
            <span class="cms-page-icon">${p.icon}</span>
            <span>${p.label}</span>
            ${p.disabled ? '<span class="cms-phase-badge">Phase 2</span>' : ''}
          </button>
        `).join('')}
      </div>
      <div id="cms-page-content"></div>
      <div class="cms-action-bar" id="cms-action-bar">
        <div class="cms-action-bar__left">
          <span class="cms-status">Editing: <strong>${cmsActivePage}</strong></span>
        </div>
        <div class="cms-action-bar__right">
          <button class="btn btn-secondary" id="cms-discard">Discard Changes</button>
          <button class="btn btn-secondary" id="cms-save-draft">Save Draft</button>
          <button class="btn btn-primary" id="cms-publish">Publish</button>
        </div>
      </div>
    `;

    // Page selector
    contentRouting.querySelectorAll('.cms-page-btn:not(.disabled)').forEach(btn => {
      btn.addEventListener('click', () => {
        cmsActivePage = btn.dataset.page;
        renderWebsiteContent();
      });
    });

    // Action bar
    document.getElementById('cms-discard')?.addEventListener('click', () => {
      if (confirm('Discard all changes?')) discardCMSChanges();
    });
    document.getElementById('cms-save-draft')?.addEventListener('click', () => {
      saveCMSDraft();
      showCMSToast('Draft saved');
    });
    document.getElementById('cms-publish')?.addEventListener('click', () => {
      publishCMS();
      showCMSToast('Changes published!');
    });

    renderCMSPage();
  }

  function showCMSToast(msg) {
    let toast = document.getElementById('cms-toast');
    if (!toast) {
      toast = document.createElement('div');
      toast.id = 'cms-toast';
      toast.className = 'cms-toast';
      document.body.appendChild(toast);
    }
    toast.textContent = msg;
    toast.classList.add('show');
    setTimeout(() => toast.classList.remove('show'), 3000);
  }

  function renderCMSPage() {
    const container = document.getElementById('cms-page-content');
    if (!container) return;

    switch (cmsActivePage) {
      case 'portfolio': renderCMSPortfolio(container); break;
      case 'home':      renderCMSHome(container);      break;
      case 'services':  renderCMSServices(container);  break;
      case 'about':     renderCMSAbout(container);      break;
      default: container.innerHTML = '<p style="color:var(--color-steel-400);padding:40px;text-align:center;">Select a page to edit.</p>';
    }
  }

  /* ═══════════════════════════════════════════════════
     HOME PAGE EDITOR
     ═══════════════════════════════════════════════════ */
  function renderCMSHome(container) {
    const home = cmsDraft?.pages?.home;
    if (!home) {
      container.innerHTML = '<p style="color:var(--color-steel-400);">No home page data found. Publish defaults first.</p>';
      return;
    }

    let html = '';

    // ── Hero ──
    html += `
      <div class="cms-block">
        <div class="cms-block__header">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="12 2 22 8.5 22 15.5 12 22 2 15.5 2 8.5 12 2"/></svg>
          Hero Section
        </div>
        <div class="admin-form-grid cols-2">
          <div class="admin-field">
            <label>Chip Text</label>
            <input type="text" value="${home.hero?.chip || ''}" data-cms-path="hero.chip" />
          </div>
          <div class="admin-field">
            <label>Hero Title</label>
            <input type="text" value="${home.hero?.title || ''}" data-cms-path="hero.title" />
          </div>
        </div>
        <div class="admin-field">
          <label>Subtitle Line</label>
          <input type="text" value="${home.hero?.subtitle || ''}" data-cms-path="hero.subtitle" />
        </div>
        <div class="admin-field">
          <label>Description</label>
          <textarea data-cms-path="hero.description" rows="3">${home.hero?.description || ''}</textarea>
        </div>
        <div class="admin-form-grid cols-2">
          <div class="admin-field">
            <label>Primary CTA Label</label>
            <input type="text" value="${home.hero?.ctaPrimary || ''}" data-cms-path="hero.ctaPrimary" />
          </div>
          <div class="admin-field">
            <label>Secondary CTA Label</label>
            <input type="text" value="${home.hero?.ctaSecondary || ''}" data-cms-path="hero.ctaSecondary" />
          </div>
        </div>
      </div>
    `;

    // ── Merger Cards ──
    html += `
      <div class="cms-block">
        <div class="cms-block__header">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="7" width="20" height="14" rx="2" ry="2"/><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/></svg>
          Merger Cards (Hero Graphic)
        </div>
        <div class="admin-form-grid cols-2">
          ${['west','east'].map(side => {
            const card = home.mergerCards?.[side] || {};
            return `
              <div style="padding:16px;background:rgba(255,255,255,0.02);border:1px solid rgba(255,255,255,0.08);border-radius:12px;">
                <h4 style="color:var(--color-electric);font-size:13px;margin-bottom:12px;text-transform:uppercase;letter-spacing:1px;">${side === 'west' ? '🌎 West' : '🌏 East'}</h4>
                <div class="cms-drop-zone" data-cms-field="mergerCards.${side}.image">
                  <div class="cms-drop-zone__preview" style="background-image:url(${card.image || ''});"></div>
                  <div class="cms-drop-zone__overlay"><span>Drop image or click</span></div>
                  <input type="file" accept="image/*" class="cms-drop-zone__input" />
                </div>
                <div class="admin-field" style="margin-top:12px;">
                  <label>Tag</label>
                  <input type="text" value="${card.tag || ''}" data-cms-path="mergerCards.${side}.tag" />
                </div>
                <div class="admin-field">
                  <label>Title</label>
                  <input type="text" value="${card.title || ''}" data-cms-path="mergerCards.${side}.title" />
                </div>
                <div class="admin-field">
                  <label>Line 1</label>
                  <input type="text" value="${card.line1 || ''}" data-cms-path="mergerCards.${side}.line1" />
                </div>
                <div class="admin-field">
                  <label>Line 2</label>
                  <input type="text" value="${card.line2 || ''}" data-cms-path="mergerCards.${side}.line2" />
                </div>
              </div>
            `;
          }).join('')}
        </div>
      </div>
    `;

    // ── Core Capabilities ──
    const caps = home.capabilities || {};
    html += `
      <div class="cms-block">
        <div class="cms-block__header">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>
          Core Capabilities (Bento Grid)
        </div>
        <div class="admin-form-grid cols-2">
          <div class="admin-field">
            <label>Section Title</label>
            <input type="text" value="${caps.sectionTitle || ''}" data-cms-path="capabilities.sectionTitle" />
          </div>
          <div class="admin-field">
            <label>Section Description</label>
            <textarea data-cms-path="capabilities.sectionDescription" rows="2">${caps.sectionDescription || ''}</textarea>
          </div>
        </div>
        <div class="cms-items-grid">
          ${(caps.cards || []).map((card, i) => `
            <div class="cms-item-card" data-iidx="${i}">
              <div class="cms-drop-zone cms-item-drop" data-sidx="0" data-iidx="${i}">
                <div class="cms-drop-zone__preview" style="background-image:url(${card.image || ''});"></div>
                <div class="cms-drop-zone__overlay"><span>Drop to replace</span></div>
                <input type="file" accept="image/*" class="cms-drop-zone__input" />
              </div>
              <div class="cms-item-card__controls">
                <button class="cms-reorder-btn cms-home-cap-move" data-dir="left" data-idx="${i}" title="Move Left" ${i === 0 ? 'disabled' : ''}>←</button>
                <button class="cms-reorder-btn cms-home-cap-move" data-dir="right" data-idx="${i}" title="Move Right" ${i >= (caps.cards || []).length - 1 ? 'disabled' : ''}>→</button>
                <button class="cms-home-cap-delete" data-idx="${i}" title="Delete">✕</button>
              </div>
              <div class="cms-item-card__fields">
                <input type="text" value="${card.title || ''}" placeholder="Title" class="cms-home-cap-title" data-idx="${i}" />
                <textarea placeholder="Description" class="cms-home-cap-desc" data-idx="${i}" rows="2">${card.description || ''}</textarea>
              </div>
            </div>
          `).join('')}
          <div class="cms-item-add" id="cms-home-add-cap">
            <span>+</span>
            <span>Add Card</span>
          </div>
        </div>
      </div>
    `;

    // ── One-Stop Shop ──
    const oss = home.oneStopShop || {};
    html += `
      <div class="cms-block">
        <div class="cms-block__header">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 20V10"/><path d="M18 20V4"/><path d="M6 20v-4"/></svg>
          One-Stop Shop Section
        </div>
        <div class="admin-form-grid cols-2">
          <div class="admin-field">
            <label>Title</label>
            <input type="text" value="${oss.sectionTitle || ''}" data-cms-path="oneStopShop.sectionTitle" />
          </div>
          <div class="admin-field">
            <label>Description</label>
            <textarea data-cms-path="oneStopShop.sectionDescription" rows="2">${oss.sectionDescription || ''}</textarea>
          </div>
        </div>
      </div>
    `;

    // ── Portfolio Preview ──
    const pp = home.portfolioPreview || {};
    html += `
      <div class="cms-block">
        <div class="cms-block__header">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="m21 15-5-5L5 21"/></svg>
          Portfolio Preview Section
        </div>
        <div class="admin-field">
          <label>Chip</label>
          <input type="text" value="${pp.sectionChip || ''}" data-cms-path="portfolioPreview.sectionChip" />
        </div>
        <div class="admin-form-grid cols-2">
          <div class="admin-field">
            <label>Title</label>
            <input type="text" value="${pp.sectionTitle || ''}" data-cms-path="portfolioPreview.sectionTitle" />
          </div>
          <div class="admin-field">
            <label>Description</label>
            <textarea data-cms-path="portfolioPreview.sectionDescription" rows="2">${pp.sectionDescription || ''}</textarea>
          </div>
        </div>
      </div>
    `;

    // ── Locations ──
    const locs = home.locations || {};
    html += `
      <div class="cms-block">
        <div class="cms-block__header">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
          Locations
        </div>
        <div class="admin-form-grid cols-2">
          <div class="admin-field">
            <label>Section Title</label>
            <input type="text" value="${locs.sectionTitle || ''}" data-cms-path="locations.sectionTitle" />
          </div>
          <div class="admin-field">
            <label>Section Description</label>
            <textarea data-cms-path="locations.sectionDescription" rows="2">${locs.sectionDescription || ''}</textarea>
          </div>
        </div>
        <div class="cms-items-grid">
          ${(locs.cards || []).map((loc, i) => `
            <div class="cms-item-card" data-iidx="${i}">
              <div class="cms-drop-zone" data-cms-field="locations.cards.${i}.image">
                <div class="cms-drop-zone__preview" style="background-image:url(${loc.image || ''});"></div>
                <div class="cms-drop-zone__overlay"><span>Drop to replace</span></div>
                <input type="file" accept="image/*" class="cms-drop-zone__input" />
              </div>
              <div class="cms-item-card__fields">
                <input type="text" value="${loc.country || ''}" placeholder="Country" class="cms-loc-field" data-idx="${i}" data-field="country" />
                <input type="text" value="${loc.label || ''}" placeholder="Label" class="cms-loc-field" data-idx="${i}" data-field="label" />
                <textarea placeholder="Address" class="cms-loc-field" data-idx="${i}" data-field="address" rows="2">${(loc.address || '').replace(/\n/g, '\n')}</textarea>
              </div>
            </div>
          `).join('')}
        </div>
      </div>
    `;

    // ── Data CTA ──
    const dc = home.dataCta || {};
    html += `
      <div class="cms-block">
        <div class="cms-block__header">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>
          Data Intelligence CTA
        </div>
        <div class="admin-form-grid cols-2">
          <div class="admin-field">
            <label>Title</label>
            <input type="text" value="${dc.title || ''}" data-cms-path="dataCta.title" />
          </div>
          <div class="admin-field">
            <label>Description</label>
            <textarea data-cms-path="dataCta.description" rows="2">${dc.description || ''}</textarea>
          </div>
        </div>
      </div>
    `;

    container.innerHTML = html;
    wireCMSHomeEvents(container);
  }

  function wireCMSHomeEvents(container) {
    const home = cmsDraft.pages.home;

    // Generic path-based text inputs
    container.querySelectorAll('[data-cms-path]').forEach(el => {
      el.addEventListener('input', () => {
        const parts = el.dataset.cmsPath.split('.');
        let obj = home;
        for (let k = 0; k < parts.length - 1; k++) obj = obj[parts[k]];
        obj[parts[parts.length - 1]] = el.value;
      });
    });

    // Capability card fields
    container.querySelectorAll('.cms-home-cap-title').forEach(el => {
      el.addEventListener('input', () => {
        home.capabilities.cards[parseInt(el.dataset.idx)].title = el.value;
      });
    });
    container.querySelectorAll('.cms-home-cap-desc').forEach(el => {
      el.addEventListener('input', () => {
        home.capabilities.cards[parseInt(el.dataset.idx)].description = el.value;
      });
    });

    // Capability card move
    container.querySelectorAll('.cms-home-cap-move').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const i = parseInt(btn.dataset.idx);
        const cards = home.capabilities.cards;
        if (btn.dataset.dir === 'left' && i > 0) {
          [cards[i - 1], cards[i]] = [cards[i], cards[i - 1]];
          renderCMSPage();
        } else if (btn.dataset.dir === 'right' && i < cards.length - 1) {
          [cards[i], cards[i + 1]] = [cards[i + 1], cards[i]];
          renderCMSPage();
        }
      });
    });

    // Capability card delete
    container.querySelectorAll('.cms-home-cap-delete').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const i = parseInt(btn.dataset.idx);
        const title = home.capabilities.cards[i]?.title || 'card';
        home.capabilities.cards.splice(i, 1);
        renderCMSPage();
        showCMSToast(`"${title}" deleted — Discard Changes to undo`);
      });
    });

    // Add capability card
    document.getElementById('cms-home-add-cap')?.addEventListener('click', () => {
      home.capabilities.cards.push({
        id: 'cap-' + Date.now(),
        image: '',
        title: 'New Card',
        description: ''
      });
      renderCMSPage();
    });

    // Location fields
    container.querySelectorAll('.cms-loc-field').forEach(el => {
      el.addEventListener('input', () => {
        const i = parseInt(el.dataset.idx);
        home.locations.cards[i][el.dataset.field] = el.value;
      });
    });

    // Wire drop zones
    wireDropZones(container);
  }

  /* ═══════════════════════════════════════════════════
     SERVICES (CAPABILITIES) PAGE EDITOR
     ═══════════════════════════════════════════════════ */
  function renderCMSServices(container) {
    const services = cmsDraft?.pages?.services;
    if (!services) {
      container.innerHTML = '<p style="color:var(--color-steel-400);">No capabilities page data found. Publish defaults first.</p>';
      return;
    }

    let html = '';

    // ── Hero ──
    html += `
      <div class="cms-block">
        <div class="cms-block__header">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="12 2 22 8.5 22 15.5 12 22 2 15.5 2 8.5 12 2"/></svg>
          Hero Section
        </div>
        <div class="admin-form-grid cols-2">
          <div class="admin-field">
            <label>Page Title</label>
            <input type="text" value="${services.hero?.title || ''}" data-cms-svc-path="hero.title" />
          </div>
          <div class="admin-field">
            <label>Description</label>
            <textarea data-cms-svc-path="hero.description" rows="2">${services.hero?.description || ''}</textarea>
          </div>
        </div>
      </div>
    `;

    // ── Service Blocks ──
    (services.blocks || []).forEach((block, bIdx) => {
      html += `
        <div class="cms-block" data-block-idx="${bIdx}">
          <div class="cms-block__header">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>
            Service: ${block.title}
            <div class="cms-header-controls">
              <button class="cms-reorder-btn" data-move-svc-up="${bIdx}" title="Move Up" ${bIdx === 0 ? 'disabled' : ''}>↑</button>
              <button class="cms-reorder-btn" data-move-svc-down="${bIdx}" title="Move Down" ${bIdx >= services.blocks.length - 1 ? 'disabled' : ''}>↓</button>
              <button class="cms-section-delete cms-svc-delete" data-delete-svc="${bIdx}" title="Delete">✕</button>
            </div>
          </div>
          <div class="admin-form-grid cols-2">
            <div class="admin-field">
              <label>Block Image</label>
              <div class="cms-drop-zone" data-sidx="${bIdx}" data-iidx="0">
                <div class="cms-drop-zone__preview" style="background-image:url(${block.image || ''});"></div>
                <div class="cms-drop-zone__overlay"><span>Drop image or click</span></div>
                <input type="file" accept="image/*" class="cms-drop-zone__input" />
              </div>
            </div>
            <div>
              <div class="admin-field">
                <label>Title</label>
                <input type="text" value="${block.title || ''}" class="cms-svc-block-field" data-bidx="${bIdx}" data-field="title" />
              </div>
              <div class="admin-field">
                <label>Description</label>
                <textarea class="cms-svc-block-field" data-bidx="${bIdx}" data-field="description" rows="3">${block.description || ''}</textarea>
              </div>
            </div>
          </div>

          <div class="admin-field" style="margin-top:16px;">
            <label>Bullet Points</label>
            ${(block.listItems || []).map((li, liIdx) => `
              <div style="display:flex;gap:8px;margin-bottom:8px;align-items:start;">
                <input type="text" value="${li.bold || ''}" placeholder="Bold label" style="width:180px;" class="cms-svc-li-bold" data-bidx="${bIdx}" data-liidx="${liIdx}" />
                <textarea placeholder="Description" class="cms-svc-li-text" data-bidx="${bIdx}" data-liidx="${liIdx}" rows="1" style="flex:1;">${li.text || ''}</textarea>
                <button class="cms-item-delete cms-svc-li-delete" data-bidx="${bIdx}" data-liidx="${liIdx}" title="Remove" style="flex-shrink:0;">✕</button>
              </div>
            `).join('')}
            <button class="cms-add-section-btn cms-svc-add-li" data-bidx="${bIdx}" style="font-size:12px;padding:8px 16px;margin-top:4px;">+ Add Bullet</button>
          </div>

          <div class="admin-form-grid cols-2" style="margin-top:16px;">
            <div class="admin-field">
              <label>Result Title</label>
              <input type="text" value="${block.resultTitle || ''}" class="cms-svc-block-field" data-bidx="${bIdx}" data-field="resultTitle" />
            </div>
            <div class="admin-field">
              <label>Result Text</label>
              <textarea class="cms-svc-block-field" data-bidx="${bIdx}" data-field="resultText" rows="2">${block.resultText || ''}</textarea>
            </div>
          </div>
        </div>
      `;
    });

    // Add Block button
    html += `<button class="cms-add-section-btn" id="cms-svc-add-block">+ Add Service Block</button>`;

    container.innerHTML = html;
    wireCMSServicesEvents(container);
  }

  function wireCMSServicesEvents(container) {
    const services = cmsDraft.pages.services;

    // Hero fields
    container.querySelectorAll('[data-cms-svc-path]').forEach(el => {
      el.addEventListener('input', () => {
        const parts = el.dataset.cmsSvcPath.split('.');
        let obj = services;
        for (let k = 0; k < parts.length - 1; k++) obj = obj[parts[k]];
        obj[parts[parts.length - 1]] = el.value;
      });
    });

    // Block fields
    container.querySelectorAll('.cms-svc-block-field').forEach(el => {
      el.addEventListener('input', () => {
        services.blocks[parseInt(el.dataset.bidx)][el.dataset.field] = el.value;
      });
    });

    // Bullet bold/text
    container.querySelectorAll('.cms-svc-li-bold').forEach(el => {
      el.addEventListener('input', () => {
        services.blocks[parseInt(el.dataset.bidx)].listItems[parseInt(el.dataset.liidx)].bold = el.value;
      });
    });
    container.querySelectorAll('.cms-svc-li-text').forEach(el => {
      el.addEventListener('input', () => {
        services.blocks[parseInt(el.dataset.bidx)].listItems[parseInt(el.dataset.liidx)].text = el.value;
      });
    });

    // Delete bullet
    container.querySelectorAll('.cms-svc-li-delete').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const b = parseInt(btn.dataset.bidx), li = parseInt(btn.dataset.liidx);
        services.blocks[b].listItems.splice(li, 1);
        renderCMSPage();
      });
    });

    // Add bullet
    container.querySelectorAll('.cms-svc-add-li').forEach(btn => {
      btn.addEventListener('click', () => {
        services.blocks[parseInt(btn.dataset.bidx)].listItems.push({ bold: '', text: '' });
        renderCMSPage();
      });
    });

    // Move block up/down
    container.querySelectorAll('[data-move-svc-up]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const b = parseInt(btn.dataset.moveSvcUp);
        if (b > 0) {
          [services.blocks[b - 1], services.blocks[b]] = [services.blocks[b], services.blocks[b - 1]];
          renderCMSPage();
        }
      });
    });
    container.querySelectorAll('[data-move-svc-down]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const b = parseInt(btn.dataset.moveSvcDown);
        if (b < services.blocks.length - 1) {
          [services.blocks[b], services.blocks[b + 1]] = [services.blocks[b + 1], services.blocks[b]];
          renderCMSPage();
        }
      });
    });

    // Delete block
    container.querySelectorAll('.cms-svc-delete').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const b = parseInt(btn.dataset.deleteSvc);
        const title = services.blocks[b]?.title || 'block';
        services.blocks.splice(b, 1);
        renderCMSPage();
        showCMSToast(`"${title}" deleted — Discard Changes to undo`);
      });
    });

    // Add block
    document.getElementById('cms-svc-add-block')?.addEventListener('click', () => {
      services.blocks.push({
        id: 'svc-' + Date.now(),
        title: 'New Service',
        description: '',
        image: '',
        listHeading: 'What We Do',
        listItems: [],
        resultTitle: 'The Result',
        resultText: ''
      });
      renderCMSPage();
    });

    // Wire drop zones
    wireDropZones(container);
  }

  /* ═══════════════════════════════════════════════════
     ABOUT US PAGE EDITOR
     ═══════════════════════════════════════════════════ */
  function renderCMSAbout(container) {
    const about = cmsDraft?.pages?.about;
    if (!about) {
      container.innerHTML = '<p style="color:var(--color-steel-400);">No about page data found. Publish defaults first.</p>';
      return;
    }

    let html = '';

    // ── Hero ──
    html += `
      <div class="cms-block">
        <div class="cms-block__header">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="12 2 22 8.5 22 15.5 12 22 2 15.5 2 8.5 12 2"/></svg>
          Hero Section
        </div>
        <div class="admin-field">
          <label>Chip Text</label>
          <input type="text" value="${about.hero?.chip || ''}" data-cms-about-path="hero.chip" />
        </div>
        <div class="admin-field">
          <label>Title</label>
          <input type="text" value="${about.hero?.title || ''}" data-cms-about-path="hero.title" />
        </div>
        <div class="admin-field">
          <label>Description</label>
          <textarea data-cms-about-path="hero.description" rows="3">${about.hero?.description || ''}</textarea>
        </div>
      </div>
    `;

    // ── Media grid ──
    const mg = about.mediaGrid || {};
    html += `
      <div class="cms-block">
        <div class="cms-block__header">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="m21 15-5-5L5 21"/></svg>
          Media Grid Images
        </div>
        <div class="admin-form-grid cols-2">
          <div class="admin-field">
            <label>Image 1 (Top Right)</label>
            <div class="cms-drop-zone" data-cms-field="mediaGrid.image1">
              <div class="cms-drop-zone__preview" style="background-image:url(${mg.image1 || ''});"></div>
              <div class="cms-drop-zone__overlay"><span>Drop image or click</span></div>
              <input type="file" accept="image/*" class="cms-drop-zone__input" />
            </div>
          </div>
          <div class="admin-field">
            <label>Image 2 (Bottom Right)</label>
            <div class="cms-drop-zone" data-cms-field="mediaGrid.image2">
              <div class="cms-drop-zone__preview" style="background-image:url(${mg.image2 || ''});"></div>
              <div class="cms-drop-zone__overlay"><span>Drop image or click</span></div>
              <input type="file" accept="image/*" class="cms-drop-zone__input" />
            </div>
          </div>
        </div>
      </div>
    `;

    // ── Methodology ──
    const meth = about.methodology || {};
    html += `
      <div class="cms-block">
        <div class="cms-block__header">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 20V10"/><path d="M18 20V4"/><path d="M6 20v-4"/></svg>
          Methodology Section
        </div>
        <div class="admin-form-grid cols-2">
          <div class="admin-field">
            <label>Title</label>
            <input type="text" value="${meth.sectionTitle || ''}" data-cms-about-path="methodology.sectionTitle" />
          </div>
          <div class="admin-field">
            <label>Description</label>
            <textarea data-cms-about-path="methodology.sectionDescription" rows="2">${meth.sectionDescription || ''}</textarea>
          </div>
        </div>
      </div>
    `;

    // ── Team ──
    const team = about.team || {};
    html += `
      <div class="cms-block">
        <div class="cms-block__header">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
          Team Members
        </div>
        <div class="admin-form-grid cols-2">
          <div class="admin-field">
            <label>Section Title</label>
            <input type="text" value="${team.sectionTitle || ''}" data-cms-about-path="team.sectionTitle" />
          </div>
          <div class="admin-field">
            <label>Section Description</label>
            <textarea data-cms-about-path="team.sectionDescription" rows="2">${team.sectionDescription || ''}</textarea>
          </div>
        </div>
        <div class="cms-items-grid">
          ${(team.members || []).map((m, i) => `
            <div class="cms-item-card" data-iidx="${i}">
              <div class="cms-drop-zone cms-item-drop" data-sidx="0" data-iidx="${i}">
                <div class="cms-drop-zone__preview" style="background-image:url(${m.photo || ''});"></div>
                <div class="cms-drop-zone__overlay"><span>Drop photo</span></div>
                <input type="file" accept="image/*" class="cms-drop-zone__input" />
              </div>
              <div class="cms-item-card__controls">
                <button class="cms-reorder-btn cms-team-move" data-dir="left" data-idx="${i}" title="Move Left" ${i === 0 ? 'disabled' : ''}>←</button>
                <button class="cms-reorder-btn cms-team-move" data-dir="right" data-idx="${i}" title="Move Right" ${i >= (team.members || []).length - 1 ? 'disabled' : ''}>→</button>
                <button class="cms-team-delete" data-idx="${i}" title="Delete">✕</button>
              </div>
              <div class="cms-item-card__fields">
                <input type="text" value="${m.name || ''}" placeholder="Name" class="cms-team-field" data-idx="${i}" data-field="name" />
                <input type="text" value="${m.role || ''}" placeholder="Role/Title" class="cms-team-field" data-idx="${i}" data-field="role" />
                <textarea placeholder="Short bio" class="cms-team-field" data-idx="${i}" data-field="description" rows="2">${m.description || ''}</textarea>
              </div>
            </div>
          `).join('')}
          <div class="cms-item-add" id="cms-about-add-member">
            <span>+</span>
            <span>Add Member</span>
          </div>
        </div>
      </div>
    `;

    container.innerHTML = html;
    wireCMSAboutEvents(container);
  }

  function wireCMSAboutEvents(container) {
    const about = cmsDraft.pages.about;

    // Generic path fields
    container.querySelectorAll('[data-cms-about-path]').forEach(el => {
      el.addEventListener('input', () => {
        const parts = el.dataset.cmsAboutPath.split('.');
        let obj = about;
        for (let k = 0; k < parts.length - 1; k++) obj = obj[parts[k]];
        obj[parts[parts.length - 1]] = el.value;
      });
    });

    // Team fields
    container.querySelectorAll('.cms-team-field').forEach(el => {
      el.addEventListener('input', () => {
        about.team.members[parseInt(el.dataset.idx)][el.dataset.field] = el.value;
      });
    });

    // Team move
    container.querySelectorAll('.cms-team-move').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const i = parseInt(btn.dataset.idx);
        const members = about.team.members;
        if (btn.dataset.dir === 'left' && i > 0) {
          [members[i - 1], members[i]] = [members[i], members[i - 1]];
          renderCMSPage();
        } else if (btn.dataset.dir === 'right' && i < members.length - 1) {
          [members[i], members[i + 1]] = [members[i + 1], members[i]];
          renderCMSPage();
        }
      });
    });

    // Team delete
    container.querySelectorAll('.cms-team-delete').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const i = parseInt(btn.dataset.idx);
        const name = about.team.members[i]?.name || 'member';
        about.team.members.splice(i, 1);
        renderCMSPage();
        showCMSToast(`"${name}" deleted — Discard Changes to undo`);
      });
    });

    // Add member
    document.getElementById('cms-about-add-member')?.addEventListener('click', () => {
      about.team.members.push({
        id: 'team-' + Date.now(),
        photo: '',
        name: 'New Member',
        role: 'Role',
        description: '',
        accentColor: 'var(--color-electric)'
      });
      renderCMSPage();
    });

    // Wire drop zones
    wireDropZones(container);
  }

  /* ═══════════════════════════════════════════════════
     SHARED: Wire drop zones for any page
     ═══════════════════════════════════════════════════ */
  function wireDropZones(container) {
    container.querySelectorAll('.cms-drop-zone').forEach(zone => {
      const fileInput = zone.querySelector('.cms-drop-zone__input');
      const preview = zone.querySelector('.cms-drop-zone__preview');

      zone.addEventListener('click', (e) => {
        if (e.target === fileInput) return;
        fileInput.click();
      });

      zone.addEventListener('dragover', e => { e.preventDefault(); zone.classList.add('dragover'); });
      zone.addEventListener('dragleave', () => zone.classList.remove('dragover'));
      zone.addEventListener('drop', e => {
        e.preventDefault();
        zone.classList.remove('dragover');
        const file = e.dataTransfer.files[0];
        if (file && file.type.startsWith('image/')) processImageFile(file, zone, preview);
      });

      fileInput.addEventListener('change', () => {
        const file = fileInput.files[0];
        if (file) processImageFile(file, zone, preview);
      });
    });
  }

  function renderCMSPortfolio(container) {
    const portfolio = cmsDraft?.pages?.portfolio;
    if (!portfolio) {
      container.innerHTML = '<p style="color:var(--color-steel-400);">No portfolio data found.</p>';
      return;
    }

    let html = '';

    // Hero section
    html += `
      <div class="cms-block">
        <div class="cms-block__header">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="12 2 22 8.5 22 15.5 12 22 2 15.5 2 8.5 12 2"/></svg>
          Hero Section
        </div>
        <div class="admin-form-grid cols-2">
          <div class="admin-field">
            <label>Page Title</label>
            <input type="text" value="${portfolio.hero?.title || ''}" data-cms-hero="title" />
          </div>
          <div class="admin-field">
            <label>Hero Background Image</label>
            <div class="cms-drop-zone" data-cms-hero-img="backgroundImage">
              <div class="cms-drop-zone__preview" style="background-image:url(${portfolio.hero?.backgroundImage || ''});"></div>
              <div class="cms-drop-zone__overlay">
                <span>Drop image or click</span>
              </div>
              <input type="file" accept="image/*" class="cms-drop-zone__input" />
            </div>
          </div>
        </div>
        <div class="admin-field">
          <label>Subtitle</label>
          <textarea data-cms-hero="subtitle" rows="2">${portfolio.hero?.subtitle || ''}</textarea>
        </div>
      </div>
    `;

    // Sections
    portfolio.sections?.forEach((section, sIdx) => {
      html += `
        <div class="cms-block" data-section-idx="${sIdx}">
          <div class="cms-block__header">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>
            Section: ${section.title}
            <div class="cms-header-controls">
              <button class="cms-reorder-btn" data-move-section-up="${sIdx}" title="Move Up" ${sIdx === 0 ? 'disabled' : ''}>↑</button>
              <button class="cms-reorder-btn" data-move-section-down="${sIdx}" title="Move Down" ${sIdx === portfolio.sections.length - 1 ? 'disabled' : ''}>↓</button>
              <button class="cms-section-delete" data-delete-section="${sIdx}" title="Delete Section">✕</button>
            </div>
          </div>
          <div class="admin-form-grid cols-2">
            <div class="admin-field">
              <label>Section Title</label>
              <input type="text" value="${section.title}" data-cms-section="title" data-sidx="${sIdx}" />
            </div>
            <div class="admin-field">
              <label>Section Description</label>
              <textarea data-cms-section="description" data-sidx="${sIdx}" rows="2">${section.description}</textarea>
            </div>
          </div>
          <div class="cms-items-grid">
            ${section.items.map((item, iIdx) => renderCMSItemCard(item, sIdx, iIdx, section.items.length)).join('')}
            <div class="cms-item-add" data-add-item="${sIdx}">
              <span>+</span>
              <span>Add Item</span>
            </div>
          </div>
        </div>
      `;
    });

    // Add Section button
    html += `
      <button class="cms-add-section-btn" id="cms-add-section">
        + Add New Section
      </button>
    `;

    container.innerHTML = html;

    // Wire all events
    wireCMSEvents(container);
  }

  function renderCMSItemCard(item, sIdx, iIdx, totalItems) {
    return `
      <div class="cms-item-card" data-sidx="${sIdx}" data-iidx="${iIdx}">
        <div class="cms-drop-zone cms-item-drop" data-sidx="${sIdx}" data-iidx="${iIdx}">
          <div class="cms-drop-zone__preview" style="background-image:url(${item.image});"></div>
          <div class="cms-drop-zone__overlay">
            <span>Drop to replace</span>
          </div>
          <input type="file" accept="image/*" class="cms-drop-zone__input" />
        </div>
        <div class="cms-item-card__controls">
          <button class="cms-reorder-btn cms-item-move" data-move-item-left data-sidx="${sIdx}" data-iidx="${iIdx}" title="Move Left" ${iIdx === 0 ? 'disabled' : ''}>←</button>
          <button class="cms-reorder-btn cms-item-move" data-move-item-right data-sidx="${sIdx}" data-iidx="${iIdx}" title="Move Right" ${iIdx >= totalItems - 1 ? 'disabled' : ''}>→</button>
          <button class="cms-item-delete" data-sidx="${sIdx}" data-iidx="${iIdx}" title="Delete Item">✕</button>
        </div>
        <div class="cms-item-card__fields">
          <input type="text" value="${item.title || ''}" placeholder="Title" class="cms-item-title" data-sidx="${sIdx}" data-iidx="${iIdx}" />
          <textarea placeholder="Description" class="cms-item-desc" data-sidx="${sIdx}" data-iidx="${iIdx}" rows="2">${item.description || ''}</textarea>
          <input type="text" value="${(item.tags || []).join(', ')}" placeholder="Tags (comma-separated)" class="cms-item-tags" data-sidx="${sIdx}" data-iidx="${iIdx}" />
        </div>
      </div>
    `;
  }

  function wireCMSEvents(container) {
    const portfolio = cmsDraft.pages.portfolio;

    // Hero text fields
    container.querySelectorAll('[data-cms-hero]').forEach(el => {
      el.addEventListener('input', () => {
        portfolio.hero[el.dataset.cmsHero] = el.value;
      });
    });

    // Section text fields
    container.querySelectorAll('[data-cms-section]').forEach(el => {
      el.addEventListener('input', () => {
        const sIdx = parseInt(el.dataset.sidx);
        portfolio.sections[sIdx][el.dataset.cmsSection] = el.value;
      });
    });

    // Item fields
    container.querySelectorAll('.cms-item-title').forEach(el => {
      el.addEventListener('input', () => {
        const s = parseInt(el.dataset.sidx), i = parseInt(el.dataset.iidx);
        portfolio.sections[s].items[i].title = el.value;
        portfolio.sections[s].items[i].alt = el.value;
      });
    });
    container.querySelectorAll('.cms-item-desc').forEach(el => {
      el.addEventListener('input', () => {
        const s = parseInt(el.dataset.sidx), i = parseInt(el.dataset.iidx);
        portfolio.sections[s].items[i].description = el.value;
      });
    });
    container.querySelectorAll('.cms-item-tags').forEach(el => {
      el.addEventListener('input', () => {
        const s = parseInt(el.dataset.sidx), i = parseInt(el.dataset.iidx);
        portfolio.sections[s].items[i].tags = el.value.split(',').map(t => t.trim()).filter(Boolean);
      });
    });

    // Drag-and-drop zones
    container.querySelectorAll('.cms-drop-zone').forEach(zone => {
      const fileInput = zone.querySelector('.cms-drop-zone__input');
      const preview = zone.querySelector('.cms-drop-zone__preview');

      // Click to select
      zone.addEventListener('click', (e) => {
        if (e.target === fileInput) return;
        fileInput.click();
      });

      // Drag events
      zone.addEventListener('dragover', e => { e.preventDefault(); zone.classList.add('dragover'); });
      zone.addEventListener('dragleave', () => zone.classList.remove('dragover'));
      zone.addEventListener('drop', e => {
        e.preventDefault();
        zone.classList.remove('dragover');
        const file = e.dataTransfer.files[0];
        if (file && file.type.startsWith('image/')) processImageFile(file, zone, preview);
      });

      // File input change
      fileInput.addEventListener('change', () => {
        const file = fileInput.files[0];
        if (file) processImageFile(file, zone, preview);
      });
    });

    // Delete item — single click delete (use Discard Changes to undo)
    container.querySelectorAll('.cms-item-delete').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        e.preventDefault();
        const s = parseInt(btn.dataset.sidx), i = parseInt(btn.dataset.iidx);
        const title = portfolio.sections[s]?.items[i]?.title || 'item';
        portfolio.sections[s].items.splice(i, 1);
        renderCMSPage();
        showCMSToast(`"${title}" deleted — Discard Changes to undo`);
      });
    });

    // Delete section — single click delete
    container.querySelectorAll('.cms-section-delete').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const s = parseInt(btn.dataset.deleteSection);
        const title = portfolio.sections[s]?.title || 'section';
        portfolio.sections.splice(s, 1);
        renderCMSPage();
        showCMSToast(`Section "${title}" deleted — Discard Changes to undo`);
      });
    });

    // Move item left / right
    container.querySelectorAll('[data-move-item-left]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const s = parseInt(btn.dataset.sidx), i = parseInt(btn.dataset.iidx);
        if (i > 0) {
          const items = portfolio.sections[s].items;
          [items[i - 1], items[i]] = [items[i], items[i - 1]];
          renderCMSPage();
        }
      });
    });
    container.querySelectorAll('[data-move-item-right]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const s = parseInt(btn.dataset.sidx), i = parseInt(btn.dataset.iidx);
        const items = portfolio.sections[s].items;
        if (i < items.length - 1) {
          [items[i], items[i + 1]] = [items[i + 1], items[i]];
          renderCMSPage();
        }
      });
    });

    // Move section up / down
    container.querySelectorAll('[data-move-section-up]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const s = parseInt(btn.dataset.moveSectionUp);
        if (s > 0) {
          [portfolio.sections[s - 1], portfolio.sections[s]] = [portfolio.sections[s], portfolio.sections[s - 1]];
          renderCMSPage();
        }
      });
    });
    container.querySelectorAll('[data-move-section-down]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const s = parseInt(btn.dataset.moveSectionDown);
        if (s < portfolio.sections.length - 1) {
          [portfolio.sections[s], portfolio.sections[s + 1]] = [portfolio.sections[s + 1], portfolio.sections[s]];
          renderCMSPage();
        }
      });
    });

    // Add item
    container.querySelectorAll('.cms-item-add').forEach(btn => {
      btn.addEventListener('click', () => {
        const s = parseInt(btn.dataset.addItem);
        const newId = 'item-' + Date.now();
        portfolio.sections[s].items.push({
          id: newId,
          image: '',
          alt: 'New Item',
          title: 'New Item',
          description: '',
          tags: []
        });
        renderCMSPage();
      });
    });

    // Add section
    document.getElementById('cms-add-section')?.addEventListener('click', () => {
      portfolio.sections.push({
        id: 'section-' + Date.now(),
        title: 'New Section',
        description: 'Section description...',
        items: []
      });
      renderCMSPage();
    });
  }

  function processImageFile(file, zone, preview) {
    const reader = new FileReader();
    reader.onload = (e) => {
      const dataUri = e.target.result;
      preview.style.backgroundImage = `url(${dataUri})`;
      zone.classList.add('has-image');

      // Update the data model — page-aware
      const page = cmsDraft.pages[cmsActivePage];
      if (!page) return;

      if (zone.dataset.cmsHeroImg) {
        page.hero[zone.dataset.cmsHeroImg] = dataUri;
      } else if (zone.dataset.cmsField) {
        // Generic field path e.g. "mergerCards.west.image"
        const parts = zone.dataset.cmsField.split('.');
        let obj = page;
        for (let k = 0; k < parts.length - 1; k++) obj = obj[parts[k]];
        obj[parts[parts.length - 1]] = dataUri;
      } else if (zone.dataset.sidx !== undefined && zone.dataset.iidx !== undefined) {
        const s = parseInt(zone.dataset.sidx), i = parseInt(zone.dataset.iidx);
        if (cmsActivePage === 'portfolio') {
          page.sections[s].items[i].image = dataUri;
        } else if (cmsActivePage === 'home') {
          page.capabilities.cards[i].image = dataUri;
        } else if (cmsActivePage === 'services') {
          page.blocks[s].image = dataUri;
        } else if (cmsActivePage === 'about') {
          page.team.members[i].photo = dataUri;
        }
      }
    };
    reader.readAsDataURL(file);
  }

  
  // ═══════════════════════════════════════════════════════════
  //  C U S T O M E R S   C R M
  // ═══════════════════════════════════════════════════════════
  let adminCustomerFilters = {
    search: ''
  };

  function renderCustomersTable() {
    let filtered = loadedCustomers.filter(c => {
      let match = true;
      if (adminCustomerFilters.search) {
        const q = adminCustomerFilters.search.toLowerCase();
        match = (c.first_name || '').toLowerCase().includes(q) || 
                (c.last_name || '').toLowerCase().includes(q) || 
                (c.company || '').toLowerCase().includes(q) || 
                (c.email || '').toLowerCase().includes(q);
      }
      return match;
    });

    const rows = filtered.map(c => {
      const tier = c.tier || 'basic';
      const tierClass = tier.toLowerCase() === 'professional' ? 'tag-tier1' : tier.toLowerCase() === 'enterprise' ? 'tag-oem' : 'tag-tier2';
      const dateJoined = new Date(c.created_at || Date.now()).toLocaleDateString();

      return `
      <tr>
        <td>
          <strong>${c.first_name || ''} ${c.last_name || ''}</strong><br>
          <span style="font-size:12px; color:var(--color-steel-400);">${c.email || '—'}</span>
        </td>
        <td>${c.company || '—'}</td>
        <td>${c.job_title || '—'}</td>
        <td><span class="tag-segment ${tierClass}" style="text-transform: capitalize;">${tier}</span></td>
        <td>${dateJoined}</td>
        <td class="admin-table-actions">
          <button class="admin-action-btn admin-view-customer" data-id="${c.id}">Manage User</button>
        </td>
      </tr>`;
    }).join('');

    const tableHTML = `
        <div class="admin-toolbar glass-panel">
          <div class="admin-toolbar-search">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
            <input type="text" id="admin-cust-search" placeholder="Search customers by name, company, email..." value="${adminCustomerFilters.search}">
          </div>
          <button class="btn btn-secondary" onclick="alert('Feature coming soon: Export billing history')">Export Billing</button>
        </div>

        <div class="admin-table-container glass-panel">
          <table class="admin-table">
            <thead><tr>
              <th>Customer</th>
              <th>Company</th>
              <th>Job Title</th>
              <th>Account Tier</th>
              <th>Join Date</th>
              <th>Actions</th>
            </tr></thead>
            <tbody>${rows || '<tr><td colspan="6" style="text-align:center;padding:40px;">No customers found.</td></tr>'}</tbody>
          </table>
        </div>
    `;
    
    contentRouting.innerHTML = tableHTML;

    // Handlers
    document.getElementById('admin-cust-search')?.addEventListener('input', e => {
      adminCustomerFilters.search = e.target.value;
      renderCustomersTable();
      const input = document.getElementById('admin-cust-search');
      if (input) { input.focus(); input.setSelectionRange(input.value.length, input.value.length); }
    });

    document.querySelectorAll('.admin-view-customer').forEach(btn => {
      btn.addEventListener('click', () => openCustomerModal(btn.dataset.id));
    });
  }

  async function openCustomerModal(id) {
    const cust = loadedCustomers.find(c => c.id === id);
    if (!cust) return;

    // Fetch their RFQ history simply to show activity stats
    let rfqCount = 0;
    try {
      const { count } = await supabase.from('rfq_history').select('*', { count: 'exact', head: true }).eq('user_id', id);
      rfqCount = count || 0;
    } catch(e) {}

    const modalHTML = `
      <div id="admin-cust-modal" class="admin-modal-overlay">
        <div class="admin-modal-content" style="max-width: 600px;">
          <header class="admin-modal-header">
            <h3>Manage Customer: ${cust.first_name || ''} ${cust.last_name || ''}</h3>
            <button class="admin-modal-close" onclick="document.getElementById('admin-cust-modal').remove()">×</button>
          </header>
          
          <div class="admin-modal-body" style="display: flex; flex-direction: column; gap: 24px;">
            <!-- Profile Info -->
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px; background: rgba(0,0,0,0.1); padding: 16px; border-radius: 8px;">
              <div><strong>Email:</strong> <span style="color:var(--color-slate-400);">${cust.email || '—'}</span></div>
              <div><strong>Phone:</strong> <span style="color:var(--color-slate-400);">${cust.phone || '—'}</span></div>
              <div><strong>Company:</strong> <span style="color:var(--color-slate-400);">${cust.company || '—'}</span></div>
              <div><strong>Job Title:</strong> <span style="color:var(--color-slate-400);">${cust.job_title || '—'}</span></div>
              <div><strong>Address:</strong> <span style="color:var(--color-slate-400);">${cust.address || '—'}</span></div>
              <div><strong>Age:</strong> <span style="color:var(--color-slate-400);">${cust.age || '—'}</span></div>
              <div><strong>Gender:</strong> <span style="color:var(--color-slate-400); text-transform: capitalize;">${cust.gender || '—'}</span></div>
            </div>
            <!-- Activity -->
            <div style="border-left: 3px solid var(--color-emerald); padding-left: 16px;">
              <h4 style="margin-bottom: 8px; color: #fff;">Account Activity</h4>
              <p style="color: var(--color-slate-400); font-size: 14px;">This user has generated <strong>${rfqCount}</strong> RFQs/quotes in the system.</p>
            </div>

             <!-- Subscription Tier Management -->
            <div class="admin-form-group">
              <label>Subscription Tier Allocation</label>
              <select id="cust-tier-select" class="admin-input">
                <option value="basic" ${cust.tier === 'basic' || !cust.tier ? 'selected' : ''}>Basic (Free)</option>
                <option value="professional" ${cust.tier === 'professional' ? 'selected' : ''}>Professional ($49/mo)</option>
                <option value="enterprise" ${cust.tier === 'enterprise' ? 'selected' : ''}>Enterprise (Custom)</option>
              </select>
              <small style="color:var(--color-slate-400); display:block; margin-top:8px;">Modifying this will instantly restrict or grant access to the Supplier Globe and Product Builder tools on the user's end.</small>
            </div>

            <!-- Internal Notes / Billing History Mockup -->
            <div class="admin-form-group">
              <label>Billing & Admin Notes</label>
              <textarea id="cust-admin-notes" class="admin-input" rows="3" placeholder="Enter manual billing refs, stripe ids, or notes..."></textarea>
              <small style="color:var(--color-slate-400); display:block; margin-top:8px;">These notes are only visible to SysAdmins.</small>
            </div>

          </div>
          
          <footer class="admin-modal-footer" style="justify-content: space-between;">
            <button class="btn btn-secondary" style="color: #ef4444; border-color: rgba(239,68,68,0.3);" onclick="if(confirm('Suspend account? User will not be able to log in.')){ alert('Account suspended'); document.getElementById('admin-cust-modal').remove(); }">Suspend Account</button>
            <div style="display:flex; gap:12px;">
              <button class="btn btn-secondary" onclick="document.getElementById('admin-cust-modal').remove()">Cancel</button>
              <button class="btn btn-primary" id="cust-save-btn">Save Changes</button>
            </div>
          </footer>
        </div>
      </div>
    `;

    document.body.insertAdjacentHTML('beforeend', modalHTML);

    document.getElementById('cust-save-btn')?.addEventListener('click', async (e) => {
      const btn = e.target;
      const originalText = btn.textContent;
      btn.textContent = 'Saving...';
      const newTier = document.getElementById('cust-tier-select').value;
      
      const { error } = await supabase.from('profiles').update({ tier: newTier }).eq('id', id);
      
      if(error) {
        console.error(error);
        alert('Failed to update customer tier.');
        btn.textContent = originalText;
      } else {
        cust.tier = newTier;
        btn.textContent = 'Saved!';
        renderCustomersTable(); // Refresh the table behind modal
        setTimeout(() => document.getElementById('admin-cust-modal')?.remove(), 800);
      }
    });
  }


  // ═══════════════════════════════════════════════════════════
  //  S T A F F   T A B L E
  // ═══════════════════════════════════════════════════════════
  function renderStaffTable() {
    contentRouting.innerHTML = `
      <div class="admin-table-controls">
        <button class="btn btn-primary" id="admin-staff-add">+ Add Staff Member</button>
      </div>
      <div class="admin-table-container">
        <table class="admin-table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Email</th>
              <th>Role</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            ${loadedStaff.map(s => `
              <tr>
                <td>${s.name}</td>
                <td>${s.email}</td>
                <td><span class="tag-segment tag-tier1" style="background:rgba(59, 130, 246, 0.1);color:#3b82f6;">${s.role}</span></td>
                <td class="admin-table-actions"><div class="admin-table-actions-wrapper">
                  <button class="admin-action-btn edit" data-id="${s.id}" title="Edit Staff">✎</button>
                  <button class="admin-action-btn delete" data-id="${s.id}" title="Delete Staff">🗑</button>
                </div></td>
              </tr>
            `).join('')}
            ${loadedStaff.length === 0 ? '<tr><td colspan="4" style="text-align:center;color:var(--color-steel-400);">No staff members found.</td></tr>' : ''}
          </tbody>
        </table>
      </div>
    `;

    document.getElementById('admin-staff-add')?.addEventListener('click', () => {
      renderStaffForm(null);
    });

    contentRouting.querySelectorAll('.admin-action-btn.edit').forEach(btn => {
      btn.addEventListener('click', e => {
        const id = e.currentTarget.dataset.id;
        const staff = loadedStaff.find(s => s.id === id);
        if (staff) renderStaffForm(staff);
      });
    });

    contentRouting.querySelectorAll('.admin-action-btn.delete').forEach(btn => {
      btn.addEventListener('click', async e => {
        const id = e.currentTarget.dataset.id;
        if (confirm('Are you sure you want to completely remove this staff account?')) {
          try {
            await fetch('/api/staff?id=' + id, { method: 'DELETE' });
            await loadCRMData();
            renderStaffTable();
            showCMSToast('Staff member removed');
          } catch(err) {
            alert('Failed to delete staff member');
          }
        }
      });
    });
  }

  function renderStaffForm(existing) {
    const s = existing || {};
    contentRouting.innerHTML = `
      <div class="admin-form-container">
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom: 24px;">
          <h3>${existing ? 'Edit Staff Account' : 'New Staff Account'}</h3>
          <button class="btn btn-secondary" id="admin-staff-back">Back to Directory</button>
        </div>
        <form class="admin-form" id="admin-staff-form">
          <input type="hidden" name="id" value="${s.id || ''}">
          <div class="admin-form-section">
            <div class="admin-form-grid cols-2">
              <div class="admin-field">
                <label>Full Name <span class="req">*</span></label>
                <input type="text" name="name" value="${s.name || ''}" required placeholder="Sarah Jenkins">
              </div>
              <div class="admin-field">
                <label>Email Address <span class="req">*</span></label>
                <input type="email" name="email" value="${s.email || ''}" required placeholder="sarah@atlasdt.com">
              </div>
              <div class="admin-field">
                <label>New Password ${existing ? '<span class="hint">(Leave blank to keep current)</span>' : '<span class="req">*</span>'}</label>
                <input type="password" name="password" ${existing ? '' : 'required'} placeholder="Enter secure password">
                <input type="hidden" name="old_password" value="${s.password || ''}">
              </div>
              <div class="admin-field">
                <label>Role</label>
                <select name="role" required class="admin-input-filter">
                  <option value="Admin" ${s.role === 'Admin' ? 'selected' : ''}>Admin</option>
                  <option value="Editor" ${s.role === 'Editor' ? 'selected' : ''}>Editor</option>
                  <option value="Viewer" ${s.role === 'Viewer' ? 'selected' : ''}>Viewer</option>
                </select>
              </div>
            </div>
          </div>
          <div class="admin-form-actions">
            <button type="submit" class="btn btn-primary">${existing ? 'Save Changes' : 'Create Staff'}</button>
          </div>
        </form>
      </div>
    `;

    document.getElementById('admin-staff-back')?.addEventListener('click', renderStaffTable);
    
    document.getElementById('admin-staff-form')?.addEventListener('submit', async e => {
      e.preventDefault();
      const fd = new FormData(e.target);
      const payload = {
        id: fd.get('id') || 'staff-' + Date.now(),
        name: fd.get('name'),
        email: fd.get('email'),
        role: fd.get('role'),
        password: fd.get('password') || fd.get('old_password')
      };

      try {
        await supabase.from('staff').upsert(payload);
        await loadCRMData();
        renderStaffTable();
        showCMSToast('Staff member saved successfully');
      } catch(err) {
        alert('Failed to save staff member');
      }
    });
  }

  // ═══════════════════════════════════════════════════════════
  //  T A X O N O M Y   I M A G E   C U R A T O R
  // ═══════════════════════════════════════════════════════════
  let curatorTaxonomy = [];
  let curatorSearchOffset = 0;
  let curatorSelectedTechId = '';
  let _curatorImageCache = [];
  let _visibilityMap = {}; // id → boolean

  async function fetchCuratorTaxonomy() {
    // Load taxonomy from static JSON
    try {
      const res = await fetch('/data/taxonomy/master_taxonomy_enriched.json');
      if (!res.ok) throw new Error('Cannot fetch taxonomy JSON');
      const data = await res.json();
      curatorTaxonomy = data.technologies || [];
    } catch (e) {
      console.error('Cannot load taxonomy:', e);
      curatorTaxonomy = [];
      return;
    }

    // Merge images stored in Supabase (additions made via the curator)
    try {
      const mRes = await fetch('/.netlify/functions/curator-manage', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'list' })
      });
      if (mRes.ok) {
        const { images: dbImages } = await mRes.json();
        if (dbImages && dbImages.length > 0) {
          const byTech = {};
          dbImages.forEach(row => {
            if (!byTech[row.tech_id]) byTech[row.tech_id] = [];
            byTech[row.tech_id].push(row.image_url);
          });
          curatorTaxonomy.forEach(tech => {
            if (byTech[tech.id]) {
              const existing = new Set(tech.images || []);
              byTech[tech.id].forEach(url => existing.add(url));
              tech.images = [...existing];
            }
          });
        }
      }
    } catch (e) {
      console.warn('Could not merge Supabase images:', e);
    }

    // Load visibility state
    try {
      const vRes = await fetch('/.netlify/functions/taxonomy-visibility');
      if (vRes.ok) {
        const vData = await vRes.json();
        _visibilityMap = {};
        vData.forEach(row => { _visibilityMap[row.id] = row.enabled; });
      }
    } catch (e) {
      console.warn('Could not load visibility:', e);
    }
  }

  function renderTaxonomyImages() {
    fetchCuratorTaxonomy().then(() => {
      const categories = [...new Set(curatorTaxonomy.map(t => t.category))].sort();

      contentRouting.innerHTML = `
        <div style="max-width:1200px;">
          <p style="color:var(--color-steel-400); margin-bottom:24px;">
            Select a technology from the taxonomy, generate candidate images via Serper API, and add the best ones to the taxonomy JSON.
          </p>

          <div style="display:flex; gap:16px; margin-bottom:32px; align-items:flex-end; flex-wrap:wrap;">
            <div class="admin-field" style="flex:1; min-width:200px;">
              <label>Category</label>
              <select id="curator-category" class="admin-input-filter" style="width:100%;">
                <option value="">Select Category…</option>
                ${categories.map(c => `<option value="${c}">${c}</option>`).join('')}
              </select>
            </div>
            <div class="admin-field" style="flex:2; min-width:250px;">
              <label>Technology</label>
              <select id="curator-tech" class="admin-input-filter" style="width:100%;" disabled>
                <option value="">Select a category first…</option>
              </select>
            </div>
            <div class="admin-field" style="flex:2; min-width:200px;">
              <label>Extra Keywords <span class="hint">(optional — refine the search)</span></label>
              <input type="text" id="curator-keywords" class="admin-input-filter" style="width:100%;" placeholder="e.g. macro photo, texture, CNC, factory floor…">
            </div>
            <div class="admin-field" style="min-width:160px;">
              <label>Search Mode</label>
              <select id="curator-mode" class="admin-input-filter" style="width:100%;">
                <option value="product" selected>🎯 Product / Outcome</option>
                <option value="process">⚙️ Process / Factory</option>
              </select>
            </div>
            <div style="display:flex; gap:8px; padding-bottom: 8px;">
              <button class="btn btn-primary" id="curator-generate" disabled>Generate Images</button>
            </div>
          </div>

          <!-- ══ TECH DETAIL VIEW (hidden until tech selected) ══ -->
          <div id="curator-tech-detail" style="display:none;">

            <button id="curator-back-btn" class="btn btn-secondary" style="margin-bottom:24px; display:inline-flex; align-items:center; gap:8px; font-size:var(--text-sm);">← Back to Taxonomy</button>

          <!-- Manual Add Section -->
          <div style="display:flex; gap:16px; margin-bottom:32px; padding:20px; border:1px solid var(--color-slate-800); border-radius:var(--radius-md); background:var(--section-bg); flex-wrap:wrap; align-items:flex-end;">
            <div class="admin-field" style="flex:2; min-width:300px;">
              <label>📋 Paste Image URL</label>
              <div style="display:flex; gap:8px;">
                <input type="text" id="curator-manual-url" class="admin-input-filter" style="flex:1;" placeholder="https://example.com/image.jpg">
                <button class="btn btn-secondary" id="curator-add-url" style="white-space:nowrap;">Add URL</button>
              </div>
            </div>
            <div class="admin-field" style="flex:1; min-width:200px;">
              <label>📁 Upload Image File</label>
              <div style="display:flex; gap:8px; align-items:center;">
                <input type="file" id="curator-file-upload" accept="image/*" style="font-size:var(--text-sm); color:var(--color-steel-400);">
                <button class="btn btn-secondary" id="curator-upload-btn" style="white-space:nowrap;">Upload</button>
              </div>
            </div>
          </div>

          <div id="curator-current-images" style="margin-bottom:32px;"></div>

          <div id="curator-results" style="margin-bottom:24px;"></div>

          <div id="curator-more-wrap" style="display:none; text-align:center; margin-bottom:32px;">
            <button class="btn btn-secondary" id="curator-more">Generate More</button>
          </div>

          <div id="curator-status" style="color:var(--color-steel-400); font-size:var(--text-sm);"></div>
          </div><!-- end curator-tech-detail -->
        </div>

        <!-- ══ VISIBILITY TOGGLES (only on main view) ══ -->
        <div id="curator-visibility-section" style="max-width:1200px; margin-top:48px; padding-top:32px; border-top:1px solid var(--color-slate-800);">
          <h3 style="color:var(--color-white); font-size:var(--text-lg); font-weight:var(--weight-bold); margin-bottom:8px;">📋 Visibility Manager</h3>
          <p style="color:var(--color-steel-400); margin-bottom:24px; font-size:var(--text-sm);">Control which categories and technologies appear on the public visualizer. Disabled items will be hidden from users but remain in your taxonomy.</p>
          <div id="curator-visibility-toggles"></div>
        </div>
      `;

      renderVisibilityToggles();

      // Wire category → tech dropdown
      document.getElementById('curator-category').addEventListener('change', (e) => {
        const cat = e.target.value;
        const techSelect = document.getElementById('curator-tech');
        const generateBtn = document.getElementById('curator-generate');

        if (!cat) {
          techSelect.innerHTML = '<option value="">Select a category first…</option>';
          techSelect.disabled = true;
          generateBtn.disabled = true;
          return;
        }

        const techs = curatorTaxonomy.filter(t => t.category === cat);
        techSelect.innerHTML = '<option value="">Select Technology…</option>' +
          techs.map(t => {
            const vis = _visibilityMap[t.id];
            const icon = vis === false ? '🔴' : '🟢';
            return `<option value="${t.id}" data-name="${t.name}">${icon} ${t.name} (${t.imageCount} images)</option>`;
          }).join('');
        techSelect.disabled = false;
      });

      document.getElementById('curator-tech').addEventListener('change', (e) => {
        const btn = document.getElementById('curator-generate');
        curatorSelectedTechId = e.target.value;
        btn.disabled = !curatorSelectedTechId;

        const techDetail = document.getElementById('curator-tech-detail');
        const visSection = document.getElementById('curator-visibility-section');

        if (curatorSelectedTechId) {
          // Show tech detail, hide visibility manager
          techDetail.style.display = 'block';
          if (visSection) visSection.style.display = 'none';
          showCurrentImages(curatorSelectedTechId);
        } else {
          // Back to main view
          techDetail.style.display = 'none';
          if (visSection) visSection.style.display = 'block';
          document.getElementById('curator-current-images').innerHTML = '';
          document.getElementById('curator-results').innerHTML = '';
          document.getElementById('curator-more-wrap').style.display = 'none';
          document.getElementById('curator-status').textContent = '';
        }
      });

      document.getElementById('curator-generate').addEventListener('click', () => {
        curatorSearchOffset = 0;
        searchCuratorImages(false, true);  // not append, force refresh
      });

      document.getElementById('curator-more')?.addEventListener('click', () => {
        curatorSearchOffset += 5;
        searchCuratorImages(true, false);  // append, no refresh
      });

      // Back button — reset to main taxonomy view
      document.getElementById('curator-back-btn')?.addEventListener('click', () => {
        curatorSelectedTechId = '';
        document.getElementById('curator-category').value = '';
        const techSelect = document.getElementById('curator-tech');
        techSelect.innerHTML = '<option value="">Select a category first…</option>';
        techSelect.disabled = true;
        document.getElementById('curator-generate').disabled = true;
        document.getElementById('curator-keywords').value = '';

        // Toggle views
        document.getElementById('curator-tech-detail').style.display = 'none';
        const visSection = document.getElementById('curator-visibility-section');
        if (visSection) visSection.style.display = 'block';

        // Clean up
        document.getElementById('curator-current-images').innerHTML = '';
        document.getElementById('curator-results').innerHTML = '';
        document.getElementById('curator-more-wrap').style.display = 'none';
        document.getElementById('curator-status').textContent = '';
        _curatorImageCache = [];
      });

      // Manual URL paste
      document.getElementById('curator-add-url')?.addEventListener('click', async () => {
        const urlInput = document.getElementById('curator-manual-url');
        const url = urlInput?.value?.trim();
        if (!url) { alert('Please paste a URL first'); return; }
        if (!curatorSelectedTechId) { alert('Please select a technology first'); return; }

        const btn = document.getElementById('curator-add-url');
        btn.textContent = 'Adding…';
        btn.disabled = true;

        try {
          const res = await fetch('/.netlify/functions/curator-manage', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'add', techId: curatorSelectedTechId, imageUrl: url })
          });
          if (res.ok) {
            urlInput.value = '';
            await fetchCuratorTaxonomy();
            showCurrentImages(curatorSelectedTechId);
            btn.textContent = '✓ Added!';
            setTimeout(() => { btn.textContent = 'Add URL'; btn.disabled = false; }, 1500);
          } else {
            const err = await res.json();
            alert(err.error || 'Failed to add URL');
            btn.textContent = 'Add URL'; btn.disabled = false;
          }
        } catch(e) {
          alert('Error: ' + e.message);
          btn.textContent = 'Add URL'; btn.disabled = false;
        }
      });

      // File upload to Supabase Storage
      document.getElementById('curator-upload-btn')?.addEventListener('click', async () => {
        const fileInput = document.getElementById('curator-file-upload');
        const file = fileInput?.files?.[0];
        if (!file) { alert('Please select a file first'); return; }
        if (!curatorSelectedTechId) { alert('Please select a technology first'); return; }

        const btn = document.getElementById('curator-upload-btn');
        btn.textContent = 'Uploading…';
        btn.disabled = true;

        try {
          // Upload to Supabase Storage
          const ext = file.name.split('.').pop();
          const fileName = `${curatorSelectedTechId}/${Date.now()}.${ext}`;
          
          const { data, error } = await supabase.storage
            .from('taxonomy-images')
            .upload(fileName, file, { cacheControl: '3600', upsert: false });

          if (error) throw error;

          // Get public URL
          const { data: urlData } = supabase.storage
            .from('taxonomy-images')
            .getPublicUrl(fileName);

          const publicUrl = urlData?.publicUrl;
          if (!publicUrl) throw new Error('Could not get public URL');

          // Add to taxonomy via serverless function
          const res = await fetch('/.netlify/functions/curator-manage', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'add', techId: curatorSelectedTechId, imageUrl: publicUrl })
          });

          if (res.ok) {
            fileInput.value = '';
            await fetchCuratorTaxonomy();
            showCurrentImages(curatorSelectedTechId);
            btn.textContent = '✓ Uploaded!';
            setTimeout(() => { btn.textContent = 'Upload'; btn.disabled = false; }, 1500);
          } else {
            throw new Error('Failed to add image to taxonomy');
          }
        } catch(e) {
          alert('Upload failed: ' + e.message);
          btn.textContent = 'Upload'; btn.disabled = false;
        }
      });
    });
  }

  function showCurrentImages(techId) {
    const tech = curatorTaxonomy.find(t => t.id === techId);
    const container = document.getElementById('curator-current-images');
    if (!tech || !tech.images || tech.images.length === 0) {
      container.innerHTML = `<div style="padding:16px; background:var(--section-bg); border:1px solid var(--color-slate-800); border-radius:var(--radius-md); color:var(--color-steel-400);">No images currently assigned to this technology.</div>`;
      return;
    }

    container.innerHTML = `
      <div style="margin-bottom:12px; font-size:var(--text-sm); font-weight:var(--weight-bold); color:var(--color-white); text-transform:uppercase; letter-spacing:1px;">
        Current Images (${tech.images.length})
      </div>
      <div style="display:grid; grid-template-columns:repeat(auto-fill, minmax(150px, 1fr)); gap:12px;">
        ${tech.images.map(url => `
          <div style="position:relative; border-radius:var(--radius-md); overflow:hidden; border:1px solid var(--color-slate-700); aspect-ratio:1;">
            <img src="${url}" style="width:100%; height:100%; object-fit:cover;" onerror="this.src='https://placehold.co/200x200/1e293b/94a3b8?text=Broken';">
            <button class="curator-remove-img" data-url="${url}" style="position:absolute; top:4px; right:4px; background:rgba(239,68,68,0.9); color:white; border:none; border-radius:50%; width:24px; height:24px; cursor:pointer; font-size:14px; line-height:1; display:flex; align-items:center; justify-content:center;" title="Remove">×</button>
          </div>
        `).join('')}
      </div>
    `;

    container.querySelectorAll('.curator-remove-img').forEach(btn => {
      btn.addEventListener('click', async () => {
        if (!confirm('Remove this image from the taxonomy?')) return;
        btn.textContent = '…';
        try {
          const res = await fetch('/.netlify/functions/curator-manage', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'remove', techId: curatorSelectedTechId, imageUrl: btn.dataset.url })
          });
          if (res.ok) {
            await fetchCuratorTaxonomy();
            showCurrentImages(curatorSelectedTechId);
          }
        } catch (e) { alert('Failed: ' + e.message); }
      });
    });
  }

  async function searchCuratorImages(append = false, forceRefresh = false) {
    const techSelect = document.getElementById('curator-tech');
    const selectedOption = techSelect.options[techSelect.selectedIndex];
    const techName = selectedOption?.dataset?.name || selectedOption?.textContent || '';
    const extraKeywords = document.getElementById('curator-keywords')?.value || '';
    const mode = document.getElementById('curator-mode')?.value || 'product';
    const status = document.getElementById('curator-status');
    const resultsDiv = document.getElementById('curator-results');
    const moreWrap = document.getElementById('curator-more-wrap');

    if (!append) resultsDiv.innerHTML = '';
    const modeLabel = mode === 'product' ? '🎯 Product' : '⚙️ Process';
    const searchLabel = extraKeywords ? `${modeLabel}: "${techName}" + "${extraKeywords}"` : `${modeLabel}: "${techName}"`;

    try {
      // If fresh search or cache empty, fetch from serverless function
      if (forceRefresh || _curatorImageCache.length === 0 || curatorSearchOffset === 0) {
        status.textContent = `Searching for ${searchLabel}…`;

        const res = await fetch('/.netlify/functions/curator-search', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ query: techName, extraKeywords, mode, num: 40 })
        });

        if (!res.ok) throw new Error('Search API returned ' + res.status);
        const data = await res.json();
        _curatorImageCache = data.images || [];
        if (!append) curatorSearchOffset = 0;
      }

      // Paginate from cache
      const batch = _curatorImageCache.slice(curatorSearchOffset, curatorSearchOffset + 5);

      if (batch.length === 0) {
        status.textContent = `No more images available (showed ${curatorSearchOffset} of ${_curatorImageCache.length}). Try different keywords.`;
        moreWrap.style.display = 'none';
        return;
      }

      const shown = curatorSearchOffset + batch.length;
      status.textContent = `Showing ${shown} of ${_curatorImageCache.length} results. Click "Add to Taxonomy" to save.`;
      moreWrap.style.display = (shown < _curatorImageCache.length) ? 'block' : 'none';

      batch.forEach(img => {
        const card = document.createElement('div');
        card.style.cssText = 'display:flex; gap:20px; padding:16px; background:var(--color-midnight); border:1px solid var(--color-slate-800); border-radius:var(--radius-md); margin-bottom:12px; align-items:center;';
        card.innerHTML = `
          <div style="width:200px; height:140px; flex-shrink:0; border-radius:var(--radius-sm); overflow:hidden; border:1px solid var(--color-slate-700); background:#000;">
            <img src="${img.url}" style="width:100%; height:100%; object-fit:cover;" onerror="this.src='https://placehold.co/200x140/1e293b/94a3b8?text=Error';">
          </div>
          <div style="flex:1; min-width:0;">
            <div style="font-weight:var(--weight-semibold); color:var(--color-white); margin-bottom:4px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">${img.title || 'Untitled'}</div>
            <div style="font-size:var(--text-xs); color:var(--color-steel-400); margin-bottom:4px;">${img.source || ''}</div>
            <div style="font-size:var(--text-xs); color:var(--color-steel-500); margin-bottom:12px; word-break:break-all; max-height:40px; overflow:hidden;">${img.url}</div>
            <div style="font-size:var(--text-xs); color:var(--color-steel-500);">${img.width || '?'}×${img.height || '?'}</div>
          </div>
          <button class="btn btn-primary curator-add-btn" data-url="${img.url}" style="flex-shrink:0; padding:10px 16px; font-size:var(--text-sm);">Add to Taxonomy</button>
        `;
        resultsDiv.appendChild(card);
      });

      // Wire add buttons (only for newly added cards)
      resultsDiv.querySelectorAll('.curator-add-btn:not([data-wired])').forEach(btn => {
        btn.setAttribute('data-wired', 'true');
        btn.addEventListener('click', async () => {
          const url = btn.dataset.url;
          btn.textContent = 'Adding…';
          btn.disabled = true;

          try {
            const res = await fetch('/.netlify/functions/curator-manage', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ action: 'add', techId: curatorSelectedTechId, imageUrl: url })
            });

            if (res.ok) {
              btn.textContent = '✓ Added';
              btn.style.background = 'var(--color-emerald)';
              await fetchCuratorTaxonomy();
              showCurrentImages(curatorSelectedTechId);
            } else {
              const err = await res.json();
              btn.textContent = err.error || 'Failed';
              btn.disabled = false;
            }
          } catch (e) {
            btn.textContent = 'Error';
            btn.disabled = false;
          }
        });
      });

    } catch (e) {
      status.textContent = `Error: ${e.message}`;
    }
  }

  // ═══════════════════════════════════════════════════════════
  //  V I S I B I L I T Y   T O G G L E S
  // ═══════════════════════════════════════════════════════════
  function renderVisibilityToggles() {
    const container = document.getElementById('curator-visibility-toggles');
    if (!container) return;

    const categories = [...new Set(curatorTaxonomy.map(t => t.category))].sort();

    let html = '';
    categories.forEach(cat => {
      const catId = 'cat:' + cat;
      const catEnabled = _visibilityMap[catId] !== false;
      const techs = curatorTaxonomy.filter(t => t.category === cat);

      html += `
        <div style="margin-bottom:24px; background:var(--section-bg); border:1px solid var(--color-slate-800); border-radius:var(--radius-md); overflow:hidden;">
          <div style="display:flex; align-items:center; justify-content:space-between; padding:16px 20px; border-bottom:1px solid var(--color-slate-800); background:${catEnabled ? 'transparent' : 'rgba(239,68,68,0.05)'};">
            <div style="font-weight:var(--weight-bold); color:var(--color-white); text-transform:uppercase; letter-spacing:0.5px; font-size:var(--text-sm);">
              ${cat} <span style="font-weight:400; color:var(--color-steel-400); text-transform:none; letter-spacing:0;">(${techs.length} techs)</span>
            </div>
            <label style="display:flex; align-items:center; gap:8px; cursor:pointer; font-size:var(--text-sm); color:${catEnabled ? 'var(--color-emerald)' : 'var(--color-error)'};">
              <span class="vis-status">${catEnabled ? 'Enabled' : 'Disabled'}</span>
              <input type="checkbox" class="vis-toggle" data-id="${catId}" ${catEnabled ? 'checked' : ''}
                style="width:18px; height:18px; accent-color:var(--color-emerald); cursor:pointer;">
            </label>
          </div>
          <div style="padding:12px 20px; display:flex; flex-wrap:wrap; gap:8px;">
            ${techs.map(t => {
              const tEnabled = _visibilityMap[t.id] !== false;
              const imgCount = (t.images || []).length;
              return `
                <div class="vis-chip" data-tech-id="${t.id}" data-cat="${cat}" style="display:flex; align-items:center; gap:6px; padding:6px 12px; background:${tEnabled ? 'var(--color-midnight)' : 'rgba(239,68,68,0.08)'}; border:1px solid ${tEnabled ? 'var(--color-slate-700)' : 'rgba(239,68,68,0.3)'}; border-radius:var(--radius-sm); font-size:var(--text-xs); transition:all 0.2s; cursor:pointer;" title="Double-click to jump to this technology">
                  <input type="checkbox" class="vis-toggle" data-id="${t.id}" ${tEnabled ? 'checked' : ''}
                    style="width:14px; height:14px; accent-color:var(--color-emerald); cursor:pointer;">
                  <span style="color:${tEnabled ? 'var(--color-white)' : 'var(--color-steel-500)'};">${t.name}</span>
                  <span style="color:var(--color-steel-500); font-size:10px;">(${imgCount} img)</span>
                </div>
              `;
            }).join('')}
          </div>
        </div>
      `;
    });

    container.innerHTML = html;

    // Wire double-click on chips to jump to that technology
    container.querySelectorAll('.vis-chip').forEach(chip => {
      chip.addEventListener('dblclick', (e) => {
        if (e.target.tagName === 'INPUT') return; // don't hijack checkbox clicks
        const techId = chip.dataset.techId;
        const cat = chip.dataset.cat;

        // Set category dropdown
        const catSelect = document.getElementById('curator-category');
        if (catSelect) {
          catSelect.value = cat;
          catSelect.dispatchEvent(new Event('change'));
        }

        // Set technology dropdown after category populates it
        setTimeout(() => {
          const techSelect = document.getElementById('curator-tech');
          if (techSelect) {
            techSelect.value = techId;
            techSelect.dispatchEvent(new Event('change'));
          }
          // Scroll to top of curator
          document.querySelector('#contentRouting')?.scrollTo({ top: 0, behavior: 'smooth' });
        }, 50);
      });
    });

    // Wire all toggle checkboxes
    container.querySelectorAll('.vis-toggle').forEach(toggle => {
      toggle.addEventListener('change', async (e) => {
        const id = e.target.dataset.id;
        const enabled = e.target.checked;
        _visibilityMap[id] = enabled;

        // Update label for category toggles
        const statusSpan = e.target.closest('label')?.querySelector('.vis-status');
        if (statusSpan) {
          statusSpan.textContent = enabled ? 'Enabled' : 'Disabled';
          statusSpan.style.color = enabled ? 'var(--color-emerald)' : 'var(--color-error)';
        }

        // If this is a category toggle, cascade to all techs in it
        if (id.startsWith('cat:')) {
          const catName = id.replace('cat:', '');
          const techs = curatorTaxonomy.filter(t => t.category === catName);
          for (const t of techs) {
            _visibilityMap[t.id] = enabled;
            const techCheckbox = container.querySelector(`.vis-toggle[data-id="${t.id}"]`);
            if (techCheckbox) techCheckbox.checked = enabled;
            try {
              await fetch('/.netlify/functions/taxonomy-visibility', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id: t.id, enabled })
              });
            } catch(err) { console.warn('Toggle save failed for', t.id); }
          }
        }

        // Persist this toggle
        try {
          await fetch('/.netlify/functions/taxonomy-visibility', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id, enabled })
          });
        } catch(err) {
          alert('Failed to save visibility');
          e.target.checked = !enabled;
        }
      });
    });
  }

});


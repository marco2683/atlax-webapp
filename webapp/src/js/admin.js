
import { MOCK_DESIGNERS } from './data/mock-designers.js';
import { supabase } from './supabase.js';

/* ================================================================
   ATLAX Admin Panel — Full CRM with Add/Edit Forms
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
  const isAuth = sessionStorage.getItem('atlax_admin_auth') === 'true';
  if (isAuth) {
    showDashboard();
  } else { 
    document.body.classList.remove('theme-light'); // Force dark mode for login screen
    loginView.classList.remove('hidden'); dashboardView.classList.add('hidden'); 
  }

  function applyThemePreference() {
    if (localStorage.getItem('atlax_admin_theme') === 'dark') {
      document.body.classList.remove('theme-light');
    } else if (localStorage.getItem('atlax_admin_theme') === 'light' || !localStorage.getItem('atlax_admin_theme')) {
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
        sessionStorage.setItem('atlax_admin_auth', 'true');
        sessionStorage.setItem('atlax_admin_user', JSON.stringify(result.user));
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
    sessionStorage.removeItem('atlax_admin_auth');
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
      localStorage.setItem('atlax_admin_theme', 
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

  async function loadCRMData() {
    try {
      const { data: staffData } = await supabase.from('staff').select('*');
      loadedStaff = staffData || [];

      const { data: supData } = await supabase.from('suppliers').select('*');
      loadedSuppliers = (supData || []).map(row => {
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

  const STAGES = ['prototyping', 'manufacturing', 'design', 'finishing'];

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
        if (t === 'designers') { pageTitle.textContent = 'Talent Hub (Designers)';   renderDesignersTable(); }
        if (t === 'rfqs')      { pageTitle.textContent = 'RFQ \u0026 Project Tracker';    renderRFQs(); }
        if (t === 'website')   { pageTitle.textContent = 'Website Content Manager';  renderWebsiteContent(); }
        if (t === 'staff')     { pageTitle.textContent = 'Staff Directory';  renderStaffTable(); }
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
    segment: ''
  };

  function renderSuppliersTable(preserveUI = false) {
    let filtered = loadedSuppliers.filter(s => {
      let match = true;
      if (adminSupplierFilters.search) {
        const q = adminSupplierFilters.search;
        match = match && (
          (s.name && s.name.toLowerCase().includes(q)) ||
          (s.nameZh && s.nameZh.includes(q)) ||
          (s.id && s.id.toLowerCase().includes(q))
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
      return match;
    });

    const sorted = filtered.sort((a, b) => compareValues(a, b, supplierSort.key, supplierSort.dir));

    const rows = sorted.map(s => `
      <tr class="${s.isActive === false ? 'row-disabled' : ''}">
        <td style="width:40px;"><input type="checkbox" class="admin-sup-row-select" data-id="${s.id || s.name}"></td>
        <td>
          <strong>${s.name}</strong><br>
          <span style="font-size:12px; color:var(--color-steel-400);">${s.nameZh || '—'}</span>
        </td>
        <td>${[s.city, s.country].filter(Boolean).join(', ')}</td>
        <td>${s.segment || '—'}</td>
        <td>${s.techGroup || '—'}</td>
        <td style="max-width: 150px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;" title="${(s.technologies || []).join(', ')}">${(s.technologies || []).slice(0,2).join(', ') || '—'}</td>
        <td>${s.factoryScore || '—'}</td>
        <td style="max-width: 150px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;" title="${(s.certifications || []).filter(c=>!c.match(/^\d{4}-\d{2}-\d{2}/)).join(', ')}">${(s.certifications || []).filter(c=>!c.match(/^\d{4}-\d{2}-\d{2}/)).slice(0,2).join(', ') || '—'}</td>
        <td>
          <label class="admin-toggle-switch">
            <input type="checkbox" class="admin-status-toggle" data-id="${s.id || s.name}" ${s.isActive !== false ? 'checked' : ''}>
            <span class="admin-toggle-slider"></span>
          </label>
        </td>
        <td class="admin-table-actions">
          <button class="admin-action-btn admin-edit-supplier" data-id="${s.id || s.name}">Edit</button>
          <button class="admin-action-btn admin-delete-supplier" data-id="${s.id || s.name}" style="color:#ef4444;border-color:rgba(239,68,68,.2);">Delete</button>
        </td>
      </tr>`).join('');

    const tableHTML = `
        <table class="admin-table">
          <thead><tr>
            <th style="width:40px;"><input type="checkbox" id="admin-sup-select-all" title="Select all visible rows"></th>
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
              <option value="">All Technologies...</option>
              ${[...new Set(loadedSuppliers.map(s=>s.techGroup).filter(Boolean))].map(t => `<option value="${t}" ${adminSupplierFilters.techGroup === t ? 'selected':''}>${t}</option>`).join('')}
            </select>
            <select id="admin-filter-country" class="admin-input-filter">
              <option value="">All Countries...</option>
              ${[...new Set(loadedSuppliers.map(s=>s.country).filter(Boolean))].map(c => `<option value="${c}" ${adminSupplierFilters.country === c ? 'selected':''}>${c}</option>`).join('')}
            </select>
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

      // Filter events
      document.getElementById('admin-filter-search')?.addEventListener('input', e => { adminSupplierFilters.search = e.target.value.toLowerCase(); renderSuppliersTable(true); });
      document.getElementById('admin-filter-segment')?.addEventListener('change', e => { adminSupplierFilters.segment = e.target.value; renderSuppliersTable(true); });
      document.getElementById('admin-filter-tech')?.addEventListener('change', e => { adminSupplierFilters.techGroup = e.target.value; renderSuppliersTable(true); });
      document.getElementById('admin-filter-country')?.addEventListener('change', e => { adminSupplierFilters.country = e.target.value; renderSuppliersTable(true); });

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
            const res = await fetch('/api/suppliers', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(sup)
            });
            if (res.ok) successCount++;
          } catch(e) { console.error(e); }
        }

        btn.textContent = ogText;
        btn.style.pointerEvents = '';
        await loadCRMData();
        renderSuppliersTable();
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
            const res = await fetch(`/api/suppliers?id=${encodeURIComponent(id)}`, { method: 'DELETE' });
            if (res.ok) successCount++;
          } catch(e) { console.error(e); }
        }
        
        await loadCRMData();
        renderSuppliersTable();
        alert(`Successfully deleted ${successCount} out of ${selectedIds.length} suppliers.`);
      });
    }

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

    contentRouting.querySelectorAll('.admin-delete-supplier').forEach(btn => {
      btn.addEventListener('click', async () => {
        if (!confirm('Are you sure you want to permanently delete this supplier?')) return;
        btn.textContent = 'Deleting...';
        btn.style.pointerEvents = 'none';
        try {
          const { error } = await supabase.from('suppliers').delete().eq('id', btn.dataset.id);
          if (res.ok) {
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
        const sup = loadedSuppliers.find(s => String(s.id) === String(id));
        if (!sup) return;
        
        sup.isActive = e.target.checked;
        const row = e.target.closest('tr');
        if (e.target.checked) row.classList.remove('row-disabled');
        else row.classList.add('row-disabled');

        try {
          const res = await fetch('/api/suppliers', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(sup)
          });
          if (!res.ok) throw new Error('Toggle save failed');
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
      <button class="admin-back-btn" id="admin-sup-back">← Back to Suppliers</button>

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
          <div class="admin-form-grid cols-2" style="margin-bottom: 12px;">
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
          <div class="admin-field">
            <label>Description / Overview <span class="req">*</span></label>
            <textarea name="description" rows="4" required placeholder="Tier-1 injection molding facility with 8,000sqm workshop...">${s.description || ''}</textarea>
          </div>
        </div>

        <!-- ─── SECTION 2: Location & Geo ─── -->
        <div class="admin-form-section">
          <div class="admin-form-section-title">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
            Location & Geography
          </div>
          <div class="admin-form-grid cols-3">
            <div class="admin-field">
              <label>City <span class="req">*</span></label>
              <input type="text" name="city" value="${s.city || ''}" required placeholder="Shenzhen">
            </div>
            <div class="admin-field">
              <label>Country <span class="req">*</span></label>
              <input type="text" name="country" value="${s.country || ''}" required placeholder="China">
            </div>
            <div class="admin-field">
              <label>Region / Province</label>
              <input type="text" name="region" value="${s.region || ''}" placeholder="Guangdong">
            </div>
          </div>
          <div class="admin-form-grid cols-2">
            <div class="admin-field">
              <label>Latitude</label>
              <input type="number" step="any" name="lat" value="${s.lat || ''}" placeholder="22.5431">
            </div>
            <div class="admin-field">
              <label>Longitude</label>
              <input type="number" step="any" name="lng" value="${s.lng || ''}" placeholder="114.0579">
            </div>
          </div>
          <div class="admin-form-grid cols-2">
            <div class="admin-field">
              <label>Full Address (English)</label>
              <input type="text" name="address" value="${s.address || ''}" placeholder="Building 12, Industrial Park, Bao'an District, Shenzhen 518100">
            </div>
            <div class="admin-field">
              <label>Full Address (Chinese)</label>
              <input type="text" name="addressZh" value="${s.addressZh || ''}" placeholder="深圳市宝安区工业园12栋 518100">
            </div>
          </div>
        </div>

        <!-- ─── SECTION 3: Technical Classification ─── -->
        <div class="admin-form-section">
          <div class="admin-form-section-title">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>
            Technical Classification
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
              <label>Manufacturing Stage <span class="req">*</span></label>
              <select name="stage" required>
                <option value="">Select…</option>
                ${STAGES.map(st => `<option value="${st}" ${s.stage === st ? 'selected' : ''}>${st}</option>`).join('')}
              </select>
            </div>
          </div>
          <div class="admin-form-grid cols-2">
            <div class="admin-field">
              <label>Specific Technologies <span class="hint">(comma-separated)</span></label>
              <input type="text" name="technologies" value="${(s.technologies || []).join(', ')}" placeholder="Injection Molding, 2K Moulding, Gas-Assisted Injection…">
            </div>
            <div class="admin-field">
              <label>General Tags <span class="hint">(comma-separated)</span></label>
              <input type="text" name="tags" value="${(s.tags || []).join(', ')}" placeholder="Consumer Electronics, Medical, ISO 9001…">
            </div>
          </div>
          <div class="admin-field">
            <label>Factory Score <span class="hint">(0–100)</span></label>
            <div class="admin-range-row">
              <input type="range" name="factoryScore" min="0" max="100" value="${s.factoryScore || 50}" id="admin-sup-score-range">
              <span class="admin-range-val" id="admin-sup-score-val">${s.factoryScore || 50}</span>
            </div>
          </div>
        </div>

        <!-- ─── SECTION 4: Scorecards & Attributes ─── -->
        <div class="admin-form-section">
          <div class="admin-form-section-title">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 20v-6M6 20V10M18 20V4"/></svg>
            Scorecards & Capabilities
          </div>
          <div class="admin-form-grid cols-3">
            <div class="admin-field">
              <label title="Technical Capabilities (0=No, 1=Moderate, 2=Excellent)">Tech Capab. (0-2)</label>
              <input type="number" name="scoreTc" min="0" max="2" value="${s.scoreTc || 0}">
            </div>
            <div class="admin-field">
              <label title="Ownership Ethos (0=No, 1=Moderate, 2=Excellent)">Owner Ethos (0-2)</label>
              <input type="number" name="scoreOe" min="0" max="2" value="${s.scoreOe || 0}">
            </div>
            <div class="admin-field">
              <label title="Quality System (0=No, 1=Moderate, 2=Excellent)">Quality Sys. (0-2)</label>
              <input type="number" name="scoreQs" min="0" max="2" value="${s.scoreQs || 0}">
            </div>
          </div>
          <div class="admin-form-grid cols-3" style="margin-top:16px;">
            <div class="admin-field">
              <label title="Verified Status (0=No, 1=Partial, 2=Yes)">Verified (0-2)</label>
              <input type="number" name="scoreV" min="0" max="2" value="${s.scoreV || 0}">
            </div>
            <div class="admin-field">
              <label>Speed Score (0-10)</label>
              <input type="number" name="scoreSpeed" min="0" max="10" value="${s.scoreSpeed || 0}">
            </div>
            <div class="admin-field">
              <label>Cost Score (0-10)</label>
              <input type="number" name="scoreCost" min="0" max="10" value="${s.scoreCost || 0}">
            </div>
          </div>
          <div class="admin-form-grid cols-3" style="margin-top:16px;">
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

        <!-- ─── SECTION 5: Certifications & Qualifiers ─── -->
        <div class="admin-form-section">
          <div class="admin-form-section-title">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
            Certifications & Qualifiers
          </div>
          <div class="admin-checkbox-grid">
            ${CERTIFICATIONS.map(c => `
              <label class="admin-checkbox">
                <input type="checkbox" name="certifications" value="${c}" ${(s.certifications || []).includes(c) ? 'checked' : ''}>
                <span>${c}</span>
              </label>`).join('')}
          </div>
          <div class="admin-form-grid cols-3" style="margin-top:16px;">
            <div class="admin-field">
              <label>MOQ (Min. Order Qty)</label>
              <input type="text" name="moq" value="${s.moq || ''}" placeholder="500 units">
            </div>
            <div class="admin-field">
              <label>Lead Time</label>
              <input type="text" name="leadTime" value="${s.leadTime || ''}" placeholder="25–35 days">
            </div>
            <div class="admin-field">
              <label>Employee Count</label>
              <input type="text" name="employees" value="${s.employees || ''}" placeholder="200+">
            </div>
          </div>
          <div class="admin-form-grid cols-2">
            <div class="admin-field">
              <label>Year Established</label>
              <input type="number" name="yearEstablished" value="${s.yearEstablished || ''}" placeholder="2005">
            </div>
            <div class="admin-field">
              <label>Factory Area (sqm)</label>
              <input type="text" name="factoryArea" value="${s.factoryArea || ''}" placeholder="8,000 sqm">
            </div>
          </div>
        </div>

        <!-- ─── SECTION 6: Contact Information ─── -->
        <div class="admin-form-section">
          <div class="admin-form-section-title">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>
            Contact Information
          </div>
          <div class="admin-form-grid cols-3">
            <div class="admin-field">
              <label>Primary Contact Name</label>
              <input type="text" name="contactName" value="${s.contactName || ''}" placeholder="John Li">
            </div>
            <div class="admin-field">
              <label>Contact Name (Chinese)</label>
              <input type="text" name="contactNameZh" value="${s.contactNameZh || ''}" placeholder="李四">
            </div>
            <div class="admin-field">
              <label>Position / Title</label>
              <input type="text" name="contactTitle" value="${s.contactTitle || ''}" placeholder="Sales Director">
            </div>
          </div>
          <div class="admin-form-grid cols-2">
            <div class="admin-field">
              <label>Email</label>
              <input type="email" name="email" value="${s.email || ''}" placeholder="sales@precision-mold.cn">
            </div>
            <div class="admin-field">
              <label>Phone / WhatsApp / WeChat</label>
              <input type="text" name="phone" value="${s.phone || ''}" placeholder="+86 755 8888 1234">
            </div>
          </div>
          <div class="admin-field">
            <label>Website</label>
            <input type="url" name="website" value="${s.website || ''}" placeholder="https://www.precision-mold.cn">
          </div>
        </div>

        <!-- ─── SECTION 6: Images & Media ─── -->
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
                <div class="admin-img-url-row"><input type="text" name="img_product" value="${url}" placeholder="https://example.com/product-1.jpg"><button type="button" class="admin-remove-row-btn">✕</button></div>
              `).join('')}
            </div>
            <button type="button" class="admin-add-row-btn" data-target="admin-sup-img-products" data-name="img_product">+ Add Product Image</button>
          </div>

          <div class="admin-image-category">
            <h5>Facility / Factory Floor</h5>
            <div class="admin-image-url-list" id="admin-sup-img-facility">
              ${(s.images?.facility?.length ? s.images.facility : ['']).map(url => `
                <div class="admin-img-url-row"><input type="text" name="img_facility" value="${url}" placeholder="https://example.com/factory-1.jpg"><button type="button" class="admin-remove-row-btn">✕</button></div>
              `).join('')}
            </div>
            <button type="button" class="admin-add-row-btn" data-target="admin-sup-img-facility" data-name="img_facility">+ Add Facility Image</button>
          </div>

          <div class="admin-image-category">
            <h5>Equipment / Machinery</h5>
            <div class="admin-image-url-list" id="admin-sup-img-equipment">
              ${(s.images?.equipment?.length ? s.images.equipment : ['']).map(url => `
                <div class="admin-img-url-row"><input type="text" name="img_equipment" value="${url}" placeholder="https://example.com/cnc-machine.jpg"><button type="button" class="admin-remove-row-btn">✕</button></div>
              `).join('')}
            </div>
            <button type="button" class="admin-add-row-btn" data-target="admin-sup-img-equipment" data-name="img_equipment">+ Add Equipment Image</button>
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

        <!-- ─── SECTION 7: Documents & Catalogues ─── -->
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
                <div class="admin-img-url-row"><input type="text" name="doc_url" value="${url}" placeholder="https://example.com/brochure.pdf"><button type="button" class="admin-remove-row-btn">✕</button></div>
              `).join('')}
            </div>
            <button type="button" class="admin-add-row-btn" data-target="admin-sup-img-docs" data-name="doc_url">+ Add Document URL</button>
          </div>
        </div>

        <!-- ─── SECTION 8: Internal Notes ─── -->
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
    document.getElementById('admin-sup-score-range')?.addEventListener('input', e => {
      document.getElementById('admin-sup-score-val').textContent = e.target.value;
    });
    document.getElementById('admin-supplier-form')?.addEventListener('submit', async e => {
      e.preventDefault();
      const form = e.target;
      const btn = form.querySelector('button[type="submit"]');
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
        techGroup: fd.get('techGroup') === '__NEW__' ? fd.get('newTechGroup').trim() : fd.get('techGroup'),
        tags: fd.get('tags') ? fd.get('tags').split(',').map(s => s.trim()).filter(Boolean) : [],
        technologies: fd.get('technologies') ? fd.get('technologies').split(',').map(s => s.trim()).filter(Boolean) : [],
        certifications: fd.getAll('certifications'),
        factoryScore: parseInt(fd.get('factoryScore') || 0),
        scoreTc: parseInt(fd.get('scoreTc') || 0),
        scoreOe: parseInt(fd.get('scoreOe') || 0),
        scoreQs: parseInt(fd.get('scoreQs') || 0),
        scoreV: parseInt(fd.get('scoreV') || 0),
        scoreSpeed: parseInt(fd.get('scoreSpeed') || 0),
        scoreCost: parseInt(fd.get('scoreCost') || 0),
        scoreLowVol: parseInt(fd.get('scoreLowVol') || 0),
        scoreComplexity: parseInt(fd.get('scoreComplexity') || 0),
        scorePrecision: parseInt(fd.get('scorePrecision') || 0),
        contactName: fd.get('contactName'),
        contactNameZh: fd.get('contactNameZh'),
        contactTitle: fd.get('contactTitle'),
        moq: fd.get('moq'),
        leadTime: fd.get('leadTime'),
        employees: fd.get('employees'),
        yearEstablished: parseInt(fd.get('yearEstablished') || 0),
        factoryArea: fd.get('factoryArea'),
        email: fd.get('email'),
        phone: fd.get('phone'),
        website: fd.get('website'),
        logo: fd.get('logo'),
        banner: fd.get('banner'),
        internalNotes: fd.get('internalNotes'),
        videoWalkthrough: fd.get('videoWalkthrough'),
        documents: fd.getAll('doc_url').filter(Boolean),
        images: {
          product: fd.getAll('img_product').filter(Boolean),
          facility: fd.getAll('img_facility').filter(Boolean),
          equipment: fd.getAll('img_equipment').filter(Boolean)
        }
      };

      try {
        const res = await fetch('/api/suppliers', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
        if (!res.ok) throw new Error('Save failed');
        
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
        <td class="admin-table-actions">
          <button class="admin-action-btn admin-edit-designer" data-id="${d.id}">Edit</button>
          <button class="admin-action-btn" style="color:#ef4444;border-color:rgba(239,68,68,.2);">Deactivate</button>
        </td>
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
            <tr><td>PRJ-A8012</td><td>Sarah Connor (InnovateX)</td><td>$45,000</td><td><span class="admin-badge pending">Quoting</span></td><td class="admin-table-actions"><button class="admin-action-btn">Review</button></td></tr>
            <tr><td>PRJ-B9921</td><td>John Doe (TechCorp)</td><td>$12,500</td><td><span class="admin-badge active">In Production</span></td><td class="admin-table-actions"><button class="admin-action-btn">Manage</button></td></tr>
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
        row.innerHTML = `<input type="text" name="${btn.dataset.name}" placeholder="https://example.com/image.jpg"><button type="button" class="admin-remove-row-btn">✕</button>`;
        list.appendChild(row);
        wireRemoveButtons(list);
      });
    });

    // Wire all remove buttons globally
    document.querySelectorAll('.admin-remove-row-btn').forEach(btn => {
      btn.addEventListener('click', () => btn.parentElement.remove());
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


  // ═══════════════════════════════════════════════════════════
  //  W E B S I T E   C O N T E N T   M A N A G E R
  // ═══════════════════════════════════════════════════════════
  const CMS_LS_KEY = 'atlax_cms_content';
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
                <td class="admin-table-actions">
                  <button class="admin-action-btn edit" data-id="${s.id}" title="Edit Staff">✎</button>
                  <button class="admin-action-btn delete" data-id="${s.id}" title="Delete Staff">🗑</button>
                </td>
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
                <input type="email" name="email" value="${s.email || ''}" required placeholder="sarah@atlax.com">
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

});

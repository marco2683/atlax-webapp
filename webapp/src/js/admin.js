import { MOCK_SUPPLIERS } from './data/mock-suppliers.js';
import { MOCK_DESIGNERS } from './data/mock-designers.js';

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
  if (isAuth) showDashboard();
  else { loginView.classList.remove('hidden'); dashboardView.classList.add('hidden'); }

  loginForm?.addEventListener('submit', e => {
    e.preventDefault();
    sessionStorage.setItem('atlax_admin_auth', 'true');
    showDashboard();
  });

  logoutBtn?.addEventListener('click', () => {
    sessionStorage.removeItem('atlax_admin_auth');
    dashboardView.classList.add('hidden');
    loginView.classList.remove('hidden');
  });

  function showDashboard() {
    loginView.classList.add('hidden');
    dashboardView.classList.remove('hidden');
    initDashboard();
  }

  // ─── Available Tech Groups & Technologies ──────────────────
  const TECH_GROUPS = [
    'Injection Molding', 'CNC Machining', 'PCBA', 'Sheet Metal',
    'Casting & Forging', 'Surface Finishing', 'Rapid Prototyping',
    '3D Printing', 'Extrusion', 'Product Design', 'Motors & Drives'
  ];

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
  function initDashboard() {
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
        if (t === 'rfqs')      { pageTitle.textContent = 'RFQ & Project Tracker';    renderRFQs(); }
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
          <div class="admin-metric-value">${MOCK_SUPPLIERS.length}</div>
          <div class="admin-metric-label">Verified Suppliers</div>
        </div>
        <div class="admin-metric-card">
          <div class="admin-metric-value">${MOCK_DESIGNERS.length}</div>
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
  function renderSuppliersTable() {
    const sorted = [...MOCK_SUPPLIERS].sort((a, b) => compareValues(a, b, supplierSort.key, supplierSort.dir));

    const rows = sorted.map(s => `
      <tr>
        <td><strong>${s.name}</strong></td>
        <td>${s.city || ''}, ${s.country || ''}</td>
        <td>${s.techGroup || '—'}</td>
        <td>${s.factoryScore || '—'}</td>
        <td><span class="admin-badge active">Verified</span></td>
        <td class="admin-table-actions">
          <button class="admin-action-btn admin-edit-supplier" data-id="${s.id}">Edit</button>
          <button class="admin-action-btn" style="color:#ef4444;border-color:rgba(239,68,68,.2);">Suspend</button>
        </td>
      </tr>`).join('');

    contentRouting.innerHTML = `
      <div style="margin-bottom:24px;display:flex;justify-content:flex-end;">
        <button class="btn btn-primary" id="admin-add-supplier-btn">+ Add New Supplier</button>
      </div>
      <div class="admin-table-container">
        <table class="admin-table">
          <thead><tr>
            <th class="sortable" data-sort-key="name">Manufacturer Name ${sortArrow('name', supplierSort)}</th>
            <th class="sortable" data-sort-key="location_display">Location ${sortArrow('location_display', supplierSort)}</th>
            <th class="sortable" data-sort-key="techGroup">Tech Group ${sortArrow('techGroup', supplierSort)}</th>
            <th class="sortable" data-sort-key="factoryScore">Factory Score ${sortArrow('factoryScore', supplierSort)}</th>
            <th>Status</th>
            <th>Actions</th>
          </tr></thead>
          <tbody>${rows}</tbody>
        </table>
      </div>`;

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
          <div class="admin-field">
            <label>Full Address</label>
            <input type="text" name="address" value="${s.address || ''}" placeholder="Building 12, Industrial Park, Bao'an District, Shenzhen 518100">
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
              <select name="techGroup" required>
                <option value="">Select…</option>
                ${TECH_GROUPS.map(tg => `<option value="${tg}" ${s.techGroup === tg ? 'selected' : ''}>${tg}</option>`).join('')}
              </select>
            </div>
            <div class="admin-field">
              <label>Manufacturing Stage <span class="req">*</span></label>
              <select name="stage" required>
                <option value="">Select…</option>
                ${STAGES.map(st => `<option value="${st}" ${s.stage === st ? 'selected' : ''}>${st}</option>`).join('')}
              </select>
            </div>
          </div>
          <div class="admin-field">
            <label>Specific Technologies <span class="hint">(comma-separated)</span></label>
            <input type="text" name="technologies" value="${(s.technologies || []).join(', ')}" placeholder="Injection Molding, 2K Moulding, Gas-Assisted Injection…">
          </div>
          <div class="admin-field">
            <label>Factory Score <span class="hint">(0–100)</span></label>
            <div class="admin-range-row">
              <input type="range" name="factoryScore" min="0" max="100" value="${s.factoryScore || 50}" id="admin-sup-score-range">
              <span class="admin-range-val" id="admin-sup-score-val">${s.factoryScore || 50}</span>
            </div>
          </div>
        </div>

        <!-- ─── SECTION 4: Certifications & Qualifiers ─── -->
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

        <!-- ─── SECTION 5: Contact Information ─── -->
        <div class="admin-form-section">
          <div class="admin-form-section-title">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>
            Contact Information
          </div>
          <div class="admin-form-grid cols-2">
            <div class="admin-field">
              <label>Primary Contact Name</label>
              <input type="text" name="contactName" value="${s.contactName || ''}" placeholder="John Li">
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

        <!-- ─── SECTION 6: Images ─── -->
        <div class="admin-form-section">
          <div class="admin-form-section-title">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>
            Image Gallery
          </div>
          <p class="admin-form-hint">Supply URLs for images. These populate the supplier profile cards, grid previews, and detail modals.</p>

          <div class="admin-image-category">
            <h5>Product Samples</h5>
            <div class="admin-image-url-list" id="admin-sup-img-products">
              <div class="admin-img-url-row"><input type="text" name="img_product" placeholder="https://example.com/product-1.jpg"><button type="button" class="admin-remove-row-btn">✕</button></div>
            </div>
            <button type="button" class="admin-add-row-btn" data-target="admin-sup-img-products" data-name="img_product">+ Add Product Image</button>
          </div>

          <div class="admin-image-category">
            <h5>Facility / Factory Floor</h5>
            <div class="admin-image-url-list" id="admin-sup-img-facility">
              <div class="admin-img-url-row"><input type="text" name="img_facility" placeholder="https://example.com/factory-1.jpg"><button type="button" class="admin-remove-row-btn">✕</button></div>
            </div>
            <button type="button" class="admin-add-row-btn" data-target="admin-sup-img-facility" data-name="img_facility">+ Add Facility Image</button>
          </div>

          <div class="admin-image-category">
            <h5>Certifications & Compliance Docs</h5>
            <div class="admin-image-url-list" id="admin-sup-img-certs">
              <div class="admin-img-url-row"><input type="text" name="img_cert" placeholder="https://example.com/iso-cert.jpg"><button type="button" class="admin-remove-row-btn">✕</button></div>
            </div>
            <button type="button" class="admin-add-row-btn" data-target="admin-sup-img-certs" data-name="img_cert">+ Add Cert Image</button>
          </div>

          <div class="admin-image-category">
            <h5>Equipment / Machinery</h5>
            <div class="admin-image-url-list" id="admin-sup-img-equipment">
              <div class="admin-img-url-row"><input type="text" name="img_equipment" placeholder="https://example.com/cnc-machine.jpg"><button type="button" class="admin-remove-row-btn">✕</button></div>
            </div>
            <button type="button" class="admin-add-row-btn" data-target="admin-sup-img-equipment" data-name="img_equipment">+ Add Equipment Image</button>
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

        <!-- ─── SECTION 7: Internal Notes ─── -->
        <div class="admin-form-section">
          <div class="admin-form-section-title">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>
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
    document.getElementById('admin-sup-back')?.addEventListener('click', () => { pageTitle.textContent = 'Suppliers CRM Directory'; renderSuppliersTable(); });
    document.getElementById('admin-sup-cancel')?.addEventListener('click', () => { pageTitle.textContent = 'Suppliers CRM Directory'; renderSuppliersTable(); });
    document.getElementById('admin-sup-score-range')?.addEventListener('input', e => {
      document.getElementById('admin-sup-score-val').textContent = e.target.value;
    });
    document.getElementById('admin-supplier-form')?.addEventListener('submit', e => {
      e.preventDefault();
      alert('Supplier saved successfully (prototype — data not persisted).');
      pageTitle.textContent = 'Suppliers CRM Directory';
      renderSuppliersTable();
    });
  }


  // ═══════════════════════════════════════════════════════════
  //  D E S I G N E R S   T A B L E
  // ═══════════════════════════════════════════════════════════
  function renderDesignersTable() {
    const sorted = [...MOCK_DESIGNERS].sort((a, b) => compareValues(a, b, designerSort.key, designerSort.dir));

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

});

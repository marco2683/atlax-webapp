
import { MOCK_DESIGNERS } from './data/mock-designers.js';
import { supabase } from './supabase.js';
import { renderPricingConfigurator } from './admin-pricing.js';
import { renderMarketplaceTaxonomy } from './admin-taxonomy.js';
import { renderAdminProducts } from './admin-products.js';
import { loadPricingConfig } from './utils/pricing-loader.js';
import { initRfiImporter } from './admin-rfi.js';
import { generateAllDocsHeadless } from './services/headless-docs.js';

/* ================================================================
   Atlas DT Admin Panel — Full CRM with Add/Edit Forms
   ================================================================ */

document.addEventListener('DOMContentLoaded', async () => {

  // Initialize Pricing Config (Async)
  const pricingPromise = loadPricingConfig();

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
        // Reconstruct techGroups array: prefer data.techGroups, fallback to single tech_group
        if (!s.techGroups || !Array.isArray(s.techGroups) || s.techGroups.length === 0) {
          s.techGroups = s.techGroup ? [s.techGroup] : [];
        }
        if (!s.techGroup && s.techGroups.length > 0) {
          s.techGroup = s.techGroups[0];
        }
        if (!s.techGroup && s.technologies && s.technologies.length > 0) {
          s.techGroup = s.technologies[0];
          s.techGroups = [s.techGroup];
        }
        return s;
      });
      TECH_GROUPS = [...new Set(loadedSuppliers.flatMap(s => (s.techGroups || []).filter(Boolean)))].sort();
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
  async function updateNavBadges() {
    // Designer pending badge
    const pendingDesigners = loadedCustomers.filter(c => c.designer_status === 'pending').length;
    const designerTab = document.querySelector('.admin-nav-item[data-tab="designers"]');
    if (designerTab) {
      designerTab.innerHTML = `Designer Hub ${pendingDesigners > 0 ? '<span style="background:var(--color-electric); color:white; padding: 2px 8px; border-radius: 12px; font-size: 11px; margin-left: 6px; font-weight: bold;">' + pendingDesigners + '</span>' : ''}`;
    }

    // RFQ submitted badge — lightweight count query
    try {
      let count = 0;
      const res = await fetch('/.netlify/functions/admin-rfqs?action=count&status=submitted');
      if (res.ok) {
        const data = await res.json();
        count = data.count || 0;
      }
      const rfqTab = document.querySelector('.admin-nav-item[data-tab="rfqs"]');
      if (rfqTab) {
        // Preserve the original text (strip any previous badge)
        const baseText = rfqTab.childNodes[0]?.textContent?.trim() || 'RFQ Tracker';
        rfqTab.innerHTML = `${baseText} ${count > 0
          ? `<span style="background:#ef4444; color:#fff; padding:2px 7px; border-radius:12px; font-size:11px; margin-left:6px; font-weight:700; animation:rfq-badge-pulse 2s ease-in-out infinite;">${count}</span>`
          : ''}`;
      }
    } catch (e) { /* silently fail — badge is non-critical */ }
  }

  async function initDashboard() {
    // Inject badge pulse keyframe once
    if (!document.getElementById('rfq-badge-style')) {
      const s = document.createElement('style');
      s.id = 'rfq-badge-style';
      s.textContent = `@keyframes rfq-badge-pulse { 0%,100%{opacity:1;transform:scale(1)} 50%{opacity:0.8;transform:scale(1.1)} }`;
      document.head.appendChild(s);
    }
    await loadCRMData();
    updateNavBadges();
    
    // Listen for incoming RFQs or admin status changes to auto-update
    supabase.channel('admin-rfqs-tracker')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'admin_rfqs' }, () => {
        updateNavBadges();
        const rfqTab = document.querySelector('.admin-nav-item[data-tab="rfqs"]');
        const modalOpen = document.querySelector('#admin-rfq-modal-overlay');
        if (rfqTab && rfqTab.classList.contains('active') && !modalOpen) {
          renderRFQs();
        }
      })
      .subscribe();
    renderOverview();

    // ── Collapsible OEM Nav Group ──────────────────────────
    const oemGroup = document.getElementById('oem-nav-group');
    const oemToggle = document.getElementById('oem-group-toggle');
    if (oemGroup && oemToggle) {
      oemGroup.classList.add('collapsed'); // start collapsed
      oemToggle.addEventListener('click', () => {
        oemGroup.classList.toggle('collapsed');
        oemGroup.classList.toggle('expanded');
      });
    }

    navItems.forEach(tab => {
      // Clone to remove old listeners
      const fresh = tab.cloneNode(true);
      tab.parentNode.replaceChild(fresh, tab);
      fresh.addEventListener('click', e => {
        document.querySelectorAll('.admin-nav-item').forEach(t => t.classList.remove('active'));
        e.currentTarget.classList.add('active');
        const t = e.currentTarget.dataset.tab;

        // Auto-expand OEM group if an OEM child tab is clicked
        const oemTabs = ['marketplace-taxonomy', 'products', 'oem-sellers'];
        if (oemTabs.includes(t) && oemGroup) {
          oemGroup.classList.remove('collapsed');
          oemGroup.classList.add('expanded');
        }

        if (t === 'overview')  { pageTitle.textContent = 'Platform Overview';        renderOverview(); }
        if (t === 'suppliers') { pageTitle.textContent = 'Suppliers CRM Directory';  renderSuppliersTable(); }
        if (t === 'customers') { pageTitle.textContent = 'Customers Data CRM';       renderCustomersTable(); }
        if (t === 'rfqs')      { pageTitle.textContent = 'RFQ \u0026 Project Tracker';    renderRFQs(); }
        if (t === 'pricing') { pageTitle.textContent = 'Pricing Engine Configurator'; renderPricingConfigurator(contentRouting); }

        if (t === 'marketplace-taxonomy') { pageTitle.textContent = 'OEM — Categories'; renderMarketplaceTaxonomy(contentRouting); }
        if (t === 'products') { pageTitle.textContent = 'OEM — Products Catalog'; renderAdminProducts(contentRouting); }
        if (t === 'oem-sellers') { pageTitle.textContent = 'OEM — Sellers Directory'; renderOEMSellers(); }
        if (t === 'designers') { pageTitle.textContent = 'Designer Applications Hub'; renderDesignersHub(); }
        if (t === 'staff')     { pageTitle.textContent = 'Staff Directory';  renderStaffTable(); }
      });
    });
  }

  // ═══════════════════════════════════════════════════════════
  //  O V E R V I E W
  // ═══════════════════════════════════════════════════════════
  function renderOverview() {
    // Top groups for suppliers
    let techCounts = {};
    loadedSuppliers.forEach(s => {
      let g = s.techGroup || 'General';
      techCounts[g] = (techCounts[g] || 0) + 1;
    });
    // Sort and keep top 5
    let sortedTech = Object.entries(techCounts).sort((a,b)=>b[1]-a[1]).slice(0,5);
    let techLabelsArray = sortedTech.map(x=>x[0]);
    let techDataArray = sortedTech.map(x=>x[1]);

    if (techLabelsArray.length === 0) {
      techLabelsArray = ['CNC Machining', 'Injection Molding', 'Additive Mfg', 'Sheet Metal', 'Casting'];
      techDataArray = [45, 25, 15, 10, 5];
    }

    const isLightMode = document.body.classList.contains('theme-light');
    const chartTextColor = isLightMode ? 'rgba(0, 0, 0, 0.5)' : 'rgba(255, 255, 255, 0.4)';
    const chartGridColor = isLightMode ? 'rgba(0, 0, 0, 0.05)' : 'rgba(255, 255, 255, 0.03)';
    const chartBarLight = isLightMode ? 'rgba(0, 0, 0, 0.05)' : 'rgba(255, 255, 255, 0.05)';
    const chartBarMed1 = isLightMode ? 'rgba(0, 0, 0, 0.15)' : 'rgba(255, 255, 255, 0.15)';
    const chartBarMed2 = isLightMode ? 'rgba(0, 0, 0, 0.25)' : 'rgba(255, 255, 255, 0.25)';

    contentRouting.innerHTML = `
      <div class="admin-dash-wrapper">
      <style>
        .admin-dash-wrapper {
          --dash-bg: rgba(255, 255, 255, 0.02);
          --dash-border: rgba(255, 255, 255, 0.05);
          --dash-modal: #0f1219;
          --dash-text: white;
          --dash-muted: var(--color-steel-400);
          --dash-subtle: var(--color-steel-300);
          --dash-tile: rgba(0,0,0,0.2);
          --dash-scroll: rgba(255, 255, 255, 0.1);
          --dash-btn: rgba(255,255,255,0.05);
          --dash-highlight: #0ea5e9;
        }
        body.theme-light .admin-dash-wrapper {
          --dash-bg: #ffffff;
          --dash-border: rgba(0, 0, 0, 0.08);
          --dash-modal: #f9fafb;
          --dash-text: #111827;
          --dash-muted: #6b7280;
          --dash-subtle: #4b5563;
          --dash-tile: #ffffff;
          --dash-scroll: rgba(0, 0, 0, 0.15);
          --dash-btn: rgba(0,0,0,0.04);
          --dash-highlight: #0284c7;
        }

        .admin-toolbar-search input {
          background: transparent;
          border: none;
          color: white;
          width: 100%;
          font-family: inherit;
          font-size: 14px;
          outline: none;
        }
        body.theme-light .admin-toolbar-search input {
          color: var(--color-slate-900);
        }

        .admin-dash-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(400px, 1fr)); gap: 24px; margin-bottom: 40px; }
        .admin-dash-section { background: var(--dash-bg); border: 1px solid var(--dash-border); border-radius: 8px; padding: 24px; display: flex; flex-direction: column; gap: 16px; min-width:0; max-height: 450px; overflow-y: auto; transition: all 0.3s; position: relative; }
        body.theme-light .admin-dash-section { box-shadow: 0 4px 6px rgba(0,0,0,0.04); }
        .admin-dash-section.expanded { position: fixed; top: 5%; left: 5%; width: 90%; height: 90%; max-height: 90%; z-index: 1000; background: var(--dash-modal); border: 1px solid var(--dash-highlight); box-shadow: 0 0 50px rgba(0,0,0,0.8); }
        body.theme-light .admin-dash-section.expanded { box-shadow: 0 20px 50px rgba(0,0,0,0.15); }
        .admin-dash-section::-webkit-scrollbar { width: 6px; }
        .admin-dash-section::-webkit-scrollbar-track { background: transparent; }
        .admin-dash-section::-webkit-scrollbar-thumb { background: var(--dash-scroll); border-radius: 4px; }
        .admin-dash-title { font-size: 16px; font-weight: 600; color: var(--dash-text); display:flex; align-items:center; justify-content: space-between; gap:8px; border-bottom: 1px solid var(--dash-border); padding-bottom: 12px; margin-bottom: 8px; text-transform: uppercase; letter-spacing: 1px;}
        .dash-expand-btn { background: var(--dash-btn); border: 1px solid var(--dash-border); color: var(--dash-subtle); border-radius: 4px; padding: 4px 10px; font-size: 11px; cursor: pointer; transition: 0.2s; text-transform: uppercase; letter-spacing: 0.5px;}
        .dash-expand-btn:hover { background: var(--dash-border); color: var(--dash-text); }
        .admin-stat-row { display: flex; justify-content: space-between; align-items: center; padding: 8px 0; border-bottom: 1px dashed var(--dash-border); }
        .admin-stat-row:last-child { border-bottom: none; }
        .admin-stat-label { color: var(--dash-muted); font-size: 13px; text-transform: uppercase; letter-spacing: 0.5px;}
        .admin-stat-value { color: var(--dash-text); font-weight: 500; font-size: 15px; }
        .admin-table-mini { width: 100%; border-collapse: collapse; margin-top: 12px; }
        .admin-table-mini th, .admin-table-mini td { padding: 10px 8px; text-align: left; font-size: 13px; border-bottom: 1px solid var(--dash-border); }
        .admin-table-mini th { color: var(--dash-muted); font-weight: 500; text-transform: uppercase; letter-spacing: 0.5px; font-size: 11px; }
        .admin-table-mini td { color: var(--dash-subtle); }
        .admin-table-mini tr:last-child td { border-bottom: none; }
        .admin-badge { background: var(--dash-btn); padding: 4px 8px; border-radius: 4px; font-size: 10px; white-space:nowrap; text-transform: uppercase; letter-spacing: 0.5px; color: var(--dash-subtle); border: 1px solid var(--dash-border); }
        .admin-badge.active { border-color: rgba(14, 165, 233, 0.4); color: var(--dash-highlight); background: rgba(14, 165, 233, 0.05); }
        .admin-chart-container { position: relative; height: 180px; width: 100%; margin-top: 16px; margin-bottom: 16px;}
        .highlight-text { color: var(--dash-highlight); font-weight: 600; }
        .dash-tile { background: var(--dash-tile); padding: 16px; border-radius: 6px; text-align: center; border: 1px solid var(--dash-border); flex: 1; }
        body.theme-light .dash-tile { box-shadow: 0 1px 3px rgba(0,0,0,0.05); }
        .dash-tile.highlighted { border-color: rgba(14, 165, 233, 0.3); }
        .dash-tile-muted { color: var(--dash-muted); font-size: 11px; margin-bottom: 6px; text-transform: uppercase; letter-spacing: 0.5px; }
        .dash-tile-val { font-size: 22px; color: var(--dash-subtle); font-weight: 400; }
        .dash-tile-val.main { color: var(--dash-text); }
        .dash-percent-bar { height: 6px; background: var(--dash-btn); border-radius: 3px; overflow: hidden; flex: 1; }
      </style>

      <div style="margin-bottom:24px;">
        <h2 style="color:var(--dash-text); margin-bottom:8px; font-size: 20px; font-weight: 400; letter-spacing: -0.5px;">Platform Overview</h2>
        <p style="color:var(--dash-muted); font-size: 14px;">Operational analytics and metrics</p>
      </div>

      <div class="admin-dash-grid">
        
        <!-- Marketplace Section -->
        <div class="admin-dash-section">
          <div class="admin-dash-title">
            <span>Marketplace Analytics</span>
            <button class="dash-expand-btn" onclick="this.closest('.admin-dash-section').classList.toggle('expanded')">Expand</button>
          </div>
          <div style="display:flex; gap:12px; margin-bottom:12px;">
            <div class="dash-tile highlighted">
              <div class="dash-tile-muted">Today's Orders</div>
              <div class="dash-tile-val main">$4,250</div>
            </div>
            <div class="dash-tile">
              <div class="dash-tile-muted">Last Week</div>
              <div class="dash-tile-val">$28,400</div>
            </div>
            <div class="dash-tile">
              <div class="dash-tile-muted">Last Month</div>
              <div class="dash-tile-val">$114,200</div>
            </div>
          </div>
          
          <div class="admin-chart-container">
            <canvas id="chartOrders"></canvas>
          </div>

          <div class="admin-stat-label" style="margin-top:8px;">Top 10 Most Ordered Items</div>
          <table class="admin-table-mini">
            <tr><th>Item / SKU</th><th>Category</th><th>Qty Sold</th><th>Revenue</th></tr>
            <tr><td>Precision Gear (G-102)</td><td>CNC Machining</td><td>420</td><td class="highlight-text">$12,600</td></tr>
            <tr><td>Aluminum Bracket (B-34)</td><td>CNC Machining</td><td>315</td><td class="highlight-text">$8,200</td></tr>
            <tr><td>Housing Enclosure (H-98)</td><td>Injection Molding</td><td>280</td><td class="highlight-text">$14,000</td></tr>
            <tr><td>Titanium Bolt (T-01)</td><td>Hardware</td><td>1500</td><td class="highlight-text">$6,000</td></tr>
            <tr><td>Motor Mount (M-22)</td><td>Sheet Metal</td><td>185</td><td class="highlight-text">$5,100</td></tr>
            <tr><td>Nylon Standoff (N-44)</td><td>Hardware</td><td>3200</td><td class="highlight-text">$1,600</td></tr>
            <tr><td>Steel Shaft (S-77)</td><td>Turning</td><td>125</td><td class="highlight-text">$4,500</td></tr>
            <tr><td>Custom Heat Sink (HS-1)</td><td>Extrusion</td><td>95</td><td class="highlight-text">$3,800</td></tr>
            <tr><td>Bearing Block (BB-2)</td><td>Assembly</td><td>80</td><td class="highlight-text">$7,200</td></tr>
            <tr><td>Lens Retainer (LR-9)</td><td>3D Printing</td><td>210</td><td class="highlight-text">$2,100</td></tr>
          </table>
        </div>

        <!-- RFQ Pipeline Section -->
        <div class="admin-dash-section">
          <div class="admin-dash-title">
            <span>RFQ Pipeline</span>
            <button class="dash-expand-btn" onclick="this.closest('.admin-dash-section').classList.toggle('expanded')">Expand</button>
          </div>
          <div style="display:flex; justify-content:space-between; margin-bottom: 24px;" class="dash-tile">
            <div style="text-align:center;"><div class="dash-tile-val">12</div><div class="dash-tile-muted">Drafted</div></div>
            <div style="text-align:center;"><div class="dash-tile-val">5</div><div class="dash-tile-muted">Pending</div></div>
            <div style="text-align:center;"><div class="dash-tile-val">8</div><div class="dash-tile-muted">Sent</div></div>
            <div style="text-align:center;"><div class="dash-tile-val" style="color:var(--dash-highlight)">24</div><div class="dash-tile-muted" style="color:var(--dash-highlight)">Addressed</div></div>
          </div>
          
          <div class="admin-chart-container">
            <canvas id="chartRFQs"></canvas>
          </div>

          <div class="admin-stat-label">Recent High-Value RFQs</div>
          <table class="admin-table-mini">
            <tr><th>RFQ ID</th><th>Client</th><th>Est. Value</th><th>Status</th></tr>
            <tr><td>#RFQ-8821</td><td>Tesla Automotive</td><td class="highlight-text">$45,000</td><td><span class="admin-badge">Pending</span></td></tr>
            <tr><td>#RFQ-8819</td><td>Boston Dynamics</td><td class="highlight-text">$12,500</td><td><span class="admin-badge">Sent</span></td></tr>
            <tr><td>#RFQ-8815</td><td>SpaceX</td><td class="highlight-text">$84,200</td><td><span class="admin-badge active">Addressed</span></td></tr>
            <tr><td>#RFQ-8814</td><td>Medtronic</td><td class="highlight-text">$8,900</td><td><span class="admin-badge">Pending</span></td></tr>
            <tr><td>#RFQ-8810</td><td>Apple Inc.</td><td class="highlight-text">$23,500</td><td><span class="admin-badge">Sent</span></td></tr>
          </table>
        </div>

        <!-- Suppliers Section -->
        <div class="admin-dash-section">
          <div class="admin-dash-title">
            <span>Supplier Network</span>
            <button class="dash-expand-btn" onclick="this.closest('.admin-dash-section').classList.toggle('expanded')">Expand</button>
          </div>
          
          <div class="admin-stat-row">
            <span class="admin-stat-label">Total Verified</span>
            <span class="admin-stat-value" style="font-size:18px;">\${loadedSuppliers.length || 154}</span>
          </div>
          <div class="admin-stat-row">
            <span class="admin-stat-label">Awaiting Verification</span>
            <span class="admin-stat-value highlight-text" style="font-size:18px;">12</span>
          </div>
          
          <div class="admin-chart-container" style="height:220px;">
            <canvas id="chartSuppliers"></canvas>
          </div>
          
          <div class="admin-stat-label" style="margin-top:24px; margin-bottom:12px;">Supplier Split</div>
          <div style="display:flex; flex-direction:column; gap:12px;">
            <div style="display:flex; align-items:center;">
              <div style="width:140px; font-size:12px; color:var(--dash-subtle); text-transform:uppercase; letter-spacing:0.5px;">CNC Machining</div>
              <div class="dash-percent-bar"><div style="height:100%; width:45%; background:rgba(14, 165, 233, 1);"></div></div>
              <div style="width:40px; text-align:right; font-size:12px; color:var(--dash-text);">45%</div>
            </div>
            <div style="display:flex; align-items:center;">
              <div style="width:140px; font-size:12px; color:var(--dash-subtle); text-transform:uppercase; letter-spacing:0.5px;">Injection Molding</div>
              <div class="dash-percent-bar"><div style="height:100%; width:25%; background:rgba(14, 165, 233, 0.8);"></div></div>
              <div style="width:40px; text-align:right; font-size:12px; color:var(--dash-text);">25%</div>
            </div>
            <div style="display:flex; align-items:center;">
              <div style="width:140px; font-size:12px; color:var(--dash-subtle); text-transform:uppercase; letter-spacing:0.5px;">Additive Mfg</div>
              <div class="dash-percent-bar"><div style="height:100%; width:15%; background:rgba(14, 165, 233, 0.6);"></div></div>
              <div style="width:40px; text-align:right; font-size:12px; color:var(--dash-text);">15%</div>
            </div>
            <div style="display:flex; align-items:center;">
              <div style="width:140px; font-size:12px; color:var(--dash-subtle); text-transform:uppercase; letter-spacing:0.5px;">Sheet Metal</div>
              <div class="dash-percent-bar"><div style="height:100%; width:10%; background:rgba(14, 165, 233, 0.4);"></div></div>
              <div style="width:40px; text-align:right; font-size:12px; color:var(--dash-text);">10%</div>
            </div>
             <div style="display:flex; align-items:center;">
              <div style="width:140px; font-size:12px; color:var(--dash-subtle); text-transform:uppercase; letter-spacing:0.5px;">Casting</div>
              <div class="dash-percent-bar"><div style="height:100%; width:5%; background:rgba(14, 165, 233, 0.2);"></div></div>
              <div style="width:40px; text-align:right; font-size:12px; color:var(--dash-text);">5%</div>
            </div>
          </div>
        </div>

        <!-- Customers Section -->
        <div class="admin-dash-section">
          <div class="admin-dash-title">
            <span>Customer Insights</span>
            <button class="dash-expand-btn" onclick="this.closest('.admin-dash-section').classList.toggle('expanded')">Expand</button>
          </div>
          
          <div style="display:flex; gap:16px; margin-bottom:16px;">
            <div class="dash-tile">
              <div class="dash-tile-muted">Enterprise</div>
              <div class="dash-tile-val main">85</div>
            </div>
            <div class="dash-tile">
              <div class="dash-tile-muted">SMB</div>
              <div class="dash-tile-val main">320</div>
            </div>
          </div>

          <div class="admin-stat-label">Top Customers (By LTV)</div>
          <table class="admin-table-mini">
            <tr><th>Rank</th><th>Customer</th><th>Sector</th><th>Total Revenue</th></tr>
            <tr><td>#1</td><td>Tesla Automotive</td><td>Automotive</td><td class="highlight-text">$1.2M</td></tr>
            <tr><td>#2</td><td>SpaceX</td><td>Aerospace</td><td class="highlight-text">$840k</td></tr>
            <tr><td>#3</td><td>Boston Dynamics</td><td>Robotics</td><td class="highlight-text">$650k</td></tr>
            <tr><td>#4</td><td>Medtronic</td><td>Medical</td><td class="highlight-text">$420k</td></tr>
            <tr><td>#5</td><td>Apple Inc.</td><td>Consumer Tech</td><td class="highlight-text">$380k</td></tr>
            <tr><td>#6</td><td>General Dynamics</td><td>Defense</td><td class="highlight-text">$310k</td></tr>
            <tr><td>#7</td><td>Rivian</td><td>Automotive</td><td class="highlight-text">$290k</td></tr>
            <tr><td>#8</td><td>Lockheed Martin</td><td>Aerospace</td><td class="highlight-text">$210k</td></tr>
          </table>

          <div class="admin-stat-label" style="margin-top:24px;">Recent Signups</div>
          <table class="admin-table-mini">
            <tr><th>Customer</th><th>Date</th><th>Type</th></tr>
            <tr><td>NeuroLink Tech</td><td>Today</td><td><span class="admin-badge active">Enterprise</span></td></tr>
            <tr><td>Astra Space</td><td>Yesterday</td><td><span class="admin-badge active">Enterprise</span></td></tr>
            <tr><td>RoboWorks LLC</td><td>2 Days Ago</td><td><span class="admin-badge">SMB</span></td></tr>
            <tr><td>ProtoDesign Inc</td><td>3 Days Ago</td><td><span class="admin-badge">SMB</span></td></tr>
          </table>
        </div>
      </div>
      </div>
    `;

    // Render charts
    setTimeout(() => {
      // Common chart configuration
      Chart.defaults.color = chartTextColor;
      Chart.defaults.font.family = "'Inter', sans-serif";
      
      // 1. Line Chart: Marketplace Orders
      const ctxOrders = document.getElementById('chartOrders');
      if(ctxOrders) {
        new Chart(ctxOrders.getContext('2d'), {
          type: 'line',
          data: {
            labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'],
            datasets: [{
              label: 'Orders',
              data: [12, 19, 35, 52, 85, 142],
              borderColor: isLightMode ? '#0ea5e9' : '#0ea5e9',
              backgroundColor: isLightMode ? 'rgba(14, 165, 233, 0.15)' : 'rgba(14, 165, 233, 0.1)',
              borderWidth: 2,
              tension: 0.4,
              fill: true,
              pointBackgroundColor: '#0ea5e9',
            }]
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { display: false } },
            scales: {
              x: { grid: { color: chartGridColor } },
              y: { grid: { color: chartGridColor }, beginAtZero: true }
            }
          }
        });
      }

      // 2. Doughnut Chart: Suppliers by Technology
      const ctxSuppliers = document.getElementById('chartSuppliers');
      if (ctxSuppliers) {
        new Chart(ctxSuppliers.getContext('2d'), {
          type: 'doughnut',
          data: {
            labels: techLabelsArray,
            datasets: [{
              data: techDataArray,
              backgroundColor: [
                'rgba(14, 165, 233, 1)', 
                'rgba(14, 165, 233, 0.8)', 
                'rgba(14, 165, 233, 0.6)', 
                'rgba(14, 165, 233, 0.4)', 
                'rgba(14, 165, 233, 0.2)'
              ],
              borderWidth: 0,
              hoverOffset: 4
            }]
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
              legend: {
                position: 'right',
                labels: { boxWidth: 10, font: { size: 10 } }
              }
            },
            cutout: '75%'
          }
        });
      }

      // 3. Bar Chart: RFQ Pipeline
      const ctxRFQs = document.getElementById('chartRFQs');
      if (ctxRFQs) {
        new Chart(ctxRFQs.getContext('2d'), {
          type: 'bar',
          data: {
            labels: ['Drafted', 'Pending', 'Sent', 'Addressed'],
            datasets: [{
              label: 'RFQs',
              data: [18, 5, 24, 9],
              backgroundColor: [
                chartBarLight,
                chartBarMed1,
                chartBarMed2,
                '#0ea5e9'
              ],
              borderRadius: 2,
            }]
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { display: false } },
            scales: {
              x: { grid: { display: false } },
              y: { grid: { color: chartGridColor }, beginAtZero: true }
            }
          }
        });
      }
    }, 50);
  }

  // ═══════════════════════════════════════════════════════════
  //  O E M   S E L L E R S   T A B
  // ═══════════════════════════════════════════════════════════
  let oemSellersData = [];
  let oemSellersSearch = '';

  async function renderOEMSellers() {
    contentRouting.innerHTML = `<div style="text-align:center; padding:40px; color:var(--color-steel-400);">Loading OEM sellers...</div>`;

    // Fetch marketplace-type suppliers
    const { data, error } = await supabase.from('oem_sellers').select('*').order('name');
    if (error) {
      contentRouting.innerHTML = `<div style="color:#ef4444; padding:40px; text-align:center;">Error loading sellers: ${error.message}</div>`;
      return;
    }
    oemSellersData = (data || []).map(row => ({
      ...row,
      ...(row.data || {}),
      id: row.id,
      name: row.name || row.data?.name || '—',
    }));

    // Count products per seller
    const { data: prodCounts } = await supabase.from('products').select('supplier_id');
    const prodCountMap = {};
    (prodCounts || []).forEach(p => {
      if (p.supplier_id) prodCountMap[p.supplier_id] = (prodCountMap[p.supplier_id] || 0) + 1;
    });

    renderOEMSellersTable(prodCountMap);
  }

  function renderOEMSellersTable(prodCountMap = {}) {
    let filtered = oemSellersData;
    if (oemSellersSearch) {
      const q = oemSellersSearch.toLowerCase();
      filtered = oemSellersData.filter(s =>
        (s.name || '').toLowerCase().includes(q) ||
        (s.country || '').toLowerCase().includes(q) ||
        (s.industry || '').toLowerCase().includes(q) ||
        (s.id || '').toLowerCase().includes(q)
      );
    }

    const rows = filtered.map(s => {
      const contact = (s.legal_representatives || [])[0] || {};
      const prodCount = prodCountMap[s.id] || 0;
      const isOnboarded = s.onboarding_completed === true;
      const created = s.created_at ? new Date(s.created_at).toLocaleDateString() : '—';

      return `
      <tr>
        <td>
          <strong>${s.name}</strong><br>
          <span style="font-size:11px; color:var(--color-steel-400);">${s.trading_name || ''}</span>
        </td>
        <td>${s.country || '—'}</td>
        <td>${s.industry || '—'}</td>
        <td>${contact.name || '—'}<br><span style="font-size:11px; color:var(--color-steel-400);">${contact.email || ''}</span></td>
        <td style="text-align:center; font-weight:600; ${prodCount > 0 ? 'color:#22c55e;' : 'color:var(--color-steel-400);'}">${prodCount}</td>
        <td>
          <span class="admin-badge ${isOnboarded ? 'active' : 'pending'}">${isOnboarded ? 'Active' : 'Onboarding'}</span>
        </td>
        <td style="font-size:12px; color:var(--color-steel-400);">${created}</td>
        <td class="admin-table-actions"><div class="admin-table-actions-wrapper">
          <button class="admin-action-btn admin-oem-toggle" data-id="${s.id}" data-active="${s.isActive !== false}" style="font-size:11px;">${s.isActive !== false ? 'Disable' : 'Enable'}</button>
          <button class="admin-action-btn admin-oem-delete" data-id="${s.id}" style="color:#ef4444;border-color:rgba(239,68,68,.2);">Delete</button>
        </div></td>
      </tr>`;
    }).join('');

    contentRouting.innerHTML = `
      <div style="margin-bottom:20px; display:flex; justify-content:space-between; align-items:center;">
        <div style="display:flex; gap:12px; align-items:center;">
          <input type="text" id="oem-seller-search" class="admin-input-filter" placeholder="Search sellers..." value="${oemSellersSearch}" style="min-width:280px;">
          <span style="font-size:13px; color:var(--color-steel-400);">${filtered.length} seller${filtered.length !== 1 ? 's' : ''}</span>
        </div>
      </div>

      <div class="admin-table-container">
        <table class="admin-table">
          <thead><tr>
            <th style="min-width:200px;">Company</th>
            <th>Country</th>
            <th>Industry</th>
            <th>Primary Contact</th>
            <th style="text-align:center;">Products</th>
            <th>Status</th>
            <th>Joined</th>
            <th style="width:160px;">Actions</th>
          </tr></thead>
          <tbody>${rows || '<tr><td colspan="8" style="text-align:center; padding:40px; color:var(--color-steel-400);">No OEM sellers found.</td></tr>'}</tbody>
        </table>
      </div>`;

    // Bind events
    document.getElementById('oem-seller-search')?.addEventListener('input', (e) => {
      oemSellersSearch = e.target.value.trim().toLowerCase();
      renderOEMSellersTable(prodCountMap);
    });

    contentRouting.querySelectorAll('.admin-oem-toggle').forEach(btn => {
      btn.addEventListener('click', async () => {
        const id = btn.dataset.id;
        const isCurrentlyActive = btn.dataset.active === 'true';
        btn.textContent = '...';
        btn.style.pointerEvents = 'none';
        const { error } = await supabase.from('oem_sellers').update({ isActive: !isCurrentlyActive }).eq('id', id);
        if (error) { alert('Error: ' + error.message); btn.textContent = isCurrentlyActive ? 'Disable' : 'Enable'; btn.style.pointerEvents = ''; return; }
        const seller = oemSellersData.find(s => s.id === id);
        if (seller) seller.isActive = !isCurrentlyActive;
        renderOEMSellersTable(prodCountMap);
      });
    });

    contentRouting.querySelectorAll('.admin-oem-delete').forEach(btn => {
      btn.addEventListener('click', async () => {
        if (!confirm('Permanently delete this seller and all their products? This cannot be undone.')) return;
        const id = btn.dataset.id;
        btn.textContent = '...';
        btn.style.pointerEvents = 'none';
        // Delete products first, then supplier
        await supabase.from('products').delete().eq('supplier_id', id);
        const { error } = await supabase.from('oem_sellers').delete().eq('id', id);
        if (error) { alert('Error: ' + error.message); btn.textContent = 'Delete'; btn.style.pointerEvents = ''; return; }
        oemSellersData = oemSellersData.filter(s => s.id !== id);
        renderOEMSellersTable(prodCountMap);
      });
    });

    // Double-click to open seller detail
    contentRouting.querySelectorAll('tbody tr').forEach(row => {
      row.style.cursor = 'pointer';
      row.addEventListener('dblclick', () => {
        const id = row.querySelector('.admin-oem-toggle')?.dataset.id;
        if (id) renderOEMSellerDetail(id);
      });
    });
  }

  // ═══════════════════════════════════════════════════════════
  //  O E M   S E L L E R   D E T A I L   P A G E
  // ═══════════════════════════════════════════════════════════
  async function renderOEMSellerDetail(sellerId) {
    const pageTitle = document.querySelector('.admin-header h2');
    contentRouting.innerHTML = `<div style="text-align:center; padding:40px; color:var(--color-steel-400);">Loading seller profile...</div>`;

    // Fetch all data in parallel
    const [sellerRes, productsRes, ordersRes, teamRes] = await Promise.all([
      supabase.from('oem_sellers').select('*').eq('id', sellerId).single(),
      supabase.from('products').select('*').eq('supplier_id', sellerId).order('created_at', { ascending: false }),
      supabase.from('marketplace_orders').select('*').order('created_at', { ascending: false }),
      supabase.from('supplier_team_members').select('*').eq('supplier_id', sellerId).order('invited_at', { ascending: false })
    ]);

    if (sellerRes.error || !sellerRes.data) {
      contentRouting.innerHTML = `<div style="color:#ef4444; padding:40px; text-align:center;">Error: ${sellerRes.error?.message || 'Seller not found'}</div>`;
      return;
    }

    const s = { ...sellerRes.data, ...(sellerRes.data.data || {}) };
    const products = productsRes.data || [];
    const team = teamRes.data || [];

    // Filter orders that contain this seller's products
    const allOrders = ordersRes.data || [];
    const sellerProductIds = new Set(products.map(p => p.id));
    const sellerOrders = allOrders.filter(o => {
      const items = o.items || [];
      return items.some(item => sellerProductIds.has(item.id) || item.supplier_id === sellerId);
    });

    // Stats
    const totalRevenue = sellerOrders.reduce((sum, o) => sum + Number(o.grand_total || 0), 0);
    const totalOrders = sellerOrders.length;
    const totalProducts = products.length;
    const activeProducts = products.filter(p => p.stock_quantity > 0).length;

    if (pageTitle) pageTitle.textContent = `OEM — ${s.name || 'Seller Detail'}`;

    // Helpers
    const esc = v => (v || '').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    const fmtDate = d => d ? new Date(d).toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' }) : '—';
    const fmtCurrency = v => '$' + Number(v || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    const addr = a => {
      if (!a || typeof a !== 'object') return '—';
      return [a.line1, a.line2, a.city, a.state, a.postal_code, a.country].filter(Boolean).join(', ') || '—';
    };

    const contact = (s.legal_representatives || [])[0] || {};
    const salesContact = (s.key_contacts || [])[0] || {};
    const banking = s.banking_info || {};
    const certs = s.certifications || [];
    const regAddr = s.registered_address || {};
    const facAddr = s.factory_address || {};
    const whAddr = s.warehouse_address || {};

    // Badge helper
    const statusBadge = (isActive, isOnboarded) => {
      if (!isOnboarded) return '<span class="admin-badge pending">Onboarding</span>';
      return isActive !== false ? '<span class="admin-badge active">Active</span>' : '<span class="admin-badge" style="background:rgba(239,68,68,0.1);color:#ef4444;">Disabled</span>';
    };

    // Sections
    const infoField = (label, value) => `
      <div class="oem-detail-field">
        <div class="oem-detail-label">${label}</div>
        <div class="oem-detail-value">${esc(value) || '<span style="opacity:0.3;">—</span>'}</div>
      </div>`;

    // Products rows
    const productRows = products.map(p => {
      const stock = p.stock_quantity || 0;
      const stockClass = stock === 0 ? 'color:#ef4444;font-weight:700;' : 'color:#22c55e;font-weight:700;';
      const price = p.base_price ? fmtCurrency(p.base_price) : '—';
      return `<tr>
        <td><div style="display:flex;align-items:center;gap:10px;">
          <img src="${p.image_url || '/placeholder.png'}" style="width:36px;height:36px;object-fit:cover;border-radius:4px;border:1px solid rgba(255,255,255,0.08);" onerror="this.src='https://via.placeholder.com/64x64.png?text=—'">
          <div><div style="font-weight:600;font-size:13px;">${esc(p.description || p.mpn)}</div><div style="font-size:11px;color:var(--color-steel-400);">${esc(p.mpn)}</div></div>
        </div></td>
        <td style="${stockClass}">${stock.toLocaleString()}</td>
        <td style="font-weight:600;">${price}</td>
        <td style="font-size:12px;color:var(--color-steel-400);">${fmtDate(p.created_at)}</td>
        <td class="admin-table-actions"><div class="admin-table-actions-wrapper">
          <button class="admin-action-btn oem-detail-delete-product" data-id="${p.id}" style="color:#ef4444;border-color:rgba(239,68,68,.2);font-size:11px;">Delete</button>
        </div></td>
      </tr>`;
    }).join('');

    // Orders rows
    const orderRows = sellerOrders.slice(0, 20).map(o => {
      const statusMap = { paid: 'active', confirmed: 'active', pending: 'pending', cancelled: 'pending' };
      return `<tr>
        <td style="font-family:monospace;font-size:12px;">${esc(o.order_ref || o.id?.substring(0, 8))}</td>
        <td>${esc(o.user_email || '—')}</td>
        <td style="font-weight:600;">${fmtCurrency(o.grand_total)}</td>
        <td><span class="admin-badge ${statusMap[o.status] || 'pending'}">${o.status || '—'}</span></td>
        <td style="font-size:12px;color:var(--color-steel-400);">${fmtDate(o.created_at)}</td>
      </tr>`;
    }).join('');

    // Team rows
    const teamRows = team.map(m => {
      const roleColors = { admin: '#3b82f6', sales: '#22c55e', operations: '#f59e0b', viewer: '#94a3b8' };
      return `<tr>
        <td>${esc(m.full_name || '—')}</td>
        <td style="font-size:13px;color:var(--color-steel-300);">${esc(m.email)}</td>
        <td><span style="background:rgba(59,130,246,0.1);color:${roleColors[m.role] || '#94a3b8'};padding:3px 8px;border-radius:4px;font-size:11px;font-weight:600;text-transform:uppercase;">${m.role}</span></td>
        <td style="font-size:12px;text-transform:capitalize;color:${m.status === 'active' ? '#22c55e' : '#f59e0b'};">● ${m.status}</td>
      </tr>`;
    }).join('');

    // Certifications
    const certsList = certs.length > 0 ? certs.map(c => `
      <div style="display:flex;gap:10px;align-items:center;padding:8px 12px;background:var(--color-void);border:1px solid var(--color-slate-800);border-radius:var(--radius-sm);">
        <span style="font-weight:600;font-size:13px;color:var(--color-cloud);">${esc(c.type || c.cert_type || c)}</span>
        ${c.number ? `<span style="font-size:11px;color:var(--color-steel-400);">#${esc(c.number)}</span>` : ''}
        ${c.expiry ? `<span style="font-size:11px;color:var(--color-steel-400);">Exp: ${c.expiry}</span>` : ''}
      </div>`).join('') : '<span style="color:var(--color-steel-500);font-size:13px;">No certifications on file</span>';

    contentRouting.innerHTML = `
      <div class="admin-form-page" style="padding-bottom:60px;">
        <button class="admin-back-btn" id="oem-detail-back">← Back to Sellers</button>

        <!-- KPI Metrics -->
        <div class="admin-metrics-grid" style="grid-template-columns:repeat(4,1fr); margin-bottom:28px;">
          <div class="admin-metric-card">
            <div class="admin-metric-value" style="color:#3b82f6;">${totalProducts}</div>
            <div class="admin-metric-label">Total Products</div>
          </div>
          <div class="admin-metric-card">
            <div class="admin-metric-value" style="color:#22c55e;">${activeProducts}</div>
            <div class="admin-metric-label">In Stock</div>
          </div>
          <div class="admin-metric-card">
            <div class="admin-metric-value" style="color:#f59e0b;">${totalOrders}</div>
            <div class="admin-metric-label">Orders</div>
          </div>
          <div class="admin-metric-card">
            <div class="admin-metric-value" style="color:#10b981;">${fmtCurrency(totalRevenue)}</div>
            <div class="admin-metric-label">Total Revenue</div>
          </div>
        </div>

        <!-- Two-column layout for sections -->
        <div class="admin-form" style="gap:20px;">

          <!-- LEFT: Company Info -->
          <div class="admin-form-section">
            <div class="admin-form-section-title">
              <div style="display:flex;align-items:center;gap:10px;">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 21h18"/><path d="M5 21V7l8-4v18"/><path d="M19 21V11l-6-4"/><path d="M9 9h1"/><path d="M9 13h1"/><path d="M9 17h1"/></svg>
                Company Information
              </div>
              ${statusBadge(s.isActive, s.onboarding_completed)}
            </div>
            <div style="display:grid; grid-template-columns:1fr 1fr; gap:8px;">
              ${infoField('Legal Name', s.name)}
              ${infoField('Trading Name', s.trading_name)}
              ${infoField('Registration No.', s.registration_number)}
              ${infoField('Tax ID', s.tax_id)}
              ${infoField('Country', s.country)}
              ${infoField('Industry', s.industry)}
              ${infoField('Business Focus', s.segment)}
              ${infoField('Year Established', s.year_established)}
              ${infoField('Employee Count', s.employee_count)}
              ${infoField('Website', s.website)}
            </div>
            <div style="margin-top:8px;">
              ${infoField('Description', s.description)}
            </div>
            <div style="margin-top:12px;">
              <div class="oem-detail-label">Agreement</div>
              <div style="font-size:12px;color:var(--color-steel-300);">
                ${s.agreement_signed ? `✅ Signed by <strong>${esc(s.agreement_signed_by)}</strong> on ${fmtDate(s.agreement_signed_at)} (${esc(s.agreement_version)})` : '⏳ Not yet signed'}
              </div>
            </div>
            <div style="margin-top:8px;font-size:11px;color:var(--color-steel-500);">
              Owner User ID: <span style="font-family:monospace;">${s.owner_user_id || '—'}</span> &nbsp;·&nbsp; Created: ${fmtDate(s.created_at)}
            </div>
          </div>

          <!-- RIGHT: Contacts & Addresses -->
          <div style="display:flex; flex-direction:column; gap:20px;">
            <!-- Contacts -->
            <div class="admin-form-section">
              <div class="admin-form-section-title">
                <div style="display:flex;align-items:center;gap:10px;">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
                  Key Contacts
                </div>
              </div>
              <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;">
                <div>
                  <div style="font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:0.5px;color:var(--color-steel-500);margin-bottom:6px;">Legal Representative</div>
                  <div style="font-size:14px;font-weight:600;color:var(--color-cloud);">${esc(contact.name) || '—'}</div>
                  <div style="font-size:12px;color:var(--color-steel-300);">${esc(contact.title) || ''}</div>
                  <div style="font-size:12px;color:var(--color-steel-400);margin-top:4px;">${esc(contact.email) || ''}</div>
                  <div style="font-size:12px;color:var(--color-steel-400);">${esc(contact.phone) || ''}</div>
                </div>
                <div>
                  <div style="font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:0.5px;color:var(--color-steel-500);margin-bottom:6px;">Sales Contact</div>
                  <div style="font-size:14px;font-weight:600;color:var(--color-cloud);">${esc(salesContact.name) || '—'}</div>
                  <div style="font-size:12px;color:var(--color-steel-300);">${esc(salesContact.title) || ''}</div>
                  <div style="font-size:12px;color:var(--color-steel-400);margin-top:4px;">${esc(salesContact.email) || ''}</div>
                  <div style="font-size:12px;color:var(--color-steel-400);">${esc(salesContact.phone) || ''}</div>
                </div>
              </div>
            </div>

            <!-- Addresses -->
            <div class="admin-form-section">
              <div class="admin-form-section-title">
                <div style="display:flex;align-items:center;gap:10px;">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
                  Addresses
                </div>
              </div>
              <div style="display:grid;gap:10px;">
                ${infoField('Registered Address', addr(regAddr))}
                ${infoField('Factory Address', addr(facAddr))}
                ${infoField('Warehouse Address', addr(whAddr))}
              </div>
            </div>
          </div>

          <!-- Banking (full width) -->
          <div class="admin-form-section" style="grid-column:1/-1;">
            <div class="admin-form-section-title">
              <div style="display:flex;align-items:center;gap:10px;">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 21h18"/><path d="M3 10h18"/><path d="M5 6l7-3 7 3"/><line x1="4" y1="10" x2="4" y2="21"/><line x1="20" y1="10" x2="20" y2="21"/><line x1="8" y1="14" x2="8" y2="17"/><line x1="12" y1="14" x2="12" y2="17"/><line x1="16" y1="14" x2="16" y2="17"/></svg>
                Banking Information
              </div>
            </div>
            <div style="display:grid; grid-template-columns:1fr 1fr 1fr; gap:8px;">
              ${infoField('Bank Name', banking.bank_name)}
              ${infoField('Branch', banking.branch_name)}
              ${infoField('Account Name', banking.account_name)}
              ${infoField('Account Number', banking.account_number)}
              ${infoField('SWIFT/BIC', banking.swift_bic)}
              ${infoField('Currency', banking.currency)}
              ${infoField('Bank Country', banking.bank_country)}
              ${infoField('CNAPS Code', banking.cnaps_code)}
              ${infoField('IBAN', banking.iban)}
              ${infoField('Beneficiary Address', banking.beneficiary_address)}
              ${infoField('Bank Address', banking.bank_address)}
              ${infoField('Routing No.', banking.routing_number)}
            </div>
          </div>

          <!-- Certifications (full width) -->
          <div class="admin-form-section" style="grid-column:1/-1;">
            <div class="admin-form-section-title">
              <div style="display:flex;align-items:center;gap:10px;">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
                Certifications
              </div>
            </div>
            <div style="display:flex;flex-wrap:wrap;gap:8px;">
              ${certsList}
            </div>
          </div>

          <!-- Team Members (full width) -->
          <div class="admin-form-section" style="grid-column:1/-1;">
            <div class="admin-form-section-title">
              <div style="display:flex;align-items:center;gap:10px;">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
                Team Members
              </div>
              <span style="font-size:12px;color:var(--color-steel-400);font-weight:400;">${team.length} member${team.length !== 1 ? 's' : ''}</span>
            </div>
            ${team.length > 0 ? `
            <div class="admin-table-container" style="box-shadow:none;">
              <table class="admin-table">
                <thead><tr><th>Name</th><th>Email</th><th>Role</th><th>Status</th></tr></thead>
                <tbody>${teamRows}</tbody>
              </table>
            </div>` : '<div style="text-align:center;padding:20px;color:var(--color-steel-500);font-size:13px;">No team members registered</div>'}
          </div>

          <!-- Products (full width) -->
          <div class="admin-form-section" style="grid-column:1/-1;">
            <div class="admin-form-section-title">
              <div style="display:flex;align-items:center;gap:10px;">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/></svg>
                Products Catalog
              </div>
              <span style="font-size:12px;color:var(--color-steel-400);font-weight:400;">${totalProducts} product${totalProducts !== 1 ? 's' : ''}</span>
            </div>
            ${products.length > 0 ? `
            <div class="admin-table-container" style="box-shadow:none;">
              <table class="admin-table">
                <thead><tr><th style="min-width:250px;">Product</th><th>Stock</th><th>Price</th><th>Created</th><th style="width:80px;">Actions</th></tr></thead>
                <tbody>${productRows}</tbody>
              </table>
            </div>` : '<div style="text-align:center;padding:20px;color:var(--color-steel-500);font-size:13px;">No products listed</div>'}
          </div>

          <!-- Orders (full width) -->
          <div class="admin-form-section" style="grid-column:1/-1;">
            <div class="admin-form-section-title">
              <div style="display:flex;align-items:center;gap:10px;">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/><polyline points="14 2 14 8 20 8"/></svg>
                Orders History
              </div>
              <span style="font-size:12px;color:var(--color-steel-400);font-weight:400;">${sellerOrders.length} order${sellerOrders.length !== 1 ? 's' : ''}</span>
            </div>
            ${sellerOrders.length > 0 ? `
            <div class="admin-table-container" style="box-shadow:none;">
              <table class="admin-table">
                <thead><tr><th>Order Ref</th><th>Customer</th><th>Total</th><th>Status</th><th>Date</th></tr></thead>
                <tbody>${orderRows}</tbody>
              </table>
            </div>` : '<div style="text-align:center;padding:20px;color:var(--color-steel-500);font-size:13px;">No orders yet</div>'}
          </div>

        </div>

        <!-- Admin Actions Bar -->
        <div style="margin-top:24px; display:flex; gap:12px; justify-content:flex-end; padding:20px 0; border-top:1px solid var(--color-slate-800);">
          <button class="admin-action-btn" id="oem-detail-toggle" data-id="${s.id}" data-active="${s.isActive !== false}" style="padding:10px 20px; font-size:13px;">
            ${s.isActive !== false ? '⏸ Disable Seller' : '▶ Enable Seller'}
          </button>
          <button class="admin-action-btn" id="oem-detail-delete" data-id="${s.id}" style="padding:10px 20px; font-size:13px; color:#ef4444; border-color:rgba(239,68,68,0.3);">
            🗑 Delete Seller
          </button>
        </div>
      </div>`;

    // Bind events
    document.getElementById('oem-detail-back')?.addEventListener('click', () => {
      if (pageTitle) pageTitle.textContent = 'OEM — Sellers Directory';
      renderOEMSellers();
    });

    document.getElementById('oem-detail-toggle')?.addEventListener('click', async function() {
      const isCurrentlyActive = this.dataset.active === 'true';
      this.textContent = '...';
      this.style.pointerEvents = 'none';
      const { error } = await supabase.from('oem_sellers').update({ isActive: !isCurrentlyActive }).eq('id', this.dataset.id);
      if (error) { alert('Error: ' + error.message); return; }
      renderOEMSellerDetail(sellerId);
    });

    document.getElementById('oem-detail-delete')?.addEventListener('click', async function() {
      if (!confirm('Permanently delete this seller and all their products?')) return;
      this.textContent = '...';
      this.style.pointerEvents = 'none';
      await supabase.from('products').delete().eq('supplier_id', this.dataset.id);
      const { error } = await supabase.from('oem_sellers').delete().eq('id', this.dataset.id);
      if (error) { alert('Error: ' + error.message); return; }
      if (pageTitle) pageTitle.textContent = 'OEM — Sellers Directory';
      renderOEMSellers();
    });

    contentRouting.querySelectorAll('.oem-detail-delete-product').forEach(btn => {
      btn.addEventListener('click', async () => {
        if (!confirm('Delete this product?')) return;
        btn.textContent = '...';
        const { error } = await supabase.from('products').delete().eq('id', btn.dataset.id);
        if (error) { alert('Error: ' + error.message); return; }
        renderOEMSellerDetail(sellerId);
      });
    });
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
          ${((s.techGroups || [s.techGroup]).filter(Boolean)).map(tg => `<span class="tag-tech-group" style="display:inline-block;margin:1px 2px;">${tg}</span>`).join('') || '—'}
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
        const availableTechGroups = [...new Set(dynamicSupList.flatMap(s => (s.techGroups || [s.techGroup]).filter(Boolean)))].sort();
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
                const availableTechGroups = [...new Set(dynamicSupList.flatMap(s => (s.techGroups || [s.techGroup]).filter(Boolean)))].sort();
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
             <button class="btn btn-secondary" id="admin-add-rfi-btn">+ Add RFI</button>
             <input type="file" id="rfi-upload-input" accept=".xlsx" style="display:none;">
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

      document.getElementById('admin-add-rfi-btn')?.addEventListener('click', () => {
        document.getElementById('rfi-upload-input').click();
      });

      document.getElementById('rfi-upload-input')?.addEventListener('change', async (e) => {
        const file = e.target.files[0];
        if (!file) return;
        await initRfiImporter(file, async () => {
          await loadCRMData(); // Reload data explicitly to fetch new supplier
          renderSuppliersTable(false); // Refresh UI
        });
        e.target.value = ''; // Reset input so same file can be selected again
      });

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
              id: sup.id, name: sup.name, segment: sup.segment, tech_group: (sup.techGroups || [sup.techGroup]).filter(Boolean)[0] || '',
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
            id: sup.id, name: sup.name, segment: sup.segment, tech_group: (sup.techGroups || [sup.techGroup]).filter(Boolean)[0] || '',
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
              <label>Primary Tech Groups <span class="req">*</span> <span class="hint">(select one or more)</span></label>
              <div id="admin-techgroup-tags" style="display:flex;flex-wrap:wrap;gap:6px;margin-bottom:8px;min-height:32px;padding:8px;background:rgba(0,0,0,0.15);border:1px solid rgba(255,255,255,0.08);border-radius:8px;">
                ${((s.techGroups || (s.techGroup ? [s.techGroup] : [])).filter(Boolean)).map(tg => `<span class="admin-tg-tag" data-value="${tg}" style="display:inline-flex;align-items:center;gap:4px;background:rgba(94,162,255,0.12);color:#5ea2ff;border:1px solid rgba(94,162,255,0.3);padding:4px 10px;border-radius:6px;font-size:12px;font-weight:600;cursor:default;">${tg} <button type="button" class="admin-tg-remove" data-value="${tg}" style="background:none;border:none;color:#5ea2ff;cursor:pointer;font-size:14px;line-height:1;padding:0 2px;">&times;</button></span>`).join('')}
              </div>
              <div style="display:flex;gap:8px;">
                <select id="admin-form-techgroup" style="flex:1;">
                  <option value="">Add tech group…</option>
                  ${TECH_GROUPS.map(tg => `<option value="${tg}">${tg}</option>`).join('')}
                  <option value="__NEW__" style="font-weight:bold;">+ Add New Tech Group...</option>
                </select>
                <button type="button" id="admin-tg-add-btn" class="btn btn-secondary" style="padding:6px 14px;font-size:12px;white-space:nowrap;">+ Add</button>
              </div>
              <input type="text" id="admin-form-new-techgroup" name="newTechGroup" style="display:none; margin-top:8px; width:100%; box-sizing:border-box;" class="admin-input-filter" placeholder="e.g. Advanced Assembly">
              <input type="hidden" name="techGroups" id="admin-form-techgroups-hidden" value='${JSON.stringify((s.techGroups || (s.techGroup ? [s.techGroup] : [])).filter(Boolean))}'>
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
          <div class="admin-form-grid cols-2" style="margin-bottom: 10px;">
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

          <div class="admin-form-grid cols-1" style="margin-top: 8px;">
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
          
          <div style="margin: 8px 0 8px 0; font-size: 11px; font-weight: bold; color: var(--color-electric); text-transform: uppercase;">Best For</div>
          <div class="admin-field">
            <label>Best For <span class="hint">(comma-separated — what this supplier excels at)</span></label>
            <input type="text" name="bestFor" value="${(s.bestFor || []).join(', ')}" placeholder="Die Casting, Aluminium Parts, Complex Geometries…">
          </div>

          <div style="margin: 20px 0 8px 0; font-size: 11px; font-weight: bold; color: var(--color-electric); text-transform: uppercase;">Internal Capabilities</div>
          <div class="admin-field">
            <label>Internal Capabilities <span class="hint">(comma-separated — in-house processes)</span></label>
            <input type="text" name="internalCapabilities" value="${(s.internalCapabilities || []).join(', ')}" placeholder="CNC Machining, Anodizing, CMM Inspection, Tooling…">
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
          <div class="admin-form-grid cols-1" style="margin-top:16px;">
            <div class="admin-field">
              <label>Other Certifications <span class="hint">(comma-separated)</span></label>
              <input type="text" name="otherCertifications" value="${(s.otherCertifications || []).join(', ')}" placeholder="Specific Industry Standards...">
            </div>
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

          <div style="margin: 16px 0 8px 0; font-size: 11px; font-weight: bold; color: var(--color-electric); text-transform: uppercase;">Business Profile & Export</div>
          <div class="admin-form-grid cols-3">
            <div class="admin-field">
              <label>Business Type</label>
              <select name="businessType">
                <option value="" ${!s.businessType ? 'selected' : ''}>Select...</option>
                <option value="Manufacturer" ${s.businessType === 'Manufacturer' ? 'selected' : ''}>Manufacturer</option>
                <option value="Trading Company" ${s.businessType === 'Trading Company' ? 'selected' : ''}>Trading Company</option>
                <option value="OEM" ${s.businessType === 'OEM' ? 'selected' : ''}>OEM</option>
                <option value="ODM" ${s.businessType === 'ODM' ? 'selected' : ''}>ODM</option>
                <option value="Distributor" ${s.businessType === 'Distributor' ? 'selected' : ''}>Distributor</option>
                <option value="Service Provider" ${s.businessType === 'Service Provider' ? 'selected' : ''}>Service Provider</option>
              </select>
            </div>
            <div class="admin-field">
              <label>Annual Revenue <span class="hint">(text)</span></label>
              <input type="text" name="revenue" value="${s.revenue || ''}" placeholder="$5M - $10M USD">
            </div>
            <div class="admin-field">
              <label>Export Markets <span class="hint">(comma-separated)</span></label>
              <input type="text" name="exportMarkets" value="${(s.exportMarkets || []).join ? (s.exportMarkets || []).join(', ') : (s.exportMarkets || '')}" placeholder="North America, Europe, Southeast Asia">
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

          <div class="admin-form-hint" style="margin-bottom:16px;">Drag the category headers (⠿) to reorder how they appear in the app. Drag images within or between categories.</div>
          ${(() => {
            const defaultCatOrder = ['img_product', 'img_facility', 'img_equipment', 'img_certificate'];
            const savedCatOrder = s.imageCategoryOrder || [];
            const catOrder = [...savedCatOrder];
            defaultCatOrder.forEach(k => { if (!catOrder.includes(k)) catOrder.push(k); });

            const categoryHTMLMap = {
              'img_product': `
                <div class="admin-image-category admin-category-draggable" data-img-name="img_product" draggable="true" style="margin-bottom: 24px; border: 1px solid rgba(255,255,255,0.1); border-radius: 8px; padding: 16px; background: rgba(0,0,0,0.2); position: relative;">
                  <h5 style="margin-top: 0; cursor: grab; display: flex; align-items: center; gap: 8px;" class="admin-cat-drag-handle">
                    <span style="color: rgba(255,255,255,0.4); font-size:16px;">⠿</span> Product Samples
                  </h5>
                  <div class="admin-image-url-list" id="admin-sup-img-products">
                    ${(s.images?.product?.length ? s.images.product : ['']).map(url => `
                      <div class="admin-img-url-row" draggable="true">
                        <span class="admin-img-drag-handle" title="Drag to reorder or move to another category">⠿</span>
                        ${url ? `<img src="${url}" class="admin-img-thumb" referrerpolicy="no-referrer" alt="" onerror="this.style.display='none';this.nextElementSibling.style.display='flex'"><span class="admin-img-thumb-empty" style="display:none">🖼</span>` : `<span class="admin-img-thumb-empty">🖼</span>`}
                        <input type="text" name="img_product" value="${url}" placeholder="https://example.com/product-1.jpg">
                        <div class="admin-img-reorder-group">
                          <button type="button" class="admin-img-reorder-btn admin-img-move-up" title="Move up">▲</button>
                          <button type="button" class="admin-img-reorder-btn admin-img-move-down" title="Move down">▼</button>
                        </div>
                        <label class="admin-action-btn" style="cursor:pointer; display:flex; align-items:center;">
                          📤 <input type="file" style="display:none;" class="admin-s3-upload" accept="image/*">
                        </label>
                        <button type="button" class="admin-remove-row-btn">✕</button>
                      </div>
                    `).join('')}
                  </div>
                  <button type="button" class="admin-add-row-btn" data-target="admin-sup-img-products" data-name="img_product" data-accept="image/*">+ Add Product Image</button>
                </div>
              `,
              'img_facility': `
                <div class="admin-image-category admin-category-draggable" data-img-name="img_facility" draggable="true" style="margin-bottom: 24px; border: 1px solid rgba(255,255,255,0.1); border-radius: 8px; padding: 16px; background: rgba(0,0,0,0.2); position: relative;">
                  <h5 style="margin-top: 0; cursor: grab; display: flex; align-items: center; gap: 8px;" class="admin-cat-drag-handle">
                    <span style="color: rgba(255,255,255,0.4); font-size:16px;">⠿</span> Facility / Factory Floor
                  </h5>
                  <div class="admin-image-url-list" id="admin-sup-img-facility">
                    ${(s.images?.facility?.length ? s.images.facility : ['']).map(url => `
                      <div class="admin-img-url-row" draggable="true">
                        <span class="admin-img-drag-handle" title="Drag to reorder or move to another category">⠿</span>
                        ${url ? `<img src="${url}" class="admin-img-thumb" referrerpolicy="no-referrer" alt="" onerror="this.style.display='none';this.nextElementSibling.style.display='flex'"><span class="admin-img-thumb-empty" style="display:none">🖼</span>` : `<span class="admin-img-thumb-empty">🖼</span>`}
                        <input type="text" name="img_facility" value="${url}" placeholder="https://example.com/factory-1.jpg">
                        <div class="admin-img-reorder-group">
                          <button type="button" class="admin-img-reorder-btn admin-img-move-up" title="Move up">▲</button>
                          <button type="button" class="admin-img-reorder-btn admin-img-move-down" title="Move down">▼</button>
                        </div>
                        <label class="admin-action-btn" style="cursor:pointer; display:flex; align-items:center;">
                          📤 <input type="file" style="display:none;" class="admin-s3-upload" accept="image/*">
                        </label>
                        <button type="button" class="admin-remove-row-btn">✕</button>
                      </div>
                    `).join('')}
                  </div>
                  <button type="button" class="admin-add-row-btn" data-target="admin-sup-img-facility" data-name="img_facility" data-accept="image/*">+ Add Facility Image</button>
                </div>
              `,
              'img_equipment': `
                <div class="admin-image-category admin-category-draggable" data-img-name="img_equipment" draggable="true" style="margin-bottom: 24px; border: 1px solid rgba(255,255,255,0.1); border-radius: 8px; padding: 16px; background: rgba(0,0,0,0.2); position: relative;">
                  <h5 style="margin-top: 0; cursor: grab; display: flex; align-items: center; gap: 8px;" class="admin-cat-drag-handle">
                    <span style="color: rgba(255,255,255,0.4); font-size:16px;">⠿</span> Equipment / Machinery
                  </h5>
                  <div class="admin-image-url-list" id="admin-sup-img-equipment">
                    ${(s.images?.equipment?.length ? s.images.equipment : ['']).map(url => `
                      <div class="admin-img-url-row" draggable="true">
                        <span class="admin-img-drag-handle" title="Drag to reorder or move to another category">⠿</span>
                        ${url ? `<img src="${url}" class="admin-img-thumb" referrerpolicy="no-referrer" alt="" onerror="this.style.display='none';this.nextElementSibling.style.display='flex'"><span class="admin-img-thumb-empty" style="display:none">🖼</span>` : `<span class="admin-img-thumb-empty">🖼</span>`}
                        <input type="text" name="img_equipment" value="${url}" placeholder="https://example.com/cnc-machine.jpg">
                        <div class="admin-img-reorder-group">
                          <button type="button" class="admin-img-reorder-btn admin-img-move-up" title="Move up">▲</button>
                          <button type="button" class="admin-img-reorder-btn admin-img-move-down" title="Move down">▼</button>
                        </div>
                        <label class="admin-action-btn" style="cursor:pointer; display:flex; align-items:center;">
                          📤 <input type="file" style="display:none;" class="admin-s3-upload" accept="image/*">
                        </label>
                        <button type="button" class="admin-remove-row-btn">✕</button>
                      </div>
                    `).join('')}
                  </div>
                  <button type="button" class="admin-add-row-btn" data-target="admin-sup-img-equipment" data-name="img_equipment" data-accept="image/*">+ Add Equipment Image</button>
                </div>
              `,
              'img_certificate': `
                <div class="admin-image-category admin-category-draggable" data-img-name="img_certificate" draggable="true" style="margin-bottom: 24px; border: 1px solid rgba(255,255,255,0.1); border-radius: 8px; padding: 16px; background: rgba(0,0,0,0.2); position: relative;">
                  <h5 style="margin-top: 0; cursor: grab; display: flex; align-items: center; gap: 8px;" class="admin-cat-drag-handle">
                    <span style="color: rgba(255,255,255,0.4); font-size:16px;">⠿</span> Certificates Images
                  </h5>
                  <div class="admin-image-url-list" id="admin-sup-img-certs">
                    ${(s.certificates?.length ? s.certificates : ['']).map(url => `
                      <div class="admin-img-url-row" draggable="true">
                        <span class="admin-img-drag-handle" title="Drag to reorder or move to another category">⠿</span>
                        ${url ? `<img src="${url}" class="admin-img-thumb" referrerpolicy="no-referrer" alt="" onerror="this.style.display='none';this.nextElementSibling.style.display='flex'"><span class="admin-img-thumb-empty" style="display:none">🖼</span>` : `<span class="admin-img-thumb-empty">🖼</span>`}
                        <input type="text" name="img_certificate" value="${url}" placeholder="Paste an image here (Ctrl+V) or type URL">
                        <div class="admin-img-reorder-group">
                          <button type="button" class="admin-img-reorder-btn admin-img-move-up" title="Move up">▲</button>
                          <button type="button" class="admin-img-reorder-btn admin-img-move-down" title="Move down">▼</button>
                        </div>
                        <label class="admin-action-btn" style="cursor:pointer; display:flex; align-items:center;">
                          📤 <input type="file" style="display:none;" class="admin-s3-upload" accept="image/*">
                        </label>
                        <button type="button" class="admin-remove-row-btn">✕</button>
                      </div>
                    `).join('')}
                  </div>
                  <button type="button" class="admin-add-row-btn" data-target="admin-sup-img-certs" data-name="img_certificate" data-accept="image/*">+ Add Certificate Image</button>
                </div>
              `
            };

            return `
              <div id="admin-image-categories-container">
                ${catOrder.map(k => categoryHTMLMap[k]).join('')}
              </div>
            `;
          })()}
          
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

        <!-- ─── SECTION 6: Documents & Asset Management ─── -->
        <div class="admin-form-section">
          <div class="admin-form-section-title">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>
            Documents & Asset Management
          </div>
          <p class="admin-form-hint">Manage core supplier documentation. Files are securely stored in the Supabase database and can be synced directly to your secure OneDrive workspace.</p>

          <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 16px; margin-bottom: 24px;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px;">
              <div>
                <h5 style="margin:0 0 4px 0; font-size: 14px; color: #0f172a;">OneDrive Secure Storage Sync</h5>
                <p style="margin:0; font-size: 12px; color: #64748b;">Push all uploaded assets and metadata to a dedicated supplier folder in Microsoft OneDrive.</p>
              </div>
              <button type="button" id="admin-sync-onedrive-btn" class="btn btn-secondary" style="display: flex; align-items: center; gap: 6px; border-color: #cbd5e1; color: #0369a1; background: white;">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17.5 19H9a7 7 0 1 1 6.71-9h1.79a4.5 4.5 0 1 1 0 9Z"/><path d="M12 16v-6"/><path d="m9 13 3-3 3 3"/></svg>
                Sync to OneDrive
              </button>
            </div>
            
            <div class="admin-field">
              <label>RFI Onboarding Form (Excel/PDF)</label>
              <div style="display:flex; gap:8px;">
                <input type="text" name="docRFI" value="${s.docRFI || ''}" placeholder="URL to filled RFI document">
                <label class="btn btn-secondary" style="cursor:pointer; display:flex; align-items:center; padding: 0 16px;">
                  Upload <input type="file" style="display:none;" class="admin-s3-upload" accept=".pdf,.xls,.xlsx">
                </label>
              </div>
            </div>

            <div class="admin-field" style="margin-top: 12px;">
              <label>Company Presentation (PPT/PDF)</label>
              <div style="display:flex; gap:8px;">
                <input type="text" name="docPresentation" value="${s.docPresentation || ''}" placeholder="URL to company slide deck">
                <label class="btn btn-secondary" style="cursor:pointer; display:flex; align-items:center; padding: 0 16px;">
                  Upload <input type="file" style="display:none;" class="admin-s3-upload" accept=".pdf,.ppt,.pptx">
                </label>
              </div>
            </div>

            <div class="admin-field" style="margin-top: 12px;">
              <label>Quality Certifications (ZIP/PDF)</label>
              <div style="display:flex; gap:8px;">
                <input type="text" name="docCertifications" value="${s.docCertifications || ''}" placeholder="URL to quality certificates">
                <label class="btn btn-secondary" style="cursor:pointer; display:flex; align-items:center; padding: 0 16px;">
                  Upload <input type="file" style="display:none;" class="admin-s3-upload" accept=".pdf,.zip">
                </label>
              </div>
            </div>
          </div>

          <div class="admin-image-category">
            <h5>Other Downloadable Documents</h5>
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



        <!-- ─── Submit ─── -->
        <div class="admin-form-actions">
          <button type="button" class="btn btn-secondary" id="admin-sup-cancel">Cancel</button>
          <button type="submit" class="btn btn-primary">${existing ? 'Save Changes' : 'Create Supplier'}</button>
        </div>
      </form>
    </div>`;

    // Wire interactive bits
    wireFormDynamics();

    // Tech Group Multi-Tag Dynamics
    const segmentSelect = document.getElementById('admin-form-segment');
    const techGroupSelect = document.getElementById('admin-form-techgroup');
    const newTechGroupInput = document.getElementById('admin-form-new-techgroup');
    const techGroupTagsContainer = document.getElementById('admin-techgroup-tags');
    const techGroupsHidden = document.getElementById('admin-form-techgroups-hidden');
    const tgAddBtn = document.getElementById('admin-tg-add-btn');

    function getSelectedTechGroups() {
      try { return JSON.parse(techGroupsHidden.value || '[]'); } catch { return []; }
    }

    function setSelectedTechGroups(groups) {
      techGroupsHidden.value = JSON.stringify(groups);
      renderTechGroupTags();
    }

    function renderTechGroupTags() {
      const groups = getSelectedTechGroups();
      techGroupTagsContainer.innerHTML = groups.length === 0
        ? '<span style="color:rgba(255,255,255,0.3);font-size:12px;font-style:italic;">No tech groups selected</span>'
        : groups.map(tg => `<span class="admin-tg-tag" data-value="${tg}" style="display:inline-flex;align-items:center;gap:4px;background:rgba(94,162,255,0.12);color:#5ea2ff;border:1px solid rgba(94,162,255,0.3);padding:4px 10px;border-radius:6px;font-size:12px;font-weight:600;cursor:default;">${tg} <button type="button" class="admin-tg-remove" data-value="${tg}" style="background:none;border:none;color:#5ea2ff;cursor:pointer;font-size:14px;line-height:1;padding:0 2px;">&times;</button></span>`).join('');
      // Wire remove buttons
      techGroupTagsContainer.querySelectorAll('.admin-tg-remove').forEach(btn => {
        btn.addEventListener('click', () => {
          const val = btn.dataset.value;
          setSelectedTechGroups(getSelectedTechGroups().filter(g => g !== val));
        });
      });
    }

    function addTechGroup(value) {
      if (!value || value === '__NEW__') return;
      const current = getSelectedTechGroups();
      if (!current.includes(value)) {
        current.push(value);
        setSelectedTechGroups(current);
      }
      techGroupSelect.value = '';
    }

    function updateTechGroupOptions() {
      if (!segmentSelect || !techGroupSelect) return;
      const selectedTier = segmentSelect.value;
      let validGroups = [...TECH_GROUPS];
      
      if (selectedTier) {
        validGroups = [...new Set(loadedSuppliers
          .flatMap(sup => (sup.segment || '').toUpperCase() === selectedTier ? (sup.techGroups || [sup.techGroup]).filter(Boolean) : [])
        )].sort();
      }

      // Ensure currently selected groups are in the list
      const currentGroups = getSelectedTechGroups();
      currentGroups.forEach(g => { if (!validGroups.includes(g)) validGroups.push(g); });
      validGroups.sort();

      techGroupSelect.innerHTML = '<option value="">Add tech group…</option>';
      validGroups.forEach(tg => {
        const opt = document.createElement('option');
        opt.value = tg;
        opt.textContent = tg;
        techGroupSelect.appendChild(opt);
      });

      const newOpt = document.createElement('option');
      newOpt.value = '__NEW__';
      newOpt.textContent = '+ Add New Tech Group...';
      newOpt.style.fontWeight = 'bold';
      techGroupSelect.appendChild(newOpt);
    }

    function handleToggleNewTech() {
      if (techGroupSelect.value === '__NEW__') {
        newTechGroupInput.style.display = 'block';
      } else {
        newTechGroupInput.style.display = 'none';
        newTechGroupInput.value = '';
      }
    }

    tgAddBtn?.addEventListener('click', () => {
      if (techGroupSelect.value === '__NEW__') {
        const newVal = newTechGroupInput.value.trim();
        if (newVal) {
          addTechGroup(newVal);
          newTechGroupInput.value = '';
          newTechGroupInput.style.display = 'none';
          // Add to global list for future use
          if (!TECH_GROUPS.includes(newVal)) TECH_GROUPS.push(newVal);
          updateTechGroupOptions();
        }
      } else if (techGroupSelect.value) {
        addTechGroup(techGroupSelect.value);
      }
    });

    segmentSelect?.addEventListener('change', updateTechGroupOptions);
    techGroupSelect?.addEventListener('change', handleToggleNewTech);
    updateTechGroupOptions();
    renderTechGroupTags();

    document.getElementById('admin-sup-back')?.addEventListener('click', () => { pageTitle.textContent = 'Suppliers CRM Directory'; renderSuppliersTable(); });
    document.getElementById('admin-sup-cancel')?.addEventListener('click', () => { pageTitle.textContent = 'Suppliers CRM Directory'; renderSuppliersTable(); });
    document.getElementById('admin-sup-cancel-top')?.addEventListener('click', () => { pageTitle.textContent = 'Suppliers CRM Directory'; renderSuppliersTable(); });

    document.getElementById('admin-sync-onedrive-btn')?.addEventListener('click', async (e) => {
      const btn = e.currentTarget;
      const originalHTML = btn.innerHTML;
      btn.innerHTML = `<svg class="spinner" viewBox="0 0 50 50" style="width:14px;height:14px;stroke:currentColor;animation:spin 1s linear infinite;"><circle cx="25" cy="25" r="20" fill="none" stroke-width="5" stroke-linecap="round"></circle></svg> Syncing...`;
      btn.style.pointerEvents = 'none';

      try {
        // Gather supplier name from form
        const supplierName = document.querySelector('[name="name"]')?.value?.trim() || 'Unknown Supplier';
        const folderPath = `AtlasDT/Suppliers/${supplierName}`;

        // Collect all document URLs from the form
        const docFields = [
          { label: 'RFI Onboarding Form', url: document.querySelector('[name="docRFI"]')?.value?.trim() },
          { label: 'Company Presentation', url: document.querySelector('[name="docPresentation"]')?.value?.trim() },
          { label: 'Quality Certifications', url: document.querySelector('[name="docCertifications"]')?.value?.trim() },
        ];
        // Also collect other downloadable documents
        document.querySelectorAll('#admin-sup-img-docs input[name="doc_url"]').forEach((inp, i) => {
          const url = inp.value?.trim();
          if (url) docFields.push({ label: `Document_${i + 1}`, url });
        });

        const validDocs = docFields.filter(d => d.url && d.url.startsWith('http'));

        if (validDocs.length === 0) {
          alert('No documents to sync. Please upload files first and save the supplier.');
          btn.innerHTML = originalHTML;
          btn.style.pointerEvents = '';
          return;
        }

        let synced = 0;
        let failed = 0;

        for (const doc of validDocs) {
          try {
            // Derive filename from URL
            const urlParts = doc.url.split('/');
            const fileName = decodeURIComponent(urlParts[urlParts.length - 1].split('?')[0]) || `${doc.label}.pdf`;

            await fetch('/.netlify/functions/webhook-sharepoint', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                file_name: fileName,
                file_url: doc.url,
                folder_path: folderPath,
                metadata: {
                  supplier_name: supplierName,
                  document_type: doc.label,
                  synced_at: new Date().toISOString()
                }
              })
            });
            synced++;
          } catch (err) {
            console.warn(`Failed to sync ${doc.label}:`, err);
            failed++;
          }
        }

        if (failed === 0) {
          btn.innerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#10b981" stroke-width="3"><polyline points="20 6 9 17 4 12"></polyline></svg> <span style="color:#10b981;">${synced} files synced to OneDrive</span>`;
        } else {
          btn.innerHTML = `<span style="color:#f59e0b;">⚠ ${synced} synced, ${failed} failed</span>`;
        }
        setTimeout(() => {
          btn.innerHTML = originalHTML;
          btn.style.pointerEvents = '';
        }, 4000);
      } catch (err) {
        console.error('OneDrive sync failed:', err);
        btn.innerHTML = `<span style="color:#ef4444;">❌ Sync failed</span>`;
        setTimeout(() => {
          btn.innerHTML = originalHTML;
          btn.style.pointerEvents = '';
        }, 3000);
      }
    });
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
        techGroups: (() => { try { return JSON.parse(fd.get('techGroups') || '[]'); } catch { return []; } })(),
        techGroup: (() => { try { const g = JSON.parse(fd.get('techGroups') || '[]'); return g[0] || ''; } catch { return ''; } })(),
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
        bestFor: fd.get('bestFor') ? fd.get('bestFor').split(',').map(s => s.trim()).filter(Boolean) : [],
        internalCapabilities: fd.get('internalCapabilities') ? fd.get('internalCapabilities').split(',').map(s => s.trim()).filter(Boolean) : [],
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
        businessType: fd.get('businessType'),
        revenue: fd.get('revenue'),
        exportMarkets: fd.get('exportMarkets') ? fd.get('exportMarkets').split(',').map(s => s.trim()).filter(Boolean) : [],
        website: fd.get('website'),
        url: fd.get('website'),
        logo: fd.get('logo'),
        banner: fd.get('banner'),
        internalNotes: fd.get('internalNotes'),
        videoWalkthrough: fd.get('videoWalkthrough'),
        docRFI: fd.get('docRFI') || '',
        docPresentation: fd.get('docPresentation') || '',
        docCertifications: fd.get('docCertifications') || '',
        documents: fd.getAll('doc_url').filter(Boolean),
        images: {
          product: fd.getAll('img_product').filter(Boolean),
          facility: fd.getAll('img_facility').filter(Boolean),
          equipment: fd.getAll('img_equipment').filter(Boolean)
        },
        certificates: fd.getAll('img_certificate').filter(Boolean),
        imageCategoryOrder: Array.from(form.querySelectorAll('.admin-image-category')).map(c => c.dataset.imgName)
      };

      try {
        const dbPayload = {
          id: payload.id,
          name: payload.name,
          segment: payload.segment,
          tech_group: (payload.techGroups || [payload.techGroup]).filter(Boolean)[0] || '',
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
        
        // ── Auto-geocode address if lat/lng missing ──
        const addressToGeocode = payload.address || payload.addressZh || '';
        const currentLat = parseFloat(dbPayload.data?.lat || 0);
        const currentLng = parseFloat(dbPayload.data?.lng || 0);
        if (addressToGeocode && (!currentLat || !currentLng)) {
          try {
            const geoRes = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(addressToGeocode)}&limit=1`, {
              headers: { 'Accept-Language': 'en' }
            });
            const geoData = await geoRes.json();
            if (geoData && geoData.length > 0) {
              const lat = parseFloat(geoData[0].lat);
              const lng = parseFloat(geoData[0].lon);
              if (lat && lng) {
                const updatedData = { ...dbPayload.data, lat, lng };
                await supabase.from('suppliers').update({ data: updatedData }).eq('id', dbPayload.id);
                console.log(`📍 Auto-geocoded "${addressToGeocode}" → ${lat}, ${lng}`);
              }
            }
          } catch (geoErr) {
            console.warn('Geocoding failed (non-critical):', geoErr);
          }
        }

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
  //  R F Q s   T A B L E
  // ═══════════════════════════════════════════════════════════
  async function renderRFQs() {
    contentRouting.innerHTML = `
      <div class="admin-table-container">
        <div style="text-align:center; padding:40px; color:#94a3b8;">Loading RFQ data...</div>
      </div>`;

    // Fetch all RFQs
    let rfqs = [];
    try {
      const res = await fetch('/.netlify/functions/admin-rfqs');
      if (!res.ok) {
        const errData = await res.json().catch(()=>({}));
        throw new Error(errData.error || 'Failed to fetch RFQs via Netlify function');
      }
      const data = await res.json();
      rfqs = data || [];
    } catch (e) {
      console.error('[Admin RFQ] Fetch error:', e);
      contentRouting.innerHTML = `<div style="padding:40px; color:#f87171; text-align:center;">Failed to load RFQs: ${e.message}</div>`;
      return;
    }

    // Build profile lookup from loadedCustomers
    const profileMap = {};
    (loadedCustomers || []).forEach(p => {
      profileMap[p.id] = p;
    });

    const statusOptions = [
      { value: 'submitted',    label: 'Submitted',                   color: '#3b82f6' },
      { value: 'under_review', label: 'Under Review',                color: '#f59e0b' },
      { value: 'confirmed',    label: 'Confirmed (Awaiting Payment)', color: '#f59e0b' },
      { value: 'paid',         label: '🟢 Paid',                     color: '#16a34a' },
      { value: 'processing',   label: 'Processing',                  color: '#14b8a6' },
      { value: 'shipped',      label: '🚧 Shipped',                   color: '#8b5cf6' },
      { value: 'rejected',     label: '❌ Rejected',                  color: '#dc2626' },
    ];

    const serviceLabels = {
      'mfg-only': 'Manufacturing Only',
      'design-mfg': 'Design + Mfg',
      'prototype': 'Prototyping',
      'full-turnkey': 'Full Turnkey',
      'consult': 'Consultation'
    };

    if (rfqs.length === 0) {
      contentRouting.innerHTML = `
        <div class="admin-table-container" style="text-align:center; padding:60px;">
          <div style="font-size:48px; margin-bottom:16px;">📋</div>
          <div style="color:#94a3b8; font-size:15px; font-weight:500;">No RFQ submissions yet</div>
          <div style="color:#64748b; font-size:13px; margin-top:4px;">Project Quote submissions will appear here in real-time.</div>
        </div>`;
      return;
    }

    const rows = rfqs.map(rfq => {
      const data = rfq.rfq_data || {};
      const profile = profileMap[rfq.user_id] || {};
      const requesterName = [profile.first_name, profile.last_name].filter(Boolean).join(' ') || profile.email || '—';
      const requesterEmail = profile.email || '';
      const requesterCompany = profile.company || data.company || '';
      const projectName = data.project_name || 'Unnamed Project';
      const service = serviceLabels[data.service] || data.service || '—';
      const qty = data.type === 'instant' 
        ? (data.parts || []).reduce((acc, p) => acc + (Number(p.qty) || 1), 0) 
        : (data.estimated_quantity || data.quantity || '—');
      const timeline = data.timeline || '—';
      const fileCount = (data.files || []).length;
      
      const tech = data.type === 'instant' ? (data.parts && data.parts.length > 0 ? data.parts[0].process + (data.parts.length > 1 ? ` (+${data.parts.length-1})` : '') : 'Multiple') : '—';
      // Compute correct total from parts data (sum of p.price = line totals incl. shipping items)
      const computedTotal = data.type === 'instant' && data.parts?.length
        ? data.parts.reduce((acc, p) => acc + (Number(p.price) || 0), 0)
        : (data.admin_final_price || data.total_price || 0);
      const price = computedTotal ? `$${computedTotal.toLocaleString(undefined, {minimumFractionDigits: 2})}` : '—';
      const date = new Date(rfq.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
      const currentStatus = rfq.status || 'submitted';

      const statusOptionsHTML = statusOptions.map(s =>
        `<option value="${s.value}" ${s.value === currentStatus ? 'selected' : ''}>${s.label}</option>`
      ).join('');

      const currentStatusColor = (statusOptions.find(s => s.value === currentStatus) || statusOptions[0]).color;

      return `
        <tr data-rfq-id="${rfq.id}" data-status="${currentStatus}"
          data-sort-name="${projectName.toLowerCase()}"
          data-sort-requester="${requesterName.toLowerCase()}"
          data-sort-price="${computedTotal || 0}"
          data-sort-status="${currentStatus}"
          data-sort-date="${rfq.created_at || ''}">
          <td style="max-width:180px;">
            <div style="font-weight:600; color:#0f172a; font-size:13px;">${projectName}</div>
            <div style="font-size:10px; color:#64748b; font-family:'SF Mono','Fira Code',monospace; margin-top:2px; letter-spacing:0.3px;">ADT-${rfq.id.slice(0,8).toUpperCase()}</div>
          </td>
          <td>
            <div style="font-weight:500; color:#0f172a; font-size:12px;">${requesterName}</div>
            <div style="color:#94a3b8; font-size:11px;">${requesterEmail}</div>
            ${requesterCompany ? `<div style="color:#64748b; font-size:10px; font-weight:600; text-transform:uppercase; margin-top:2px;">${requesterCompany}</div>` : ''}
          </td>
          <td style="font-size:12px; color:#64748b;">${service}</td>
          <td style="font-size:12px; color:#64748b;">${tech}</td>
          <td style="font-size:12px; color:#64748b; text-align:center;">${qty}</td>
          <td style="font-size:12px; color:#10b981; text-align:right; font-weight:600;">${price}</td>
          <td style="font-size:12px; color:#64748b; text-align:center;">${fileCount}</td>
          <td>
            <select class="admin-rfq-status-select" data-rfq-id="${rfq.id}"
              style="padding:5px 8px; border-radius:6px; border:1px solid ${currentStatusColor}40; background:${currentStatusColor}15; color:${currentStatusColor}; font-size:11px; font-weight:600; cursor:pointer; font-family:inherit;">
              ${statusOptionsHTML}
            </select>
          </td>
          <td style="font-size:11px; color:#94a3b8;">${date}</td>
          <td class="admin-table-actions">
            <div class="admin-table-actions-wrapper">
              <button class="admin-action-btn admin-rfq-view-btn" data-rfq-id="${rfq.id}">View</button>
            </div>
          </td>
        </tr>`;
    }).join('');

    contentRouting.innerHTML = `
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; flex-wrap: wrap; gap: 12px;">
        <div style="display:flex; align-items:center; gap:14px;">
          <h2 style="margin:0; font-size: 20px; color: #0f172a; font-weight: 700;">RFQ Tracker</h2>
          <div style="display:flex; gap:6px;">
            <button id="admin-manual-quote-btn" style="padding:5px 12px; background:#eff6ff; color:#1d4ed8; border:1px solid #bfdbfe; border-radius:6px; font-size:11px; font-weight:700; cursor:pointer; font-family:inherit; white-space:nowrap; display:flex; align-items:center; gap:4px;">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
              Manual Quote
            </button>
            <button id="admin-manual-invoice-btn" style="padding:5px 12px; background:#f0fdf4; color:#15803d; border:1px solid #bbf7d0; border-radius:6px; font-size:11px; font-weight:700; cursor:pointer; font-family:inherit; white-space:nowrap; display:flex; align-items:center; gap:4px;">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
              Manual Invoice
            </button>
            <button id="admin-proposal-btn" style="padding:5px 12px; background:#faf5ff; color:#7c3aed; border:1px solid #ddd6fe; border-radius:6px; font-size:11px; font-weight:700; cursor:pointer; font-family:inherit; white-space:nowrap; display:flex; align-items:center; gap:4px;">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
              Project Proposal
            </button>
          </div>
        </div>
        <div style="display:flex; gap:16px;">
          <label style="display: flex; align-items: center; gap: 8px; font-size: 13px; font-weight: 500; color: #475569; cursor: pointer;">
            <input type="checkbox" id="admin-rfq-hide-rejected" style="cursor:pointer;" checked>
            Hide Rejected RFQs
          </label>
          <label style="display: flex; align-items: center; gap: 8px; font-size: 13px; font-weight: 500; color: #475569; cursor: pointer;">
            <input type="checkbox" id="admin-rfq-hide-done" style="cursor:pointer;" checked>
            Hide 'Done' RFQs
          </label>
        </div>
      </div>
      <div class="admin-table-container">
        <table class="admin-table" id="admin-rfq-table">
          <thead>
            <tr id="admin-rfq-table-head">
              <th data-sort="name" style="cursor:pointer;user-select:none;">Project Name <span class="sort-icon"></span></th>
              <th data-sort="requester" style="cursor:pointer;user-select:none;">Requester <span class="sort-icon"></span></th>
              <th>Service</th>
              <th>Tech</th>
              <th style="text-align:center;">Qty</th>
              <th data-sort="price" style="text-align:right;cursor:pointer;user-select:none;">Price <span class="sort-icon"></span></th>
              <th style="text-align:center;">Files</th>
              <th data-sort="status" style="cursor:pointer;user-select:none;">Status <span class="sort-icon"></span></th>
              <th data-sort="date" style="cursor:pointer;user-select:none;">Date <span class="sort-icon"></span></th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>${rows}</tbody>
        </table>
      </div>`;

    // Wire up column sorting for admin RFQ table
    const adminSortHead = contentRouting.querySelector('#admin-rfq-table-head');
    const adminSortBody = contentRouting.querySelector('#admin-rfq-table tbody');
    if (adminSortHead && adminSortBody) {
      adminSortHead.querySelectorAll('th[data-sort]').forEach(th => {
        let sortKey = null, sortDir = 1;
        th.addEventListener('click', () => {
          const key = th.dataset.sort;
          if (sortKey === key) { sortDir *= -1; } else { sortKey = key; sortDir = 1; }
          adminSortHead.querySelectorAll('.sort-icon').forEach(ic => ic.textContent = '');
          th.querySelector('.sort-icon').textContent = sortDir === 1 ? ' ↑' : ' ↓';
          const rows = Array.from(adminSortBody.querySelectorAll('tr[data-rfq-id]'));
          rows.sort((a, b) => {
            const camel = `sort${key.charAt(0).toUpperCase()}${key.slice(1)}`;
            let va = a.dataset[camel] || '', vb = b.dataset[camel] || '';
            if (key === 'price') return (parseFloat(va) - parseFloat(vb)) * sortDir;
            if (key === 'date')  return (new Date(va) - new Date(vb)) * sortDir;
            return va.localeCompare(vb) * sortDir;
          });
          rows.forEach(r => adminSortBody.appendChild(r));
        });
      });
    }

    const toggleDoneFilter = () => {
      const isDoneHidden = document.getElementById('admin-rfq-hide-done')?.checked;
      const isRejectedHidden = document.getElementById('admin-rfq-hide-rejected')?.checked;
      document.querySelectorAll('#admin-rfq-table tbody tr').forEach(row => {
        let show = true;
        if (row.dataset.status === 'done' && isDoneHidden) show = false;
        if (row.dataset.status === 'rejected' && isRejectedHidden) show = false;
        row.style.display = show ? '' : 'none';
      });
    };

    document.getElementById('admin-rfq-hide-done')?.addEventListener('change', toggleDoneFilter);
    document.getElementById('admin-rfq-hide-rejected')?.addEventListener('change', toggleDoneFilter);
    toggleDoneFilter();

    // Manual doc buttons
    document.getElementById('admin-manual-quote-btn')?.addEventListener('click', async () => {
      const { openManualDocModal } = await import('./services/manual-doc-modal.js');
      openManualDocModal('quotation');
    });
    document.getElementById('admin-manual-invoice-btn')?.addEventListener('click', async () => {
      const { openManualDocModal } = await import('./services/manual-doc-modal.js');
      openManualDocModal('invoice');
    });
    document.getElementById('admin-proposal-btn')?.addEventListener('click', async () => {
      const { openProposalWizard } = await import('./services/proposal-wizard.js');
      openProposalWizard();
    });

    // Status change handlers
    contentRouting.querySelectorAll('.admin-rfq-status-select').forEach(select => {
      select.addEventListener('change', async (e) => {
        const rfqId = e.target.dataset.rfqId;
        const newStatus = e.target.value;
        try {
          const res = await fetch('/.netlify/functions/admin-rfqs', {
            method: 'PATCH',
            body: JSON.stringify({ id: rfqId, updates: { status: newStatus } })
          });
          if (!res.ok) {
            const errData = await res.json().catch(()=>({}));
            throw new Error(errData.error || 'Failed to update RFQ status');
          }

          // Update visual styling
          const opt = statusOptions.find(s => s.value === newStatus);
          if (opt) {
            e.target.style.borderColor = opt.color + '40';
            e.target.style.background = opt.color + '15';
            e.target.style.color = opt.color;
          }

          // Update row state and re-apply filter
          const row = e.target.closest('tr');
          if (row) {
            row.dataset.status = newStatus;
            toggleDoneFilter();
          }
        } catch (err) {
          alert('Failed to update status: ' + err.message);
          renderRFQs(); // Reload on error
        }
      });
    });

    // View detail modal handlers
    contentRouting.querySelectorAll('.admin-rfq-view-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const rfqId = btn.dataset.rfqId;
        const rfq = rfqs.find(r => r.id === rfqId);
        if (rfq) openRFQDetailModal(rfq, profileMap, rfqs);
      });
    });

    // Double-click row handler
    contentRouting.querySelectorAll('#admin-rfq-table tbody tr[data-rfq-id]').forEach(row => {
      row.style.userSelect = 'none'; // Prevent text selection on double click
      row.addEventListener('dblclick', (e) => {
        if (e.target.closest('select') || e.target.closest('button')) return;
        const rfqId = row.dataset.rfqId;
        const rfq = rfqs.find(r => r.id === rfqId);
        if (rfq) openRFQDetailModal(rfq, profileMap, rfqs);
      });
    });
  }

  // ═══════════════════════════════════════════════════════════
  //  R F Q   D E T A I L   M O D A L
  // ═══════════════════════════════════════════════════════════
  async function openRFQDetailModal(rfq, profileMap, rfqs = []) {
    const data = rfq.rfq_data || {};

    // Fetch staff list for assignee dropdown
    let staffList = [];
    try {
      const { data: staffRows } = await supabase.from('staff').select('id, name, email');
      staffList = staffRows || [];
    } catch(_) {}

    const assigneeOptionsHTML = [
      '<option value="">Unassigned</option>',
      ...staffList.map(s => {
        const val = `${s.email}|${s.name}`;
        const sel = data.assigned_to_email === s.email ? 'selected' : '';
        return `<option value="${val}" ${sel}>${s.name} (${s.email})</option>`;
      })
    ].join('');
    const profile = profileMap[rfq.user_id] || {};
    const requesterName = [profile.first_name, profile.last_name].filter(Boolean).join(' ') || profile.email || '—';
    const requesterEmail = profile.email || '';
    const requesterCompany = profile.company || '';
    const projectName = data.project_name || 'Unnamed Project';

    const serviceLabels = {
      'mfg-only': 'Manufacturing Only',
      'design-mfg': 'Design + Manufacturing',
      'prototype': 'Prototyping',
      'full-turnkey': 'Full Turnkey (Design → Assembly)',
      'consult': 'Consultation / DFM Review'
    };
    const timelineLabels = {
      'flexible': 'Flexible',
      '4-weeks': '4 Weeks',
      '8-weeks': '8 Weeks',
      '12-weeks': '12 Weeks',
      'custom': 'Custom'
    };

    const service = serviceLabels[data.service] || data.service || '—';
    // For instant quotes, compute qty from actual part quantities
    const qty = data.type === 'instant' 
      ? (data.parts || []).reduce((acc, p) => acc + (Number(p.qty) || 1), 0) 
      : (data.estimated_quantity || data.quantity || '—');
    const timeline = timelineLabels[data.target_timeline] || data.target_timeline || timelineLabels[data.timeline] || data.timeline || '—';
    const notes = data.notes || '<span style="color:#94a3b8; font-style:italic;">No notes provided</span>';
    const contactMe = data.contact_me ? '✅ Yes' : '—';
    const files = data.type === 'instant' ? (data.parts || []) : (data.files || []);
    const date = new Date(rfq.created_at).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' });

    const statusOptions = [
      { value: 'submitted',    label: 'Submitted' },
      { value: 'under_review', label: 'Under Review' },
      { value: 'confirmed',    label: 'Confirmed (Awaiting Payment)' },
      { value: 'paid',         label: '🟢 Paid' },
      { value: 'processing',   label: 'Processing' },
      { value: 'shipped',      label: '🚧 Shipped' },
      { value: 'rejected',     label: '❌ Rejected' },
    ];
    const statusSelectHTML = statusOptions.map(s =>
      `<option value="${s.value}" ${s.value === rfq.status ? 'selected' : ''}>${s.label}</option>`
    ).join('');

    // Build file list
    const fileListHTML = files.length > 0 ? files.map((f, i) => {
      const fileName = f.name || f.file_name || `File ${i + 1}`;
      const filePath = f.storage_path || f.path || '';
      const fileSize = f.size ? `${(f.size / 1024).toFixed(1)} KB` : '';
      const bucketName = f.bucket || 'rfq-uploads';
      const downloadUrl = filePath
        ? `${import.meta.env.VITE_SUPABASE_URL || 'https://qvxrwbcmyrugjevgvujb.supabase.co'}/storage/v1/object/public/${bucketName}/${filePath}?download=${encodeURIComponent(fileName)}`
        : '#';
      return `
        <div style="display:flex; align-items:center; justify-content:space-between; padding:10px 12px; background:#f8fafc; border-radius:8px; margin-bottom:6px; border:1px solid #e2e8f0;">
          <div style="display:flex; align-items:center; gap:10px; min-width:0;">
            <span style="font-size:18px;">📄</span>
            <div style="min-width:0;">
              <div style="font-size:12px; font-weight:600; color:#0f172a; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${fileName}</div>
              ${fileSize ? `<div style="font-size:10px; color:#94a3b8;">${fileSize}</div>` : ''}
            </div>
          </div>
          <a href="${downloadUrl}" download="${fileName}" target="_blank"
            style="flex-shrink:0; padding:4px 12px; background:#3b82f610; color:#3b82f6; border:1px solid #3b82f630; border-radius:6px; font-size:11px; font-weight:600; text-decoration:none; cursor:pointer;">
            Download
          </a>
        </div>`;
    }).join('') : '<div style="color:#94a3b8; font-size:13px; font-style:italic; padding:12px 0;">No files uploaded</div>';

    const commLog = data.communication_log || [];
    const commLogHtml = commLog.map(c => `
      <div style="margin-bottom:12px; padding:10px 14px; border-radius:8px; background:${c.role === 'admin' ? '#dbeafe' : '#f1f5f9'}; border:1px solid ${c.role === 'admin' ? '#bfdbfe' : '#e2e8f0'};">
        <div style="display:flex; justify-content:space-between; margin-bottom:4px; font-size:11px; color:#64748b; font-weight:600;">
          <span>${c.role === 'admin' ? `You (${c.name})` : 'Client'}</span>
          <span>${new Date(c.date).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}</span>
        </div>
        <div style="font-size:13px; color:#0f172a; white-space:pre-wrap;">${c.text}</div>
      </div>
    `).join('');

    const hasBeenConfirmed = !!data.confirmed_price || !!data.confirmed_at || ['confirmed', 'processing', 'paid', 'shipped'].includes(rfq.status || data.status || 'submitted');
    const confirmedDateStr = data.confirmed_at ? new Date(data.confirmed_at).toLocaleDateString() : (hasBeenConfirmed ? new Date(rfq.created_at).toLocaleDateString() : '');

    // OneDrive folder URL
    const bankRefClean = `ADT-${(rfq.id||'').slice(0,8).toUpperCase()}`;
    const folderIdentifier = profile.company || [profile.first_name, profile.last_name].filter(Boolean).join(' ') || data.client_name || '';
    const companySuffix = folderIdentifier ? ` - ${folderIdentifier.replace(/[\/\\?%*:|"<>]/g, '')}` : '';
    const odName = `${bankRefClean}${companySuffix}`;
    const odBaseUrl = data.onedrive_folder_url || `https://atlasdt-my.sharepoint.com/personal/marco_atlasdt_com/Documents/AtlasDT/RFQs/${encodeURIComponent(odName)}`;
    const supaUrl = import.meta.env.VITE_SUPABASE_URL || 'https://qvxrwbcmyrugjevgvujb.supabase.co';

    const documents = Array.isArray(data.documents) ? data.documents : [];
    const overrides = data.timeline_overrides || {};
    const quotedDoc = documents.slice().reverse().find(d => d.type === 'quotation');
    const stepQuote = overrides['Quoted'] !== undefined ? overrides['Quoted'] : !!quotedDoc;
    const isQuoteLocked = (stepQuote || hasBeenConfirmed) && !data.is_amending;

    function getTimelineHTML() {
      const commLog = data.communication_log || [];
      const currentStatusForConfirm = rfq.status || data.status || 'submitted';
      const statusIdx = ['submitted', 'under_review', 'confirmed', 'paid', 'processing', 'shipped'].indexOf(currentStatusForConfirm);
      
      const stepSubmitted = overrides['Submitted'] !== undefined ? overrides['Submitted'] : true;
      const stepReview = overrides['Under Review'] !== undefined ? overrides['Under Review'] : (statusIdx >= 1 || currentStatusForConfirm !== 'submitted');
      const stepInfo = overrides['Info Req.'] !== undefined ? overrides['Info Req.'] : (commLog.length > 0);
      const stepConfirmed = overrides['Confirmed'] !== undefined ? overrides['Confirmed'] : (hasBeenConfirmed || statusIdx >= 2);
      
      const invoiceDoc = documents.slice().reverse().find(d => (d.type === 'proforma' || d.type === 'invoice'));
      const stepPaid = overrides['Paid'] !== undefined ? overrides['Paid'] : (data.payment_status === 'paid' || statusIdx >= 3);
      const stepProcessing = overrides['Processing'] !== undefined ? overrides['Processing'] : (statusIdx >= 4);
      const stepFinished = overrides['Finished'] !== undefined ? overrides['Finished'] : (statusIdx >= 5);

      const timelineSteps = [
        { label: 'Submitted', active: stepSubmitted },
        { label: 'Under Review', active: stepReview },
        { label: 'Info Req.', active: stepInfo },
        { label: 'Confirmed', active: stepConfirmed },
        { label: 'Quoted', active: stepQuote, link: odBaseUrl, linkText: quotedDoc ? 'OneDrive Folder' : 'View Quote' },
        { label: 'Paid', active: stepPaid, link: odBaseUrl, linkText: invoiceDoc ? 'OneDrive Folder' : 'View Invoice' },
        { label: 'Processing', active: stepProcessing },
        { label: 'Finished', active: stepFinished }
      ];

      return `
        <div style="display: flex; align-items: flex-start; justify-content: space-between; position: relative; padding: 16px 28px 64px 28px; background: #f8fafc; border-bottom: 1px solid #e2e8f0; flex-shrink: 0;">
          <div style="position: absolute; top: 28px; left: 60px; right: 60px; height: 2px; background: #e2e8f0; z-index: 1;"></div>
          ${timelineSteps.map((step, i) => {
            // If rejected, don't show active green tracks past Confirmed
            const blockTrack = currentStatusForConfirm === 'rejected' && i >= 3;
            const isNextActive = timelineSteps[i+1]?.active && !blockTrack;
            const showActiveTrack = step.active && isNextActive && i < timelineSteps.length - 1;
            
            return `
            <div style="display: flex; flex-direction: column; align-items: center; position: relative; z-index: 2; flex: 1;">
              ${showActiveTrack ? '<div style="position: absolute; top: 12px; left: 50%; right: -50%; height: 2px; background: #10b981; z-index: -1;"></div>' : ''}
              <div class="timeline-step-circle" data-step="${step.label}" data-active="${step.active}" style="cursor: pointer; width: 24px; height: 24px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 11px; font-weight: bold; border: 2px solid #fff; box-shadow: 0 0 0 1px ${(step.active && !blockTrack) ? '#059669' : '#cbd5e1'}; background: ${(step.active && !blockTrack) ? '#10b981' : '#f8fafc'}; color: ${(step.active && !blockTrack) ? '#fff' : '#64748b'}; transition: all 0.2s;">
                ${(step.active && !blockTrack) ? '✓' : (i + 1)}
              </div>
              <div style="font-size: 10px; font-weight: 600; color: ${(step.active && !blockTrack) ? '#0f172a' : '#64748b'}; margin-top: 6px; text-align: center; text-transform: uppercase; letter-spacing: 0.3px;">
                ${step.label}
              </div>
              ${(step.active && !blockTrack) && step.link ? `
                <a href="${step.link}" target="_blank" style="font-size: 9px; color: #3b82f6; text-decoration: none; margin-top: 2px; display: flex; align-items: center; gap: 2px;">
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path><polyline points="15 3 21 3 21 9"></polyline><line x1="10" y1="14" x2="21" y2="3"></line></svg>
                  ${step.linkText}
                </a>
              ` : '<div style="height:15px; margin-top:2px;"></div>'}
              
              ${step.label === 'Confirmed' ? `
                <div style="position: absolute; top: 24px; left: 50%; width: 2px; height: 56px; background: ${currentStatusForConfirm === 'rejected' ? '#ef4444' : '#e2e8f0'}; z-index: -1;"></div>
                <div style="position: absolute; top: 80px; left: 50%; transform: translateX(-50%); display: flex; flex-direction: column; align-items: center;">
                  <div class="timeline-step-circle" data-step="Rejected" style="cursor: pointer; width: 24px; height: 24px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 11px; font-weight: bold; border: 2px solid #fff; box-shadow: 0 0 0 1px ${currentStatusForConfirm === 'rejected' ? '#ef4444' : '#cbd5e1'}; background: ${currentStatusForConfirm === 'rejected' ? '#ef4444' : '#f8fafc'}; color: ${currentStatusForConfirm === 'rejected' ? '#fff' : '#64748b'}; transition: all 0.2s;">
                    ✕
                  </div>
                  <div style="font-size: 10px; font-weight: 600; color: ${currentStatusForConfirm === 'rejected' ? '#ef4444' : '#94a3b8'}; margin-top: 6px; text-transform: uppercase;">Rejected</div>
                </div>
              ` : ''}
              
              ${(step.label === 'Quoted' && isQuoteLocked) ? `
                <div style="position: absolute; top: 24px; left: 50%; width: 2px; height: 56px; background: #e2e8f0; z-index: -1;"></div>
                <div style="position: absolute; top: 80px; left: 50%; transform: translateX(-50%); display: flex; flex-direction: column; align-items: center;">
                  <button id="admin-amend-quote-timeline-btn" style="cursor: pointer; padding: 4px 10px; border-radius: 12px; font-size: 10px; font-weight: 700; background: #fef08a; color: #854d0e; border: 1px solid #fde047; transition: all 0.2s; white-space: nowrap;">
                    AMEND ORDER
                  </button>
                </div>
              ` : ''}
              
              ${(step.label === 'Paid' && statusIdx >= 3) ? `
                <div style="position: absolute; top: 24px; left: 50%; width: 2px; height: 56px; background: #e2e8f0; z-index: -1;"></div>
                <div style="position: absolute; top: 80px; left: 50%; transform: translateX(-50%); display: flex; flex-direction: column; gap: 6px; align-items: center;">
                  <button class="admin-refund-order-btn" data-rfq-id="${rfq.id}" style="cursor: pointer; padding: 4px 10px; border-radius: 12px; font-size: 10px; font-weight: 700; background: ${data.payment_status === 'refunded' ? '#dcfce7' : '#ffedd5'}; color: ${data.payment_status === 'refunded' ? '#15803d' : '#9a3412'}; border: 1px solid ${data.payment_status === 'refunded' ? '#bbf7d0' : '#fdba74'}; transition: all 0.2s; white-space: nowrap;">
                    ${data.payment_status === 'refunded' ? 'Refunded ✓' : 'Refund'}
                  </button>
                </div>
              ` : ''}
              
              ${(step.label === 'Processing') ? `
                <div style="position: absolute; top: 24px; left: 50%; width: 2px; height: 56px; background: #e2e8f0; z-index: -1;"></div>
                <div style="position: absolute; top: 80px; left: 50%; transform: translateX(-50%); display: flex; flex-direction: column; gap: 6px; align-items: center;">
                  <button class="admin-cancel-order-btn" data-rfq-id="${rfq.id}" style="cursor: pointer; padding: 4px 10px; border-radius: 12px; font-size: 10px; font-weight: 700; background: #fee2e2; color: #991b1b; border: 1px solid #fca5a5; transition: all 0.2s; white-space: nowrap;">
                    Cancel Order
                  </button>
                </div>
              ` : ''}
            </div>
          `}).join('')}
        </div>`;
    }

    const confirmBtnHtml = hasBeenConfirmed 
      ? `<button id="rfq-confirm-client-btn" data-rfq-id="${rfq.id}" disabled
             style="padding:6px 12px; height:32px; background:#f1f5f9; color:#16a34a; border:1px solid #bbf7d0; border-radius:8px; font-size:11px; font-weight:700; cursor:default; font-family:inherit; display:flex; align-items:center; gap:6px; box-sizing:border-box; white-space:nowrap;">
             <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>
             Confirmed ${confirmedDateStr ? `<span style="color:#94a3b8;font-weight:500;font-size:10px;">${confirmedDateStr}</span>` : ''}
           </button>`
      : `<button id="rfq-confirm-client-btn" data-rfq-id="${rfq.id}"
            style="padding:0 20px; height:40px; background:linear-gradient(135deg,#16a34a,#15803d); color:#fff; border:none; border-radius:8px; font-size:14px; font-weight:800; cursor:pointer; font-family:inherit; display:flex; align-items:center; gap:8px; box-shadow:0 4px 12px rgba(22,163,74,0.4); box-sizing: border-box; white-space:nowrap;">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>
            Confirm to Customer
          </button>`;

    const modal = document.createElement('div');
    modal.id = 'admin-rfq-detail-modal';
    modal.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.5);backdrop-filter:blur(6px);z-index:9999;display:flex;align-items:center;justify-content:center;padding:16px;';
    modal.innerHTML = `
      <div style="background:#fff;border-radius:20px;width:1020px;max-width:96vw;max-height:92vh;display:flex;flex-direction:column;overflow:hidden;box-shadow:0 32px 64px rgba(0,0,0,0.3);font-family:Inter,sans-serif;">

        <!-- ── Sticky Header ── -->
        <div style="padding:20px 28px; border-bottom:1px solid #e2e8f0; display:flex; justify-content:space-between; align-items:center; background:#fff; flex-shrink:0;">
          <div>
            <div style="font-size:11px; font-weight:700; color:#3b82f6; text-transform:uppercase; letter-spacing:0.6px; margin-bottom:4px;">RFQ Detail — Admin View</div>
            <h2 style="margin:0; font-size:20px; color:#0f172a; font-weight:700;">${projectName}</h2>
            <div style="display:flex; align-items:center; gap:10px; margin-top:4px; flex-wrap:wrap;">
              <span style="font-size:12px; color:#94a3b8;">Submitted ${date}</span>
              <span style="font-size:11px; color:#94a3b8;">·</span>
              <!-- Bank reference — always shown, key for reconciliation -->
              <span style="display:inline-flex; align-items:center; gap:6px; background:#f1f5f9; border:1px solid #e2e8f0; border-radius:6px; padding:3px 10px;">
                <span style="font-size:10px; color:#64748b; font-weight:600; text-transform:uppercase;">Ref</span>
                <span style="font-size:12px; font-weight:800; color:#0f172a; font-family:'SF Mono','Fira Code',monospace; letter-spacing:0.5px;">ADT-${(rfq.id||'').slice(0,8).toUpperCase()}</span>
                <button onclick="navigator.clipboard.writeText('ADT-${(rfq.id||'').slice(0,8).toUpperCase()}').then(()=>{this.textContent='✓';this.style.color='#16a34a';setTimeout(()=>{this.textContent='⎘';this.style.color='';},1500)})"
                  style="background:none;border:none;cursor:pointer;font-size:13px;color:#94a3b8;padding:0;line-height:1;" title="Copy reference">⎘</button>
              </span>
              ${data.payment_method === 'bank_transfer' ? `<span style="background:#fef9c3; color:#854d0e; font-size:10px; font-weight:700; padding:2px 8px; border-radius:10px; border:1px solid #fde68a;">🏦 BANK TRANSFER</span>` : ''}
              ${data.payment_method === 'stripe' ? `<span style="background:#eff6ff; color:#1d4ed8; font-size:10px; font-weight:700; padding:2px 8px; border-radius:10px; border:1px solid #bfdbfe;">💳 STRIPE</span>` : ''}
            </div>
          </div>
          <button id="rfq-modal-close" style="background:none; border:none; font-size:26px; cursor:pointer; color:#94a3b8; line-height:1; padding:4px 8px; border-radius:6px;">&times;</button>
        </div>

        <!-- ── Timeline ── -->
        <div id="rfq-timeline-wrapper">
          ${getTimelineHTML()}
        </div>


        <!-- ── Action Bar Row 1: Status & Assigned To ── -->
        <div style="padding:10px 28px; background:#fff; border-bottom:1px solid #e2e8f0; display:flex; justify-content:space-between; align-items:center; flex-shrink:0;">
          <div style="display:flex; align-items:center; gap:8px;">
            <label style="font-size:11px; font-weight:700; color:#64748b; text-transform:uppercase; letter-spacing:0.5px;">Status</label>
            <select id="rfq-modal-status" data-rfq-id="${rfq.id}"
              style="padding:7px 12px; border-radius:8px; border:1px solid #e2e8f0; font-size:13px; font-weight:600; cursor:pointer; font-family:inherit; background:#fff; min-width:200px;">
              ${statusSelectHTML}
            </select>
          </div>
          <div style="display:flex; align-items:center; gap:8px;">
            <label style="font-size:11px; font-weight:700; color:#64748b; text-transform:uppercase; letter-spacing:0.5px;">Assigned To</label>
            <select id="rfq-modal-assignee" data-rfq-id="${rfq.id}"
              style="padding:7px 12px; border-radius:8px; border:1px solid #e2e8f0; font-size:13px; font-weight:600; cursor:pointer; font-family:inherit; background:#fff; min-width:200px;">
              ${assigneeOptionsHTML}
            </select>
          </div>
        </div>

        <!-- ── Action Bar Row 2: Pricing & Actions ── -->
        <div style="padding:14px 28px; background:#f8fafc; border-bottom:1px solid #e2e8f0; display:flex; align-items:center; justify-content:space-between; flex-wrap:nowrap; gap:16px; flex-shrink:0;">
          <div style="display:flex; align-items:flex-end; gap:8px; flex-shrink:0;">
            <div style="display:flex; flex-direction:column; gap:4px;">
              <label style="font-size:10px; font-weight:700; color:#64748b; text-transform:uppercase; letter-spacing:0.5px;">Final Price (USD)</label>
              <input id="rfq-modal-final-price" type="number" step="0.01" min="0" oninput="this.value = this.value.replace(/[^0-9.]/g, '').replace(/(\\..*)\\./g, '$1'); if(this.value.includes('.')){ const parts = this.value.split('.'); if(parts[1].length > 2) this.value = parts[0] + '.' + parts[1].slice(0,2); }"
              <input id="rfq-modal-final-price" type="number" step="0.01" min="0" oninput="this.value = this.value.replace(/[^0-9.]/g, '').replace(/(\\..*)\\./g, '$1'); if(this.value.includes('.')){ const parts = this.value.split('.'); if(parts[1].length > 2) this.value = parts[0] + '.' + parts[1].slice(0,2); }"
                value="${data.admin_final_price || data.total_price || ''}"
                placeholder="0.00"
                ${isQuoteLocked ? 'disabled' : ''}
                style="padding:6px 10px; border-radius:6px; border:1px solid #e2e8f0; font-size:13px; font-weight:600; font-family:inherit; width:90px; background:${isQuoteLocked ? '#f1f5f9' : '#fff'}; height: 32px; box-sizing: border-box; color: ${isQuoteLocked ? '#94a3b8' : 'inherit'};">
            </div>
            <button id="rfq-save-price-btn" data-rfq-id="${rfq.id}"
              style="padding:0 12px; height: 32px; background:#0f172a; color:#fff; border:none; border-radius:6px; font-size:12px; font-weight:600; cursor:pointer; font-family:inherit; box-sizing: border-box; display: ${isQuoteLocked ? 'none' : 'block'};">Update</button>
          </div>
          
          <!-- Actions on the right -->
          <div style="display:flex; align-items:center; gap:8px; flex-wrap:nowrap; overflow-x:auto;">
            ${confirmBtnHtml}
            ${(data.payment_method === 'bank_transfer' && !['paid','shipped','done'].includes(rfq.status)) ? `
            <button id="rfq-confirm-bank-payment-btn" data-rfq-id="${rfq.id}"
              style="padding:6px 12px; height:32px; background:linear-gradient(135deg,#059669,#047857); color:#fff; border:none; border-radius:8px; font-size:11px; font-weight:700; cursor:pointer; display:flex; align-items:center; gap:5px; font-family:inherit; box-sizing:border-box; white-space:nowrap; box-shadow:0 2px 8px rgba(5,150,105,0.3);">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>
              Confirm Payment Received
            </button>` : ''}
            <button id="rfq-generate-quote-btn" style="padding:6px 10px; height:32px; background:#fff; color:#0f172a; border:1px solid #e2e8f0; border-radius:6px; font-size:11px; font-weight:600; cursor:pointer; display:${isQuoteLocked ? 'none' : 'flex'}; align-items:center; gap:4px; font-family:inherit; box-sizing: border-box; white-space:nowrap;" title="Generate Formal Quotation">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>
              Quote
            </button>
            <button id="rfq-generate-invoice-btn" style="padding:6px 10px; height:32px; background:#fff; color:#0f172a; border:1px solid #e2e8f0; border-radius:6px; font-size:11px; font-weight:600; cursor:pointer; display:${isQuoteLocked ? 'none' : 'flex'}; align-items:center; gap:4px; font-family:inherit; box-sizing: border-box; white-space:nowrap;" title="Generate Proforma/Commercial Invoice">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>
              Invoice
            </button>
            <button id="rfq-request-info-btn" style="padding:6px 10px; height:32px; background:#eff6ff; color:#2563eb; border:1px solid #bfdbfe; border-radius:6px; font-size:11px; font-weight:600; cursor:pointer; display:flex; align-items:center; gap:4px; font-family:inherit; box-sizing: border-box; white-space:nowrap;" title="Ask the client for more details via email">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
              Req Info
            </button>
            <button id="rfq-reject-btn" style="padding:6px 10px; height:32px; background:#fff7ed; color:#ea580c; border:1px solid #fed7aa; border-radius:6px; font-size:11px; font-weight:600; cursor:pointer; display:flex; align-items:center; gap:4px; font-family:inherit; box-sizing: border-box; white-space:nowrap;">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>
              Reject
            </button>
            <button id="rfq-delete-btn" style="padding:6px 10px; height:32px; background:#fee2e2; color:#dc2626; border:1px solid #fecaca; border-radius:6px; font-size:11px; font-weight:600; cursor:pointer; display:flex; align-items:center; gap:4px; font-family:inherit; box-sizing: border-box; white-space:nowrap;" title="Permanently delete from DB — dev use">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 6h18"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
              Delete
            </button>
          </div>
        </div>


        <!-- Reject reason panel (hidden by default) -->
        <div id="rfq-reject-panel" style="display:${rfq.status === 'rejected' && !data.rejection_notified ? 'block' : 'none'}; padding:12px 28px; background:#fff7ed; border-bottom:2px solid #fed7aa;">
          <div style="font-size:12px; font-weight:700; color:#9a3412; margin-bottom:6px;">Rejection Reason(s) — will be emailed to the client as bullet points</div>
          <textarea id="rfq-reject-reason" rows="3" placeholder="e.g. Insufficient technical specification&#10;Quantity below minimum order&#10;Material not available in requested tolerance"
            style="width:100%; padding:10px 12px; border-radius:8px; border:1px solid #fed7aa; font-size:13px; font-family:inherit; resize:vertical; background:#fff; color:#0f172a; outline:none;">${data.rejected_reason || ''}</textarea>
          <div style="display:flex; gap:8px; margin-top:8px; justify-content:flex-end;">
            <button id="rfq-reject-cancel-btn" style="padding:7px 14px; background:#fff; border:1px solid #e2e8f0; border-radius:8px; font-size:12px; font-weight:600; cursor:pointer; font-family:inherit; color:#64748b;">Cancel</button>
            <button id="rfq-reject-confirm-btn" style="padding:7px 16px; background:#ea580c; color:#fff; border:none; border-radius:8px; font-size:12px; font-weight:700; cursor:pointer; font-family:inherit;">Send Rejection &amp; Notify Client</button>
          </div>
        </div>
        ${data.rejection_notified ? `
        <div style="padding:8px 28px; background:#fef2f2; border-bottom:1px solid #fecaca; display:flex; align-items:center; gap:8px;">
          <span style="font-size:12px; color:#991b1b; font-weight:600;">✉️ Rejection notification sent${data.rejection_notified_at ? ' on ' + new Date(data.rejection_notified_at).toLocaleDateString() : ''}</span>
        </div>` : ''}

        <!-- Request info panel (hidden by default) -->
        <div id="rfq-request-info-panel" style="display:${commLog.length > 0 ? 'block' : 'none'}; padding:12px 28px; background:#eff6ff; border-bottom:2px solid #bfdbfe;">
          <div style="font-size:12px; font-weight:700; color:#1e3a8a; margin-bottom:12px;">Request More Information / Communication History</div>
          
          <div id="rfq-comm-log-container" style="margin-bottom:12px; display:${commLog.length > 0 ? 'block' : 'none'};">
            ${commLogHtml}
          </div>

          <textarea id="rfq-request-info-msg" rows="3" placeholder="e.g. Please clarify the tolerances for part X, or upload the missing STP file."
            style="width:100%; padding:10px 12px; border-radius:8px; border:1px solid #bfdbfe; font-size:13px; font-family:inherit; resize:vertical; background:#fff; color:#0f172a; outline:none;"></textarea>
          <div style="display:flex; gap:8px; margin-top:8px; justify-content:flex-end;">
            <button id="rfq-request-info-cancel-btn" style="padding:7px 14px; background:#fff; border:1px solid #e2e8f0; border-radius:8px; font-size:12px; font-weight:600; cursor:pointer; font-family:inherit; color:#64748b;">Close</button>
            <button id="rfq-request-info-confirm-btn" style="padding:7px 16px; background:#2563eb; color:#fff; border:none; border-radius:8px; font-size:12px; font-weight:700; cursor:pointer; font-family:inherit;">Send Request &amp; Notify Client</button>
          </div>
        </div>


        <!-- Amend Quote panel (hidden by default) -->
        <div id="rfq-amend-panel" style="display:none; padding:12px 28px; background:#fefce8; border-bottom:2px solid #fef08a;">
          <div style="font-size:12px; font-weight:700; color:#854d0e; margin-bottom:6px;">Reason for Amending Quote / Invoice</div>
          <textarea id="rfq-amend-reason" rows="2" placeholder="e.g. Client requested a change in quantity, fixing a typo, etc."
            style="width:100%; padding:10px 12px; border-radius:8px; border:1px solid #fef08a; font-size:13px; font-family:inherit; resize:vertical; background:#fff; color:#0f172a; outline:none;"></textarea>
          <div style="display:flex; gap:8px; margin-top:8px; justify-content:flex-end;">
            <button id="rfq-amend-cancel-btn" style="padding:7px 14px; background:#fff; border:1px solid #e2e8f0; border-radius:8px; font-size:12px; font-weight:600; cursor:pointer; font-family:inherit; color:#64748b;">Cancel</button>
            <button id="rfq-amend-confirm-btn" style="padding:7px 16px; background:#ca8a04; color:#fff; border:none; border-radius:8px; font-size:12px; font-weight:700; cursor:pointer; font-family:inherit;">Unlock for Editing</button>
          </div>
        </div>

        <!-- ── Body (scrollable) ── -->
        <div style="flex:1; overflow-y:auto; padding:28px; display:flex; flex-direction:column; gap:24px;">

          <!-- INFO ROW — single horizontal line -->
          <div style="display:flex; gap:12px; flex-wrap:nowrap; align-items:stretch;">

            <!-- Requester -->
            <div style="background:#f0f9ff; padding:14px 18px; border-radius:12px; border:1px solid #bae6fd; min-width:180px; flex:1.2;">
              <div style="font-size:9px; color:#0369a1; text-transform:uppercase; font-weight:700; letter-spacing:0.5px; margin-bottom:6px;">Requester</div>
              <div style="font-size:14px; color:#0f172a; font-weight:700; line-height:1.3;">${requesterName}</div>
              ${requesterEmail ? `<a href="mailto:${requesterEmail}" style="font-size:11px; color:#0369a1; margin-top:3px; display:block; text-decoration:none;">${requesterEmail}</a>` : ''}
              ${requesterCompany ? `<div style="font-size:11px; color:#64748b; margin-top:1px;">${requesterCompany}</div>` : ''}
            </div>

            <!-- Service -->
            <div style="background:#f8fafc; padding:14px 18px; border-radius:12px; border:1px solid #f1f5f9; flex:0.8;">
              <div style="font-size:9px; color:#94a3b8; text-transform:uppercase; font-weight:600; margin-bottom:4px;">Service</div>
              <div style="font-size:13px; color:#0f172a; font-weight:600;">${service}</div>
            </div>

            <!-- Quantity -->
            <div style="background:#f8fafc; padding:14px 18px; border-radius:12px; border:1px solid #f1f5f9; flex:0.5;">
              <div style="font-size:9px; color:#94a3b8; text-transform:uppercase; font-weight:600; margin-bottom:4px;">Quantity</div>
              <div id="admin-qty-display" style="font-size:13px; color:#0f172a; font-weight:600;">${qty}</div>
            </div>

            <!-- Timeline -->
            <div style="background:#f8fafc; padding:14px 18px; border-radius:12px; border:1px solid #f1f5f9; flex:0.6;">
              <div style="font-size:9px; color:#94a3b8; text-transform:uppercase; font-weight:600; margin-bottom:4px;">Timeline</div>
              <div style="font-size:13px; color:#0f172a; font-weight:600;">${timeline}</div>
            </div>
            ${data.type === 'instant' ? `
            <div style="background:${data.payment_status === 'paid' ? '#f0fdf4' : '#f0fdf4'}; padding:14px 18px; border-radius:12px; border:1px solid ${data.payment_status === 'paid' ? '#86efac' : '#bbf7d0'}; flex:1;">
                <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:4px;">
                  <div style="font-size:10px; color:#166534; text-transform:uppercase; font-weight:600;">${data.payment_status === 'paid' ? '💳 Amount Paid' : 'Quoted Total'}</div>
                  ${data.payment_status === 'paid' ? `<span style="background:#16a34a; color:#fff; font-size:9px; font-weight:800; padding:2px 7px; border-radius:20px; letter-spacing:0.5px;">PAID</span>` : ''}
                </div>
                <div id="admin-quoted-total-display" style="font-size:15px; color:#15803d; font-weight:800;">US$${(data.amount_paid || data.admin_final_price || data.total_price || 0).toLocaleString(undefined, {minimumFractionDigits:2, maximumFractionDigits:2})}</div>
                ${data.paid_at ? `<div style="font-size:11px; color:#4ade80; margin-top:4px;">Paid ${new Date(data.paid_at).toLocaleDateString('en-US',{day:'numeric',month:'short',year:'numeric',hour:'2-digit',minute:'2-digit'})}</div>` : ''}
              </div>` : `
            <div style="background:#f8fafc; padding:14px 18px; border-radius:12px; border:1px solid #f1f5f9; flex:0.8;">
              <div style="font-size:9px; color:#94a3b8; text-transform:uppercase; font-weight:600; margin-bottom:4px;">Contact Requested</div>
              <div style="font-size:13px; color:#0f172a; font-weight:600;">${contactMe}</div>
            </div>`}
          </div>

            <!-- Notes row — side by side -->
            <div style="display:grid; grid-template-columns:1fr 1fr; gap:16px;">
              <div>
                <div style="font-size:10px; color:#94a3b8; text-transform:uppercase; font-weight:700; letter-spacing:0.5px; margin-bottom:8px;">Client Notes</div>
                <div style="background:#f8fafc; padding:14px; border-radius:10px; border:1px solid #f1f5f9; font-size:13px; line-height:1.6; color:#334155; min-height:70px;">${notes}</div>
              </div>
              <div>
                <div style="font-size:10px; color:#94a3b8; text-transform:uppercase; font-weight:700; letter-spacing:0.5px; margin-bottom:8px;">Internal Notes (Admin Only)</div>
                <textarea id="rfq-admin-notes" rows="3" placeholder="Add internal notes, pricing rationale, supplier contacts..."
                  style="width:100%; box-sizing:border-box; padding:12px 14px; border-radius:10px; border:1px solid #e2e8f0; font-size:13px; font-family:inherit; line-height:1.6; color:#334155; resize:vertical; background:#fff;">${data.admin_notes || ''}</textarea>
                <button id="rfq-save-notes-btn" data-rfq-id="${rfq.id}"
                  style="margin-top:6px; padding:6px 14px; background:#0f172a; color:#fff; border:none; border-radius:8px; font-size:11px; font-weight:600; cursor:pointer; font-family:inherit;">Save Notes</button>
              </div>
            </div>

          <!-- FULL-WIDTH PARTS -->
            ${data.type === 'instant' ? `
            <div>
              <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:10px;">
              <div style="display:flex; align-items:center; gap:10px;">
                <div style="font-size:11px; color:#0f172a; text-transform:uppercase; font-weight:800; letter-spacing:0.5px;">Quoted Parts (<span id="admin-parts-count">${data.parts?.length || 0}</span>)</div>
                <button id="rfq-download-all-parts-btn" style="padding:4px 10px; background:#f1f5f9; color:#475569; border:1px solid #e2e8f0; border-radius:6px; font-size:10px; font-weight:600; cursor:pointer;">Download All</button>
                <button id="rfq-open-onedrive-btn" style="padding:4px 10px; background:#eff6ff; color:#2563eb; border:1px solid #bfdbfe; border-radius:6px; font-size:10px; font-weight:600; cursor:pointer;">OneDrive</button>
              </div>
              <button id="admin-add-part-btn" style="padding:4px 8px; background:#eff6ff; color:#2563eb; border:1px solid #bfdbfe; border-radius:6px; font-size:10px; font-weight:600; cursor:pointer; display:${isQuoteLocked ? 'none' : 'block'};">+ Add Line</button>
              </div>
              <div style="border:1px solid #e2e8f0; border-radius:12px; overflow:hidden;">
                <table id="rfq-admin-parts-table" style="width:100%; border-collapse:collapse; font-size:12px;">
                  <thead style="background:#f8fafc;">
                    <tr style="border-bottom:1px solid #e2e8f0; text-align:left;">
                      <th style="padding:10px 14px; width:30px;"></th>
                    <th style="padding:10px 14px; font-weight:600; color:#475569;">Part Name</th>
                    <th style="padding:10px 14px; font-weight:600; color:#475569;">Technology</th>
                    <th style="padding:10px 14px; font-weight:600; color:#475569;">Material</th>
                    <th style="padding:10px 14px; font-weight:600; color:#475569; width:60px;">Qty</th>
                    <th style="padding:10px 14px; font-weight:600; color:#475569; width:90px;">Unit Cost</th>
                    <th style="padding:10px 14px; font-weight:600; color:#475569; width:100px;">Line Total</th>
                    <th style="padding:10px 14px; font-weight:600; color:#475569; width:100px;">Actions</th>
                    <th style="padding:10px 8px; width:30px;"></th>
                    </tr>
                  </thead>
                  <tbody id="rfq-admin-parts-tbody">
                    <!-- Rendered by renderAdminPartsTable() -->
                  </tbody>
                </table>
              </div>
            </div>
            ` : `
            <div>
              <div style="display:flex; align-items:center; justify-content:space-between; margin-bottom:10px;">
                <div style="font-size:10px; color:#94a3b8; text-transform:uppercase; font-weight:700; letter-spacing:0.5px;">Project Files (${files.length})</div>
                ${files.length > 1 ? `<button id="rfq-download-all-btn" style="padding:6px 12px; background:#3b82f6; color:#fff; border:none; border-radius:6px; font-size:11px; font-weight:600; cursor:pointer; font-family:inherit;">Download All</button>` : ''}
              </div>
              ${fileListHTML}
            </div>`}

        </div>
      </div>`;

    document.body.appendChild(modal);

    // ── Admin Parts Table Logic ──
    const partsTbody = modal.querySelector('#rfq-admin-parts-tbody');
    const partsTableEl = modal.querySelector('#rfq-admin-parts-table');
    
    function updateAdminPartsTotal() {
      // p.price = line total from quote engine (unitPrice × qty + tooling)
      // Sum all parts directly — shipping line items are already included as parts
      let total = 0;
      let totalQty = 0;
      (data.parts || []).forEach(p => {
        total += (Number(p.price) || 0);
        totalQty += (Number(p.qty) || 1);
      });

      const finalPriceInp = modal.querySelector('#rfq-modal-final-price');
      if (finalPriceInp) finalPriceInp.value = total.toFixed(2);
      
      const quotedTotalDisp = modal.querySelector('#admin-quoted-total-display');
      if (quotedTotalDisp) quotedTotalDisp.textContent = 'US$' + total.toLocaleString(undefined, {minimumFractionDigits:2, maximumFractionDigits:2});

      // Update quantity display on left panel
      const qtyDisp = modal.querySelector('#admin-qty-display');
      if (qtyDisp) qtyDisp.textContent = totalQty;

      // Update parts count
      const countSpan = modal.querySelector('#admin-parts-count');
      if (countSpan) countSpan.textContent = (data.parts || []).length;

      // Sync data totals
      data.total_price = total;
      data.estimated_quantity = totalQty;
    }

    function renderAdminPartsTable() {
       if (!partsTbody) return;
       partsTbody.innerHTML = (data.parts || []).map((p, i) => {
         const hasFile = !!p.storage_path;
         const ext = (p.storage_path||'').split('.').pop().toLowerCase();
         const fUrl = hasFile ? `${supaUrl}/storage/v1/object/public/${p.bucket||'rfq-uploads'}/${p.storage_path}` : '';
         const isCAD = hasFile && ['step','stp','stl','obj','3mf','iges','igs'].includes(ext);
         return `<tr data-idx="${i}" class="admin-part-row" style="border-bottom:1px solid #f1f5f9;cursor:${isCAD?'pointer':'default'};transition:background .15s;" onmouseover="this.style.background='#f8fafc'" onmouseout="this.style.background=''" ${isCAD?'title="Click to view 3D model"':''}>
           <td style="padding:8px 10px;text-align:center;"><svg class="admin-part-expand-icon" data-idx="${i}" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" stroke-width="2" style="transition:transform .2s"><polyline points="6 9 12 15 18 9"/></svg></td>
           <td style="padding:6px 12px;"><input class="admin-part-input" data-field="name" value="${p.name||''}" placeholder="Part Name" style="width:100%;border:1px solid transparent;background:transparent;font-size:12px;font-family:inherit;padding:4px;outline:none;color:${isQuoteLocked ? '#94a3b8' : 'inherit'};" onclick="event.stopPropagation()" ${isQuoteLocked ? 'disabled' : ''}/></td>
           <td style="padding:6px 12px;"><input class="admin-part-input" data-field="process" value="${p.process||''}" placeholder="Process" style="width:100%;border:1px solid transparent;background:transparent;font-size:12px;font-family:inherit;padding:4px;outline:none;color:${isQuoteLocked ? '#94a3b8' : 'inherit'};" onclick="event.stopPropagation()" ${isQuoteLocked ? 'disabled' : ''}/></td>
           <td style="padding:6px 12px;"><input class="admin-part-input" data-field="material" value="${p.material||''}" placeholder="Material" style="width:100%;border:1px solid transparent;background:transparent;font-size:12px;font-family:inherit;padding:4px;outline:none;color:${isQuoteLocked ? '#94a3b8' : 'inherit'};" onclick="event.stopPropagation()" ${isQuoteLocked ? 'disabled' : ''}/></td>
           <td style="padding:6px 12px;"><input class="admin-part-input" type="number" data-field="qty" value="${p.qty||1}" style="width:50px;border:1px solid transparent;background:transparent;font-size:12px;font-weight:600;font-family:inherit;padding:4px;outline:none;color:${isQuoteLocked ? '#94a3b8' : 'inherit'};" onclick="event.stopPropagation()" ${isQuoteLocked ? 'disabled' : ''}/></td>
           <td style="padding:6px 12px;color:#64748b;font-size:12px;font-weight:500;white-space:nowrap;"><span class="admin-part-unit-cost">US$ ${((Number(p.price)||0) / Math.max(Number(p.qty)||1, 1)).toFixed(2)}</span></td>
           <td style="padding:6px 12px;color:${isQuoteLocked ? '#94a3b8' : '#10b981'};font-weight:700;"><div style="display:flex;align-items:center;">US$<input class="admin-part-input" type="number" step="0.01" data-field="price" value="${p.price||0}" style="width:70px;border:1px solid transparent;background:transparent;color:${isQuoteLocked ? '#94a3b8' : '#10b981'};font-weight:700;font-size:12px;font-family:inherit;padding:4px;outline:none;" onclick="event.stopPropagation()" ${isQuoteLocked ? 'disabled' : ''}/></div></td>
           <td style="padding:6px 8px;" onclick="event.stopPropagation()"><div style="display:flex;gap:4px;">${isCAD?'<span style="display:inline-flex;align-items:center;gap:2px;padding:3px 8px;background:#eff6ff;border:1px solid #bfdbfe;border-radius:4px;color:#2563eb;font-size:10px;font-weight:600;cursor:pointer;font-family:Inter,sans-serif;" class="admin-part-view3d" data-view-idx="'+i+'">🧊 3D</span>':''}${hasFile?'<a href="'+fUrl+'" download target="_blank" title="Download" style="display:flex;padding:3px 6px;background:#f1f5f9;border:1px solid #e2e8f0;border-radius:4px;color:#475569;text-decoration:none;font-size:13px;">&#x2B07;</a>':''}</div></td>
           <td style="padding:6px 8px;text-align:center;" onclick="event.stopPropagation()">${isQuoteLocked ? '' : `<button class="admin-part-remove-btn" data-idx="${i}" style="background:none;border:none;color:#ef4444;font-size:16px;cursor:pointer;">&times;</button>`}</td>
         </tr>
         <tr class="admin-part-detail-row" data-detail-idx="${i}" style="display:none;border-bottom:1px solid #e2e8f0;">
           <td colspan="9" style="padding:0;"><div style="display:flex;gap:16px;padding:14px 20px;background:#fafbfc;border-top:1px solid #f1f5f9;">
             <div style="flex:1;display:flex;flex-direction:column;gap:10px;">
               <div style="display:flex;gap:8px;flex-wrap:wrap;">
                 ${hasFile?'<a href="'+fUrl+'" download target="_blank" style="display:inline-flex;align-items:center;gap:4px;padding:5px 12px;background:#fff;border:1px solid #e2e8f0;border-radius:6px;font-size:11px;font-weight:600;color:#0f172a;text-decoration:none;">Download '+ext.toUpperCase()+'</a>':''}
                 <a href="${odBaseUrl}/CAD" target="_blank" style="display:inline-flex;align-items:center;gap:4px;padding:5px 12px;background:#eff6ff;border:1px solid #bfdbfe;border-radius:6px;font-size:11px;font-weight:600;color:#2563eb;text-decoration:none;">Open in OneDrive</a>
               </div>
               <div><div style="font-size:9px;color:#94a3b8;text-transform:uppercase;font-weight:700;margin-bottom:4px;">Part Notes (Admin)</div>
                 <textarea class="admin-part-notes" data-notes-idx="${i}" rows="2" placeholder="Tooling notes, supplier info..." style="width:100%;box-sizing:border-box;padding:8px 10px;border-radius:8px;border:1px solid #e2e8f0;font-size:11px;font-family:inherit;line-height:1.4;color:${isQuoteLocked ? '#94a3b8' : '#334155'};resize:vertical;background:${isQuoteLocked ? '#f8fafc' : '#fff'};" ${isQuoteLocked ? 'disabled' : ''}>${p.admin_notes||''}</textarea>
               </div>
             </div>
           </div></td>
         </tr>`;
       }).join('');
       const countSpan = modal.querySelector('#admin-parts-count');
       if (countSpan) countSpan.textContent = (data.parts || []).length;

       // Attach 3D viewer buttons (inside stopPropagation cells, so needs direct binding)
       partsTbody.querySelectorAll('.admin-part-view3d').forEach(btn => {
         btn.addEventListener('click', async (e) => {
           e.stopPropagation();
           const idx = parseInt(btn.dataset.viewIdx);
           const p = data.parts[idx];
           if (!p || !p.storage_path) return;
           const { openAdmin3DViewer } = await import('./components/admin-3d-viewer.js');
           openAdmin3DViewer(p, (updatedPart) => {
             data.parts[idx] = { ...data.parts[idx], annotations: updatedPart.annotations };
           });
         });
       });
    }

    if (partsTbody) {
      renderAdminPartsTable();
      // Recalculate totals from actual parts data on initial load
      // (fixes stale total_price from DB not matching sum of parts)
      updateAdminPartsTotal();
    }

    if (partsTableEl) {
       partsTableEl.addEventListener('input', (e) => {
         if (e.target.classList.contains('admin-part-input')) {
           const row = e.target.closest('tr');
           const idx = parseInt(row.dataset.idx);
           const field = e.target.dataset.field;
           if (field === 'qty' || field === 'price') {
             data.parts[idx][field] = Number(e.target.value) || 0;
             updateAdminPartsTotal();
             // Update unit cost display in this row
             const unitCostEl = row.querySelector('.admin-part-unit-cost');
             if (unitCostEl) {
               const lineTotal = Number(data.parts[idx].price) || 0;
               const qty = Math.max(Number(data.parts[idx].qty) || 1, 1);
               unitCostEl.textContent = `US$ ${(lineTotal / qty).toFixed(2)}`;
             }
           } else {
             data.parts[idx][field] = e.target.value;
           }
         }
       });
       partsTableEl.addEventListener('click', (e) => {
         if (e.target.classList.contains('admin-part-remove-btn')) {
           const idx = parseInt(e.target.dataset.idx);
           data.parts.splice(idx, 1);
           renderAdminPartsTable();
           updateAdminPartsTotal();
         }
       });
    }

    modal.querySelector('#admin-add-part-btn')?.addEventListener('click', () => {
       data.parts = data.parts || [];
       data.parts.push({ name: '', process: '', material: '', qty: 1, price: 0 });
       renderAdminPartsTable();
    });

    // Row click → open 3D viewer; Chevron → expand/collapse detail
    if (partsTableEl) {
      partsTableEl.addEventListener('click', async (e) => {
        // Chevron click → toggle detail row
        const chevron = e.target.closest('.admin-part-expand-icon');
        if (chevron) {
          e.stopPropagation();
          const idx = chevron.dataset.idx;
          const detailRow = modal.querySelector(`.admin-part-detail-row[data-detail-idx="${idx}"]`);
          if (detailRow) {
            const isOpen = detailRow.style.display !== 'none';
            detailRow.style.display = isOpen ? 'none' : 'table-row';
            chevron.style.transform = isOpen ? '' : 'rotate(180deg)';
          }
          return;
        }

        // 🧊 3D button click → open viewer
        const view3dBtn = e.target.closest('.admin-part-view3d');
        if (view3dBtn) {
          e.stopPropagation();
          const viewIdx = parseInt(view3dBtn.dataset.viewIdx);
          const vp = data.parts[viewIdx];
          if (vp && vp.storage_path) {
            const { openAdmin3DViewer } = await import('./components/admin-3d-viewer.js');
            openAdmin3DViewer(vp, (updatedPart) => {
              data.parts[viewIdx] = { ...data.parts[viewIdx], annotations: updatedPart.annotations };
            });
          }
          return;
        }

        // Row click → open 3D viewer if CAD file
        const row = e.target.closest('.admin-part-row');
        if (!row) return;
        const idx = parseInt(row.dataset.idx);
        const p = data.parts[idx];
        if (!p || !p.storage_path) return;
        const partExt = (p.storage_path||'').split('.').pop().toLowerCase();
        const isCAD = ['step','stp','stl','obj','3mf','iges','igs'].includes(partExt);
        if (!isCAD) return;

        // Lazy-load the viewer module
        const { openAdmin3DViewer } = await import('./components/admin-3d-viewer.js');
        openAdmin3DViewer(p, (updatedPart) => {
          // Save annotations back to data
          data.parts[idx] = { ...data.parts[idx], annotations: updatedPart.annotations };
        });
      });
      partsTableEl.addEventListener('change', (e) => {
        if (e.target.classList.contains('admin-part-notes')) {
          const idx = parseInt(e.target.dataset.notesIdx);
          if (data.parts[idx]) data.parts[idx].admin_notes = e.target.value;
        }
      });
    }
    modal.querySelector('#rfq-open-onedrive-btn')?.addEventListener('click', () => {
      window.open(odBaseUrl, '_blank');
    });
    modal.querySelector('#rfq-download-all-parts-btn')?.addEventListener('click', () => {
      (data.parts || []).forEach((p, i) => {
        if (!p.storage_path) return;
        const url = `${supaUrl}/storage/v1/object/public/${p.bucket||'rfq-uploads'}/${p.storage_path}`;
        setTimeout(() => { const a = document.createElement('a'); a.href = url; a.download = p.name || 'part'; a.target = '_blank'; document.body.appendChild(a); a.click(); a.remove(); }, i * 400);
      });
    });

    // Close modal
    modal.querySelector('#rfq-modal-close').addEventListener('click', () => modal.remove());
    modal.addEventListener('click', (e) => { if (e.target === modal) modal.remove(); });

    // Timeline toggle and buttons (Event Delegation)
    modal.querySelector('#rfq-timeline-wrapper').addEventListener('click', async (e) => {
      // 1. Amend Quote
      if (e.target.closest('#admin-amend-quote-timeline-btn')) {
        const panel = modal.querySelector('#rfq-amend-panel');
        if (panel) panel.style.display = 'block';
        return;
      }
      
      // 2. Cancel Order
      const cancelBtn = e.target.closest('.admin-cancel-order-btn');
      if (cancelBtn) {
        if (!confirm('Are you sure you want to cancel this order? This cannot be easily undone.')) return;
        cancelBtn.disabled = true;
        cancelBtn.textContent = 'Canceling...';
        const rfqId = cancelBtn.dataset.rfqId;
        data.status = 'rejected';
        data.payment_status = 'cancelled';
        rfq.status = 'rejected';
        
        try {
          await fetch('/.netlify/functions/admin-rfqs', {
            method: 'PATCH',
            body: JSON.stringify({ id: rfqId, updates: { status: 'rejected', rfq_data: data } })
          });
          const rfqObj = rfqs.find(r => r.id === rfqId);
          if (rfqObj) { rfqObj.status = 'rejected'; rfqObj.rfq_data = data; }
          
          modal.remove();
          openRFQDetailModal(rfq, profileMap, rfqs);

          const tableSelect = contentRouting.querySelector(`.admin-rfq-status-select[data-rfq-id="${rfqId}"]`);
          if (tableSelect) tableSelect.value = 'rejected';
        } catch(err) {
          alert('Failed to cancel order: ' + err.message);
          cancelBtn.disabled = false;
          cancelBtn.textContent = 'Cancel Order';
        }
        return;
      }

      // 3. Refund Order
      const refundBtn = e.target.closest('.admin-refund-order-btn');
      if (refundBtn) {
        if (!confirm('Have you processed the refund for this order? This will mark the payment as refunded.')) return;
        refundBtn.disabled = true;
        refundBtn.textContent = 'Refunding...';
        const rfqId = refundBtn.dataset.rfqId;
        data.payment_status = 'refunded';
        
        try {
          await fetch('/.netlify/functions/admin-rfqs', {
            method: 'PATCH',
            body: JSON.stringify({ id: rfqId, updates: { rfq_data: data } })
          });
          const rfqObj = rfqs.find(r => r.id === rfqId);
          if (rfqObj) { rfqObj.rfq_data = data; }
          refundBtn.textContent = 'Refunded ✓';
          refundBtn.style.background = '#dcfce7';
          refundBtn.style.color = '#15803d';
          refundBtn.style.borderColor = '#bbf7d0';
        } catch(err) {
          alert('Failed to update refund status: ' + err.message);
          refundBtn.disabled = false;
          refundBtn.textContent = 'Refund';
        }
        return;
      }

      // 4. Timeline bubble overrides
      const circle = e.target.closest('.timeline-step-circle');
      if (!circle) return;
      const stepLabel = circle.dataset.step;
      if (stepLabel === 'Confirmed') return; // Do not allow manual toggle of Confirmed from timeline
      const currentlyActive = circle.dataset.active === 'true';
      
      data.timeline_overrides = data.timeline_overrides || {};
      data.timeline_overrides[stepLabel] = !currentlyActive;
      
      // Update DOM optimistically
      modal.remove();
      openRFQDetailModal(rfq, profileMap, rfqs);
      
      try {
        await fetch('/.netlify/functions/admin-rfqs', {
          method: 'PATCH',
          body: JSON.stringify({ id: rfq.id, updates: { rfq_data: data } })
        });
      } catch(err) {
        console.error('Failed to save timeline override', err);
      }
    });

    // Amend quote confirmation logic
    modal.querySelector('#rfq-amend-cancel-btn')?.addEventListener('click', () => {
      const panel = modal.querySelector('#rfq-amend-panel');
      if (panel) panel.style.display = 'none';
    });
    
    modal.querySelector('#rfq-amend-confirm-btn')?.addEventListener('click', async (e) => {
      const reason = modal.querySelector('#rfq-amend-reason').value.trim();
      if (!reason) {
        alert('Please provide a reason for amending the quote.');
        return;
      }
      const btn = e.target;
      btn.disabled = true;
      btn.textContent = 'Unlocking...';
      
      const currentNotes = modal.querySelector('#rfq-admin-notes').value || '';
      const newNotes = currentNotes + `\n\n[${new Date().toLocaleDateString()}] AMEND QUOTE: ${reason}`;
      modal.querySelector('#rfq-admin-notes').value = newNotes;
      data.admin_notes = newNotes;
      data.is_amending = true;
      
      try {
        await fetch('/.netlify/functions/admin-rfqs', {
          method: 'PATCH',
          body: JSON.stringify({ id: rfq.id, updates: { rfq_data: data } })
        });
        
        const rfqObj = rfqs.find(r => r.id === rfq.id);
        if (rfqObj) rfqObj.rfq_data = data;
        
        // Re-render modal to unlock fields
        modal.remove();
        openRFQDetailModal(rfq, profileMap, rfqs);
      } catch(err) {
        alert('Failed to unlock quote: ' + err.message);
        btn.disabled = false;
        btn.textContent = 'Unlock for Editing';
      }
    });

    // Status change in modal
    // Status change in modal
    const modalStatusSelect = modal.querySelector('#rfq-modal-status');
    if (modalStatusSelect) {
      modalStatusSelect.addEventListener('change', async (e) => {
        const rfqId = e.target.dataset.rfqId;
        const newStatus = e.target.value;
        try {
          const res = await fetch('/.netlify/functions/admin-rfqs', {
            method: 'PATCH',
            body: JSON.stringify({ id: rfqId, updates: { status: newStatus } })
          });
          if (!res.ok) {
            const errData = await res.json().catch(()=>({}));
            throw new Error(errData.error || 'Failed to update RFQ status');
          }
          // Update the table row's select too
          const tableSelect = contentRouting.querySelector(`.admin-rfq-status-select[data-rfq-id="${rfqId}"]`);
          if (tableSelect) tableSelect.value = newStatus;

          rfq.status = newStatus;
          data.status = newStatus;
          modal.remove();
          openRFQDetailModal(rfq, profileMap, rfqs);
        } catch (err) {
          alert('Failed to update status: ' + err.message);
        }
      });
    }

    // Confirm Bank Payment Received
    modal.querySelector('#rfq-confirm-bank-payment-btn')?.addEventListener('click', async (e) => {
      const btn = e.target.closest('button');
      if (!confirm('Confirm that bank transfer payment has been received for this RFQ?')) return;
      btn.disabled = true;
      btn.innerHTML = '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg> Saving...';
      try {
        const paidAt = new Date().toISOString();
        data.payment_status = 'paid';
        data.paid_at = paidAt;
        rfq.status = 'paid';
        data.status = 'paid';

        await fetch('/.netlify/functions/admin-rfqs', {
          method: 'PATCH',
          body: JSON.stringify({ id: rfq.id, updates: { status: 'paid', rfq_data: data } })
        });

        // Update table row
        const tableSelect = document.querySelector(`.admin-rfq-status-select[data-rfq-id="${rfq.id}"]`);
        if (tableSelect) tableSelect.value = 'paid';

        // Send payment confirmation email
        try {
          await fetch('/.netlify/functions/send-email', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              type: 'payment_confirmed',
              email: data.user_email || data.client_email || '',
              name: data.client_name || data.user_name || 'Customer',
              projectName: data.project_name || 'Manufacturing Order',
              amount: Number(data.total_price || 0).toLocaleString(undefined, {minimumFractionDigits:2, maximumFractionDigits:2}),
              bankRef: `ADT-${(rfq.id||'').slice(0,8).toUpperCase()}`
            })
          });
        } catch(emailErr) {
          console.warn('Payment confirmation email skipped:', emailErr);
        }

        // Replace button with success badge
        btn.outerHTML = `<div style="display:flex; align-items:center; gap:5px; padding:6px 12px; background:#dcfce7; color:#15803d; border-radius:8px; font-size:11px; font-weight:700; border:1px solid #bbf7d0;">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>
          Payment Confirmed
        </div>`;

        setTimeout(() => {
          modal.remove();
          openRFQDetailModal(rfq, profileMap, rfqs);
        }, 1500);
      } catch (err) {
        alert('Failed to confirm payment: ' + err.message);
        btn.disabled = false;
        btn.innerHTML = '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg> Confirm Payment Received';
      }
    });

    // Assignee change in modal
    const modalAssigneeSelect = modal.querySelector('#rfq-modal-assignee');
    if (modalAssigneeSelect) {
      modalAssigneeSelect.addEventListener('change', async (e) => {
        const rfqId = e.target.dataset.rfqId;
        const val = e.target.value;
        let email = null;
        let name = null;
        if (val) {
          const parts = val.split('|');
          email = parts[0];
          name = parts[1];
        }

        data.assigned_to_email = email;
        data.assigned_to_name = name;
        const updatedData = { ...data, assigned_to_email: email, assigned_to_name: name };

        try {
          const res = await fetch('/.netlify/functions/admin-rfqs', {
            method: 'PATCH',
            body: JSON.stringify({ id: rfqId, updates: { rfq_data: updatedData } })
          });
          if (!res.ok) {
            const errData = await res.json().catch(()=>({}));
            throw new Error(errData.error || 'Failed to update RFQ data');
          }
          
          // Visual success feedback
          e.target.style.borderColor = '#22c55e';
          setTimeout(() => e.target.style.borderColor = '#e2e8f0', 1500);
          
          // Update the local rfqs cache so closing/reopening is correct
          const rfqObj = rfqs.find(r => r.id === rfqId);
          if (rfqObj) rfqObj.rfq_data = updatedData;
          
        } catch (err) {
          alert('Failed to assign engineer: ' + err.message);
        }
      });
    }

    // Save internal admin notes
    modal.querySelector('#rfq-save-notes-btn')?.addEventListener('click', async (e) => {
      const rfqId = e.target.dataset.rfqId;
      const notes = modal.querySelector('#rfq-admin-notes')?.value || '';
      const updatedData = { ...data, admin_notes: notes };
      try {
        const res = await fetch('/.netlify/functions/admin-rfqs', {
          method: 'PATCH',
          body: JSON.stringify({ id: rfqId, updates: { rfq_data: updatedData } })
        });
        if (!res.ok) {
           const errData = await res.json().catch(()=>({}));
           throw new Error(errData.error || 'Failed to update RFQ data');
        }
        e.target.textContent = 'Saved ✓';
        setTimeout(() => e.target.textContent = 'Save Notes', 2000);
        const rfqObj = rfqs.find(r => r.id === rfqId);
        if (rfqObj) rfqObj.rfq_data = updatedData;
      } catch (err) { alert('Failed to save notes: ' + err.message); }
    });

    // Update final price — overrides total_price on both admin and user side
    modal.querySelector('#rfq-save-price-btn')?.addEventListener('click', async (e) => {
      const rfqId = e.target.dataset.rfqId;
      const priceVal = parseFloat(modal.querySelector('#rfq-modal-final-price')?.value);
      if (isNaN(priceVal)) { alert('Please enter a valid price.'); return; }
      // Overwrite total_price so user-side workspace reflects the admin price
      const updatedData = { ...data, admin_final_price: priceVal, total_price: priceVal };
      try {
        const res = await fetch('/.netlify/functions/admin-rfqs', {
          method: 'PATCH',
          body: JSON.stringify({ id: rfqId, updates: { rfq_data: updatedData } })
        });
        if (!res.ok) {
           const errData = await res.json().catch(()=>({}));
           throw new Error(errData.error || 'Failed to update RFQ data');
        }
        // Update button
        e.target.textContent = 'Updated ✓';
        setTimeout(() => e.target.textContent = 'Update', 2000);
        // Update Quoted Total display live in the modal
        const totalEl = modal.querySelector('#admin-quoted-total-display');
        if (totalEl) totalEl.textContent = `$${priceVal.toLocaleString(undefined, {minimumFractionDigits:2, maximumFractionDigits:2})}`;
        // Update cache
        const rfqObj = rfqs.find(r => r.id === rfqId);
        if (rfqObj) rfqObj.rfq_data = updatedData;
      } catch (err) { alert('Failed to update price: ' + err.message); }
    });

    // Confirm to Client — triggers payment flow on user side
    modal.querySelector('#rfq-confirm-client-btn')?.addEventListener('click', async (e) => {
      const confirmedPrice = parseFloat(modal.querySelector('#rfq-modal-final-price')?.value) || data.total_price || 0;
      if (!confirmedPrice || confirmedPrice <= 0) {
        alert('Please set a valid Final Price before confirming to the client.');
        return;
      }
      
      const isConfirmed = window.confirm(`Are you sure you want to send a confirmation to the customer for US$${confirmedPrice.toFixed(2)}? This action will notify the client and lock the price.`);
      if (!isConfirmed) return;

      const rfqId = e.target.closest('button').dataset.rfqId || rfq.id;
      const btn = e.target.closest('button');
      btn.disabled = true;
      btn.textContent = 'Generating Docs...';

      let generatedDocs = [];
      try {
        console.log('[Admin] Generating Quotation + Proforma for confirm...');
        generatedDocs = await generateAllDocsHeadless({ rfq, rfqData: data, profile: profileMap[rfq.user_id] || {} });
        console.log('[Admin] Generated docs:', generatedDocs.length, generatedDocs.map(d => d.title));
      } catch (err) {
        console.error('[Admin] Failed to generate documents:', err);
      }

      btn.textContent = 'Confirming…';

      const confirmedAtIso = new Date().toISOString();
      
      const docsArr = data.documents || [];
      generatedDocs.forEach(doc => {
        const existIdx = docsArr.findIndex(d => d.docRef === doc.docRef);
        if (existIdx >= 0) docsArr[existIdx] = doc;
        else docsArr.push(doc);
      });

      const updatedData = {
        ...data,
        documents: docsArr,
        confirmed_price: confirmedPrice,
        total_price: confirmedPrice,
        admin_final_price: confirmedPrice,
        payment_status: 'awaiting_payment',
        confirmed_at: confirmedAtIso
      };

      try {
        const res = await fetch('/.netlify/functions/admin-rfqs', {
          method: 'PATCH',
          body: JSON.stringify({ id: rfqId, updates: { status: 'confirmed', rfq_data: updatedData } })
        });
        if (!res.ok) {
          const errData = await res.json().catch(()=>({}));
          throw new Error(errData.error || 'Failed to update RFQ data');
        }

        // Update local cache
        const rfqObj = rfqs.find(r => r.id === rfqId);
        if (rfqObj) { rfqObj.status = 'confirmed'; rfqObj.rfq_data = updatedData; }
        
        // Update local modal references so timeline updates correctly
        rfq.status = 'confirmed';
        data.status = 'confirmed';
        data.confirmed_at = confirmedAtIso;
        
        // Update in table row
        const tableSelect = contentRouting.querySelector(`.admin-rfq-status-select[data-rfq-id="${rfqId}"]`);
        if (tableSelect) tableSelect.value = 'confirmed';
        // Refresh nav badge count
        updateNavBadges();

        btn.textContent = '✓ Sent & Saved';
        btn.style.background = '#64748b';
        btn.style.color = '#fff';
        btn.style.border = 'none';

        setTimeout(() => {
          modal.remove();
          openRFQDetailModal(rfq, profileMap, rfqs);
        }, 1500);

        // Send confirmation email to client
        const bankRef = `ADT-${rfqId.slice(0,8).toUpperCase()}`;
        await fetch('/.netlify/functions/send-email', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            type: 'rfq_confirmed',
            email: requesterEmail,
            name: requesterName,
            projectName,
            confirmedPrice,
            bankRef,
            rfqId,
          })
        }).catch(e => console.warn('Confirmation email skipped:', e));

      } catch (err) {
        alert('Failed to confirm: ' + err.message);
        btn.disabled = false;
        btn.textContent = 'Confirm to Client';
      }
    });

    // ── Generate Quotation ───────────────────────────────────────
    modal.querySelector('#rfq-generate-quote-btn')?.addEventListener('click', async () => {
      const { openDocumentGenerator } = await import('./services/doc-generator.js');
      openDocumentGenerator({ 
        docType: 'quotation', rfq, rfqData: data, profile: profileMap[rfq.user_id], rfqs,
        onComplete: () => {
          modal.remove();
          openRFQDetailModal(rfq, profileMap, rfqs);
        }
      });
    });

    // ── Generate Invoice ───────────────────────────────────────
    modal.querySelector('#rfq-generate-invoice-btn')?.addEventListener('click', async () => {
      const { openDocumentGenerator } = await import('./services/doc-generator.js');
      openDocumentGenerator({ 
        docType: 'proforma', rfq, rfqData: data, profile: profileMap[rfq.user_id], rfqs,
        onComplete: () => {
          modal.remove();
          openRFQDetailModal(rfq, profileMap, rfqs);
        }
      });
    });

    // ── Request More Info ─────────────────────────────────────
    const reqInfoBtn    = modal.querySelector('#rfq-request-info-btn');
    const reqInfoPanel  = modal.querySelector('#rfq-request-info-panel');
    const reqInfoCancel = modal.querySelector('#rfq-request-info-cancel-btn');
    const reqInfoSend   = modal.querySelector('#rfq-request-info-confirm-btn');

    reqInfoBtn?.addEventListener('click', () => {
      // Check if assigned
      if (!data.assigned_to_email) {
        alert('Please assign an engineer to this project before requesting more information.');
        return;
      }
      reqInfoPanel.style.display = reqInfoPanel.style.display === 'none' ? 'block' : 'none';
      modal.querySelector('#rfq-request-info-msg')?.focus();
    });
    
    reqInfoCancel?.addEventListener('click', () => {
      reqInfoPanel.style.display = 'none';
      modal.querySelector('#rfq-request-info-msg').value = '';
    });

    reqInfoSend?.addEventListener('click', async () => {
      const msg = modal.querySelector('#rfq-request-info-msg').value.trim();
      if (!msg) {
        alert('Please enter the information required.');
        return;
      }

      reqInfoSend.disabled = true;
      reqInfoSend.textContent = 'Sending…';

      const bankRef = `ADT-${rfq.id.slice(0,8).toUpperCase()}`;

      try {
        await fetch('/.netlify/functions/send-email', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            type: 'rfq_request_info',
            email: requesterEmail,
            name: requesterName,
            projectName,
            bankRef,
            staffEmail: data.assigned_to_email,
            staffName: data.assigned_to_name,
            message: msg
          })
        });

        // Persist communication log
        const newMsgObj = {
          role: 'admin',
          name: data.assigned_to_name,
          text: msg,
          date: new Date().toISOString()
        };
        const updatedLog = [...(data.communication_log || []), newMsgObj];
        const updatedData = { ...data, communication_log: updatedLog };
        
        await fetch('/.netlify/functions/admin-rfqs', {
          method: 'PATCH',
          body: JSON.stringify({ id: rfq.id, updates: { rfq_data: updatedData } })
        });
        
        // Update local cache
        const rfqObj = rfqs.find(r => r.id === rfq.id);
        if (rfqObj) {
          rfqObj.rfq_data = updatedData;
        }

        reqInfoSend.textContent = '✓ Sent & Saved';
        reqInfoSend.style.background = '#64748b';
        setTimeout(() => {
          document.body.removeChild(modal);
          openRFQDetailModal(rfq, profileMap, rfqs);
        }, 1500);
      } catch (err) {
        alert('Failed to send request: ' + err.message);
        reqInfoSend.disabled = false;
        reqInfoSend.textContent = 'Send Request & Notify Client';
      }
    });

    // ── Reject Quote ──────────────────────────────────────────
    const rejectBtn    = modal.querySelector('#rfq-reject-btn');
    const rejectPanel  = modal.querySelector('#rfq-reject-panel');
    const rejectCancel = modal.querySelector('#rfq-reject-cancel-btn');
    const rejectSend   = modal.querySelector('#rfq-reject-confirm-btn');

    rejectBtn?.addEventListener('click', () => {
      rejectPanel.style.display = rejectPanel.style.display === 'none' ? 'block' : 'none';
      modal.querySelector('#rfq-reject-reason')?.focus();
    });
    rejectCancel?.addEventListener('click', () => {
      rejectPanel.style.display = 'none';
      modal.querySelector('#rfq-reject-reason').value = '';
    });

    rejectSend?.addEventListener('click', async () => {
      const rawReason = modal.querySelector('#rfq-reject-reason').value.trim();
      if (!rawReason) {
        alert('Please enter at least one reason before sending.');
        return;
      }

      rejectSend.disabled = true;
      rejectSend.textContent = 'Sending…';

      const bankRef = `ADT-${rfq.id.slice(0,8).toUpperCase()}`;
      // Convert each non-empty line into a bullet
      const reasonLines = rawReason.split('\n').map(l => l.trim()).filter(Boolean);

      try {
        // Update DB status to rejected with notified flag
        const updatedRfqData = { ...data, rejected_reason: rawReason, rejection_notified: true, rejection_notified_at: new Date().toISOString() };
        const res = await fetch('/.netlify/functions/admin-rfqs', {
          method: 'PATCH',
          body: JSON.stringify({ id: rfq.id, updates: { status: 'rejected', rfq_data: updatedRfqData } })
        });
        if (!res.ok) {
          const errData = await res.json().catch(()=>({}));
          throw new Error(errData.error || 'Failed to update RFQ data');
        }

        // Send rejection email — await and check response
        console.log('[Admin] Sending rejection email to:', requesterEmail);
        const emailRes = await fetch('/.netlify/functions/send-email', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            type: 'rfq_rejected',
            email: requesterEmail,
            name: requesterName,
            projectName,
            bankRef,
            reasons: reasonLines,
          })
        });
        const emailBody = await emailRes.json().catch(() => ({}));
        console.log('[Admin] Rejection email response:', emailRes.status, emailBody);
        if (!emailRes.ok) {
          console.error('[Admin] Rejection email failed:', emailBody);
        }

        rejectPanel.style.display = 'none';
        rejectSend.textContent = '✓ Rejected & Notified';
        rejectSend.style.background = '#64748b';

        // Sync UI
        const statusSel = modal.querySelector('#rfq-modal-status');
        if (statusSel) statusSel.value = 'rejected';
        const tableSelect = contentRouting.querySelector(`.admin-rfq-status-select[data-rfq-id="${rfq.id}"]`);
        if (tableSelect) tableSelect.value = 'rejected';
        
        // Update local cache with notified flag
        rfq.status = 'rejected';
        Object.assign(data, updatedRfqData);
        const rfqObj = rfqs.find(r => r.id === rfq.id);
        if (rfqObj) {
          rfqObj.status = 'rejected';
          rfqObj.rfq_data = updatedRfqData;
        }
        
        updateNavBadges();

      } catch (err) {
        alert('Failed to reject: ' + err.message);
        rejectSend.disabled = false;
        rejectSend.textContent = 'Send Rejection & Notify Client';
      }
    });

    // ── Delete (permanent, no email) ──────────────────────────
    const deleteBtnEl = modal.querySelector('#rfq-delete-btn');
    if (deleteBtnEl) {
      let deleteConfirmShown = false;
      deleteBtnEl.addEventListener('click', async () => {
        // First click: show inline confirmation
        if (!deleteConfirmShown) {
          deleteConfirmShown = true;
          deleteBtnEl.innerHTML = `
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 6h18"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
            Confirm Delete?`;
          deleteBtnEl.style.background = '#dc2626';
          deleteBtnEl.style.color = '#fff';
          deleteBtnEl.style.borderColor = '#dc2626';
          // Auto-reset after 4 seconds if not confirmed
          setTimeout(() => {
            if (deleteConfirmShown && !deleteBtnEl.disabled) {
              deleteConfirmShown = false;
              deleteBtnEl.innerHTML = `
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 6h18"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
                Delete`;
              deleteBtnEl.style.background = '#fee2e2';
              deleteBtnEl.style.color = '#dc2626';
              deleteBtnEl.style.borderColor = '#fecaca';
            }
          }, 4000);
          return;
        }

        // Second click: actually delete
        deleteBtnEl.disabled = true;
        deleteBtnEl.textContent = 'Deleting…';

        try {
          // 1. Delete files from storage
          const filesByBucket = {};
          files.forEach(f => {
            const path = f.storage_path || f.path;
            if (!path) return;
            const b = f.bucket || 'rfq-uploads';
            if (!filesByBucket[b]) filesByBucket[b] = [];
            filesByBucket[b].push(path);
          });
          await Promise.all(Object.entries(filesByBucket).map(([b, paths]) =>
            supabase.storage.from(b).remove(paths)
          ));

          // 2. Delete DB record
          const res = await fetch(`/.netlify/functions/admin-rfqs?id=${rfq.id}`, { method: 'DELETE' });
          if (!res.ok) {
             const errData = await res.json().catch(()=>({}));
             throw new Error(errData.error || 'Failed to delete RFQ');
          }

          modal.remove();
          contentRouting.querySelector(`tr[data-rfq-id="${rfq.id}"]`)?.remove();
          updateNavBadges();

        } catch (err) {
          alert('Delete failed: ' + err.message);
          deleteConfirmShown = false;
          deleteBtnEl.disabled = false;
          deleteBtnEl.innerHTML = `
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 6h18"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
            Delete`;
          deleteBtnEl.style.background = '#fee2e2';
          deleteBtnEl.style.color = '#dc2626';
          deleteBtnEl.style.borderColor = '#fecaca';
        }
      });
    }

    // Download All
    const downloadAllBtn = modal.querySelector('#rfq-download-all-btn');
    if (downloadAllBtn && files.length > 0) {
      downloadAllBtn.addEventListener('click', () => {
        files.forEach((f, i) => {
          const filePath = f.storage_path || f.path || '';
          if (!filePath) return;
          const url = `${import.meta.env.VITE_SUPABASE_URL || 'https://qvxrwbcmyrugjevgvujb.supabase.co'}/storage/v1/object/public/rfq-uploads/${filePath}`;
          // Stagger downloads to prevent browser blocking
          setTimeout(() => {
            const a = document.createElement('a');
            a.href = url;
            a.download = f.name || f.file_name || `file_${i + 1}`;
            a.target = '_blank';
            document.body.appendChild(a);
            a.click();
            a.remove();
          }, i * 400);
        });
      });
    }
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

    // ── Helper: build standard image row HTML ──
    function _buildImgRowHtml(inputName, accept, placeholder) {
      return `<span class="admin-img-drag-handle" title="Drag to reorder or move to another category">⠿</span>
        <span class="admin-img-thumb-empty">🖼</span>
        <input type="text" name="${inputName}" placeholder="${placeholder || 'https://example.com/image.jpg'}">
        <div class="admin-img-reorder-group">
          <button type="button" class="admin-img-reorder-btn admin-img-move-up" title="Move up">▲</button>
          <button type="button" class="admin-img-reorder-btn admin-img-move-down" title="Move down">▼</button>
        </div>
        <label class="admin-action-btn" style="cursor:pointer; display:flex; align-items:center;">
          📤 <input type="file" style="display:none;" class="admin-s3-upload" accept="${accept || 'image/*'}">
        </label>
        <button type="button" class="admin-remove-row-btn">✕</button>`;
    }

    // Global Paste Listener for Image Uploads & Comma-Separated URLs
    // Must be done BEFORE wireS3Uploaders so cloneNode doesn't destroy input change listeners
    document.querySelectorAll('.admin-image-url-list').forEach(list => {
      // Prevent multiple listeners
      const _list = list.cloneNode(true);
      list.parentNode.replaceChild(_list, list);
      
      _list.addEventListener('paste', async (e) => {
        const items = (e.clipboardData || e.originalEvent.clipboardData).items;
        
        let imagesToPaste = [];
        let hasImage = false;
        
        for (const item of items) {
          if (item.type.indexOf('image') === 0) {
             hasImage = true;
             imagesToPaste.push(item.getAsFile());
          }
        }
        
        if (hasImage) {
            e.preventDefault();
            const target = e.target;
            const targetRow = target.closest('.admin-img-url-row');
            if (!targetRow) return;
            
            for (let i = 0; i < imagesToPaste.length; i++) {
                const file = imagesToPaste[i];
                let row = i === 0 ? targetRow : null;
                if (!row) {
                    const addBtn = document.querySelector(`.admin-add-row-btn[data-target="${_list.id}"]`);
                    if (!addBtn) continue;
                    row = document.createElement('div');
                    row.className = 'admin-img-url-row';
                    row.setAttribute('draggable', 'true');
                    row.innerHTML = _buildImgRowHtml(addBtn.dataset.name, addBtn.dataset.accept);
                    _list.appendChild(row);
                    wireRemoveButtons(row);
                    wireS3Uploaders(row);
                    wireImageRowDragAndReorder(row);
                }
                const textInput = row.querySelector('input[type="text"], input[type="url"]');
                if (textInput) {
                  const ext = file.type.split('/')[1] || 'png';
                  const fileName = `admin_${Date.now()}_${Math.random().toString(36).substring(2, 8)}.${ext}`;
                  textInput.value = 'Uploading...';
                  textInput.disabled = true;
                  try {
                    if (!supabase) throw new Error('Supabase client not found.');
                    const { data, error } = await supabase.storage.from('supplier-assets').upload(fileName, file);
                    if (error) throw error;
                    const { data: publicData } = supabase.storage.from('supplier-assets').getPublicUrl(fileName);
                    textInput.value = publicData.publicUrl;
                    _updateRowThumb(row, publicData.publicUrl);
                  } catch(err) {
                    console.error('Pasted Image Upload failed:', err);
                    textInput.value = '';
                    alert('Pasted Image Upload failed: ' + err.message);
                  } finally {
                    textInput.disabled = false;
                  }
                }
            }
            return;
        }
        
        // Text Paste: split by comma or newline for multiple URLs
        const pastedText = (e.clipboardData || e.originalEvent.clipboardData).getData('text');
        if (pastedText && (pastedText.includes(',') || pastedText.includes('\n'))) {
            const urls = pastedText.split(/[\n,]+/).map(s => s.trim()).filter(Boolean);
            if (urls.length > 1) {
                e.preventDefault();
                const target = e.target;
                const targetRow = target.closest('.admin-img-url-row');
                if (!targetRow) return;
                
                for (let i = 0; i < urls.length; i++) {
                    let row = i === 0 ? targetRow : null;
                    if (!row) {
                        const addBtn = document.querySelector(`.admin-add-row-btn[data-target="${_list.id}"]`);
                        if (!addBtn) continue;
                        row = document.createElement('div');
                        row.className = 'admin-img-url-row';
                        row.setAttribute('draggable', 'true');
                        row.innerHTML = _buildImgRowHtml(addBtn.dataset.name, addBtn.dataset.accept);
                        _list.appendChild(row);
                        wireRemoveButtons(row);
                        wireS3Uploaders(row);
                        wireImageRowDragAndReorder(row);
                    }
                    const textInput = row.querySelector('input[type="text"], input[type="url"]');
                    if (textInput) {
                        textInput.value = urls[i];
                        _updateRowThumb(row, urls[i]);
                    }
                }
            }
        }
      });
    });

    // "Add row" buttons for image URL lists
    document.querySelectorAll('.admin-add-row-btn[data-target]').forEach(btn => {
      // Prevent duplicate binding by cloning once
      const cloneBtn = btn.cloneNode(true);
      btn.parentNode.replaceChild(cloneBtn, btn);
      
      cloneBtn.addEventListener('click', () => {
        const list = document.getElementById(cloneBtn.dataset.target);
        if (!list) return;
        const row = document.createElement('div');
        row.className = 'admin-img-url-row';
        row.setAttribute('draggable', 'true');
        row.innerHTML = _buildImgRowHtml(cloneBtn.dataset.name, cloneBtn.dataset.accept);
        list.appendChild(row);
        wireRemoveButtons(row);
        wireS3Uploaders(row);
        wireImageRowDragAndReorder(row);
      });
    });

    // Wire all remove buttons globally
    wireRemoveButtons(document);
    
    // Wire all S3 Uploaders globally
    wireS3Uploaders(document);

    // Wire all image row drag & reorder globally
    wireImageRowDragAndReorder(document);
    wireCategoryDragAndReorder(document);
  }

  function wireRemoveButtons(container = document) {
    container.querySelectorAll('.admin-remove-row-btn').forEach(btn => {
      // Prevent duplicate event binding
      const fresh = btn.cloneNode(true);
      btn.parentNode.replaceChild(fresh, btn);
      fresh.addEventListener('click', () => fresh.parentElement.remove());
    });
  }

  function wireS3Uploaders(container = document) {
    container.querySelectorAll('.admin-s3-upload').forEach(input => {
      // Avoid duplicate bindings
      const _new = input.cloneNode(true);
      input.parentNode.replaceChild(_new, input);
      _new.addEventListener('change', async (e) => {
        const file = e.target.files[0];
        if (!file) return;
        
        // Find adjacent text input — try .admin-img-url-row first, then .admin-field, then closest div
        const row = _new.closest('.admin-img-url-row') || _new.closest('.admin-field') || _new.closest('div');
        const textInput = row ? row.querySelector('input[type="text"], input[type="url"]') : null;
        if (!textInput) { console.error('No text input found for upload target'); return; }
        
        const parentLabel = _new.parentElement;
        const ogLabel = parentLabel.innerHTML;
        parentLabel.innerHTML = '⏳ Uploading...';
        
        try {
          const ext = file.name.split('.').pop();
          // Build a supplier-scoped path: suppliers/{slug}/{original-or-unique-name}
          const supplierName = document.querySelector('[name="name"]')?.value?.trim() || 'unknown';
          const slug = supplierName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
          const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
          const fileName = `suppliers/${slug}/${Date.now()}_${safeName}`;
          
          if (!supabase) {
             throw new Error('Supabase client not found.');
          }
          const { data, error } = await supabase.storage.from('supplier-assets').upload(fileName, file, {
            cacheControl: '3600',
            upsert: false
          });
          if (error) throw error;
          
          const { data: publicData } = supabase.storage.from('supplier-assets').getPublicUrl(fileName);
          textInput.value = publicData.publicUrl;
          _updateRowThumb(row, publicData.publicUrl);
          
          parentLabel.innerHTML = '✅ Done';
          setTimeout(() => {
            parentLabel.innerHTML = ogLabel;
            wireS3Uploaders(row);
          }, 2000);
        } catch(err) {
          console.error('Upload Failed', err);
          parentLabel.innerHTML = '❌ Error';
          setTimeout(() => {
            parentLabel.innerHTML = ogLabel;
            wireS3Uploaders(row);
          }, 2000);
        }
      });
    });
  }

  // ── Update thumbnail in an image row ──
  function _updateRowThumb(row, url) {
    if (!row) return;
    const existingThumb = row.querySelector('.admin-img-thumb');
    const existingEmpty = row.querySelector('.admin-img-thumb-empty');
    if (url && url.startsWith('http')) {
      if (existingThumb) {
        existingThumb.src = url;
        existingThumb.style.display = '';
        if (existingEmpty) existingEmpty.style.display = 'none';
      } else if (existingEmpty) {
        const img = document.createElement('img');
        img.className = 'admin-img-thumb';
        img.src = url;
        img.alt = '';
        img.onerror = function() { this.style.display = 'none'; existingEmpty.style.display = 'flex'; };
        existingEmpty.parentNode.insertBefore(img, existingEmpty);
        existingEmpty.style.display = 'none';
      }
    } else {
      if (existingThumb) { existingThumb.style.display = 'none'; }
      if (existingEmpty) { existingEmpty.style.display = 'flex'; }
    }
  }

  // ── Drag & Drop + Reorder for image rows ──
  let _draggedImgRow = null;

  function wireImageRowDragAndReorder(scopeEl) {
    const container = scopeEl || document;
    const rows = container.classList?.contains('admin-img-url-row') 
      ? [container] 
      : container.querySelectorAll('.admin-img-url-row');

    rows.forEach(row => {
      // ── Up/Down reorder buttons ──
      const upBtn = row.querySelector('.admin-img-move-up');
      const downBtn = row.querySelector('.admin-img-move-down');

      if (upBtn) {
        const _up = upBtn.cloneNode(true);
        upBtn.parentNode.replaceChild(_up, upBtn);
        _up.addEventListener('click', () => {
          const prev = row.previousElementSibling;
          if (prev && prev.classList.contains('admin-img-url-row')) {
            row.parentNode.insertBefore(row, prev);
          }
        });
      }

      if (downBtn) {
        const _down = downBtn.cloneNode(true);
        downBtn.parentNode.replaceChild(_down, downBtn);
        _down.addEventListener('click', () => {
          const next = row.nextElementSibling;
          if (next && next.classList.contains('admin-img-url-row')) {
            row.parentNode.insertBefore(next, row);
          }
        });
      }

      // ── Drag start — only from the handle ──
      row.addEventListener('dragstart', (e) => {
        // Only allow drag from the drag handle
        if (!e.target.closest('.admin-img-drag-handle') && e.target !== row) {
          e.preventDefault();
          return;
        }
        _draggedImgRow = row;
        row.classList.add('dragging');
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('text/plain', ''); // required for Firefox
      });

      row.addEventListener('dragend', () => {
        row.classList.remove('dragging');
        _draggedImgRow = null;
        // Clean up all visual states
        document.querySelectorAll('.admin-img-url-row').forEach(r => {
          r.classList.remove('drag-insert-above', 'drag-insert-below');
        });
        document.querySelectorAll('.admin-image-category').forEach(c => {
          c.classList.remove('drag-over');
        });
      });

      row.addEventListener('dragover', (e) => {
        if (!_draggedImgRow || _draggedImgRow === row) return;
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
        // Determine if we insert above or below
        const rect = row.getBoundingClientRect();
        const midY = rect.top + rect.height / 2;
        row.classList.remove('drag-insert-above', 'drag-insert-below');
        if (e.clientY < midY) {
          row.classList.add('drag-insert-above');
        } else {
          row.classList.add('drag-insert-below');
        }
      });

      row.addEventListener('dragleave', () => {
        row.classList.remove('drag-insert-above', 'drag-insert-below');
      });

      row.addEventListener('drop', (e) => {
        if (!_draggedImgRow || _draggedImgRow === row) return;
        e.preventDefault();
        const rect = row.getBoundingClientRect();
        const midY = rect.top + rect.height / 2;
        const list = row.closest('.admin-image-url-list');
        if (!list) return;

        if (e.clientY < midY) {
          list.insertBefore(_draggedImgRow, row);
        } else {
          list.insertBefore(_draggedImgRow, row.nextSibling);
        }

        // Update the input name if dropped into a different category
        const newCategory = list.closest('.admin-image-category');
        if (newCategory) {
          const newName = newCategory.dataset.imgName;
          if (newName) {
            const inp = _draggedImgRow.querySelector('input[type="text"], input[type="url"]');
            if (inp) inp.name = newName;
          }
        }

        row.classList.remove('drag-insert-above', 'drag-insert-below');
      });

      // ── Thumbnail live update on URL input blur/change ──
      const textInput = row.querySelector('input[type="text"], input[type="url"]');
      if (textInput) {
        const _updateThumbOnBlur = () => { _updateRowThumb(row, textInput.value); };
        textInput.removeEventListener('blur', _updateThumbOnBlur);
        textInput.addEventListener('blur', _updateThumbOnBlur);
        textInput.addEventListener('change', _updateThumbOnBlur);
      }
    });

    // ── Category-level drop targets (for dragging to empty categories) ──
    document.querySelectorAll('.admin-image-category').forEach(cat => {
      cat.addEventListener('dragover', (e) => {
        if (!_draggedImgRow) return;
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
        cat.classList.add('drag-over');
      });

      cat.addEventListener('dragleave', (e) => {
        // Only remove if leaving the category entirely
        if (!cat.contains(e.relatedTarget)) {
          cat.classList.remove('drag-over');
        }
      });

      cat.addEventListener('drop', (e) => {
        e.preventDefault();
        cat.classList.remove('drag-over');
        if (!_draggedImgRow) return;
        // If dropped directly on the category (not on a row), append to the list
        const targetRow = e.target.closest('.admin-img-url-row');
        if (targetRow) return; // handled by row drop
        const list = cat.querySelector('.admin-image-url-list');
        if (list) {
          list.appendChild(_draggedImgRow);
          // Update input name
          const newName = cat.dataset.imgName;
          if (newName) {
            const inp = _draggedImgRow.querySelector('input[type="text"], input[type="url"]');
            if (inp) inp.name = newName;
          }
        }
      });
    });
  }

  // ── Drag & Drop + Reorder for Category Blocks ──
  let _draggedCategory = null;

  function wireCategoryDragAndReorder(container = document) {
    const cats = container.querySelectorAll('.admin-category-draggable');
    cats.forEach(cat => {
      cat.addEventListener('dragstart', (e) => {
        // If the drag is originating from an image row (or anything else), ignore it here
        if (e.target !== cat) return;
        
        _draggedCategory = cat;
        cat.classList.add('dragging-cat');
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('text/plain', '');
      });

      cat.addEventListener('dragend', () => {
        cat.classList.remove('dragging-cat');
        _draggedCategory = null;
        document.querySelectorAll('.admin-category-draggable').forEach(c => {
          c.classList.remove('drag-insert-above', 'drag-insert-below');
        });
      });

      cat.addEventListener('dragover', (e) => {
        // Prevent interfering with row drag
        if (!_draggedCategory || _draggedCategory === cat) return;
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
        
        const rect = cat.getBoundingClientRect();
        const midY = rect.top + rect.height / 2;
        cat.classList.remove('drag-insert-above', 'drag-insert-below');
        if (e.clientY < midY) {
          cat.classList.add('drag-insert-above');
        } else {
          cat.classList.add('drag-insert-below');
        }
      });

      cat.addEventListener('dragleave', () => {
        cat.classList.remove('drag-insert-above', 'drag-insert-below');
      });

      cat.addEventListener('drop', (e) => {
        if (!_draggedCategory || _draggedCategory === cat) return;
        e.preventDefault();
        
        const rect = cat.getBoundingClientRect();
        const midY = rect.top + rect.height / 2;
        const container = cat.parentNode;
        
        if (e.clientY < midY) {
          container.insertBefore(_draggedCategory, cat);
        } else {
          container.insertBefore(_draggedCategory, cat.nextSibling);
        }
        
        cat.classList.remove('drag-insert-above', 'drag-insert-below');
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
      { id: 'about',     label: 'About Us', icon: '🏢' },
      { id: 'faq',       label: 'FAQ', icon: '❓' },
      { id: 'blog',      label: 'Blog', icon: '✒️' }
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
      case 'about':     renderCMSAbout(container);     break;
      case 'faq':       renderCMSFaq(container);       break;
      case 'blog':      renderCMSBlog(container);      break;
      default: container.innerHTML = '<p style="color:var(--color-steel-400);padding:40px;text-align:center;">Select a page to edit.</p>';
    }
  }

  /* ═══════════════════════════════════════════════════
     FAQ PAGE EDITOR
     ═══════════════════════════════════════════════════ */
  window.cmsAddFaqSection = function() {
    if(!cmsDraft.pages.faq) cmsDraft.pages.faq = { sections: [] };
    if(!cmsDraft.pages.faq.sections) cmsDraft.pages.faq.sections = [];
    cmsDraft.pages.faq.sections.push({ title: "New Section", items: [] });
    renderCMSPage();
  };
  window.cmsRemoveFaqSection = function(i) {
    cmsDraft.pages.faq.sections.splice(i, 1);
    renderCMSPage();
  };
  window.cmsAddFaqItem = function(i) {
    if(!cmsDraft.pages.faq.sections[i].items) cmsDraft.pages.faq.sections[i].items = [];
    cmsDraft.pages.faq.sections[i].items.push({ question: "New Question", answer: "Answer here" });
    renderCMSPage();
  };
  window.cmsRemoveFaqItem = function(sIdx, iIdx) {
    cmsDraft.pages.faq.sections[sIdx].items.splice(iIdx, 1);
    renderCMSPage();
  };
  window.cmsUpdateFaqItem = function(sIdx, iIdx, field, val) {
    cmsDraft.pages.faq.sections[sIdx].items[iIdx][field] = val;
    saveCMSDraft();
  };
  window.cmsUpdateFaqSection = function(sIdx, val) {
    cmsDraft.pages.faq.sections[sIdx].title = val;
    saveCMSDraft();
  };

  function renderCMSFaq(container) {
    const faq = cmsDraft?.pages?.faq;
    if (!faq) cmsDraft.pages.faq = { sections: [] };
    const sections = cmsDraft.pages.faq.sections || [];
    let html = '<div class="cms-section-card"><h3>FAQ Sections</h3>';
    
    sections.forEach((sec, sIdx) => {
      html += `
        <div style="border:1px solid rgba(255,255,255,0.1); padding:16px; border-radius:8px; margin-bottom:16px;">
          <div style="display:flex; justify-content:space-between; margin-bottom:12px;">
            <input type="text" class="cms-input" value="${sec.title || ''}" onchange="cmsUpdateFaqSection(${sIdx}, this.value)" placeholder="Section Title" style="flex:1; margin-right:12px;">
            <button class="btn" style="background:#ff4d4d; color:white; border:none; padding:8px 12px; border-radius:4px;" onclick="cmsRemoveFaqSection(${sIdx})">Remove Section</button>
          </div>
          <div style="margin-left: 20px;">
      `;
      const items = sec.items || [];
      items.forEach((item, iIdx) => {
        html += `
            <div style="background:rgba(255,255,255,0.02); padding:12px; border-radius:6px; margin-bottom:8px; position:relative;">
              <input type="text" class="cms-input" value="${item.question || ''}" onchange="cmsUpdateFaqItem(${sIdx}, ${iIdx}, 'question', this.value)" placeholder="Question" style="margin-bottom:8px; width:100%;">
              <textarea class="cms-input" onchange="cmsUpdateFaqItem(${sIdx}, ${iIdx}, 'answer', this.value)" placeholder="Answer" rows="3" style="width:100%;">${item.answer || ''}</textarea>
              <button class="btn" style="position:absolute; top:12px; right:12px; background:transparent; color:#ff4d4d; border:1px solid #ff4d4d; padding:4px 8px; border-radius:4px; font-size:11px;" onclick="cmsRemoveFaqItem(${sIdx}, ${iIdx})">Remove Q</button>
            </div>
        `;
      });
      html += `
            <button class="btn btn-secondary" onclick="cmsAddFaqItem(${sIdx})" style="font-size:12px; margin-top:8px;">+ Add Question</button>
          </div>
        </div>
      `;
    });

    html += `<button class="btn btn-primary" onclick="cmsAddFaqSection()">+ Add Section</button></div>`;
    container.innerHTML = html;
  }

  /* ═══════════════════════════════════════════════════
     BLOG PAGE EDITOR
     ═══════════════════════════════════════════════════ */
  window.cmsAddBlogPost = function() {
    if(!cmsDraft.pages.blog) cmsDraft.pages.blog = { posts: [] };
    if(!cmsDraft.pages.blog.posts) cmsDraft.pages.blog.posts = [];
    cmsDraft.pages.blog.posts.push({ title: "New Post", date: new Date().toISOString().split('T')[0], image: "", content: "" });
    renderCMSPage();
  };
  window.cmsRemoveBlogPost = function(i) {
    cmsDraft.pages.blog.posts.splice(i, 1);
    renderCMSPage();
  };
  window.cmsUpdateBlogPost = function(i, field, val) {
    cmsDraft.pages.blog.posts[i][field] = val;
    saveCMSDraft();
  };

  function renderCMSBlog(container) {
    const blog = cmsDraft?.pages?.blog;
    if (!blog) cmsDraft.pages.blog = { posts: [] };
    const posts = cmsDraft.pages.blog.posts || [];
    let html = '<div class="cms-section-card"><h3>Blog Posts</h3>';
    
    posts.forEach((post, i) => {
      html += `
        <div style="border:1px solid rgba(255,255,255,0.1); padding:16px; border-radius:8px; margin-bottom:16px; position:relative;">
          <input type="text" class="cms-input" value="${post.title || ''}" onchange="cmsUpdateBlogPost(${i}, 'title', this.value)" placeholder="Post Title" style="margin-bottom:8px; width:calc(100% - 100px);">
          <input type="date" class="cms-input" value="${post.date || ''}" onchange="cmsUpdateBlogPost(${i}, 'date', this.value)" style="margin-bottom:8px; width:100px;">
          <input type="text" class="cms-input" value="${post.image || ''}" onchange="cmsUpdateBlogPost(${i}, 'image', this.value)" placeholder="Image URL (e.g., https://images.unsplash.com/...)" style="margin-bottom:8px; width:100%;">
          <textarea class="cms-input" onchange="cmsUpdateBlogPost(${i}, 'content', this.value)" placeholder="Post Content (Markdown or Text)" rows="6" style="width:100%;">${post.content || ''}</textarea>
          <button class="btn" style="position:absolute; top:16px; right:16px; background:#ff4d4d; color:white; border:none; padding:6px 12px; border-radius:4px; font-size:12px;" onclick="cmsRemoveBlogPost(${i})">Remove</button>
        </div>
      `;
    });

    html += `<button class="btn btn-primary" onclick="cmsAddBlogPost()">+ Add Post</button></div>`;
    container.innerHTML = html;
  }

  /* ═══════════════════════════════════════════════════
     HOME PAGE EDITOR
     ═══════════════════════════════════════════════════ */
  function renderCMSHome(container) {
    let home = cmsDraft?.pages?.home;
    if (!home) home = cmsDraft.pages.home = {};

    let html = '';

    // ── Hero ──
    html += `
      <div class="cms-block">
        <div class="cms-block__header">Hero Section</div>
        <div class="admin-field">
          <label>Headline</label>
          <input type="text" value="${home.hero?.headline || ''}" data-cms-path="hero.headline" placeholder="Design + Manufacturing" />
        </div>
        <div class="admin-field">
          <label>Prompt Text (Subtitle)</label>
          <textarea data-cms-path="hero.prompt" rows="2" placeholder="From concept to factory floor...">${home.hero?.prompt || ''}</textarea>
        </div>
        <div class="admin-field">
          <label>Gate Prompt (Above phase cards)</label>
          <input type="text" value="${home.hero?.gatePrompt || ''}" data-cms-path="hero.gatePrompt" placeholder="How can we help you" />
        </div>
      </div>
    `;

    // ── Phase Cards ──
    html += `
      <div class="cms-block">
        <div class="cms-block__header">Phase Cards (x4)</div>
    `;
    for (let c = 0; c < 4; c++) {
      const card = home.phaseCards?.[c] || {};
      html += `
        <div style="margin-bottom:16px; border:1px solid rgba(255,255,255,0.1); padding:16px; border-radius:8px;">
            <h4 style="color:white; margin-bottom:12px;">Card ${c + 1}</h4>
            <div class="admin-field"><label>Title</label><input type="text" value="${card.title || ''}" data-cms-path="phaseCards.${c}.title"/></div>
            <div class="admin-field"><label>Prompt</label><input type="text" value="${card.prompt || ''}" data-cms-path="phaseCards.${c}.prompt"/></div>
            <div class="admin-field"><label>CTA Button</label><input type="text" value="${card.cta || ''}" data-cms-path="phaseCards.${c}.cta"/></div>
            <div class="admin-field">
              <label>Bullets (3)</label>
              <input type="text" value="${card.bullets?.[0] || ''}" data-cms-path="phaseCards.${c}.bullets.0" placeholder="Bullet 1" style="margin-bottom:8px; display:block;"/>
              <input type="text" value="${card.bullets?.[1] || ''}" data-cms-path="phaseCards.${c}.bullets.1" placeholder="Bullet 2" style="margin-bottom:8px; display:block;"/>
              <input type="text" value="${card.bullets?.[2] || ''}" data-cms-path="phaseCards.${c}.bullets.2" placeholder="Bullet 3" style="margin-bottom:8px; display:block;"/>
            </div>
        </div>
      `;
    }
    html += '</div>';

    // ── Who We Are ──
    html += `
      <div class="cms-block">
        <div class="cms-block__header">Who We Are</div>
        <div class="admin-field">
          <label>Eyebrow Text</label>
          <input type="text" value="${home.whoWeAre?.eyebrow || ''}" data-cms-path="whoWeAre.eyebrow" placeholder="Who We Are" />
        </div>
        <div class="admin-field">
          <label>Main Title</label>
          <textarea data-cms-path="whoWeAre.title" rows="2">${home.whoWeAre?.title || ''}</textarea>
        </div>
        <div class="admin-field">
          <label>Body Paragraph 1</label>
          <textarea data-cms-path="whoWeAre.body1" rows="3">${home.whoWeAre?.body1 || ''}</textarea>
        </div>
        <div class="admin-field">
          <label>Body Paragraph 2</label>
          <textarea data-cms-path="whoWeAre.body2" rows="3">${home.whoWeAre?.body2 || ''}</textarea>
        </div>
    `;

    // Pillars
    html += `<label style="color:var(--color-steel-300);font-size:13px;display:block;margin-bottom:8px;">4 Core Pillars</label>`;
    for(let i = 0; i < 4; i++) {
        const pillar = home.whoWeAre?.pillars?.[i] || {};
        html += `
          <div style="display:flex;gap:12px;margin-bottom:12px;">
            <div style="flex:1;"><input type="text" value="${pillar.title || ''}" data-cms-path="whoWeAre.pillars.${i}.title" placeholder="Pillar Title" style="width:100%;background:rgba(0,0,0,0.2);border:1px solid rgba(255,255,255,0.1);color:white;padding:8px;border-radius:4px;"/></div>
            <div style="flex:2;"><input type="text" value="${pillar.desc || ''}" data-cms-path="whoWeAre.pillars.${i}.desc" placeholder="Pillar Description" style="width:100%;background:rgba(0,0,0,0.2);border:1px solid rgba(255,255,255,0.1);color:white;padding:8px;border-radius:4px;"/></div>
          </div>
        `;
    }
    html += '</div>';

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
        for (let k = 0; k < parts.length - 1; k++) {
          if (!obj[parts[k]]) obj[parts[k]] = {};
          obj = obj[parts[k]];
        }
        obj[parts[parts.length - 1]] = el.value;
      });
    });

    // Wire drop zones (if any added later)
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
      const role = c.role || (c.designer_status && c.designer_status !== 'none' ? 'designer' : 'user');
      const roleColors = {
        designer:     { bg: '#ede9fe', color: '#6d28d9', border: '#c4b5fd' },
        entrepreneur: { bg: '#fef3c7', color: '#92400e', border: '#fde68a' },
        user:         { bg: '#f1f5f9', color: '#475569', border: '#e2e8f0' },
      };
      const rc = roleColors[role] || roleColors.user;
      const dateJoined = new Date(c.created_at || Date.now()).toLocaleDateString('en-GB', { day:'2-digit', month:'2-digit', year:'numeric' });
      const signupEmail = c.email || '—';

      return `
      <tr>
        <td>
          <strong>${c.first_name || ''} ${c.last_name || ''}</strong><br>
          <span style="font-size:12px; color:var(--color-steel-400);">${signupEmail}</span>
        </td>
        <td><a href="mailto:${c.email}" style="color:#3b82f6;font-size:13px;font-weight:500;text-decoration:none;">${signupEmail}</a></td>
        <td>${c.company || '—'}</td>
        <td>${c.job_title || '—'}</td>
        <td><span style="display:inline-block;padding:3px 10px;border-radius:20px;font-size:11px;font-weight:700;text-transform:capitalize;background:${rc.bg};color:${rc.color};border:1px solid ${rc.border};">${role}</span></td>
        <td>${dateJoined}</td>
        <td>${c.marketing_opt_in ? '<span class="tag-segment tag-tier1" style="background: rgba(14, 165, 233, 0.1); color: var(--color-electric); border: 1px solid rgba(14, 165, 233, 0.3);">Opted In</span>' : '<span style="color: var(--color-steel-400); font-size: 12px;">No</span>'}</td>
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
              <th>Email</th>
              <th>Company</th>
              <th>Job Title</th>
              <th>Role</th>
              <th>Join Date</th>
              <th>Marketing</th>
              <th>Actions</th>
            </tr></thead>
            <tbody>${rows || '<tr><td colspan="8" style="text-align:center;padding:40px;">No customers found.</td></tr>'}</tbody>
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

    let rfqCount = 0;
    try {
      const res = await fetch(`/.netlify/functions/admin-rfqs?action=count&userId=${id}`);
      if (res.ok) {
        const data = await res.json();
        rfqCount = data.count || 0;
      }
    } catch(e) {}

    const dateJoined = cust.created_at ? new Date(cust.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : '—';
    const isDesigner = cust.designer_status && cust.designer_status !== 'none';
    const dsColor = cust.designer_status === 'approved' ? '#059669' : cust.designer_status === 'pending' ? '#d97706' : cust.designer_status === 'rejected' ? '#dc2626' : '#64748b';
    const role = cust.role || (isDesigner ? 'designer' : 'user');
    const dsLabel = (cust.designer_status || 'none').charAt(0).toUpperCase() + (cust.designer_status || 'none').slice(1);

    // Helper for field rows
    const field = (label, val) => `<div style="display:flex;justify-content:space-between;padding:8px 0;border-bottom:1px solid #f1f5f9;"><span style="color:#64748b;font-size:13px;font-weight:500;">${label}</span><span style="color:#0f172a;font-size:13px;font-weight:600;text-align:right;max-width:60%;word-break:break-word;">${val || '—'}</span></div>`;

    const modalHTML = `
      <div id="admin-cust-modal" style="position:fixed;inset:0;background:rgba(0,0,0,0.4);backdrop-filter:blur(4px);z-index:9999;display:flex;align-items:center;justify-content:center;">
        <div style="background:#ffffff;border-radius:16px;width:90%;max-width:820px;max-height:90vh;display:flex;flex-direction:column;box-shadow:0 24px 80px rgba(0,0,0,0.18);overflow:hidden;">

          <!-- Header -->
          <div style="padding:20px 28px;border-bottom:1px solid #e2e8f0;display:flex;justify-content:space-between;align-items:center;flex-shrink:0;">
            <div>
              <h2 style="margin:0;font-size:18px;font-weight:800;color:#0f172a;">${cust.first_name || ''} ${cust.last_name || ''}</h2>
              <div style="font-size:13px;color:#64748b;margin-top:2px;">${cust.email || '—'} · Joined ${dateJoined}</div>
            </div>
            <div style="display:flex;align-items:center;gap:12px;">
              ${isDesigner ? `<span style="background:${dsColor}15;color:${dsColor};border:1px solid ${dsColor}40;padding:4px 10px;border-radius:6px;font-size:11px;font-weight:700;text-transform:uppercase;">Designer: ${dsLabel}</span>` : ''}
              <span style="background:${role === 'designer' ? '#ede9fe' : role === 'entrepreneur' ? '#fef3c7' : '#f1f5f9'};color:${role === 'designer' ? '#6d28d9' : role === 'entrepreneur' ? '#92400e' : '#475569'};padding:4px 10px;border-radius:6px;font-size:11px;font-weight:700;text-transform:uppercase;border:1px solid ${role === 'designer' ? '#c4b5fd' : role === 'entrepreneur' ? '#fde68a' : '#e2e8f0'}">${role}</span>
              <button onclick="document.getElementById('admin-cust-modal').remove()" style="background:none;border:none;cursor:pointer;font-size:22px;color:#94a3b8;line-height:1;">×</button>
            </div>
          </div>

          <!-- Scrollable Body -->
          <div style="flex:1;overflow-y:auto;padding:28px;">
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:28px;">

              <!-- LEFT COLUMN -->
              <div style="display:flex;flex-direction:column;gap:24px;">

                <!-- Personal Information -->
                <div>
                  <div style="font-size:11px;font-weight:800;color:#94a3b8;text-transform:uppercase;letter-spacing:0.06em;margin-bottom:12px;">Personal Information</div>
                  <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:10px;padding:16px;">
                    ${field('First Name', cust.first_name)}
                    ${field('Last Name', cust.last_name)}
                    ${field('Email', cust.email)}
                    ${field('Phone', cust.phone)}
                    ${field('Age', cust.age)}
                    ${field('Gender', cust.gender ? cust.gender.charAt(0).toUpperCase() + cust.gender.slice(1) : null)}
                    ${field('Address', cust.address)}
                    ${field('Shipping Address', cust.shipping_address)}
                    ${field('LinkedIn', cust.linkedin_url ? '<a href="' + cust.linkedin_url + '" target="_blank" style="color:#2563eb;text-decoration:none;">View Profile ↗</a>' : null)}
                  </div>
                </div>

                <!-- Company Information -->
                <div>
                  <div style="font-size:11px;font-weight:800;color:#94a3b8;text-transform:uppercase;letter-spacing:0.06em;margin-bottom:12px;">Company Information</div>
                  <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:10px;padding:16px;">
                    ${field('Company', cust.company)}
                    ${field('Job Title', cust.job_title)}
                    ${field('Website', cust.company_website)}
                    ${field('Industry', cust.company_industry)}
                    ${field('Company Size', cust.company_size)}
                    ${field('Tax ID', cust.tax_id)}
                    ${field('Registration No.', cust.registration_number)}
                  </div>
                </div>
              </div>

              <!-- RIGHT COLUMN -->
              <div style="display:flex;flex-direction:column;gap:24px;">

                <!-- Professional Profile -->
                <div>
                  <div style="font-size:11px;font-weight:800;color:#94a3b8;text-transform:uppercase;letter-spacing:0.06em;margin-bottom:12px;">Professional Profile</div>
                  <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:10px;padding:16px;">
                    ${field('Skills', cust.skills)}
                    ${field('Career Description', cust.career_description ? (cust.career_description.length > 80 ? cust.career_description.slice(0,80) + '…' : cust.career_description) : null)}
                    ${field('Experience (yrs)', cust.experience_years)}
                    ${field('Methodologies', cust.methodologies)}
                    ${field('Work History', cust.work_history ? (cust.work_history.length > 80 ? cust.work_history.slice(0,80) + '…' : cust.work_history) : null)}
                    ${field('Resume', cust.resume_url ? '<a href="' + cust.resume_url + '" target="_blank" style="color:#2563eb;text-decoration:none;">View Resume ↗</a>' : null)}
                    ${field('Portfolio', cust.portfolio_url ? '<a href="' + cust.portfolio_url + '" target="_blank" style="color:#2563eb;text-decoration:none;">View Portfolio ↗</a>' : null)}
                  </div>
                </div>

                <!-- Account Activity -->
                <div>
                  <div style="font-size:11px;font-weight:800;color:#94a3b8;text-transform:uppercase;letter-spacing:0.06em;margin-bottom:12px;">Account Activity</div>
                  <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:10px;padding:16px;display:flex;align-items:center;gap:16px;">
                    <div style="background:#dcfce7;border-radius:10px;width:48px;height:48px;display:flex;align-items:center;justify-content:center;font-size:20px;font-weight:800;color:#059669;">${rfqCount}</div>
                    <div><div style="font-size:14px;font-weight:700;color:#166534;">RFQs / Quotes Generated</div><div style="font-size:12px;color:#4ade80;">Total activity in the system</div></div>
                  </div>
                  <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:10px;padding:16px;margin-top:12px;">
                    ${field('Marketing Opt-In', cust.marketing_opt_in ? '<span style="color:#059669;font-weight:700;">✓ Opted In</span>' : '<span style="color:#94a3b8;">No</span>')}
                    ${field('Designer Status', `<span style="color:${dsColor};font-weight:700;">${dsLabel}</span>`)}
                    ${field('Account Created', dateJoined)}
                  </div>
                </div>

                <!-- Admin Controls -->
                <div>
                  <div style="font-size:11px;font-weight:800;color:#94a3b8;text-transform:uppercase;letter-spacing:0.06em;margin-bottom:12px;">Admin Controls</div>
                  <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:10px;padding:16px;">
                    <div style="margin-bottom:12px;">
                      <label style="font-size:12px;font-weight:700;color:#475569;display:block;margin-bottom:6px;">User Role</label>
                      <select id="cust-role-select" style="width:100%;padding:8px 12px;border:1px solid #cbd5e1;border-radius:8px;font-size:13px;color:#0f172a;background:#ffffff;">
                        <option value="user"         ${role === 'user'         ? 'selected' : ''}>User</option>
                        <option value="designer"     ${role === 'designer'     ? 'selected' : ''}>Designer</option>
                        <option value="entrepreneur" ${role === 'entrepreneur' ? 'selected' : ''}>Entrepreneur</option>
                      </select>
                    </div>
                    <div>
                      <label style="font-size:12px;font-weight:700;color:#475569;display:block;margin-bottom:6px;">Admin Notes</label>
                      <textarea id="cust-admin-notes" rows="3" placeholder="Billing refs, stripe IDs, internal notes…" style="width:100%;padding:8px 12px;border:1px solid #cbd5e1;border-radius:8px;font-size:13px;color:#0f172a;background:#ffffff;resize:vertical;box-sizing:border-box;font-family:inherit;">${cust.admin_notes || ''}</textarea>
                      <div style="font-size:11px;color:#94a3b8;margin-top:4px;">Only visible to SysAdmins.</div>
                    </div>
                  </div>
                </div>

              </div>
            </div>
          </div>

          <!-- Footer -->
          <div style="padding:16px 28px;border-top:1px solid #e2e8f0;display:flex;justify-content:space-between;align-items:center;flex-shrink:0;background:#f8fafc;">
            <button onclick="if(confirm('Suspend this account? The user will be locked out.')){alert('Account suspended.');document.getElementById('admin-cust-modal').remove();}" style="background:#fef2f2;color:#dc2626;border:1px solid #fecaca;padding:8px 16px;border-radius:8px;font-size:13px;font-weight:700;cursor:pointer;">Suspend Account</button>
            <div style="display:flex;gap:10px;">
              <button onclick="document.getElementById('admin-cust-modal').remove()" style="background:#ffffff;color:#475569;border:1px solid #cbd5e1;padding:8px 20px;border-radius:8px;font-size:13px;font-weight:600;cursor:pointer;">Cancel</button>
              <button id="cust-save-btn" style="background:#2563eb;color:#ffffff;border:none;padding:8px 20px;border-radius:8px;font-size:13px;font-weight:700;cursor:pointer;">Save Changes</button>
            </div>
          </div>

        </div>
      </div>
    `;

    document.body.insertAdjacentHTML('beforeend', modalHTML);

    document.getElementById('cust-save-btn')?.addEventListener('click', async (e) => {
      const btn = e.target;
      const originalText = btn.textContent;
      btn.textContent = 'Saving...';
      btn.style.opacity = '0.6';
      const newRole    = document.getElementById('cust-role-select').value;
      const adminNotes = document.getElementById('cust-admin-notes').value;

      const { error } = await supabase.from('profiles').update({ role: newRole, admin_notes: adminNotes }).eq('id', id);

      if(error) {
        console.error(error);
        alert('Failed to save changes.');
        btn.textContent = originalText;
        btn.style.opacity = '1';
      } else {
        cust.role = newRole;
        cust.admin_notes = adminNotes;
        btn.textContent = '✓ Saved!';
        btn.style.background = '#059669';
        renderCustomersTable();
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
  } // END renderStaffForm

  window.hideRejectedDesigners = window.hideRejectedDesigners === undefined ? false : window.hideRejectedDesigners;

  function renderDesignersHub() {
    let targetDesigners = loadedCustomers.filter(c => c.designer_status && c.designer_status !== 'none');
    if (window.hideRejectedDesigners) {
      targetDesigners = targetDesigners.filter(c => c.designer_status !== 'rejected');
    }

    const parseArray = (attr) => {
      if (!attr) return [];
      if (Array.isArray(attr)) return attr;
      try { return JSON.parse(attr); } catch(e) { return [attr]; }
    };

    const rows = targetDesigners.map(s => `
      <tr>
        <td>
          <div style="font-weight:600; color:var(--color-electric);">${s.first_name || ''} ${s.last_name || ''}</div>
          <div style="font-size:12px; color:var(--color-steel-400);">${s.email || '—'}</div>
        </td>
        <td>
           <span style="font-size: 10px; padding: 2px 6px; border-radius: 4px; border: 1px solid rgba(255,255,255,0.2); text-transform: uppercase;">${s.designer_status}</span><br>
           <div style="font-size: 12px; margin-top: 4px; color: var(--color-steel-400);">${s.job_title || s.company || '—'}</div>
        </td>
        <td style="max-width:300px;">
          <div style="max-height:80px; overflow-y:auto; font-size:12px; background:rgba(255,255,255,0.05); padding:8px; border-radius:4px; white-space:pre-wrap;">${s.cover_letter || 'No pitch provided.'}</div>
        </td>
        <td>
          ${s.resume_url ? `<a href="${s.resume_url}" target="_blank" class="admin-badge active" style="text-decoration:none;">View CV</a>` : `<span class="admin-badge">No CV</span>`}
        </td>
        <td>
          ${s.portfolio_url ? `<a href="${s.portfolio_url}" target="_blank" class="admin-badge active" style="text-decoration:none;">Doc</a>` : ''}
          ${parseArray(s.portfolio_assets).length ? `<a href="${parseArray(s.portfolio_assets)[0]}" target="_blank" class="admin-badge active" style="text-decoration:none; margin-left: ${s.portfolio_url ? '4px' : '0'};">Images</a>` : (!s.portfolio_url ? `<span class="admin-badge">None</span>` : '')}
        </td>
        <td style="white-space: nowrap;">
          ${s.hourly_rate || s.rate ? `<span style="font-weight: 500; color: var(--color-electric);">${s.hourly_rate || s.rate}</span>` : `<span style="opacity:0.5;">—</span>`}
        </td>
        <td style="max-width: 200px;">
          <div style="display: flex; flex-wrap: wrap; gap: 4px;">
            ${parseArray(s.specialized_skills).length ? parseArray(s.specialized_skills).map(sk => `<span class="admin-badge" style="font-size: 9px; padding: 2px 4px;">${sk.skill || sk}</span>`).join('') : '<span style="opacity:0.5;">—</span>'}
          </div>
        </td>
        <td class="admin-table-actions">
           <button class="admin-action-btn admin-view-designer" data-id="${s.id}" style="color:white; background:var(--color-electric); border-color:var(--color-electric);">Review</button>
           ${s.designer_status === 'pending' || s.designer_status === 'unverified' ? `
             <button class="admin-action-btn admin-approve-designer" data-id="${s.id}" style="color:var(--color-emerald); border-color:var(--color-emerald);">Approve</button>
             <button class="admin-action-btn admin-reject-designer" data-id="${s.id}" style="color:#ef4444; border-color:rgba(239,68,68,.2);">Reject</button>
           ` : ''}
           ${s.designer_status === 'approved' ? `
             <button class="admin-action-btn admin-reject-designer" data-id="${s.id}" style="color:#ef4444; border-color:rgba(239,68,68,.2);">Revoke</button>
           ` : ''}
           ${s.designer_status === 'rejected' ? `
             <button class="admin-action-btn admin-approve-designer" data-id="${s.id}" style="color:var(--color-emerald); border-color:var(--color-emerald);">Restore</button>
             <button class="admin-action-btn admin-delete-designer" data-id="${s.id}" style="color:white; background:#ef4444; border-color:#ef4444;">Delete</button>
           ` : ''}
        </td>
      </tr>
    `).join('');

    contentRouting.innerHTML = `
      <div style="margin-bottom:24px; display: flex; justify-content: space-between; align-items: start;">
        <div>
          <h2 style="font-size: 20px; margin-bottom: 8px;">Designer Directory & Applications</h2>
          <p style="color: var(--color-steel-400); font-size: 14px;">Review applicants and manage approved designers.</p>
        </div>
        <div style="display: flex; align-items: center; gap: 8px;">
          <input type="checkbox" id="hide-rejected-toggle" ${window.hideRejectedDesigners ? 'checked' : ''}>
          <label for="hide-rejected-toggle" style="font-size: 13px; color: var(--color-steel-300); cursor:pointer;">Hide Rejected</label>
        </div>
      </div>

      <div class="admin-table-container">
        <table class="admin-table">
          <thead>
            <tr>
              <th>Applicant</th>
              <th>Status & Role</th>
              <th>Cover Letter / Pitch</th>
              <th>Resume</th>
              <th>Portfolio</th>
              <th>Rate</th>
              <th>Skills</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            ${rows.length ? rows : '<tr><td colspan="6" style="text-align:center; padding: 40px; color:var(--color-steel-400);">No applications found.</td></tr>'}
          </tbody>
        </table>
      </div>
    `;

    document.getElementById('hide-rejected-toggle')?.addEventListener('change', (e) => {
      window.hideRejectedDesigners = e.target.checked;
      renderDesignersHub();
    });

    document.querySelectorAll('.admin-approve-designer').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        const id = e.target.dataset.id;
        btn.textContent = '...';
        btn.disabled = true;
        try {
          const { error } = await supabase.from('profiles').update({ designer_status: 'approved' }).eq('id', id);
          if (error) throw error;
          
          const approved = loadedCustomers.find(c => c.id === id);
          if (approved) {
             const wasPending = approved.designer_status === 'pending' || approved.designer_status === 'unverified';
             approved.designer_status = 'approved';
             if (wasPending) {
               try {
                 await fetch('/.netlify/functions/send-email', {
                   method: 'POST',
                   headers: { 'Content-Type': 'application/json' },
                   body: JSON.stringify({ email: approved.contact_email, name: approved.first_name || 'Designer', type: 'designer_approved' })
                 });
               } catch(err) { console.error("Failed to trigger email hook", err); }
             }
          }
          updateNavBadges();
          renderDesignersHub();
        } catch(err) {
          alert('Error approving designer: ' + err.message);
          renderDesignersHub();
        }
      });
    });

    document.querySelectorAll('.admin-reject-designer').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        if (!confirm("Are you sure you want to reject/revoke this status?")) return;
        const id = e.target.dataset.id;
        btn.textContent = '...';
        btn.disabled = true;
        try {
          const { error } = await supabase.from('profiles').update({ designer_status: 'rejected' }).eq('id', id);
          if (error) throw error;
          
          const rejected = loadedCustomers.find(c => c.id === id);
          if (rejected) {
             const wasPending = rejected.designer_status === 'pending' || rejected.designer_status === 'unverified';
             rejected.designer_status = 'rejected';
             if (wasPending) {
               try {
                 await fetch('/.netlify/functions/send-email', {
                   method: 'POST',
                   headers: { 'Content-Type': 'application/json' },
                   body: JSON.stringify({ email: rejected.contact_email, name: rejected.first_name || 'Designer', type: 'designer_rejected' })
                 });
               } catch(err) { console.error("Failed to trigger email hook", err); }
             }
          }
          updateNavBadges();
          renderDesignersHub();
        } catch(err) {
          alert('Error updating status: ' + err.message);
          renderDesignersHub();
        }
      });
    });

    document.querySelectorAll('.admin-delete-designer').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        if (!confirm("Permanently delete this designer application? This will reset them entirely.")) return;
        const id = e.target.dataset.id;
        btn.textContent = '...';
        btn.disabled = true;
        try {
          const { error } = await supabase.from('profiles').update({ designer_status: 'none' }).eq('id', id);
          if (error) throw error;
          
          const target = loadedCustomers.find(c => c.id === id);
          if (target) target.designer_status = 'none';
          
          updateNavBadges();
          renderDesignersHub();
        } catch(err) {
          alert('Error deleting: ' + err.message);
          renderDesignersHub();
        }
      });
    });

    document.querySelectorAll('.admin-view-designer').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const id = e.target.dataset.id;
        const s = loadedCustomers.find(c => c.id === id);
        if (!s) return;
        
        const parseArray = (attr) => {
          if (!attr) return [];
          if (Array.isArray(attr)) return attr;
          try { return JSON.parse(attr); } catch(e) { return [attr]; }
        };

        let skillsHtml = parseArray(s.specialized_skills).map(sk => `<span style="display:inline-block; border:1px solid rgba(255,255,255,0.2); border-radius:4px; padding:2px 6px; margin:2px;">${sk.skill || sk}</span>`).join('') || 'None';
        let softwareHtml = parseArray(s.software_used).map(sk => `<span style="display:inline-block; border:1px solid rgba(255,255,255,0.2); border-radius:4px; padding:2px 6px; margin:2px;">${sk}</span>`).join('') || 'None';
        let languageHtml = parseArray(s.spoken_languages).map(sk => `<span style="display:inline-block; border:1px solid rgba(255,255,255,0.2); border-radius:4px; padding:2px 6px; margin:2px;">${sk}</span>`).join('') || 'None';

        const modalHtml = `
          <div id="inspector-modal-overlay-${id}" style="position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(0,0,0,0.8); z-index:9999; display:flex; align-items:center; justify-content:center;">
            <div style="background:#1e293b; border:1px solid rgba(255,255,255,0.1); border-radius:12px; width:90%; max-width:800px; max-height:90vh; overflow-y:auto; padding:32px; color:white; font-family:'Output', 'Space Grotesk', sans-serif;">
              <div style="display:flex; justify-content:space-between; align-items:center; border-bottom:1px solid rgba(255,255,255,0.1); padding-bottom:16px; margin-bottom:24px;">
                <h2 style="margin:0; font-size:22px;">Applicant Diagnostics File</h2>
                <button onclick="document.getElementById('inspector-modal-overlay-${id}').remove()" style="background:transparent; border:none; color:white; font-size:24px; cursor:pointer;">&times;</button>
              </div>

              <div style="display:grid; grid-template-columns:1fr 1fr; gap:24px; margin-bottom:24px;">
                <div style="background:rgba(255,255,255,0.03); padding:16px; border-radius:8px; border:1px solid rgba(255,255,255,0.05);">
                  <strong style="color:var(--color-electric); display:block; margin-bottom:8px; text-transform:uppercase; font-size:12px;">Contact Information</strong>
                  <div style="font-size:14px; margin-bottom:4px;"><strong>Email (Auth):</strong> ${s.email || 'N/A'}</div>
                  <div style="font-size:14px; margin-bottom:4px;"><strong>Email (Contact):</strong> ${s.contact_email || 'N/A'}</div>
                  <div style="font-size:14px; margin-bottom:4px;"><strong>Phone:</strong> ${s.phone || 'N/A'}</div>
                  <div style="font-size:14px; margin-bottom:4px;"><strong>Location:</strong> ${s.address || 'N/A'}</div>
                  <div style="font-size:14px; margin-bottom:4px;"><strong>LinkedIn:</strong> ${s.linkedin_url ? `<a href="${s.linkedin_url}" target="_blank" style="color:#60a5fa;">View</a>` : 'N/A'}</div>
                  <div style="font-size:14px; margin-bottom:4px;"><strong>Online Portfolio:</strong> ${s.online_portfolio_url ? `<a href="${s.online_portfolio_url}" target="_blank" style="color:#60a5fa;">View</a>` : 'N/A'}</div>
                </div>

                <div style="background:rgba(255,255,255,0.03); padding:16px; border-radius:8px; border:1px solid rgba(255,255,255,0.05);">
                  <strong style="color:var(--color-electric); display:block; margin-bottom:8px; text-transform:uppercase; font-size:12px;">Rates & Environment</strong>
                  <div style="font-size:14px; margin-bottom:4px;"><strong>Hourly Rate:</strong> ${s.hourly_rate ? s.hourly_rate + ' ' + (s.hourly_rate_currency || 'USD') + '/hr' : 'N/A'}</div>
                  <div style="font-size:14px; margin-bottom:4px;"><strong>Availability:</strong> ${s.availability || 'N/A'}</div>
                  <div style="font-size:14px; margin-bottom:4px;"><strong>Schedule Type:</strong> ${s.schedule_type || 'N/A'}</div>
                  <div style="font-size:14px; margin-bottom:4px;"><strong>Working Days:</strong> ${s.working_days || 'N/A'}</div>
                  <div style="font-size:14px; margin-bottom:4px;"><strong>Working Hours:</strong> ${s.working_hours || 'N/A'}</div>
                  <div style="font-size:14px; margin-bottom:4px;"><strong>Timezone:</strong> ${s.timezone || 'N/A'}</div>
                </div>
              </div>

              <div style="background:rgba(255,255,255,0.03); padding:16px; border-radius:8px; border:1px solid rgba(255,255,255,0.05); margin-bottom:24px;">
                  <strong style="color:var(--color-electric); display:block; margin-bottom:8px; text-transform:uppercase; font-size:12px;">Technical Skills</strong>
                  <div style="margin-bottom:12px; font-size:13px;"><strong style="display:block; margin-bottom:4px;">Specializations:</strong> ${skillsHtml}</div>
                  <div style="margin-bottom:12px; font-size:13px;"><strong style="display:block; margin-bottom:4px;">Software Used:</strong> ${softwareHtml}</div>
                  <div style="margin-bottom:12px; font-size:13px;"><strong style="display:block; margin-bottom:4px;">Languages Spoken:</strong> ${languageHtml}</div>
              </div>
            </div>
          </div>
        `;
        document.body.insertAdjacentHTML('beforeend', modalHtml);
      });
    });

  }

});


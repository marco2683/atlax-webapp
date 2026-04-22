
import { MOCK_DESIGNERS } from './data/mock-designers.js';
import { supabase } from './supabase.js';
import { renderPricingConfigurator } from './admin-pricing.js';
import { renderMarketplaceTaxonomy } from './admin-taxonomy.js';
import { renderAdminProducts } from './admin-products.js';
import { loadPricingConfig } from './utils/pricing-loader.js';
import { initRfiImporter } from './admin-rfi.js';

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
        if (t === 'rfqs')      { pageTitle.textContent = 'RFQ \u0026 Project Tracker';    renderRFQs(); }
        if (t === 'pricing') { pageTitle.textContent = 'Pricing Engine Configurator'; renderPricingConfigurator(contentRouting); }
        if (t === 'website')   { pageTitle.textContent = 'Website Content Manager';  renderWebsiteContent(); }
        if (t === 'marketplace-taxonomy') { pageTitle.textContent = 'Marketplace Admin'; renderMarketplaceTaxonomy(contentRouting); }
        if (t === 'products') { pageTitle.textContent = 'Products Catalog'; renderAdminProducts(contentRouting); }
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
  } // END renderStaffForm

  function renderDesignersHub() {
    let pendingDesigners = loadedCustomers.filter(c => c.designer_status === 'pending');

    const rows = pendingDesigners.map(s => `
      <tr>
        <td>
          <div style="font-weight:600; color:var(--color-electric);">${s.first_name || ''} ${s.last_name || ''}</div>
          <div style="font-size:12px; color:var(--color-steel-400);">${s.email || '—'}</div>
        </td>
        <td>${s.job_title || s.company || '—'}</td>
        <td style="max-width:300px;">
          <div style="max-height:80px; overflow-y:auto; font-size:12px; background:rgba(255,255,255,0.05); padding:8px; border-radius:4px; white-space:pre-wrap;">${s.cover_letter || 'No pitch provided.'}</div>
        </td>
        <td>
          ${s.resume_url ? `<a href="${s.resume_url}" target="_blank" class="admin-badge active" style="text-decoration:none;">View CV</a>` : `<span class="admin-badge">No CV</span>`}
        </td>
        <td>
          ${s.portfolio_assets && s.portfolio_assets.length ? `<a href="${JSON.parse(s.portfolio_assets)[0]}" target="_blank" class="admin-badge active" style="text-decoration:none;">View Portfolio</a>` : `<span class="admin-badge">No Portfolio</span>`}
        </td>
        <td class="admin-table-actions">
           <button class="admin-action-btn admin-approve-designer" data-id="${s.id}" style="color:var(--color-emerald); border-color:var(--color-emerald);">Approve</button>
           <button class="admin-action-btn admin-reject-designer" data-id="${s.id}" style="color:#ef4444; border-color:rgba(239,68,68,.2);">Reject</button>
        </td>
      </tr>
    `).join('');

    contentRouting.innerHTML = `
      <div style="margin-bottom:24px;">
        <h2 style="font-size: 20px; margin-bottom: 8px;">Pending Designer Applications</h2>
        <p style="color: var(--color-steel-400); font-size: 14px;">Review CVs and Cover Letters before approving them to the global Designer directory.</p>
      </div>

      <div class="admin-table-container">
        <table class="admin-table">
          <thead>
            <tr>
              <th>Applicant</th>
              <th>Current Role</th>
              <th>Cover Letter / Pitch</th>
              <th>Resume</th>
              <th>Portfolio</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            ${rows.length ? rows : '<tr><td colspan="6" style="text-align:center; padding: 40px; color:var(--color-steel-400);">No pending applications found.</td></tr>'}
          </tbody>
        </table>
      </div>
    `;

    document.querySelectorAll('.admin-approve-designer').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        const id = e.target.dataset.id;
        btn.textContent = 'Approving...';
        btn.disabled = true;
        try {
          const { error } = await supabase.from('profiles').update({ designer_status: 'approved' }).eq('id', id);
          if (error) throw error;
          
          const approved = loadedCustomers.find(c => c.id === id);
          if (approved) approved.designer_status = 'approved';
          renderDesignersHub();
        } catch(err) {
          alert('Error approving designer: ' + err.message);
          btn.textContent = 'Approve';
          btn.disabled = false;
        }
      });
    });

    document.querySelectorAll('.admin-reject-designer').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        if (!confirm("Are you sure you want to reject this applicant? They will be removed from pending.")) return;
        const id = e.target.dataset.id;
        btn.textContent = 'Rejecting...';
        btn.disabled = true;
        try {
           // We can set it back to null or 'rejected'
          const { error } = await supabase.from('profiles').update({ designer_status: 'rejected' }).eq('id', id);
          if (error) throw error;
          
          const rejected = loadedCustomers.find(c => c.id === id);
          if (rejected) rejected.designer_status = 'rejected';
          renderDesignersHub();
        } catch(err) {
          alert('Error rejecting designer: ' + err.message);
          btn.textContent = 'Reject';
          btn.disabled = false;
        }
      });
    });
  }

});


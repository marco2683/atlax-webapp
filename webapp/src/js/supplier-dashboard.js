import { supabase } from './supabase.js';
import { getCurrentUser, logoutUser, loginUser, signUpUser } from './services/auth.js';

let currentUser = null;
let factoryRecord = null;
let categories = [];
let categoryParameters = [];
let myProducts = [];
let currentLang = 'en';

const i18nDict = {
  disconnect: { en: "Logout", zh: "登出" }
};

export function translateDOM() {
  document.querySelectorAll('[data-i18n]').forEach(el => {
    const key = el.dataset.i18n;
    if (i18nDict[key] && i18nDict[key][currentLang]) {
      el.textContent = i18nDict[key][currentLang];
    }
  });
}

document.addEventListener('DOMContentLoaded', async () => {
  const loadingUi = document.getElementById('supplier-loading');
  const onboardingUi = document.getElementById('supplier-onboarding');
  const appUi = document.getElementById('supplier-app');
  
  document.getElementById('lang-toggle-btn')?.addEventListener('click', () => {
    currentLang = currentLang === 'en' ? 'zh' : 'en';
    translateDOM();
  });
  
  currentUser = await getCurrentUser();
  if (!currentUser) {
    // Show inline auth UI instead of redirecting away
    loadingUi.style.display = 'none';
    showSupplierAuthScreen();
    return;
  }

  const { data: factories, error } = await supabase.from('suppliers').select('*').eq('owner_user_id', currentUser.id);
  
  if (error || !factories || factories.length === 0) {
    loadingUi.style.display = 'none';
    onboardingUi.style.display = 'flex';
    bindOnboarding();
  } else {
    factoryRecord = factories[0];
    bootApp();
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// SUPPLIER SELF-SERVICE AUTH (Login / Register)
// Shown when no session exists — suppliers don't need to leave this page
// ─────────────────────────────────────────────────────────────────────────────
function showSupplierAuthScreen() {
  const onboardingUi = document.getElementById('supplier-onboarding');
  const appUi        = document.getElementById('supplier-app');

  // Replace the onboarding panel with the auth screen
  document.body.innerHTML = `
    <div style="min-height:100vh; background:linear-gradient(135deg,#0c1a2e 0%,#0e2640 50%,#0a1628 100%); display:flex; flex-direction:column; align-items:center; justify-content:center; font-family:'Open Sans',sans-serif;">

      <!-- Logo -->
      <div style="margin-bottom:40px; text-align:center;">
        <img src="/logos/atlax-logo-original.png" alt="AtlasDT" style="height:36px; filter:brightness(0) invert(1); margin-bottom:12px;">
        <div style="color:rgba(255,255,255,0.6); font-size:13px; letter-spacing:2px; text-transform:uppercase;">Seller Platform · 卖家平台</div>
      </div>

      <!-- Card -->
      <div style="background:#fff; border-radius:8px; box-shadow:0 24px 64px rgba(0,0,0,0.4); width:100%; max-width:440px; overflow:hidden;">

        <!-- Tab switcher -->
        <div id="auth-tabs" style="display:flex; border-bottom:1px solid #e2e8f0;">
          <button id="tab-login" onclick="window._authTab('login')" style="flex:1; padding:16px; background:#fff; border:none; font-weight:700; font-size:14px; color:#007185; cursor:pointer; border-bottom:3px solid #007185; font-family:inherit;">Sign In</button>
          <button id="tab-register" onclick="window._authTab('register')" style="flex:1; padding:16px; background:#f8fafc; border:none; font-weight:600; font-size:14px; color:#64748b; cursor:pointer; border-bottom:3px solid transparent; font-family:inherit;">Create Account</button>
        </div>

        <div id="auth-body" style="padding:32px;">

          <!-- Login Form -->
          <div id="auth-login">
            <h2 style="margin:0 0 4px 0; font-size:20px; font-weight:700; color:#0f172a;">Welcome back</h2>
            <p style="margin:0 0 24px 0; font-size:13px; color:#64748b;">Sign in to access your seller dashboard.</p>
            <div id="auth-login-err" style="display:none; background:#fef2f2; border:1px solid #fecaca; border-radius:4px; padding:10px 14px; font-size:13px; color:#dc2626; margin-bottom:16px;"></div>
            <label style="display:block; margin-bottom:4px; font-size:12px; font-weight:700; color:#374151;">Email address</label>
            <input type="email" id="login-email" placeholder="you@company.com" style="width:100%; padding:10px 14px; border:1px solid #d1d5db; border-radius:4px; font-size:14px; margin-bottom:16px; box-sizing:border-box; font-family:inherit;">
            <label style="display:block; margin-bottom:4px; font-size:12px; font-weight:700; color:#374151;">Password</label>
            <input type="password" id="login-password" placeholder="••••••••" style="width:100%; padding:10px 14px; border:1px solid #d1d5db; border-radius:4px; font-size:14px; margin-bottom:24px; box-sizing:border-box; font-family:inherit;">
            <button id="btn-login" onclick="window._doLogin()" style="width:100%; padding:12px; background:#007185; color:#fff; border:none; border-radius:4px; font-size:15px; font-weight:700; cursor:pointer; font-family:inherit;">Sign In to Seller Central</button>
            <p style="text-align:center; margin:16px 0 0 0; font-size:12px; color:#64748b;">
              Don't have an account? <a href="#" onclick="window._authTab('register'); return false;" style="color:#007185; font-weight:700;">Register here</a>
            </p>
          </div>

          <!-- Register Form -->
          <div id="auth-register" style="display:none;">
            <h2 style="margin:0 0 4px 0; font-size:20px; font-weight:700; color:#0f172a;">Create your seller account</h2>
            <p style="margin:0 0 24px 0; font-size:13px; color:#64748b;">Join the AtlasDT B2B marketplace as a verified supplier.</p>
            <div id="auth-reg-err" style="display:none; background:#fef2f2; border:1px solid #fecaca; border-radius:4px; padding:10px 14px; font-size:13px; color:#dc2626; margin-bottom:16px;"></div>
            <div id="auth-reg-ok"  style="display:none; background:#f0fdf4; border:1px solid #86efac; border-radius:4px; padding:10px 14px; font-size:13px; color:#16a34a; margin-bottom:16px;"></div>
            <label style="display:block; margin-bottom:4px; font-size:12px; font-weight:700; color:#374151;">Full name</label>
            <input type="text" id="reg-name" placeholder="Zhang Wei" style="width:100%; padding:10px 14px; border:1px solid #d1d5db; border-radius:4px; font-size:14px; margin-bottom:16px; box-sizing:border-box; font-family:inherit;">
            <label style="display:block; margin-bottom:4px; font-size:12px; font-weight:700; color:#374151;">Work email</label>
            <input type="email" id="reg-email" placeholder="you@factory.com" style="width:100%; padding:10px 14px; border:1px solid #d1d5db; border-radius:4px; font-size:14px; margin-bottom:16px; box-sizing:border-box; font-family:inherit;">
            <label style="display:block; margin-bottom:4px; font-size:12px; font-weight:700; color:#374151;">Password <span style="color:#9ca3af; font-weight:400;">(min. 8 characters)</span></label>
            <input type="password" id="reg-password" placeholder="••••••••" style="width:100%; padding:10px 14px; border:1px solid #d1d5db; border-radius:4px; font-size:14px; margin-bottom:16px; box-sizing:border-box; font-family:inherit;">
            <label style="display:block; margin-bottom:4px; font-size:12px; font-weight:700; color:#374151;">Company name</label>
            <input type="text" id="reg-company" placeholder="Shenzhen Precision Manufacturing Ltd." style="width:100%; padding:10px 14px; border:1px solid #d1d5db; border-radius:4px; font-size:14px; margin-bottom:24px; box-sizing:border-box; font-family:inherit;">
            <button id="btn-register" onclick="window._doRegister()" style="width:100%; padding:12px; background:#f59e0b; color:#fff; border:none; border-radius:4px; font-size:15px; font-weight:700; cursor:pointer; font-family:inherit;">Create Account & Continue</button>
            <p style="text-align:center; margin:16px 0 0 0; font-size:12px; color:#64748b;">
              Already registered? <a href="#" onclick="window._authTab('login'); return false;" style="color:#007185; font-weight:700;">Sign in</a>
            </p>
          </div>

        </div>
      </div>

      <p style="margin-top:24px; font-size:12px; color:rgba(255,255,255,0.4);">
        By continuing you agree to the AtlasDT Platform Terms of Service.
      </p>
    </div>
  `;

  // ── Tab switcher ────────────────────────────────────────────────────────────
  window._authTab = function(tab) {
    const isLogin = tab === 'login';
    document.getElementById('auth-login').style.display    = isLogin ? '' : 'none';
    document.getElementById('auth-register').style.display = isLogin ? 'none' : '';
    document.getElementById('tab-login').style.color       = isLogin ? '#007185' : '#64748b';
    document.getElementById('tab-login').style.fontWeight  = isLogin ? '700' : '600';
    document.getElementById('tab-login').style.borderBottom= isLogin ? '3px solid #007185' : '3px solid transparent';
    document.getElementById('tab-login').style.background  = isLogin ? '#fff' : '#f8fafc';
    document.getElementById('tab-register').style.color       = !isLogin ? '#007185' : '#64748b';
    document.getElementById('tab-register').style.fontWeight  = !isLogin ? '700' : '600';
    document.getElementById('tab-register').style.borderBottom= !isLogin ? '3px solid #007185' : '3px solid transparent';
    document.getElementById('tab-register').style.background  = !isLogin ? '#fff' : '#f8fafc';
  };

  // ── Login handler ───────────────────────────────────────────────────────────
  window._doLogin = async function() {
    const btn   = document.getElementById('btn-login');
    const errEl = document.getElementById('auth-login-err');
    const email = document.getElementById('login-email').value.trim();
    const pass  = document.getElementById('login-password').value;

    if (!email || !pass) { errEl.textContent = 'Please enter your email and password.'; errEl.style.display=''; return; }

    btn.textContent = 'Signing in...';
    btn.disabled = true;
    errEl.style.display = 'none';

    const { data, error } = await loginUser(email, pass);
    if (error) {
      errEl.textContent = error.message || 'Login failed. Check your credentials.';
      errEl.style.display = '';
      btn.textContent = 'Sign In to Seller Central';
      btn.disabled = false;
    } else {
      // Reload the page — DOMContentLoaded will re-run with the session now set
      window.location.reload();
    }
  };

  // ── Register handler ────────────────────────────────────────────────────────
  window._doRegister = async function() {
    const btn     = document.getElementById('btn-register');
    const errEl   = document.getElementById('auth-reg-err');
    const okEl    = document.getElementById('auth-reg-ok');
    const name    = document.getElementById('reg-name').value.trim();
    const email   = document.getElementById('reg-email').value.trim();
    const pass    = document.getElementById('reg-password').value;
    const company = document.getElementById('reg-company').value.trim();

    errEl.style.display = 'none';
    okEl.style.display  = 'none';

    if (!name || !email || !pass || !company) {
      errEl.textContent = 'Please fill in all fields.'; errEl.style.display=''; return;
    }
    if (pass.length < 8) {
      errEl.textContent = 'Password must be at least 8 characters.'; errEl.style.display=''; return;
    }

    btn.textContent = 'Creating account...';
    btn.disabled = true;

    const { data, error } = await signUpUser(email, pass, { full_name: name, company });
    if (error) {
      errEl.textContent = error.message || 'Registration failed. Please try again.';
      errEl.style.display = '';
      btn.textContent = 'Create Account & Continue';
      btn.disabled = false;
    } else {
      // Supabase may require email confirmation depending on project settings
      const needsConfirm = !data?.session;
      if (needsConfirm) {
        okEl.innerHTML = `
          <strong>✅ Account created!</strong><br>
          Please check <strong>${email}</strong> for a confirmation email, then return here and sign in.
        `;
        okEl.style.display = '';
        btn.textContent = 'Account Created — Check your email';
        btn.disabled = true;
      } else {
        // Auto-confirmed (email confirm disabled in Supabase) — reload with session
        window.location.reload();
      }
    }
  };

  // Allow Enter key on inputs
  setTimeout(() => {
    ['login-email','login-password'].forEach(id => {
      document.getElementById(id)?.addEventListener('keydown', e => { if(e.key==='Enter') window._doLogin(); });
    });
    ['reg-name','reg-email','reg-password','reg-company'].forEach(id => {
      document.getElementById(id)?.addEventListener('keydown', e => { if(e.key==='Enter') window._doRegister(); });
    });
  }, 100);
}

function bindOnboarding() {
  document.getElementById('onboarding-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = e.target.querySelector('button');
    btn.textContent = "Processing...";
    btn.disabled = true;

    const name = document.getElementById('onboard-factory-name').value;
    const segment = document.getElementById('onboard-factory-focus').value;

    const { data, error } = await supabase.from('suppliers').insert({
      id: crypto.randomUUID(),
      owner_user_id: currentUser.id,
      name: name,
      segment: segment
    }).select('*');

    if (error) {
      alert("Error linking profile: " + error.message);
      btn.textContent = "Agree and Create Profile";
      btn.disabled = false;
    } else {
      factoryRecord = data[0];
      document.getElementById('supplier-onboarding').style.display = 'none';
      bootApp();
    }
  });
}

async function bootApp() {
  document.getElementById('supplier-loading').style.display = 'none';
  document.getElementById('supplier-app').style.display = 'flex';

  document.getElementById('sidebar-factory-name').textContent = `${factoryRecord.name} | Global`;

  document.getElementById('supplier-logout-btn').addEventListener('click', async () => {
    await logoutUser();
  });

  const [catRes, paramRes] = await Promise.all([
    supabase.from('component_categories').select('*').order('name'),
    supabase.from('category_parameters').select('*')
  ]);
  categories = catRes.data || [];
  categoryParameters = paramRes.data || [];

  // Bind top nav
  document.getElementById('nav-inventory').addEventListener('click', loadCatalogTab);
  document.getElementById('nav-orders')?.addEventListener('click', loadOrdersTab);

  loadCatalogTab(); 
}

// ─────────────────────────────────────────────────────────────────────────────
// TAB: CATALOG (Manage Inventory Amazon Style)
// ─────────────────────────────────────────────────────────────────────────────
async function loadCatalogTab() {
  const routing = document.getElementById('supplier-content-routing');
  
  routing.innerHTML = `
    <div class="amz-container">
      <h1 class="amz-page-title">Manage All Inventory</h1>
      
      <div class="amz-tabs">
        <div class="amz-tab active">All listings</div>
        <div class="amz-tab">Complete drafts</div>
        <div class="amz-tab">Activate listings</div>
        <div class="amz-tab">Enhance listings</div>
        <div class="amz-tab">Review listing changes</div>
      </div>

      <div class="amz-toolbar">
        <div class="amz-search-bar">
          <select class="amz-search-select"><option>All</option></select>
          <input type="text" class="amz-search-input" placeholder="Search SKU, Title, ASIN, UPC/EAN">
          <button style="border:none; background:#FFF; padding:0 12px; cursor:pointer;">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#565959" stroke-width="2"><circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/></svg>
          </button>
        </div>
        <button class="amz-btn" id="btn-create-product">Add a product</button>
      </div>

      <div id="catalog-grid" style="min-height: 400px; background:#FFF; border: 1px solid var(--amz-border); border-top:none;">
        <div style="padding: 40px; text-align:center; color: var(--amz-text-light);">Loading listings...</div>
      </div>
    </div>
  `;

  document.getElementById('btn-create-product').addEventListener('click', () => renderCreateProductForm());

  // Dev Helper: Auto-assign mock components to the logged-in supplier so they can test updates
  await supabase.from('products').update({ supplier_id: factoryRecord.id }).ilike('mpn', '%OPTO%');
  const { data, error } = await supabase.from('products').select('*').eq('supplier_id', factoryRecord.id);
  myProducts = data || [];

  const grid = document.getElementById('catalog-grid');
  if (myProducts.length === 0) {
    grid.innerHTML = `
      <div style="text-align: center; padding: 60px;">
        <div style="font-weight: 700; margin-bottom: 8px;">No listings found.</div>
        <div style="font-size: 13px; color: var(--amz-text-light);">Create a new listing to start selling.</div>
      </div>
    `;
  } else {
    grid.innerHTML = `
      <table class="amz-table">
        <thead>
          <tr>
            <th style="width:30px;"><input type="checkbox"></th>
            <th>Listing status</th>
            <th style="width:300px;">Product details</th>
            <th>Performance</th>
            <th>Inventory</th>
            <th>Price and shipping cost</th>
            <th style="text-align:right;">Estimated fees</th>
            <th style="width:100px;"></th>
          </tr>
        </thead>
        <tbody>
          ${myProducts.map(p => {
            const stock = p.stock_quantity || 0;
            const price = Number(p.base_price || 0).toFixed(2);
            
            const isOOS = stock === 0;
            const statusBadge = isOOS 
              ? '<span class="amz-badge amz-badge-red">Out of stock</span><span style="color:var(--amz-link); font-size:12px;">Replenish inventory</span>'
              : '<span class="amz-badge amz-badge-gray">Active</span>';

            return `
              <tr>
                <td><input type="checkbox"></td>
                <td>
                  ${statusBadge}
                  <div style="color:var(--amz-text-light); font-size:11px; margin-top:4px;">Just now</div>
                </td>
                <td>
                  <div class="amz-product-meta">
                    <img src="${p.image_url || p.specs?.images?.[0] || p.specs?.image_url || '/placeholder.png'}" class="amz-product-thumb">
                    <div class="amz-product-info">
                      <a class="amz-product-title" data-product-id="${p.id}">${p.description || p.mpn}</a>
                      <div class="amz-product-sub">ASIN: ${p.id.substring(0,8).toUpperCase()}<br>SKU: ${p.mpn}</div>
                    </div>
                  </div>
                </td>
                <td>
                  <div class="amz-metrics">
                    <span class="amz-metric-label">Sales</span><span class="amz-metric-val">--</span>
                    <span class="amz-metric-label">Units sold</span><span class="amz-metric-val">--</span>
                    <span class="amz-metric-label">Page views</span><span class="amz-metric-val">--</span>
                    <span class="amz-metric-label">Sales rank</span><span class="amz-metric-val">--</span>
                  </div>
                </td>
                <td>
                   <div class="amz-metrics">
                    <span class="amz-metric-label"><strong>Available</strong></span><span class="amz-metric-val"><strong>${stock}</strong></span>
                    <span class="amz-metric-label">Inbound</span><span class="amz-metric-val">0</span>
                    <span class="amz-metric-label">Unfulfillable</span><span class="amz-metric-val">0</span>
                    <span class="amz-metric-label">Reserved</span><span class="amz-metric-val">0</span>
                  </div>
                </td>
                <td>
                   <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:8px;">
                     <span style="font-weight:700;">Price</span>
                     <div style="display:flex; align-items:center; border:1px solid var(--amz-input-border); border-radius:4px; overflow:hidden;">
                        <span style="background:#F0F2F2; padding:4px 8px; border-right:1px solid var(--amz-input-border); color:var(--amz-text-light);">USD</span>
                        <input type="text" class="amz-inline-input" value="${price}" style="border:none; width:60px;" data-update-id="${p.id}">
                     </div>
                   </div>
                   <div style="font-size:12px; color:var(--amz-text-light);">
                     Lowest price: --
                   </div>
                </td>
                <td style="text-align:right;">
                  <div style="font-weight:700;">Total fees</div>
                  <div style="color:var(--amz-text-light);">FBA fee</div>
                  <a style="color:var(--amz-link); font-size:11px;">Calculate revenue</a>
                </td>
                <td style="text-align:right;">
                  <button class="amz-btn btn-edit-prod" data-id="${p.id}">Edit</button>
                </td>
              </tr>
            `;
          }).join('')}
        </tbody>
      </table>
    `;

    document.querySelectorAll('.btn-edit-prod, .amz-product-title').forEach(el => {
      el.addEventListener('click', (e) => {
        const id = e.currentTarget.dataset.id || e.currentTarget.dataset.productId;
        renderCreateProductForm(id);
      });
    });

    // Handle inline price update demo
    document.querySelectorAll('.amz-inline-input').forEach(el => {
      el.addEventListener('change', async (e) => {
        const id = e.target.dataset.updateId;
        const newPrice = Number(e.target.value);
        if(!isNaN(newPrice)) {
          e.target.style.opacity = '0.5';
          await supabase.from('products').update({ base_price: newPrice }).eq('id', id);
          e.target.style.opacity = '1';
        }
      });
    });
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// ADD PRODUCT VIEW (Amazon Style)
// ─────────────────────────────────────────────────────────────────────────────
function renderCreateProductForm(editProdId = null) {
  const routing = document.getElementById('supplier-content-routing');
  const prod = editProdId ? myProducts.find(p => p.id === editProdId) : null;
  const specs = prod?.specs || {};
  
  const rootCats = categories.filter(c => !c.parent_id);
  const options = [];
  rootCats.forEach(r => {
    const subs = categories.filter(c => c.parent_id === r.id);
    if(subs.length === 0) {
      options.push(`<option data-id="${r.id}" value="${r.name}"></option>`);
    } else {
      subs.forEach(s => options.push(`<option data-id="${s.id}" value="${r.name} > ${s.name}"></option>`));
    }
  });

  const getCatName = (id) => {
    const cat = categories.find(c => c.id === id);
    if (!cat) return '';
    if (cat.parent_id) {
       const p = categories.find(p => p.id === cat.parent_id);
       return p ? p.name + ' > ' + cat.name : cat.name;
    }
    return cat.name;
  };

  const asinMock = prod ? prod.id.substring(0,8).toUpperCase() : 'NEW_ASIN';

  routing.innerHTML = `
<div class="amz-container">
    <!-- Top Header -->
    <div style="margin-bottom:24px; padding-bottom:20px; border-bottom:1px solid var(--amz-border);">
      <div style="display:flex; justify-content:space-between; align-items:flex-end;">
         <div style="flex:1;">
            <label style="font-size:12px; font-weight:700; color:#565959; margin-bottom:4px; display:block; text-transform:uppercase; letter-spacing:0.5px;">Product Name / Title</label>
            <input type="text" id="p-desc" required class="amz-form-input" style="font-size:20px; font-weight:700; padding:10px 14px; border:1px solid #ccc; width:100%; border-radius:4px; box-shadow:inset 0 1px 2px rgba(0,0,0,0.05);" value="${prod?.description || ''}">
         </div>
      </div>
    </div>

    <form id="new-product-form">
      <!-- Top Grid 3-Columns -->
      <div style="display:grid; grid-template-columns: repeat(auto-fit, minmax(320px, 1fr)); gap:32px; margin-bottom:48px;">
        
        <!-- Left: Image & Media Management -->
        <div>
          <label style="font-size:12px; font-weight:700; color:#111; margin-bottom:10px; display:block; text-transform:uppercase; border-bottom:2px solid #e0e0e0; padding-bottom:6px;">Media & Documents</label>
          
          <div style="text-align:center; padding:24px; border:1px solid #ccc; background:#fff; border-radius:4px; box-shadow:0 1px 3px rgba(0,0,0,0.05); margin-bottom:16px; position:relative;">
             <img id="prod-main-img-preview" src="${prod?.image_url || prod?.specs?.images?.[0] || prod?.specs?.image_url || '/placeholder.png'}" style="max-width:100%; max-height:200px; height:auto; margin-bottom:16px; object-fit:contain;">
             <br>
             <button type="button" onclick="document.getElementById('p-img-file').click()" style="background:#fff; border:1px solid #007185; color:#007185; padding:8px 16px; border-radius:4px; cursor:pointer; font-size:12px; font-weight:700; transition:background 0.2s; width:100%;">
                <svg style="vertical-align:middle; margin-right:4px; margin-top:-2px;" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="17 8 12 3 7 8"></polyline><line x1="12" y1="3" x2="12" y2="15"></line></svg> Upload Main Image
             </button>
             <input type="file" accept="image/*" id="p-img-file" style="display:none;">
          </div>

          <div style="display:flex; flex-direction:column; gap:8px;">
             <!-- Extra Images -->
             <div style="display:flex; justify-content:space-between; align-items:center; border:1px solid #e0e0e0; padding:8px 12px; border-radius:4px; background:#fafafa;">
                <div style="font-size:12px; color:#333; font-weight:600;"><svg style="vertical-align:middle; margin-right:6px;" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg> Extra Gallery Images</div>
                <button type="button" onclick="document.getElementById('p-extra-imgs').click()" style="background:none; border:none; color:#007185; font-size:12px; font-weight:700; cursor:pointer;">Add</button>
                <input type="file" accept="image/*" multiple id="p-extra-imgs" style="display:none;">
             </div>
             <!-- 3D Model -->
             <div style="display:flex; justify-content:space-between; align-items:center; border:1px solid #e0e0e0; padding:8px 12px; border-radius:4px; background:#fafafa;">
                <div style="font-size:12px; color:#333; font-weight:600;"><svg style="vertical-align:middle; margin-right:6px;" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path><polyline points="3.27 6.96 12 12.01 20.73 6.96"></polyline><line x1="12" y1="22.08" x2="12" y2="12"></line></svg> 3D Model (STEP/STL)</div>
                <button type="button" onclick="document.getElementById('p-3d-model').click()" style="background:none; border:none; color:#007185; font-size:12px; font-weight:700; cursor:pointer;">Add</button>
                <input type="file" accept=".stp,.step,.stl,.igs,.iges" id="p-3d-model" style="display:none;">
             </div>
             <!-- 2D Drawing -->
             <div style="display:flex; justify-content:space-between; align-items:center; border:1px solid #e0e0e0; padding:8px 12px; border-radius:4px; background:#fafafa;">
                <div style="font-size:12px; color:#333; font-weight:600;"><svg style="vertical-align:middle; margin-right:6px;" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><line x1="3" y1="9" x2="21" y2="9"></line><line x1="9" y1="21" x2="9" y2="9"></line></svg> 2D Drawing (PDF/DXF)</div>
                <button type="button" onclick="document.getElementById('p-2d-drawing').click()" style="background:none; border:none; color:#007185; font-size:12px; font-weight:700; cursor:pointer;">Add</button>
                <input type="file" accept=".pdf,.dxf,.dwg" id="p-2d-drawing" style="display:none;">
             </div>
             <!-- Product Video -->
             <div style="display:flex; justify-content:space-between; align-items:center; border:1px solid #e0e0e0; padding:8px 12px; border-radius:4px; background:#fafafa;">
                <div style="font-size:12px; color:#333; font-weight:600;"><svg style="vertical-align:middle; margin-right:6px;" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="23 7 16 12 23 17 23 7"></polygon><rect x="1" y="5" width="15" height="14" rx="2" ry="2"></rect></svg> Video (.MP4)</div>
                <button type="button" onclick="document.getElementById('p-video').click()" style="background:none; border:none; color:#007185; font-size:12px; font-weight:700; cursor:pointer;">Add</button>
                <input type="file" accept="video/mp4" id="p-video" style="display:none;">
             </div>
          </div>
        </div>

        <!-- Middle: Properties -->
        <div>
          <label style="font-size:12px; font-weight:700; color:#111; margin-bottom:10px; display:block; text-transform:uppercase; border-bottom:2px solid #e0e0e0; padding-bottom:6px;">Basic Identities</label>
          <table style="width:100%; border-collapse:collapse; font-size:13px; line-height:1.6;" class="e14-prop-table">
            <tr style="border-bottom:1px solid #f0f0f0;">
              <td style="padding:10px 0; color:#666; width:35%;">Category</td>
              <td style="padding:10px 0;">
                 <input list="category-datalist" id="p-category" required class="amz-form-input" placeholder="Search categories..." value="${getCatName(prod?.category_id)}" style="width:100%; padding:6px 10px; border:1px solid #ccc; border-radius:3px;">
                 <datalist id="category-datalist">${options.join('')}</datalist>
              </td>
            </tr>
            <tr style="border-bottom:1px solid #f0f0f0;">
              <td style="padding:10px 0; color:#666;">Manufacturer Part No</td>
              <td style="padding:10px 0;">
                <input type="text" id="p-mpn" required class="amz-form-input" style="width:100%; padding:6px 10px; border:1px solid #ccc; border-radius:3px; font-weight:700; font-size:14px; color:#111;" value="${prod?.mpn || ''}">
              </td>
            </tr>
            <tr style="border-bottom:1px solid #f0f0f0;">
              <td style="padding:10px 0; color:#666;">Internal SKU</td>
              <td style="padding:10px 0;">
                <input type="text" id="internal-sku" class="amz-form-input" style="width:100%; padding:6px 10px; border:1px solid #ccc; border-radius:3px; color:#333;" value="${prod?.mpn || ''}" placeholder="Optional">
              </td>
            </tr>
            <tr style="border-bottom:1px solid #f0f0f0;">
              <td style="padding:10px 0; color:#666;">Product Type</td>
              <td style="padding:10px 0;">
                <input type="text" id="product-type" class="amz-form-input" style="width:100%; padding:6px 10px; border:1px solid #ccc; border-radius:3px; color:#333;" value="INDUSTRIAL_COMPONENT">
              </td>
            </tr>
            <tr>
              <td style="padding:10px 0; color:#666;">Technical Datasheet</td>
              <td style="padding:10px 0;">
                 <div style="display:flex; align-items:center; gap:8px;">
                     <input type="file" accept="application/pdf" id="p-pdf-file" style="font-size:11px; width:100%; padding:4px;">
                 </div>
              </td>
            </tr>
          </table>
        </div>

        <!-- Right: Commerce / Pricing -->
        <div style="border-left:1px solid #eee; padding-left:32px;">
          <div style="color:#007185; font-size:15px; font-weight:700; margin-bottom:12px; border-bottom:2px solid #007185; padding-bottom:6px; display:inline-block;">
            <svg style="vertical-align:middle; margin-right:4px;" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="4" width="20" height="16" rx="2"/><path d="M7 15h0M2 9.5h20"/></svg> Pricing & Logistics
          </div>
          
          <table style="width: 100%; border-collapse: collapse; font-size: 11px;" id="pricing-tiers-table">
            <thead>
              <tr style="background: #F0F2F2; border-top: 1px solid #ccc; border-bottom: 2px solid #ccc;">
                <th style="padding: 8px 6px; text-align: left; color:#555; text-transform:uppercase;">MoQ</th>
                <th style="padding: 8px 6px; text-align: left; color:#555; text-transform:uppercase;">Lead (Days)</th>
                <th style="padding: 8px 6px; text-align: left; color:#555; text-transform:uppercase;">Unit Price</th>
                <th style="padding: 8px 6px; text-align: center; color:#555;">CTRL</th>
              </tr>
            </thead>
            <tbody id="pricing-tiers-body">
            </tbody>
          </table>
          <button type="button" id="btn-add-tier" style="margin-top:8px; background:#fff; border:1px solid #007185; color:#007185; padding:6px 12px; border-radius:3px; font-size:11px; font-weight:700; cursor:pointer; width:100%; transition:background 0.2s;">+ Add Volume Tier</button>

          <div style="margin-top:32px;">
            <div style="font-weight:700; font-size:12px; color:#111; margin-bottom:12px; text-transform:uppercase; border-bottom:2px solid #e0e0e0; padding-bottom:4px;">Packaging Dimensions</div>
            <div id="packaging-layers-container"></div>
            <button type="button" id="btn-add-packaging-layer" style="margin-top:8px; background:#FAFAFA; border:1px dashed #aaa; color:#333; padding:8px 12px; border-radius:3px; font-size:11px; font-weight:700; cursor:pointer; width:100%; transition:all 0.2s;">+ Add Packaging Layer</button>
          </div>
        </div>
      </div>

      <!-- Bottom Structured Data -->
      <div style="max-width: 1000px;">
        
        <!-- Product Overview (Rich Text) -->
        <h2 style="font-size:16px; font-weight:700; border-bottom:2px solid #007185; padding-bottom:6px; margin-bottom:16px; color:#111; display:inline-block;">Product Overview</h2>
        
        <div style="border: 1px solid #ccc; border-radius: 4px; background: #fff; margin-bottom:32px; box-shadow:0 1px 4px rgba(0,0,0,0.03);" id="rich-editor-wrapper">
          <div style="background: #f9f9f9; padding: 8px 12px; border-bottom: 1px solid #ccc; display:flex; gap: 8px; flex-wrap:wrap;">
            <button type="button" onclick="document.execCommand('formatBlock',false,'H1')" style="background:#fff; border:1px solid #d5d9d9; border-radius:3px; cursor:pointer; font-weight:700; padding:4px 10px; font-size:12px; color:#333;">H1</button>
            <button type="button" onclick="document.execCommand('formatBlock',false,'H2')" style="background:#fff; border:1px solid #d5d9d9; border-radius:3px; cursor:pointer; font-weight:700; padding:4px 10px; font-size:12px; color:#333;">H2</button>
            <hr style="width:1px; height:20px; background:#ccc; border:none; margin:0 4px;">
            <button type="button" onclick="document.execCommand('bold',false,null)" style="background:#fff; border:1px solid #d5d9d9; border-radius:3px; cursor:pointer; font-weight:700; padding:4px 10px; color:#333;">B</button>
            <button type="button" onclick="document.execCommand('italic',false,null)" style="background:#fff; border:1px solid #d5d9d9; border-radius:3px; cursor:pointer; font-style:italic; padding:4px 10px; color:#333;">I</button>
            <button type="button" onclick="document.execCommand('underline',false,null)" style="background:#fff; border:1px solid #d5d9d9; border-radius:3px; cursor:pointer; text-decoration:underline; padding:4px 10px; color:#333;">U</button>
            <hr style="width:1px; height:20px; background:#ccc; border:none; margin:0 4px;">
            <button type="button" onclick="document.execCommand('insertUnorderedList',false,null)" style="background:#fff; border:1px solid #d5d9d9; border-radius:3px; cursor:pointer; padding:4px 10px; color:#333;">• List</button>
            <button type="button" onclick="document.getElementById('rich-desc-img-upload').click()" style="background:#fff; border:1px solid #d5d9d9; border-radius:3px; cursor:pointer; padding:4px 10px; display:flex; align-items:center; gap:4px; color:#333;">
               <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg> Image
            </button>
            <input type="file" accept="image/*" id="rich-desc-img-upload" style="display:none;">
          </div>
          <div id="rich-description" contenteditable="true" style="min-height: 220px; padding: 20px; outline: none; font-size:14px; line-height:1.7; color:#222; overflow:hidden;">${prod?.rich_description || ''}</div>
        </div>

        <!-- Applications -->
        <h2 style="font-size:16px; font-weight:700; border-bottom:2px solid #007185; padding-bottom:6px; margin-bottom:16px; color:#111; display:inline-block;">Applications</h2>
        <input type="text" id="p-applications" class="amz-form-input" style="width:100%; padding:10px 14px; border:1px solid #ccc; border-radius:4px; font-size:14px; margin-bottom:48px; box-shadow:inset 0 1px 2px rgba(0,0,0,0.03);" placeholder="e.g. Industrial Control, Telecommunications, Automotive..." value="${prod?.applications || 'Industrial, Manufacturing'}">

        <!-- Technical Specifications -->
        <h2 style="font-size:16px; font-weight:700; border-bottom:2px solid #007185; padding-bottom:6px; margin-bottom:24px; color:#111; display:inline-block;">Technical Specifications</h2>
        <div style="background:#fafafa; border:1px solid #e0e0e0; border-radius:4px; padding:24px; margin-bottom:64px;">
           <div id="dynamic-params-container" style="display:grid; grid-template-columns: 1fr 1fr; gap:x-large; align-items:start; row-gap:16px; column-gap:48px;">
              <div style="grid-column: span 2; text-align:center; padding:32px; color:#565959; font-size:13px;">Select a category to load specifications...</div>
           </div>
        </div>
        
        <div style="height: 140px;"></div>

      </div>
</div>

      <!-- Action Footer -->
      <div style="position:fixed; bottom:0; left:0; right:0; border-top:1px solid #ccc; padding:16px 32px; text-align:right; z-index:999; background: #fff; box-shadow:0 -2px 10px rgba(0,0,0,0.05);">
         <button type="button" class="amz-btn" id="btn-cancel-product" style="margin-right:16px; background:#fff; border:1px solid #ccc; padding:10px 24px; color:#333; font-weight:600; border-radius:4px; cursor:pointer;">Cancel</button>
         <button type="button" id="btn-save-product" class="amz-btn" style="background:#007185; border:1px solid #007185; color:#fff; padding:10px 32px; font-weight:700; border-radius:4px; cursor:pointer; font-size:14px; box-shadow:0 2px 4px rgba(13, 130, 70, 0.2);">Save and Finish</button>
      </div>

    </form>
  `;

  document.getElementById('btn-cancel-product').addEventListener('click', loadCatalogTab);
  // ── Live file-input feedback ─────────────────────────────────────────────
  // Main image: show thumbnail preview immediately on file select
  document.getElementById('p-img-file')?.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const preview = document.getElementById('prod-main-img-preview');
      if (preview) preview.src = ev.target.result;
    };
    reader.readAsDataURL(file);
  });

  // Extra images: show count badge
  document.getElementById('p-extra-imgs')?.addEventListener('change', (e) => {
    const n = e.target.files.length;
    const row = e.target.closest('div[style]');
    if (!row) return;
    let badge = row.querySelector('.file-badge');
    if (!badge) { badge = document.createElement('span'); badge.className='file-badge'; badge.style.cssText='font-size:11px;color:#10b981;font-weight:700;margin-left:6px;'; row.querySelector('div').appendChild(badge); }
    badge.textContent = n + ' file' + (n > 1 ? 's' : '') + ' selected';
  });

  // Generic filename feedback for 3D model, 2D drawing, video, PDF
  ['p-3d-model', 'p-2d-drawing', 'p-video', 'p-pdf-file'].forEach(inputId => {
    document.getElementById(inputId)?.addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (!file) return;
      const row = e.target.closest('div[style]') || e.target.closest('td');
      if (!row) return;
      let badge = row.querySelector('.file-badge');
      if (!badge) {
        badge = document.createElement('div');
        badge.className = 'file-badge';
        badge.style.cssText = 'font-size:11px;color:#10b981;font-weight:700;margin-top:4px;word-break:break-all;';
        e.target.insertAdjacentElement('afterend', badge);
      }
      badge.textContent = '✓ ' + file.name + ' (' + (file.size / 1024).toFixed(0) + ' KB)';
    });
  });


  // Dynamic Parameter Injection
  const catSelect = document.getElementById('p-category');
  const dpc = document.getElementById('dynamic-params-container');

  function renderDynamicParams(catId) {
    if(!catId) {
       dpc.innerHTML = `<div style="grid-column: span 2; text-align:center; padding:32px; color:#565959; font-size:13px;">Attributes will populate based on category selection.</div>`;
       return;
    }
    const paramsForCat = categoryParameters.filter(p => p.category_id === catId);
    if(paramsForCat.length === 0) {
      dpc.innerHTML = `<div style="grid-column: span 2; text-align:center; padding:32px; color:#565959; font-size:13px;">No specific attributes required for this category.</div>`;
      return;
    }

    const priorityOrder = { required: 0, recommended: 1, optional: 2 };
    const sorted = [...paramsForCat].sort((a, b) => (priorityOrder[a.priority] ?? 2) - (priorityOrder[b.priority] ?? 2));

    let html = '';
    sorted.forEach(p => {
      const prio = p.priority || 'optional';
      const isRequired = prio === 'required';
      let inputHtml = '';
      if(p.data_type === 'boolean') {
        inputHtml = `<select ${isRequired ? 'required' : ''} id="spec-${p.id}" style="width:100%; border:1px solid #ccc; padding:6px 10px; border-radius:3px; background:#fff;"><option value="true">Yes</option><option value="false">No</option></select>`;
      } else if (p.data_type === 'number') {
        inputHtml = `<input ${isRequired ? 'required' : ''} type="number" step="any" id="spec-${p.id}" style="width:100%; border:1px solid #ccc; padding:6px 10px; border-radius:3px; box-shadow:inset 0 1px 2px rgba(0,0,0,0.03);">`;
      } else {
        inputHtml = `<input ${isRequired ? 'required' : ''} type="text" id="spec-${p.id}" style="width:100%; border:1px solid #ccc; padding:6px 10px; border-radius:3px; box-shadow:inset 0 1px 2px rgba(0,0,0,0.03);">`;
      }

      html += `
        <div class="amz-dynamic-param" style="display:flex; border-bottom:1px solid #f0f0f0; padding-bottom:8px; align-items:center;">
          <div style="width:40%; font-size:13px; color:#666;">${isRequired ? '<span style="color:#e00;">*</span> ' : ''}${p.parameter_name} ${p.unit ? `[${p.unit}]` : ''}</div>
          <div style="width:60%;">
            ${inputHtml}
          </div>
        </div>
      `;
    });
    dpc.innerHTML = html;
  }

  catSelect.addEventListener('change', (e) => {
    const val = e.target.value;
    const opt = document.querySelector(`#category-datalist option[value="${val}"]`);
    const catId = opt ? opt.dataset.id : null;
    renderDynamicParams(catId);
  });



  // Rich Text Editor Logic
  const richDesc = document.getElementById('rich-description');
  // Inject scoped CSS to constrain images inside the rich text editor
  const richStyle = document.createElement('style');
  richStyle.textContent = '#rich-description img { max-width:100% !important; width:auto !important; height:auto !important; display:block; margin:8px 0; border-radius:3px; }';
  document.head.appendChild(richStyle);


  const richWrapper = document.getElementById('rich-editor-wrapper');
  const imgUploadBtn = document.getElementById('rich-desc-img-upload');

  const insertImageAtCursor = (url) => {
    richDesc.focus();
    document.execCommand('insertImage', false, url);
    // Constrain all images in the editor to the container width
    setTimeout(() => {
      richDesc.querySelectorAll('img').forEach(img => {
        img.style.maxWidth  = '100%';
        img.style.width     = 'auto';
        img.style.height    = 'auto';
        img.style.display   = 'block';
        img.style.marginTop = '8px';
        img.style.marginBottom = '8px';
        img.style.borderRadius = '3px';
      });
    }, 10);
  };

  imgUploadBtn.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if(file && file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = (ev) => insertImageAtCursor(ev.target.result);
      reader.readAsDataURL(file);
    }
  });

  richDesc.addEventListener('dragover', (e) => {
    e.preventDefault();
    richWrapper.style.borderColor = '#007185';
    richWrapper.style.boxShadow = '0 0 0 3px rgba(0, 113, 133, 0.2)';
  });
  
  richDesc.addEventListener('dragleave', (e) => {
    e.preventDefault();
    richWrapper.style.borderColor = 'var(--amz-input-border)';
    richWrapper.style.boxShadow = 'none';
  });

  richDesc.addEventListener('drop', (e) => {
    e.preventDefault();
    richWrapper.style.borderColor = 'var(--amz-input-border)';
    richWrapper.style.boxShadow = 'none';
    
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const file = e.dataTransfer.files[0];
      if (file.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onload = (ev) => insertImageAtCursor(ev.target.result);
        reader.readAsDataURL(file);
      }
    }
  });

  if (prod) {
    const initialName = getCatName(prod.category_id);
    document.getElementById('p-category').value = initialName;
    renderDynamicParams(prod.category_id);
    
    setTimeout(() => {
      if (prod.specs) {
        Object.keys(prod.specs).forEach(k => {
          const paramDef = categoryParameters.find(cp => cp.category_id === prod.category_id && cp.parameter_name === k);
          if (paramDef) {
            const field = document.getElementById(`spec-${paramDef.id}`);
            if (field) field.value = prod.specs[k];
          }
        });
      }
    }, 50);
  }

  // Helper to add a pricing tier
  function addPricingTier(minQty = '', leadTime = '', price = '') {
    const tr = document.createElement('tr');
    tr.style.borderBottom = '1px solid #eee';
    tr.innerHTML = `
      <td style="padding:4px;"><input type="number" class="amz-form-input tier-qty" style="width:100%; padding:4px;" value="${minQty}"></td>
      <td style="padding:4px;"><input type="number" class="amz-form-input tier-lead" style="width:100%; padding:4px;" value="${leadTime}"></td>
      <td style="padding:4px;"><input type="number" step="any" class="amz-form-input tier-price" style="width:100%; padding:4px;" value="${price}"></td>
      <td style="padding:4px; text-align:center;"><button type="button" class="btn-remove-tier" style="background:none; border:none; color:#e00; cursor:pointer; font-weight:bold;" title="Remove">X</button></td>
    `;
    tr.querySelector('.btn-remove-tier').addEventListener('click', () => tr.remove());
    document.getElementById('pricing-tiers-body').appendChild(tr);
  }

  document.getElementById('btn-add-tier').addEventListener('click', () => addPricingTier());
  
  // Helper to add a packaging layer
  function addPackagingLayer(name = '', l = '', w = '', h = '', weight = '') {
    const div = document.createElement('div');
    div.style.display = 'flex';
    div.style.gap = '8px';
    div.style.marginBottom = '8px';
    div.innerHTML = `
      <input type="text" class="amz-form-input pack-name" placeholder="Name" style="flex:2; padding:4px;" value="${name}">
      <input type="number" step="any" class="amz-form-input pack-l" placeholder="L (mm)" style="flex:1; padding:4px;" value="${l}">
      <input type="number" step="any" class="amz-form-input pack-w" placeholder="W (mm)" style="flex:1; padding:4px;" value="${w}">
      <input type="number" step="any" class="amz-form-input pack-h" placeholder="H (mm)" style="flex:1; padding:4px;" value="${h}">
      <input type="number" step="any" class="amz-form-input pack-weight" placeholder="kg" style="flex:1; padding:4px;" value="${weight}">
      <button type="button" class="btn-remove-pack" style="background:none; border:none; color:#e00; cursor:pointer; font-weight:bold;" title="Remove">X</button>
    `;
    div.querySelector('.btn-remove-pack').addEventListener('click', () => div.remove());
    document.getElementById('packaging-layers-container').appendChild(div);
  }

  document.getElementById('btn-add-packaging-layer').addEventListener('click', () => addPackagingLayer());

  // Initialization for edit mode
  if (prod) {
    if (prod.pricing_tiers && prod.pricing_tiers.length) {
      prod.pricing_tiers.forEach(t => addPricingTier(t.min_quantity, t.lead_time_days, t.unit_price));
    } else {
      addPricingTier(); // at least one default
    }
    
    if (prod.packaging && prod.packaging.length) {
      prod.packaging.forEach(p => addPackagingLayer(p.name, p.l, p.w, p.h, p.weight));
    } else {
      addPackagingLayer('Single Unit');
    }
  } else {
    // defaults
    addPricingTier(1, 14, '');
    addPackagingLayer('Single Unit');
  }

  // Handle Form Submission
  // NOTE: The Save button is outside <form> (fixed footer), so we use a click
  // listener on the button directly instead of the form's submit event.
  const saveBtn = document.getElementById('btn-save-product');
  saveBtn.addEventListener('click', async () => {
    const btn = saveBtn;
    const ogText = btn.textContent;
    btn.textContent = 'Saving...';
    btn.disabled = true;
    // Wrap everything so a crash re-enables the button
    try {

    const catId = catSelect.value; // It could be value (text) or we need the raw id
    // Resolve catId properly
    let finalCatId = catId;
    const matchedOpt = document.querySelector(`#category-datalist option[value="${catId}"]`);
    if (matchedOpt) finalCatId = matchedOpt.dataset.id;
    else if (prod) finalCatId = prod.category_id; // Default back if invalid text

    const paramsForCat = categoryParameters.filter(p => p.category_id === finalCatId);
    
    let specsPayload = prod?.specs ? JSON.parse(JSON.stringify(prod.specs)) : {};
    paramsForCat.forEach(p => {
      const el = document.getElementById(`spec-${p.id}`);
      if(el) {
        let val = el.value;
        if (p.data_type === 'number') val = Number(val);
        if (p.data_type === 'boolean') val = val === 'true';
        specsPayload[p.parameter_name] = val;
      }
    });

    // Collect pricing tiers
    const tiers = [];
    document.querySelectorAll('#pricing-tiers-body tr').forEach(tr => {
       const qty = Number(tr.querySelector('.tier-qty').value);
       const lead = Number(tr.querySelector('.tier-lead').value);
       const price = Number(tr.querySelector('.tier-price').value);
       if (qty > 0 && price >= 0) {
          tiers.push({ min_quantity: qty, lead_time_days: lead, unit_price: price });
       }
    });

    // Collect packaging layers
    const pack = [];
    document.querySelectorAll('#packaging-layers-container > div').forEach(div => {
       const name = div.querySelector('.pack-name').value;
       const l = Number(div.querySelector('.pack-l').value);
       const w = Number(div.querySelector('.pack-w').value);
       const h = Number(div.querySelector('.pack-h').value);
       const weight = Number(div.querySelector('.pack-weight').value);
       if (name) {
          pack.push({ name, l, w, h, weight });
       }
    });

    const richDesc = document.getElementById('rich-description').innerHTML;
    const applications = document.getElementById('p-applications')?.value || '';
    const internalSku = document.getElementById('internal-sku').value;

    const base_price = tiers.length ? tiers[0].unit_price : 0;

    // Store applications inside specs (not a top-level products column)
    if (applications) specsPayload.applications = applications;

    const payload = {
      supplier_id: factoryRecord.id,
      category_id: finalCatId,
      mpn: document.getElementById('p-mpn').value || internalSku,
      description: document.getElementById('p-desc').value,
      stock_quantity: 0,
      base_price: base_price,
      pricing_tiers: tiers,
      packaging: pack,
      rich_description: richDesc,
      specs: specsPayload
    };

    let prodId = null;
    
    if (prod) {
      const { error: prodErr } = await supabase.from('products').update(payload).eq('id', prod.id);
      if (prodErr) { alert("Failed to update part: " + prodErr.message); btn.textContent = ogText; btn.disabled = false; return; }
      prodId = prod.id;
    } else {
      const { data: prodData, error: prodErr } = await supabase.from('products').insert(payload).select();
      if (prodErr) { alert("Failed to publish part: " + prodErr.message); btn.textContent = ogText; btn.disabled = false; return; }
      prodId = prodData[0].id;
    }

    // ── Media Upload ────────────────────────────────────────────────────────────
    // Collect all file inputs
    const mainImageFiles  = document.getElementById('p-img-file').files;
    const extraImageFiles = document.getElementById('p-extra-imgs').files;
    const model3dFile     = document.getElementById('p-3d-model').files[0];
    const drawing2dFile   = document.getElementById('p-2d-drawing').files[0];
    const videoFile       = document.getElementById('p-video').files[0];
    const pdfFile         = document.getElementById('p-pdf-file').files[0];

    const uploadErrors = [];
    let firstImageUrl = null; // track to patch product.image_url

    /**
     * Upload a single file to the product_assets Supabase Storage bucket,
     * register the row in product_assets table, and (for images) patch specs.images.
     * Returns the public URL on success, null on failure.
     */
    async function uploadAsset(file, assetType) {
      if (!file) return null;
      const fileExt = file.name.split('.').pop().toLowerCase();
      const safeType = assetType.replace(/[^a-z0-9_]/g, '_');
      const fileName = `${prodId}_${safeType}_${Date.now()}_${Math.random().toString(36).substring(2, 7)}.${fileExt}`;
      const filePath = `${factoryRecord.id}/${fileName}`;

      // Ensure auth session is fresh before uploading
      await supabase.auth.getSession();

      const { error: uploadError } = await supabase.storage
        .from('product_assets')
        .upload(filePath, file, { upsert: true, cacheControl: '3600' });


      if (uploadError) {
        console.error(`Upload failed [${assetType}]:`, uploadError.message);
        uploadErrors.push(`${file.name}: ${uploadError.message}`);
        return null;
      }

      const { data: publicData } = supabase.storage.from('product_assets').getPublicUrl(filePath);
      const publicUrl = publicData.publicUrl;

      // Register in product_assets table
      await supabase.from('product_assets').insert({
        product_id: prodId,
        asset_type: assetType,
        url: publicUrl
      });

      // For images: update specs.images array and track first image for image_url
      if (assetType === 'image') {
        const { data: cData } = await supabase.from('products').select('specs').eq('id', prodId).single();
        const currentSpecs = cData?.specs || {};
        currentSpecs.images = [publicUrl, ...(currentSpecs.images || [])];
        await supabase.from('products').update({ specs: currentSpecs }).eq('id', prodId);
        if (!firstImageUrl) firstImageUrl = publicUrl;
      }

      return publicUrl;
    }

    try {
      const hasAnyFile = mainImageFiles.length || extraImageFiles.length ||
                         model3dFile || drawing2dFile || videoFile || pdfFile;

      if (hasAnyFile) btn.textContent = 'Uploading assets...';

      // 1. Main product image (maps to catalog display)
      for (let i = 0; i < mainImageFiles.length; i++) {
        await uploadAsset(mainImageFiles[i], 'image');
      }

      // 2. Extra gallery images
      for (let i = 0; i < extraImageFiles.length; i++) {
        await uploadAsset(extraImageFiles[i], 'image');
      }

      // 3. Technical datasheet PDF
      if (pdfFile) await uploadAsset(pdfFile, 'datasheet');

      // 4. 3D model (STEP/STL/IGES)
      if (model3dFile) await uploadAsset(model3dFile, '3d_model');

      // 5. 2D engineering drawing (PDF/DXF/DWG)
      if (drawing2dFile) await uploadAsset(drawing2dFile, '2d_drawing');

      // 6. Product video (MP4)
      if (videoFile) await uploadAsset(videoFile, 'video');

      // Patch product.image_url with the first uploaded image
      // (this is what the marketplace catalog and cart read directly)
      if (firstImageUrl) {
        await supabase.from('products').update({ image_url: firstImageUrl }).eq('id', prodId);
      }

      if (uploadErrors.length > 0) {
        alert('Product saved, but some files failed to upload:\n\n' + uploadErrors.join('\n') +
              '\n\nThis is usually a storage permission issue. Contact the platform admin.');
      }

    } catch (e) {
      console.error('Upload error:', e);
    }

      loadCatalogTab();
    } catch (globalErr) {
      console.error('Save error:', globalErr);
      alert('An unexpected error occurred. Check the browser console for details.');
      btn.textContent = ogText;
      btn.disabled = false;
    }
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// TAB: ORDER MANAGEMENT
// ─────────────────────────────────────────────────────────────────────────────
async function loadOrdersTab() {
  const routing = document.getElementById('supplier-content-routing');
  
  routing.innerHTML = `
    <div class="amz-container">
      <h1 class="amz-page-title">Manage Orders & RFQs</h1>
      
      <div class="amz-tabs">
        <div class="amz-tab active">Pending Requests</div>
        <div class="amz-tab">Quoted / Action Required</div>
        <div class="amz-tab">Shipped</div>
      </div>

      <div class="amz-toolbar">
        <div class="amz-search-bar">
          <input type="text" class="amz-search-input" placeholder="Search Order ID, MPN, Customer Name">
          <button style="border:none; background:#FFF; padding:0 12px; cursor:pointer;">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#565959" stroke-width="2"><circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/></svg>
          </button>
        </div>
      </div>

      <div id="orders-grid" style="min-height: 400px; background:#FFF; border: 1px solid var(--amz-border); border-top:none;">
        <div style="padding: 40px; text-align:center; color: var(--amz-text-light);">Loading orders...</div>
      </div>
    </div>
  `;

  // Fetch from rfq_history where supplier_id matches our factoryRecord.id
  const { data, error } = await supabase.from('rfq_history').select('*').order('created_at', { ascending: false });
  
  const grid = document.getElementById('orders-grid');
  
  if (error) {
     grid.innerHTML = `<div style="padding:40px; text-align:center; color:red;">Failed to load orders: ${error.message}</div>`;
     return;
  }

  // Filter client side in case of JSON query issues
  const myOrders = (data || []).filter(row => {
     return row.rfq_data && String(row.rfq_data.supplier_id) === String(factoryRecord.id);
  });

  if (myOrders.length === 0) {
    grid.innerHTML = `
      <div style="text-align: center; padding: 60px;">
        <div style="font-weight: 700; margin-bottom: 8px;">No active orders.</div>
        <div style="font-size: 13px; color: var(--amz-text-light);">Once a user requests a quote or adds to basket, it will appear here.</div>
      </div>
    `;
    return;
  }

  // Render Table
  let html = `
    <table class="amz-table">
      <thead>
        <tr>
          <th>Order Date</th>
          <th>Product / MPN</th>
          <th>Quantity</th>
          <th>Total Value</th>
          <th>Status</th>
          <th>Action</th>
        </tr>
      </thead>
      <tbody>
  `;

  myOrders.forEach(o => {
      const rd = o.rfq_data || {};
      const statusLabel = o.status === 'submitted' ? 'Action Needed' : o.status;
      const statusColor = o.status === 'submitted' ? '#c40000' : '#10b981';
      
      html += `
        <tr>
          <td style="font-size:12px; color:#555;">${new Date(o.created_at).toLocaleDateString()}</td>
          <td>
             <div style="font-weight:600; color:var(--amz-link);">${rd.mpn || 'Unknown Component'}</div>
             <div style="font-size:11px; color:#666;">Type: ${rd.type || 'Standard RFQ'}</div>
          </td>
          <td>${rd.quantity || 1}</td>
          <td>$${(rd.quantity * (rd.unit_price || 0)).toFixed(2) === '0.00' ? '--' : (rd.quantity * rd.unit_price).toFixed(2)}</td>
          <td><span style="color:${statusColor}; font-weight:600; font-size:12px; text-transform:capitalize;">${statusLabel.replace('_', ' ')}</span></td>
          <td>
             <select class="amz-form-input status-dropdown" data-id="${o.id}" style="font-size:11px; padding:4px; height:auto; width:120px; display:inline-block;">
                <option value="submitted" ${o.status==='submitted'?'selected':''}>Pending</option>
                <option value="quoted" ${o.status==='quoted'?'selected':''}>Quote Sent</option>
                <option value="accepted" ${o.status==='accepted'?'selected':''}>Accepted</option>
                <option value="shipped" ${o.status==='shipped'?'selected':''}>Shipped</option>
             </select>
             <button class="amz-btn btn-update-status" data-id="${o.id}" style="padding:4px 8px; margin-left:4px;">Update</button>
          </td>
        </tr>
      `;
  });

  html += `</tbody></table>`;
  grid.innerHTML = html;

  // Bind update buttons
  document.querySelectorAll('.btn-update-status').forEach(btn => {
      btn.addEventListener('click', async (e) => {
         const id = e.target.dataset.id;
         const sel = document.querySelector(`.status-dropdown[data-id="${id}"]`);
         const newStatus = sel.value;
         
         e.target.textContent = '...';
         e.target.disabled = true;

         const { error } = await supabase.from('rfq_history').update({ status: newStatus }).eq('id', id);
         if(error) {
            alert('Failed to update: '+error.message);
         } else {
            e.target.style.background = '#10b981';
            e.target.style.color = '#fff';
            e.target.textContent = 'Saved';
            setTimeout(() => {
               e.target.style.background = '';
               e.target.style.color = '';
               e.target.textContent = 'Update';
               e.target.disabled = false;
            }, 2000);
         }
      });
  });
}

import { supabase } from './supabase.js';
import { getCurrentUser, logoutUser } from './services/auth.js';

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
    alert("You must be logged in to access Seller Central.");
    window.location.href = '/index.html?login=true';
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
                    <img src="${p.image_url || '/placeholder.png'}" class="amz-product-thumb">
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
      options.push(`<option value="${r.id}">${r.name}</option>`);
    } else {
      options.push(`<optgroup label="${r.name}">`);
      subs.forEach(s => options.push(`<option value="${s.id}">${s.name}</option>`));
      options.push(`</optgroup>`);
    }
  });

  const asinMock = prod ? prod.id.substring(0,8).toUpperCase() : 'NEW_ASIN';

  routing.innerHTML = `
    <!-- Top Header Summary -->
    <div class="amz-edit-header">
      <img src="${prod?.image_url || '/placeholder.png'}" class="amz-edit-thumb">
      <div class="amz-edit-summary">
         <div class="amz-edit-title">${prod?.description || 'Draft Product Title...'}</div>
         <div style="font-size:12px; color:#565959; font-weight:700;">
           ASIN: <span style="font-weight:400; color:#111;">${asinMock}</span> &nbsp;&nbsp;
           EAN: <span style="font-weight:400; color:#111;">0649275547799</span> &nbsp;&nbsp;
           Amazon sales rank: <span style="font-weight:400; color:#111;">--</span>
         </div>
         <div style="font-size:12px; margin-top:8px;">
           <span style="color:#565959;">Competing marketplace offers:</span> <br>
           <a style="color:#007185; cursor:pointer;">No current offers</a>
         </div>
      </div>
    </div>
    
    <!-- Top Tabs -->
    <div class="amz-edit-tabs">
      <div class="amz-edit-tab active" data-target="tab-details">Product Details</div>
      <div class="amz-edit-tab" data-target="tab-images">Images</div>
      <div class="amz-edit-tab" data-target="tab-offer">Offer</div>
      <div class="amz-edit-tab">Variations</div>
      <div class="amz-edit-tab">Safety & Compliance</div>
    </div>

    <!-- Main Content -->
    <form id="new-product-form" class="amz-edit-main">
      <!-- Left Sidebar Nav -->
      <aside class="amz-edit-sidebar">
        <div style="border:1px solid var(--amz-border); border-radius:4px; padding:16px;">
          <h3 style="margin:0 0 8px 0; font-size:14px;">Attributes</h3>
          <div class="amz-sidebar-nav">
             <label class="amz-radio-row"><input type="radio" name="attrView" checked> All attributes</label>
             <label class="amz-radio-row"><input type="radio" name="attrView"> Required</label>
             <label class="amz-radio-row"><input type="radio" name="attrView"> Recommended</label>
          </div>
        </div>
      </aside>

      <!-- Center Form -->
      <div class="amz-edit-content">
        
        <div style="background:#F0F8FF; border:1px solid #C8F3FA; padding:16px; margin-bottom:32px; display:flex; gap:12px; border-radius:4px;">
           <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#007185" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>
           <div style="font-size:13px; color:#111;">
             When multiple sellers sell the same product through a single detail page, we combine and present the best product data to ensure customers get the best experience.<br>
             <label style="display:flex; align-items:center; gap:8px; margin-top:12px; font-weight:700;"><input type="checkbox" checked> Show content currently live on the detail page</label>
           </div>
        </div>

        <!-- TAB DETAILS -->
        <div id="tab-details">
            <div class="amz-form-group">
              <div class="amz-label-col"><span class="required">*</span> Item Name (Title)</div>
              <div class="amz-input-col">
                <div class="amz-live-value">${prod?.description || ''}</div>
                <input type="text" id="p-desc" required class="amz-form-input" value="${prod?.description || ''}">
              </div>
            </div>

            <div class="amz-form-group">
              <div class="amz-label-col"><span class="required">*</span> Part Number (SKU/MPN)</div>
              <div class="amz-input-col">
                <div class="amz-live-value">${prod?.mpn || ''}</div>
                <input type="text" id="p-mpn" required class="amz-form-input" value="${prod?.mpn || ''}">
              </div>
            </div>

            <div class="amz-form-group">
              <div class="amz-label-col"><span class="required">*</span> Category Browse Node</div>
              <div class="amz-input-col">
                <select id="p-category" required class="amz-form-input amz-form-input-single" style="border-radius:4px; margin-bottom: 8px;">
                  <option value="">Select a specific category...</option>
                  ${options.join('')}
                </select>
                <div style="font-size:12px; color:var(--amz-text-light);">Select the Amazon category taxonomy path</div>
              </div>
            </div>

            <div class="amz-form-group">
              <div class="amz-label-col">Bullet Point</div>
              <div class="amz-input-col">
                <input type="text" placeholder="Feature 1" class="amz-form-input amz-form-input-single" style="margin-bottom:8px;">
                <input type="text" placeholder="Feature 2" class="amz-form-input amz-form-input-single" style="margin-bottom:8px;">
                <a style="color:var(--amz-link); font-size:12px; font-weight:700; cursor:pointer;">Add More | Remove Last</a>
              </div>
            </div>

            <!-- Dynamic Parametric Data (Injected from Supabase Category Mapping) -->
            <div id="dynamic-params-container" style="border-top:1px dashed var(--amz-border); padding-top:24px; margin-top:24px;">
              <div style="text-align:center; padding:32px; color:#565959; font-size:13px;">Attributes will populate based on category selection.</div>
            </div>
        </div>

        <!-- TAB OFFER (Pricing & Granularity) -->
        <div id="tab-offer" style="display:none; max-width: 900px;">
            
            <div style="margin-bottom: 24px;">
              <div style="display:flex; justify-content:space-between; align-items:center;">
                <h2 style="font-size:18px; font-weight:700;">Offer</h2>
                <a style="color:var(--amz-link); font-size:13px; cursor:pointer;">Advanced View</a>
              </div>
            </div>

            <!-- Readonly Identifiers -->
            <div class="amz-form-group" style="align-items: center;">
              <div class="amz-label-col">SKU <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#565959" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/></svg></div>
              <div class="amz-input-col">
                <div style="background:#E3E3E3; border:1px solid #888C8C; padding:6px 12px; color:#565959; font-size:13px; display:flex; justify-content:space-between;">
                  <span>${prod?.mpn || 'NEW_SKU'}</span>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#111" stroke-width="2"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
                </div>
              </div>
            </div>

            <div class="amz-form-group" style="align-items: center;">
              <div class="amz-label-col"><span class="required">*</span> Product Type <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#565959" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/></svg></div>
              <div class="amz-input-col">
                <div style="font-weight:700; font-size:13px; padding-top:4px; display:flex; justify-content:space-between;">
                  <span id="label-product-type">INDUSTRIAL_HARDWARE_COMPONENT</span>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#111" stroke-width="2"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
                </div>
              </div>
            </div>

            <hr style="border:none; border-top:1px solid var(--amz-border); margin:24px 0;">

            <!-- Pricing Section -->
            <div class="amz-form-group">
              <div class="amz-label-col">Minimum Advertised Price <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#565959" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/></svg></div>
              <div class="amz-input-col" style="display:flex;">
                <span style="background:#F0F2F2; border:1px solid var(--amz-input-border); border-right:none; padding:6px 12px; font-weight:700;">USD$</span>
                <input type="number" step="any" class="amz-form-input" style="border-radius:0 4px 4px 0;" placeholder="Example: 25.99">
              </div>
            </div>

            <div class="amz-form-group">
              <div class="amz-label-col"><span class="required">*</span> Your Price <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#565959" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/></svg></div>
              <div class="amz-input-col" style="display:flex;">
                <span style="background:#F0F2F2; border:1px solid var(--amz-input-border); border-right:none; padding:6px 12px; font-weight:700;">USD$</span>
                <input type="number" step="any" id="p-price" value="${prod?.base_price || ''}" class="amz-form-input" style="border-radius:0 4px 4px 0;">
              </div>
            </div>

            <div class="amz-form-group">
              <div class="amz-label-col">Currency conversion <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#565959" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/></svg></div>
              <div class="amz-input-col">
                <button type="button" style="background:#4A5568; color:white; border:none; padding:6px 16px; border-radius:4px; font-size:13px; font-weight:700; cursor:pointer;">Apply</button>
              </div>
            </div>

            <div class="amz-form-group">
              <div class="amz-label-col">Minimum Seller Allowed Price <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#565959" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/></svg></div>
              <div class="amz-input-col" style="display:flex;">
                <span style="background:#F0F2F2; border:1px solid var(--amz-input-border); border-right:none; padding:6px 12px; font-weight:700;">USD$</span>
                <input type="number" step="any" class="amz-form-input" style="border-radius:0 4px 4px 0;" placeholder="Example: 10.00">
              </div>
            </div>

            <div class="amz-form-group">
              <div class="amz-label-col">Maximum Seller Allowed Price <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#565959" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/></svg></div>
              <div class="amz-input-col" style="display:flex;">
                <span style="background:#F0F2F2; border:1px solid var(--amz-input-border); border-right:none; padding:6px 12px; font-weight:700;">USD$</span>
                <input type="number" step="any" class="amz-form-input" style="border-radius:0 4px 4px 0;" placeholder="Example: 100.00">
              </div>
            </div>
            
            <div class="amz-form-group">
              <div class="amz-label-col">Sale Price <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#565959" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/></svg></div>
              <div class="amz-input-col" style="display:flex;">
                <span style="background:#F0F2F2; border:1px solid var(--amz-input-border); border-right:none; padding:6px 12px; font-weight:700;">USD$</span>
                <input type="number" step="any" class="amz-form-input" style="border-radius:0 4px 4px 0;" placeholder="Example: 21.99">
              </div>
            </div>

            <div class="amz-form-group">
              <div class="amz-label-col">Sale Start Date <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#565959" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/></svg></div>
              <div class="amz-input-col" style="display:flex; align-items:center;">
                <input type="date" class="amz-form-input amz-form-input-single" style="width: 180px;">
              </div>
            </div>

            <div class="amz-form-group">
              <div class="amz-label-col">Sale End Date <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#565959" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/></svg></div>
              <div class="amz-input-col" style="display:flex; align-items:center;">
                <input type="date" class="amz-form-input amz-form-input-single" style="width: 180px;">
              </div>
            </div>

            <div class="amz-form-group">
              <div class="amz-label-col">Offering Release Date <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#565959" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/></svg></div>
              <div class="amz-input-col" style="display:flex; align-items:center;">
                <input type="date" class="amz-form-input amz-form-input-single" style="width: 180px;" value="2024-02-18">
              </div>
            </div>

            <div class="amz-form-group">
              <div class="amz-label-col">Item Condition <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#565959" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/></svg></div>
              <div class="amz-input-col" style="display:flex; align-items:center; gap:12px;">
                <select class="amz-form-input amz-form-input-single" style="background:#E3E3E3;">
                  <option>New</option>
                  <option>Refurbished</option>
                  <option>Used - Like New</option>
                </select>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#111" stroke-width="2"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
              </div>
            </div>

            <div class="amz-form-group">
              <div class="amz-label-col">List Price with Tax <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#565959" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/></svg></div>
              <div class="amz-input-col" style="display:flex; align-items:center; gap: 12px;">
                <div style="display:flex;">
                  <span style="background:#F0F2F2; border:1px solid var(--amz-input-border); border-right:none; padding:6px 12px; font-weight:700;">USD$</span>
                  <input type="number" step="any" class="amz-form-input" style="border-radius:0 4px 4px 0;" placeholder="Example: 69">
                </div>
                <a style="font-size:12px; color:var(--amz-link); cursor:pointer;">Enter List Price equal to Your Price <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#565959" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/></svg></a>
              </div>
            </div>

            <div class="amz-form-group">
              <div class="amz-label-col">Merchant Release Date <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#565959" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/></svg></div>
              <div class="amz-input-col">
                <input type="date" class="amz-form-input amz-form-input-single" style="width: 100%;">
              </div>
            </div>

            <div class="amz-form-group">
              <div class="amz-label-col">Shipping Template <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#565959" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/></svg></div>
              <div class="amz-input-col">
                <select class="amz-form-input amz-form-input-single">
                  <option>Migrated Template</option>
                  <option>Heavy/Bulky Freight Template</option>
                </select>
              </div>
            </div>

            <div class="amz-form-group">
              <div class="amz-label-col">Maximum Order Quantity <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#565959" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/></svg></div>
              <div class="amz-input-col">
                <input type="number" class="amz-form-input amz-form-input-single" placeholder="Example: 3">
              </div>
            </div>

            <hr style="border:none; border-top:1px solid var(--amz-border); margin:24px 0;">

            <!-- Industrial Supplemental Info replacing consumer condition metrics -->
            <div style="font-weight:700; font-size:14px; margin-bottom:16px;">Supplemental Condition Information <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#565959" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/></svg></div>
            
            <div class="amz-form-group">
              <div class="amz-label-col">Packaging Options <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#565959" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/></svg></div>
              <div class="amz-input-col">
                <select class="amz-form-input amz-form-input-single">
                  <option>Tape & Reel (TR)</option>
                  <option>Cut Tape (CT)</option>
                  <option>Tray</option>
                  <option>Tube</option>
                  <option>Bulk</option>
                </select>
              </div>
            </div>

            <div class="amz-form-group">
              <div class="amz-label-col">Lifecycle Status <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#565959" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/></svg></div>
              <div class="amz-input-col">
                <select class="amz-form-input amz-form-input-single">
                  <option>Active</option>
                  <option>Not Recommended for New Designs (NRND)</option>
                  <option>Last Time Buy (LTB)</option>
                  <option>Obsolete / EOL</option>
                </select>
              </div>
            </div>

            <div class="amz-form-group">
              <div class="amz-label-col">RoHS Status <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#565959" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/></svg></div>
              <div class="amz-input-col">
                <select class="amz-form-input amz-form-input-single">
                  <option>RoHS Compliant</option>
                  <option>RoHS Non-Compliant</option>
                  <option>RoHS Exempt</option>
                </select>
              </div>
            </div>

            <div class="amz-form-group">
              <div class="amz-label-col">Moisture Sensitivity Level <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#565959" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/></svg></div>
              <div class="amz-input-col">
                <select class="amz-form-input amz-form-input-single">
                  <option>MSL 1 (Unlimited)</option>
                  <option>MSL 2 (1 Year)</option>
                  <option>MSL 3 (168 Hours)</option>
                  <option>MSL 4 (72 Hours)</option>
                  <option>MSL 5 (48 Hours)</option>
                </select>
              </div>
            </div>

            <div class="amz-form-group">
              <div class="amz-label-col">Certificate of Conformity (CoC) <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#565959" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/></svg></div>
              <div class="amz-input-col">
                <select class="amz-form-input amz-form-input-single">
                  <option>Provided with Shipment</option>
                  <option>Available upon Request</option>
                  <option>Not Available</option>
                </select>
              </div>
            </div>
            
            <hr style="border:none; border-top:1px solid var(--amz-border); margin:24px 0;">

            <div style="font-weight:700; font-size:14px; margin-bottom:16px;">Item Dimensions <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#565959" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/></svg></div>
            
            <div style="border: 1px solid var(--amz-border); margin-bottom: 8px;">
               <div style="background:#F0F2F2; padding:8px 16px; border-bottom:1px solid var(--amz-border); font-size:13px; color:#565959;">Item Length</div>
               <div style="padding:16px;">
                  <div class="amz-form-group" style="margin-bottom:16px;">
                    <div class="amz-label-col"><span class="required">*</span> Item Length <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#565959" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/></svg></div>
                    <div class="amz-input-col">
                      <div class="amz-live-value">11.0</div>
                      <input type="text" class="amz-form-input" value="11">
                    </div>
                  </div>
                  <div class="amz-form-group" style="margin-bottom:0;">
                    <div class="amz-label-col"><span class="required">*</span> Item Length Unit <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#565959" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/></svg></div>
                    <div class="amz-input-col">
                      <div class="amz-live-value">millimeters</div>
                      <select class="amz-form-input"><option>Millimeters</option><option>Centimeters</option><option>Inches</option></select>
                    </div>
                  </div>
               </div>
            </div>

            <div style="border: 1px solid var(--amz-border); margin-bottom: 8px;">
               <div style="background:#F0F2F2; padding:8px 16px; border-bottom:1px solid var(--amz-border); font-size:13px; color:#565959;">Item Width</div>
               <div style="padding:16px;">
                  <div class="amz-form-group" style="margin-bottom:16px;">
                    <div class="amz-label-col"><span class="required">*</span> Item Width <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#565959" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/></svg></div>
                    <div class="amz-input-col">
                      <div class="amz-live-value">11.0</div>
                      <input type="text" class="amz-form-input" value="11">
                    </div>
                  </div>
                  <div class="amz-form-group" style="margin-bottom:0;">
                    <div class="amz-label-col"><span class="required">*</span> Item Width Unit <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#565959" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/></svg></div>
                    <div class="amz-input-col">
                      <div class="amz-live-value">millimeters</div>
                      <select class="amz-form-input"><option>Millimeters</option><option>Centimeters</option><option>Inches</option></select>
                    </div>
                  </div>
               </div>
            </div>

            <div style="border: 1px solid var(--amz-border); margin-bottom: 24px;">
               <div style="background:#F0F2F2; padding:8px 16px; border-bottom:1px solid var(--amz-border); font-size:13px; color:#565959;">Item Height</div>
               <div style="padding:16px;">
                  <div class="amz-form-group" style="margin-bottom:16px;">
                    <div class="amz-label-col"><span class="required">*</span> Item Height <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#565959" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/></svg></div>
                    <div class="amz-input-col">
                      <div class="amz-live-value">13.0</div>
                      <input type="text" class="amz-form-input" value="13">
                    </div>
                  </div>
                  <div class="amz-form-group" style="margin-bottom:0;">
                    <div class="amz-label-col"><span class="required">*</span> Item Height Unit <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#565959" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/></svg></div>
                    <div class="amz-input-col">
                      <div class="amz-live-value">millimeters</div>
                      <select class="amz-form-input"><option>Millimeters</option><option>Centimeters</option><option>Inches</option></select>
                    </div>
                  </div>
               </div>
            </div>
            
            <div class="amz-form-group">
              <div class="amz-label-col">Package Weight Unit <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#565959" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/></svg></div>
              <div class="amz-input-col">
                <div class="amz-live-value">grams</div>
                <select class="amz-form-input"><option>Grams</option><option>Kilograms</option><option>Pounds</option></select>
              </div>
            </div>

            <div class="amz-form-group">
              <div class="amz-label-col">Number of Boxes <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#565959" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/></svg></div>
              <div class="amz-input-col">
                <div class="amz-live-value">1</div>
                <input type="number" class="amz-form-input" value="1">
              </div>
            </div>

            <!-- Volume Pricing Re-located here -->
            <hr style="border:none; border-top:1px solid var(--amz-border); margin:40px 0;">
            <h3 style="font-size:16px; margin-bottom:8px;">B2B Volume Pricing Breaks</h3>
            <p style="font-size:13px; color:var(--amz-text-light); margin-bottom:24px;">These fields map to the B2B catalog tier structures. Set custom price-breaks for larger lot quotes.</p>
            
            <div class="amz-form-group">
              <div class="amz-label-col">Qty 1 Price</div>
              <div class="amz-input-col" style="display:flex;">
                <span style="background:#F0F2F2; border:1px solid var(--amz-input-border); border-right:none; padding:6px 12px; font-weight:700;">USD$</span>
                <input type="number" step="any" id="p-price-1" value="${specs.price_1 || ''}" class="amz-form-input" style="border-radius:0 4px 4px 0;">
              </div>
            </div>
            <div class="amz-form-group">
              <div class="amz-label-col">Qty 10 Price</div>
              <div class="amz-input-col" style="display:flex;">
                <span style="background:#F0F2F2; border:1px solid var(--amz-input-border); border-right:none; padding:6px 12px; font-weight:700;">USD$</span>
                <input type="number" step="any" id="p-price-10" value="${specs.price_10 || ''}" class="amz-form-input" style="border-radius:0 4px 4px 0;">
              </div>
            </div>
            <div class="amz-form-group">
              <div class="amz-label-col">Qty 100 Price</div>
              <div class="amz-input-col" style="display:flex;">
                <span style="background:#F0F2F2; border:1px solid var(--amz-input-border); border-right:none; padding:6px 12px; font-weight:700;">USD$</span>
                <input type="number" step="any" id="p-price-100" value="${specs.price_100 || ''}" class="amz-form-input" style="border-radius:0 4px 4px 0;">
              </div>
            </div>
            <div class="amz-form-group">
              <div class="amz-label-col">Qty 1000 Price</div>
              <div class="amz-input-col" style="display:flex;">
                <span style="background:#F0F2F2; border:1px solid var(--amz-input-border); border-right:none; padding:6px 12px; font-weight:700;">USD$</span>
                <input type="number" step="any" id="p-price-1000" value="${specs.price_1000 || ''}" class="amz-form-input" style="border-radius:0 4px 4px 0;">
              </div>
            </div>
            <div class="amz-form-group">
              <div class="amz-label-col">Factory Lead Time</div>
              <div class="amz-input-col"><input type="text" id="p-leadtime" value="${specs.lead_time || ''}" class="amz-form-input amz-form-input-single" placeholder="e.g. 14 Weeks"></div>
            </div>

            <!-- Regional Marketplaces Block (Screenshot 4) -->
            <hr style="border:none; border-top:1px solid var(--amz-border); margin:40px 0;">
            <h3 style="font-size:18px; margin-bottom:8px;">Manage offers in other marketplaces</h3>
            <p style="font-size:13px; color:var(--amz-text-light); margin-bottom:24px;">You may be able to sell this product in other marketplaces. Provide a price and quantity for each. <a style="color:var(--amz-link); cursor:pointer;">Learn more</a></p>
            
            <table style="width:100%; border-collapse:collapse; border:1px solid var(--amz-border); font-size:13px; margin-bottom:24px;">
              <thead>
                <tr style="background:#FAFAFA; border-bottom:1px solid var(--amz-border);">
                  <th style="padding:12px; text-align:left; font-weight:700;">Marketplace</th>
                  <th style="padding:12px; text-align:left; font-weight:700;">Status</th>
                  <th style="padding:12px; text-align:left; font-weight:700;">Quantity</th>
                  <th style="padding:12px; text-align:left; font-weight:700;">Your price</th>
                  <th style="padding:12px; text-align:left; font-weight:700;">Lowest price</th>
                </tr>
              </thead>
              <tbody>
                <tr><td colspan="5" style="background:#F0F2F2; padding:8px 12px; font-weight:700; border-bottom:1px solid var(--amz-border);">Asia Pacific</td></tr>
                <tr style="border-bottom:1px solid var(--amz-border);">
                  <td style="padding:12px; display:flex; align-items:center; gap:8px;">
                     <!-- Toggle Mock -->
                     <div style="width:36px; height:20px; background:#007185; border-radius:10px; position:relative;"><div style="width:16px; height:16px; background:#FFF; border-radius:50%; position:absolute; right:2px; top:2px;"></div></div>
                     China
                  </td>
                  <td style="padding:12px;">Active</td>
                  <td style="padding:12px;">15,000<svg style="margin-left:4px; vertical-align:middle;" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#111" stroke-width="2"><path d="M6 9l6 6 6-6"/></svg></td>
                  <td style="padding:12px;">
                    <div style="display:flex; border:1px solid var(--amz-border); border-radius:4px; overflow:hidden;">
                      <span style="background:#FFF; padding:6px; border-right:1px solid var(--amz-border);">CNY¥</span>
                      <input type="text" value="38.50" style="border:none; width:60px; padding:6px; background:#F0F2F2;">
                    </div>
                  </td>
                  <td style="padding:12px;">-</td>
                </tr>

                <tr><td colspan="5" style="background:#F0F2F2; padding:8px 12px; font-weight:700; border-bottom:1px solid var(--amz-border);">Europe</td></tr>
                <tr style="border-bottom:1px solid var(--amz-border);">
                  <td style="padding:12px; display:flex; align-items:center; gap:8px;">
                     <div style="width:36px; height:20px; background:#888C8C; border-radius:10px; position:relative;"><div style="width:16px; height:16px; background:#FFF; border-radius:50%; position:absolute; left:2px; top:2px;"></div></div>
                     Germany
                  </td>
                  <td style="padding:12px;">Inactive (Out of Stock)</td>
                  <td style="padding:12px;">0<svg style="margin-left:4px; vertical-align:middle;" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#111" stroke-width="2"><path d="M6 9l6 6 6-6"/></svg></td>
                  <td style="padding:12px;">
                    <div style="display:flex; border:1px solid var(--amz-border); border-radius:4px; overflow:hidden;">
                      <span style="background:#FFF; padding:6px; border-right:1px solid var(--amz-border);">EUR€</span>
                      <input type="text" value="36.00" style="border:none; width:60px; padding:6px; background:#FFF;">
                    </div>
                  </td>
                  <td style="padding:12px;">-</td>
                </tr>

                <tr><td colspan="5" style="background:#F0F2F2; padding:8px 12px; font-weight:700; border-bottom:1px solid var(--amz-border);">Americas</td></tr>
                <tr style="border-bottom:1px solid var(--amz-border);">
                  <td style="padding:12px; display:flex; align-items:center; gap:8px;">
                     <div style="width:36px; height:20px; background:#888C8C; border-radius:10px; position:relative;"><div style="width:16px; height:16px; background:#FFF; border-radius:50%; position:absolute; left:2px; top:2px;"></div></div>
                     United States
                  </td>
                  <td style="padding:12px;">Inactive (Out of Stock)</td>
                  <td style="padding:12px;">0<svg style="margin-left:4px; vertical-align:middle;" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#111" stroke-width="2"><path d="M6 9l6 6 6-6"/></svg></td>
                  <td style="padding:12px;">
                    <div style="display:flex; border:1px solid var(--amz-border); border-radius:4px; overflow:hidden;">
                      <span style="background:#FFF; padding:6px; border-right:1px solid var(--amz-border);">USD$</span>
                      <input type="text" value="44.20" style="border:none; width:60px; padding:6px; background:#FFF;">
                    </div>
                    <div style="color:#C45500; font-size:11px; margin-top:4px;">Warning: Local compliance docs missing.</div>
                  </td>
                  <td style="padding:12px;">-</td>
                </tr>
              </tbody>
            </table>

            <!-- Add some bottom padding -->
            <div style="height:40px;"></div>
        </div>

        <!-- TAB IMAGES -->
        <div id="tab-images" style="display:none;">
            <h2 style="font-size:18px; font-weight:700; margin-bottom:24px;">Images</h2>
            <div style="border: 1px dashed var(--amz-input-border); border-radius:4px; padding:40px; text-align:center; background:#FAFAFA;">
              <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#888C8C" stroke-width="1"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="M21 15l-5-5L5 21"/></svg>
              <div style="margin-top:12px; font-weight:700;">Drag and drop images here</div>
              <div style="font-size:12px; color:var(--amz-text-light); margin-top:4px;">or click to select files</div>
              <input type="file" accept="image/*,video/*" multiple id="p-img-file" style="margin-top:24px;">
            </div>
            
            <div style="margin-top:32px;">
              <h3 style="font-size:14px;">Datasheet (PDF)</h3>
              <input type="file" accept="application/pdf" id="p-pdf-file">
            </div>
        </div>

      </div>

      <!-- Sticky Footer -->
      <div class="amz-sticky-footer">
        <button type="button" class="amz-btn" id="btn-cancel-product">Cancel</button>
        <button type="submit" class="amz-btn amz-btn-teal">Save and finish</button>
      </div>

    </form>
  `;

  // Tab Switching Logic
  document.querySelectorAll('.amz-edit-tab').forEach(tab => {
    tab.addEventListener('click', (e) => {
      if(!e.currentTarget.dataset.target) return; // Prevent dead tabs
      document.querySelectorAll('.amz-edit-tab').forEach(t => t.classList.remove('active'));
      e.currentTarget.classList.add('active');
      
      document.getElementById('tab-details').style.display = 'none';
      document.getElementById('tab-offer').style.display = 'none';
      document.getElementById('tab-images').style.display = 'none';
      
      document.getElementById(e.currentTarget.dataset.target).style.display = 'block';
    });
  });

  document.getElementById('btn-cancel-product').addEventListener('click', loadCatalogTab);

  // Dynamic Parameter Injection
  const catSelect = document.getElementById('p-category');
  const dpc = document.getElementById('dynamic-params-container');

  catSelect.addEventListener('change', (e) => {
    const catId = e.target.value;
    if(!catId) {
       dpc.innerHTML = `<div style="text-align:center; padding:32px; color:#565959; font-size:13px;">Attributes will populate based on category selection.</div>`;
       return;
    }
    const paramsForCat = categoryParameters.filter(p => p.category_id === catId);
    if(paramsForCat.length === 0) {
      dpc.innerHTML = `<div style="text-align:center; padding:32px; color:#565959; font-size:13px;">No specific attributes required for this category.</div>`;
      return;
    }

    let html = '';
    paramsForCat.forEach(p => {
      let inputHtml = '';
      if(p.data_type === 'boolean') {
        inputHtml = `<select required id="spec-${p.id}" class="amz-form-input amz-form-input-single"><option value="true">Yes</option><option value="false">No</option></select>`;
      } else if (p.data_type === 'number') {
        inputHtml = `<input required type="number" step="any" id="spec-${p.id}" class="amz-form-input amz-form-input-single">`;
      } else {
        inputHtml = `<input required type="text" id="spec-${p.id}" class="amz-form-input amz-form-input-single">`;
      }

      html += `
        <div class="amz-form-group">
          <div class="amz-label-col">${p.parameter_name} ${p.unit ? `<br><span style="font-weight:400; font-size:11px; color:#565959;">[${p.unit}]</span>` : ''}</div>
          <div class="amz-input-col">
            ${inputHtml}
          </div>
        </div>
      `;
    });
    dpc.innerHTML = html;
  });

  if (prod) {
    document.getElementById('p-category').value = prod.category_id;
    catSelect.dispatchEvent(new Event('change'));
    
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

  // Handle Form Submission
  document.getElementById('new-product-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = e.target.querySelector('button[type="submit"]');
    const ogText = btn.textContent;
    btn.textContent = "Saving...";
    btn.disabled = true;

    const catId = catSelect.value;
    const paramsForCat = categoryParameters.filter(p => p.category_id === catId);
    
    let specsPayload = {};
    paramsForCat.forEach(p => {
      const el = document.getElementById(`spec-${p.id}`);
      if(el) {
        let val = el.value;
        if (p.data_type === 'number') val = Number(val);
        if (p.data_type === 'boolean') val = val === 'true';
        specsPayload[p.parameter_name] = val;
      }
    });

    specsPayload.lead_time = document.getElementById('p-leadtime').value;
    specsPayload.price_1 = document.getElementById('p-price-1').value;
    specsPayload.price_10 = document.getElementById('p-price-10').value;
    specsPayload.price_100 = document.getElementById('p-price-100').value;
    specsPayload.price_1000 = document.getElementById('p-price-1000').value;

    const price1 = Number(document.getElementById('p-price').value) || Number(specsPayload.price_1) || null;

    const payload = {
      supplier_id: factoryRecord.id,
      category_id: catId,
      mpn: document.getElementById('p-mpn').value,
      description: document.getElementById('p-desc').value,
      stock_quantity: Number(document.getElementById('p-stock').value) || 0,
      base_price: price1,
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

    // Media
    const mediaFiles = document.getElementById('p-img-file').files;
    const pdfFile = document.getElementById('p-pdf-file').files[0];

    async function uploadAsset(file, defaultType) {
      if (!file) return;
      let type = defaultType;
      if (file.type && file.type.startsWith('video')) type = 'video';

      const fileExt = file.name.split('.').pop();
      const fileName = `${prodId}_${type}_${Math.random().toString(36).substring(7)}.${fileExt}`;
      const filePath = `${factoryRecord.id}/${fileName}`;
      
      const { error: uploadError } = await supabase.storage.from('product_assets').upload(filePath, file);
      if (!uploadError) {
        const { data: publicData } = supabase.storage.from('product_assets').getPublicUrl(filePath);
        await supabase.from('product_assets').insert({ product_id: prodId, asset_type: type, url: publicData.publicUrl });
        
        // Also patch image_url on product if it's the first image
        if(type === 'image') {
           await supabase.from('products').update({ image_url: publicData.publicUrl }).eq('id', prodId);
        }
      }
    }

    try {
      if (mediaFiles.length > 0 || pdfFile) btn.textContent = "Uploading assets...";
      for(let i=0; i<mediaFiles.length; i++) await uploadAsset(mediaFiles[i], 'image');
      if (pdfFile) await uploadAsset(pdfFile, 'datasheet');
    } catch (e) {
      console.error(e);
    }

    loadCatalogTab();
  });
}

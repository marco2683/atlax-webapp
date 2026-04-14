import { supabase } from './supabase.js';
import { getCurrentUser, logoutUser } from './services/auth.js';

let currentUser = null;
let factoryRecord = null;

let categories = [];
let categoryParameters = [];
let myProducts = [];
let viewMode = 'grid';

let currentLang = 'en';
const i18nDict = {
  supplierHub: { en: "Supplier Hub", zh: "供应商中心" },
  disconnect: { en: "Disconnect", zh: "断开连接" },
  productCatalogTitle: { en: "Product Catalog", zh: "产品目录" },
  productCatalogDesc: { en: "Manage your parametrically indexed marketplace products.", zh: "管理您的参数化索引市场产品。" },
  btnNewProduct: { en: "+ New Product", zh: "+ 添加新产品" },
  loadingProducts: { en: "Loading products...", zh: "正在加载产品..." },
  noProductsTitle: { en: "No products listed yet", zh: "暂无上市产品" },
  noProductsDesc: { en: "Help buyers find your parts by uploading them explicitly categorized into our taxonomy.", zh: "通过明确分类上传产品，帮助买家找到您的零件。" },
  addNewProduct: { en: "Add New Product", zh: "添加新产品" },
  editProductTitle: { en: "Edit Product", zh: "编辑产品" },
  btnCancel: { en: "Cancel", zh: "取消" },
  coreIdentity: { en: "Core Identity", zh: "核心信息" },
  mpnLabel: { en: "Manufacturer Part Number (MPN) *", zh: "制造商零件编号 (MPN) *" },
  categoryLabel: { en: "Product Category *", zh: "产品类别 *" },
  descLabel: { en: "Description", zh: "描述" },
  pricingAssets: { en: "Pricing & Assets", zh: "定价与资产" },
  moqLabel: { en: "Min Order Qty (MOQ)", zh: "最小起订量 (MOQ)" },
  priceLabel: { en: "Base Unit Price ($)", zh: "基本单价 ($)" },
  imagesLabel: { en: "Product Images/Videos (Multiple)", zh: "产品图片/视频 (多个)" },
  datasheetLabel: { en: "Datasheet (PDF)", zh: "数据表 (PDF)" },
  techSpecs: { en: "Technical Specifications", zh: "技术规格" },
  selectCatPrompt: { en: "Select a product category to load its required engineering parameters.", zh: "选择产品类别以加载其所需的工程参数。" },
  btnPublish: { en: "Publish Product to Marketplace", zh: "发布产品到市场" },
  btnUpdate: { en: "Update Product", zh: "更新产品" },
  navProdManager: { en: "Product Manager", zh: "产品经理" },
  navProfile: { en: "Company Profile", zh: "公司简介" }
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
  
  // 1. Auth Check
  currentUser = await getCurrentUser();
  if (!currentUser) {
    // If not logged in, force them back to home page to login
    alert("You must be logged in to access the Supplier Hub.");
    window.location.href = '/index.html?login=true';
    return;
  }

  // 2. Factory Check (Do they have a supplier record?)
  const { data: factories, error } = await supabase.from('suppliers').select('*').eq('owner_user_id', currentUser.id);
  
  if (error || !factories || factories.length === 0) {
    loadingUi.style.display = 'none';
    onboardingUi.style.display = 'flex';
    bindOnboarding();
  } else {
    // They have a factory
    factoryRecord = factories[0];
    bootApp();
  }
});

function bindOnboarding() {
  document.getElementById('onboarding-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = e.target.querySelector('button');
    btn.textContent = "Linking...";
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
      btn.textContent = "Create & Link Factory Profile";
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

  document.getElementById('sidebar-factory-name').textContent = factoryRecord.name;
  document.getElementById('sidebar-factory-segment').textContent = factoryRecord.segment || "OEM";

  document.getElementById('supplier-logout-btn').addEventListener('click', async () => {
    await logoutUser();
  });

  // Fetch baseline taxonomy
  const [catRes, paramRes] = await Promise.all([
    supabase.from('component_categories').select('*').order('name'),
    supabase.from('category_parameters').select('*')
  ]);
  categories = catRes.data || [];
  categoryParameters = paramRes.data || [];

  bindNavigation();
  loadCatalogTab(); // Default view
}

function bindNavigation() {
  document.querySelectorAll('.supplier-nav-item').forEach(btn => {
    btn.addEventListener('click', (e) => {
      document.querySelectorAll('.supplier-nav-item').forEach(b => b.classList.remove('active'));
      e.currentTarget.classList.add('active');
      const tab = e.currentTarget.dataset.tab;
      
      if (tab === 'catalog') loadCatalogTab();
      if (tab === 'profile') loadProfileTab();
    });
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// TAB: CATALOG (Product Manager)
// ─────────────────────────────────────────────────────────────────────────────
async function loadCatalogTab() {
  const routing = document.getElementById('supplier-content-routing');
  routing.innerHTML = `
    <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom: 24px;">
      <div>
        <h2 style="margin: 0 0 4px 0; font-family: var(--font-display); color:var(--text-main);" data-i18n="productCatalogTitle">Product Catalog</h2>
        <p style="margin: 0; color: var(--text-muted); font-size: 13px;" data-i18n="productCatalogDesc">Manage your parametrically indexed marketplace products.</p>
      </div>
      <div style="display:flex; gap: 12px; align-items:center;">
        <div style="display:flex; background:var(--input-bg); border:1px solid var(--border-subtle); border-radius:6px; overflow:hidden;">
          <button id="view-grid" style="padding: 6px 10px; cursor: pointer; border:none; background: ${viewMode === 'grid' ? 'var(--bg-surface)' : 'transparent'}; color: ${viewMode === 'grid' ? 'var(--text-main)' : 'var(--text-muted)'};">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="7" height="7"></rect><rect x="14" y="3" width="7" height="7"></rect><rect x="14" y="14" width="7" height="7"></rect><rect x="3" y="14" width="7" height="7"></rect></svg>
          </button>
          <button id="view-list" style="padding: 6px 10px; cursor: pointer; border:none; background: ${viewMode === 'list' ? 'var(--bg-surface)' : 'transparent'}; color: ${viewMode === 'list' ? 'var(--text-main)' : 'var(--text-muted)'};">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="8" y1="6" x2="21" y2="6"></line><line x1="8" y1="12" x2="21" y2="12"></line><line x1="8" y1="18" x2="21" y2="18"></line><line x1="3" y1="6" x2="3.01" y2="6"></line><line x1="3" y1="12" x2="3.01" y2="12"></line><line x1="3" y1="18" x2="3.01" y2="18"></line></svg>
          </button>
        </div>
        <button class="btn btn-primary" id="btn-create-product" style="font-size: 13px; font-weight: 500;" data-i18n="btnNewProduct">+ New Product</button>
      </div>
    </div>
    
    <div id="catalog-grid" class="${viewMode === 'grid' ? 'prod-grid' : 'prod-list'}">
      <div style="color:var(--text-muted); padding: 40px; text-align:center; grid-column: 1/-1;" data-i18n="loadingProducts">Loading products...</div>
    </div>
  `;
  translateDOM();

  document.getElementById('view-grid').addEventListener('click', () => { viewMode = 'grid'; loadCatalogTab(); });
  document.getElementById('view-list').addEventListener('click', () => { viewMode = 'list'; loadCatalogTab(); });

  // Fetch products
  const { data, error } = await supabase.from('products').select('*, product_pricing_tiers(*)').eq('supplier_id', factoryRecord.id);
  myProducts = data || [];

  const grid = document.getElementById('catalog-grid');
  if (myProducts.length === 0) {
    grid.innerHTML = `
      <div style="grid-column: 1/-1; background: var(--bg-panel); border: 1px dashed var(--border-subtle); border-radius: 12px; padding: 60px; text-align: center;">
        <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" stroke-width="1.5" style="margin-bottom:16px;"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path><polyline points="3.27 6.96 12 12.01 20.73 6.96"></polyline><line x1="12" y1="22.08" x2="12" y2="12"></line></svg>
        <div style="font-size: 15px; font-weight: 500; color: var(--text-main); margin-bottom: 8px;" data-i18n="noProductsTitle">No products listed yet</div>
        <div style="font-size: 13px; color: var(--text-muted); max-width: 400px; margin: 0 auto;" data-i18n="noProductsDesc">Help buyers find your parts by uploading them explicitly categorized into our taxonomy.</div>
      </div>
    `;
    translateDOM();
  } else {
    if (viewMode === 'grid') {
      grid.innerHTML = myProducts.map(p => {
        const cat = categories.find(c => c.id === p.category_id) || { name: 'Unknown Category' };
        const keys = Object.keys(p.specs || {}).slice(0, 3);
        const specPreview = keys.length ? keys.map(k => `<span style="display:inline-block; background:var(--bg-surface); padding:2px 6px; border-radius:4px; font-size:10px; color:var(--text-muted); margin:0 4px 4px 0;">${k}: ${p.specs[k]}</span>`).join('') : '<span style="color:var(--text-muted); font-size:11px;">No specs defined</span>';
        
        return `
          <div class="prod-card" data-id="${p.id}">
            <div style="font-size: 10px; font-weight: 600; color: var(--color-electric); text-transform: uppercase;">${cat.name}</div>
            <div style="font-size: 14px; font-weight: 500; color: var(--text-main); margin-bottom: 4px;">${p.mpn}</div>
            ${p.base_price ? `<div style="font-family: var(--font-mono); font-size: 12px; color: var(--color-emerald);">Baseline: $${p.base_price.toFixed(2)} (MOQ: ${p.moq})</div>` : ''}
            <div style="margin-top: 8px;">${specPreview}</div>
          </div>
        `;
      }).join('');
    } else {
      // List Mode
      grid.innerHTML = `
        <div style="overflow-x: auto;">
          <table class="neo-table" style="width:100%; border-collapse:collapse; text-align:left;">
            <thead>
              <tr style="border-bottom:1px solid var(--border-subtle); background:var(--bg-panel);">
                <th style="padding:10px 12px; font-size:12px; font-weight:500; color:var(--text-muted);">Category</th>
                <th style="padding:10px 12px; font-size:12px; font-weight:500; color:var(--text-muted);">MPN</th>
                <th style="padding:10px 12px; font-size:12px; font-weight:500; color:var(--text-muted);">Price (MOQ)</th>
                <th style="padding:10px 12px; font-size:12px; font-weight:500; color:var(--text-muted);">Key Specs</th>
              </tr>
            </thead>
            <tbody>
              ${myProducts.map(p => {
                const cat = categories.find(c => c.id === p.category_id) || { name: 'Unknown Category' };
                const keys = Object.keys(p.specs || {}).slice(0, 3);
                const specPreview = keys.length ? keys.map(k => `<span style="display:inline-block; background:var(--bg-surface); padding:2px 6px; border-radius:4px; font-size:10px; color:var(--text-muted); margin:0 4px 4px 0;">${k}: ${p.specs[k]}</span>`).join('') : '<span style="color:var(--text-muted); font-size:11px;">N/A</span>';
                return `
                  <tr class="prod-row" data-id="${p.id}" style="border-bottom:1px solid var(--border-subtle); cursor:pointer; transition:0.2s;">
                    <td style="padding:10px 12px; font-size:12px; color:var(--color-electric);">${cat.name}</td>
                    <td style="padding:10px 12px; font-size:13px; font-weight:500; color:var(--text-main);">${p.mpn}</td>
                    <td style="padding:10px 12px; font-family:var(--font-mono); font-size:12px; color:var(--color-emerald);">${p.base_price ? '$'+p.base_price.toFixed(2) : '-'} <span style="color:var(--text-muted)">(@${p.moq})</span></td>
                    <td style="padding:10px 12px;">${specPreview}</td>
                  </tr>
                `;
              }).join('')}
            </tbody>
          </table>
        </div>
      `;
    }
    translateDOM();

    // Attach click events for edit
    document.querySelectorAll('.prod-card, .prod-row').forEach(el => {
      el.addEventListener('click', () => {
        renderCreateProductForm(el.dataset.id);
      });
    });
  }

  document.getElementById('btn-create-product').addEventListener('click', () => renderCreateProductForm());
}

// ─────────────────────────────────────────────────────────────────────────────
// ADD PRODUCT VIEW
// ─────────────────────────────────────────────────────────────────────────────
function renderCreateProductForm(editProdId = null) {
  const routing = document.getElementById('supplier-content-routing');
  const prod = editProdId ? myProducts.find(p => p.id === editProdId) : null;
  
  // Build category hierarchy options
  const rootCats = categories.filter(c => !c.parent_id);
  const options = [];
  rootCats.forEach(r => {
    // Only showing 2 levels for MVP simplicity in dropdown
    const subs = categories.filter(c => c.parent_id === r.id);
    if(subs.length === 0) {
      options.push(`<option value="${r.id}">${r.name}</option>`);
    } else {
      options.push(`<optgroup label="${r.name}">`);
      subs.forEach(s => options.push(`<option value="${s.id}">${s.name}</option>`));
      options.push(`</optgroup>`);
    }
  });

  routing.innerHTML = `
    <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:16px; border-bottom:1px solid var(--border-subtle); padding-bottom:12px;">
      <h2 style="margin: 0; font-family: var(--font-display); color:var(--text-main); font-weight:500;" data-i18n="${prod ? 'editProductTitle' : 'addNewProduct'}">${prod ? 'Edit Product' : 'Add New Product'}</h2>
      <button class="btn btn-secondary" id="btn-cancel-product" style="font-size:13px;" data-i18n="btnCancel">Cancel</button>
    </div>

    <form id="new-product-form" style="display: flex; gap: 24px;">
      <!-- Left Column: Core Product Info -->
      <div style="flex: 1; display:flex; flex-direction:column; gap:16px;">
        
        <div style="background: var(--bg-panel); border: 1px solid var(--border-subtle); border-radius: 8px; padding: 16px;">
          <h3 style="margin:0 0 12px 0; color:var(--color-electric); font-size:13px; font-weight:600; text-transform:uppercase;" data-i18n="coreIdentity">Core Identity</h3>
          
          <div class="input-group" style="margin-bottom:12px;">
            <label style="color:var(--text-main); font-size:13px;" data-i18n="mpnLabel">Manufacturer Part Number (MPN) *</label>
            <input type="text" id="p-mpn" required class="neo-input" style="width:100%; border:1px solid var(--border-subtle); background:var(--input-bg); color:var(--text-main); padding:8px 12px; font-size:13px; border-radius:4px;">
          </div>
          
          <div class="input-group" style="margin-bottom:12px;">
            <label style="color:var(--text-main); font-size:13px;" data-i18n="categoryLabel">Product Category *</label>
            <select id="p-category" required class="neo-input" style="width:100%; border:1px solid var(--border-subtle); background:var(--input-bg); color:var(--text-main); padding:8px 12px; font-size:13px; border-radius:4px;">
              <option value="">Select a specific category...</option>
              ${options.join('')}
            </select>
          </div>

          <div class="input-group">
            <label style="color:var(--text-main); font-size:13px;" data-i18n="descLabel">Description</label>
            <textarea id="p-desc" class="neo-input" style="width:100%; border:1px solid var(--border-subtle); background:var(--input-bg); color:var(--text-main); padding:8px 12px; font-size:13px; border-radius:4px; resize:vertical; min-height:60px;"></textarea>
          </div>
        </div>

        <div style="background: var(--bg-panel); border: 1px solid var(--border-subtle); border-radius: 8px; padding: 16px;">
           <h3 style="margin:0 0 12px 0; color:var(--color-electric); font-size:13px; font-weight:600; text-transform:uppercase;" data-i18n="pricingAssets">Pricing & Assets</h3>
           
           <div style="display:flex; gap:12px; margin-bottom:12px;">
             <div class="input-group" style="flex:1;">
               <label style="color:var(--text-main); font-size:13px;" data-i18n="moqLabel">Min Order Qty (MOQ)</label>
               <input type="number" id="p-moq" value="1" min="1" class="neo-input" style="width:100%; border:1px solid var(--border-subtle); background:var(--input-bg); color:var(--text-main); padding:8px 12px; font-size:13px; border-radius:4px;">
             </div>
             <div class="input-group" style="flex:1;">
               <label style="color:var(--text-main); font-size:13px;" data-i18n="priceLabel">Base Unit Price ($)</label>
               <input type="number" step="any" id="p-price" placeholder="0.00" class="neo-input" style="width:100%; border:1px solid var(--border-subtle); background:var(--input-bg); color:var(--text-main); padding:8px 12px; font-size:13px; border-radius:4px;">
             </div>
           </div>

           <div class="input-group" style="margin-bottom:12px;">
              <label style="color:var(--text-main); font-size:13px;" data-i18n="imagesLabel">Product Images/Videos (Multiple)</label>
              <input type="file" accept="image/*,video/*" multiple id="p-img-file" class="neo-input" style="width:100%; border:1px solid var(--border-subtle); background:var(--input-bg); color:var(--text-main); padding:8px 12px; font-size:13px; border-radius:4px;">
           </div>
           
           <div class="input-group">
              <label style="color:var(--text-main); font-size:13px;" data-i18n="datasheetLabel">Datasheet (PDF)</label>
              <input type="file" accept="application/pdf" id="p-pdf-file" class="neo-input" style="width:100%; border:1px solid var(--border-subtle); background:var(--input-bg); color:var(--text-main); padding:8px 12px; font-size:13px; border-radius:4px;">
           </div>
        </div>

      </div>

      <!-- Right Column: Dynamic Parametric Data -->
      <div style="flex: 1; display:flex; flex-direction:column; gap:16px;">
        <div style="background: var(--bg-panel); height:100%; border: 1px solid var(--border-subtle); border-radius: 8px; padding: 16px;">
          <h3 style="margin:0 0 8px 0; color:var(--color-electric); font-size:13px; font-weight:600; text-transform:uppercase;" data-i18n="techSpecs">Technical Specifications</h3>
          <p style="margin:0 0 16px 0; font-size:12px; color:var(--text-muted);" data-i18n="selectCatPrompt">Select a product category to load its required engineering parameters.</p>
          
          <div id="dynamic-params-container">
             <div style="text-align:center; padding:32px; border:1px dashed var(--border-subtle); border-radius:6px; color:var(--text-muted); font-size:13px;">
              Please select a Category first.
            </div>
          </div>
          
          <div style="margin-top:32px;">
            <button type="submit" class="btn btn-primary" style="width:100%; padding:10px 14px; font-size:14px; font-weight:500;" data-i18n="${prod ? 'btnUpdate' : 'btnPublish'}">${prod ? 'Update Product' : 'Publish Product to Marketplace'}</button>
          </div>
        </div>
      </div>
    </form>
  `;
  translateDOM();

  document.getElementById('btn-cancel-product').addEventListener('click', loadCatalogTab);

  // Dynamic Parameter Injection logic
  const catSelect = document.getElementById('p-category');
  const dpc = document.getElementById('dynamic-params-container');

  catSelect.addEventListener('change', (e) => {
    const catId = e.target.value;
    if(!catId) {
       dpc.innerHTML = `<div style="text-align:center; padding:32px; border:1px dashed var(--border-subtle); border-radius:6px; color:var(--text-muted); font-size:13px;">Please select a Category first.</div>`;
       return;
    }
    const paramsForCat = categoryParameters.filter(p => p.category_id === catId);
    if(paramsForCat.length === 0) {
      dpc.innerHTML = `<div style="color:var(--text-muted); font-size:13px;">No technical parameters required for this category.</div>`;
      return;
    }

    let html = '';
    paramsForCat.forEach(p => {
      let inputHtml = '';
      if(p.data_type === 'boolean') {
        inputHtml = `<select required id="spec-${p.id}" class="neo-input" style="width:100%; border:1px solid var(--border-subtle); background:var(--input-bg); color:var(--text-main); padding:8px 12px; font-size:13px; border-radius:4px;"><option value="true">Yes</option><option value="false">No</option></select>`;
      } else if (p.data_type === 'number') {
        inputHtml = `<input required type="number" step="any" id="spec-${p.id}" class="neo-input" style="width:100%; border:1px solid var(--border-subtle); background:var(--input-bg); color:var(--text-main); padding:8px 12px; font-size:13px; border-radius:4px;">`;
      } else {
        inputHtml = `<input required type="text" id="spec-${p.id}" class="neo-input" style="width:100%; border:1px solid var(--border-subtle); background:var(--input-bg); color:var(--text-main); padding:8px 12px; font-size:13px; border-radius:4px;">`;
      }

      html += `
        <div class="input-group" style="margin-bottom:12px;">
          <label style="color:var(--color-emerald); font-family:var(--font-mono); font-size:11px;">${p.parameter_name} ${p.unit ? `[${p.unit}]` : ''}</label>
          ${inputHtml}
        </div>
      `;
    });
    dpc.innerHTML = html;
  });

  // Pre-fill if editing
  if (prod) {
    document.getElementById('p-mpn').value = prod.mpn;
    document.getElementById('p-category').value = prod.category_id;
    document.getElementById('p-desc').value = prod.description || '';
    document.getElementById('p-moq').value = prod.moq || 1;
    document.getElementById('p-price').value = prod.base_price || '';
    
    // Trigger the change to construct DOM inputs
    catSelect.dispatchEvent(new Event('change'));
    
    // Insert values
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
    btn.textContent = prod ? "Updating..." : "Publishing...";
    btn.disabled = true;

    // Build the specs JSONB
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

    const payload = {
      supplier_id: factoryRecord.id,
      category_id: catId,
      mpn: document.getElementById('p-mpn').value,
      description: document.getElementById('p-desc').value,
      stock_quantity: prod ? prod.stock_quantity : 0,
      moq: Number(document.getElementById('p-moq').value) || 1,
      base_price: Number(document.getElementById('p-price').value) || null,
      specs: specsPayload
    };

    let prodId = null;
    
    if (prod) {
      const { error: prodErr } = await supabase.from('products').update(payload).eq('id', prod.id);
      if (prodErr) { alert("Failed to update product: " + prodErr.message); btn.textContent = ogText; btn.disabled = false; return; }
      prodId = prod.id;
    } else {
      const { data: prodData, error: prodErr } = await supabase.from('products').insert(payload).select();
      if (prodErr) { alert("Failed to publish product: " + prodErr.message); btn.textContent = ogText; btn.disabled = false; return; }
      prodId = prodData[0].id;
    }

    // Handle File Uploads to Supabase Storage
    const mediaFiles = document.getElementById('p-img-file').files;
    const pdfFile = document.getElementById('p-pdf-file').files[0];

    async function uploadAsset(file, defaultType) {
      if (!file) return;
      
      let type = defaultType;
      if (file.type && file.type.startsWith('video')) {
         type = 'video';
      }

      const fileExt = file.name.split('.').pop();
      const fileName = `${prodId}_${type}_${Math.random().toString(36).substring(7)}.${fileExt}`;
      const filePath = `${factoryRecord.id}/${fileName}`;
      
      const { error: uploadError } = await supabase.storage.from('product_assets').upload(filePath, file);
      if (uploadError) {
        console.error("Storage upload error:", uploadError);
        alert(`Warning: Product saved, but failed to upload ${type}: ${uploadError.message}. Make sure the bucket 'product_assets' is public.`);
        return;
      }
      
      const { data: publicData } = supabase.storage.from('product_assets').getPublicUrl(filePath);
      
      await supabase.from('product_assets').insert({ 
        product_id: prodId, 
        asset_type: type, 
        url: publicData.publicUrl 
      });
    }

    try {
      if (mediaFiles.length > 0 || pdfFile) btn.textContent = "Uploading assets...";
      
      for(let i=0; i<mediaFiles.length; i++) {
        await uploadAsset(mediaFiles[i], 'image');
      }
      
      if (pdfFile) await uploadAsset(pdfFile, 'datasheet');
    } catch (e) {
      console.error(e);
    }

    // Success! Return to catalog
    loadCatalogTab();
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// TAB: PROFILE
// ─────────────────────────────────────────────────────────────────────────────
function loadProfileTab() {
  const routing = document.getElementById('supplier-content-routing');
  routing.innerHTML = `
    <div style="background: var(--bg-panel); border: 1px solid var(--border-subtle); border-radius: 8px; padding: 24px; max-width: 600px;">
      <h2 style="margin: 0 0 16px 0; font-family: var(--font-display); color:var(--text-main); font-weight:500;">Factory Profile Details</h2>
      <p style="color:var(--text-muted); font-size:13px;">This profile determines your public storefront presence and dictates how buyers contact your account managers.</p>
      
      <div style="margin-top: 24px; padding: 12px; border-left: 4px solid var(--color-emerald); background: var(--bg-surface);">
        <strong style="color:var(--color-emerald); font-size:13px; font-weight:500;">Profile Linked to Subapase Auth</strong>
        <p style="margin: 4px 0 0 0; font-size:12px; color:var(--text-muted);">Owner ID: ${currentUser.id}<br>Factory ID: ${factoryRecord.id}</p>
      </div>

      <div style="margin-top: 24px;">
         <label style="color:var(--text-muted); font-size:12px; font-weight:500;">Factory Name</label>
         <div style="font-size:15px; font-weight:500; color:var(--text-main); margin-bottom:16px;">${factoryRecord.name}</div>

         <label style="color:var(--text-muted); font-size:12px; font-weight:500;">Segment / Classification</label>
         <div style="font-size:14px; color:var(--text-main); margin-bottom:16px;">${factoryRecord.segment || "None"}</div>
      </div>

      <p style="margin-top:24px; font-size:12px; color:var(--text-muted);">(Advanced editing and verification uploads occur via the corporate Admin team. Contact your Atlas DT rep to request major structural changes).</p>
    </div>
  `;
}

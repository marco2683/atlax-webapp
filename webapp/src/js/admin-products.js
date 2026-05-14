/**
 * Admin Products Module — Full CRUD for all supplier products.
 * Mirrors 1:1 the fields available in the Supplier Dashboard.
 */
import { supabase } from './supabase.js';

let allProducts = [];
let allCategories = [];
let allCategoryParams = [];
let allSuppliers = [];
let adminProductsPage = 1;
const ADMIN_PRODUCTS_PER_PAGE = 25;

export async function renderAdminProducts(container) {
  container.innerHTML = `<div style="text-align:center; padding:40px; color:var(--color-steel-400);">Loading products...</div>`;
  
  const [prodRes, catRes, paramRes, supRes] = await Promise.all([
    supabase.from('products').select('*, oem_sellers(name)').order('created_at', { ascending: false }),
    supabase.from('component_categories').select('*').order('name'),
    supabase.from('category_parameters').select('*').order('parameter_name'),
    supabase.from('oem_sellers').select('id, name').order('name')
  ]);

  allProducts = prodRes.data || [];
  allCategories = catRes.data || [];
  allCategoryParams = paramRes.data || [];
  allSuppliers = supRes.data || [];

  renderProductsTable(container);
}

function renderProductsTable(container, search = '') {
  let filtered = allProducts;
  if (search) {
    const q = search.toLowerCase();
    filtered = allProducts.filter(p =>
      (p.mpn || '').toLowerCase().includes(q) ||
      (p.description || '').toLowerCase().includes(q) ||
      (p.oem_sellers?.name || '').toLowerCase().includes(q) ||
      (p.id || '').toLowerCase().includes(q)
    );
  }

  const totalPages = Math.max(1, Math.ceil(filtered.length / ADMIN_PRODUCTS_PER_PAGE));
  if (adminProductsPage > totalPages) adminProductsPage = totalPages;
  const start = (adminProductsPage - 1) * ADMIN_PRODUCTS_PER_PAGE;
  const pageItems = filtered.slice(start, start + ADMIN_PRODUCTS_PER_PAGE);

  const catLookup = {};
  allCategories.forEach(c => catLookup[c.id] = c.name);

  const rows = pageItems.map(p => {
    const stock = p.stock_quantity || 0;
    const price = p.base_price ? Number(p.base_price).toFixed(2) : '—';
    const catName = catLookup[p.category_id] || '—';
    const supplierName = p.oem_sellers?.name || '—';
    const stockClass = stock === 0 ? 'color:#ef4444;font-weight:700;' : 'color:#22c55e;font-weight:700;';

    return `
      <tr>
        <td style="font-family:monospace; font-size:11px; color:var(--color-steel-400);" title="${p.id}">${p.id.substring(0, 8)}…</td>
        <td>
          <div style="display:flex; align-items:center; gap:10px;">
            <img src="${p.image_url || p.specs?.images?.[0] || '/placeholder.png'}" style="width:36px; height:36px; object-fit:cover; border-radius:4px; border:1px solid rgba(255,255,255,0.08);" onerror="this.onerror=null; this.src='https://via.placeholder.com/64x64.png?text=No+Image'">
            <div>
              <div style="font-weight:600; font-size:13px;">${p.description || p.mpn}</div>
              <div style="font-size:11px; color:var(--color-steel-400);">${p.mpn}</div>
            </div>
          </div>
        </td>
        <td style="font-size:13px;">${supplierName}</td>
        <td style="font-size:13px;">${catName}</td>
        <td style="${stockClass} font-size:13px;">${stock.toLocaleString()}</td>
        <td style="font-size:13px; font-weight:600;">${price !== '—' ? '$' + price : price}</td>
        <td class="admin-table-actions"><div class="admin-table-actions-wrapper">
          <button class="admin-action-btn admin-edit-product" data-id="${p.id}">Edit</button>
          <button class="admin-action-btn admin-delete-product" data-id="${p.id}" style="color:#ef4444;border-color:rgba(239,68,68,.2);">Delete</button>
        </div></td>
      </tr>
    `;
  }).join('');

  container.innerHTML = `
    <div style="margin-bottom:20px; display:flex; justify-content:space-between; align-items:center;">
      <div style="display:flex; gap:12px; align-items:center;">
        <input type="text" id="admin-product-search" class="admin-input-filter" placeholder="Search by MPN, description, supplier..." value="${search}" style="min-width:300px;">
        <span style="font-size:13px; color:var(--color-steel-400);">${filtered.length} products</span>
      </div>
    </div>

    <div class="admin-table-container">
      <table class="admin-table">
        <thead><tr>
          <th style="width:90px;">ID</th>
          <th style="min-width:250px;">Product</th>
          <th>Supplier</th>
          <th>Category</th>
          <th>Stock</th>
          <th>Price</th>
          <th style="width:140px;">Actions</th>
        </tr></thead>
        <tbody>${rows || '<tr><td colspan="7" style="text-align:center; padding:40px; color:var(--color-steel-400);">No products found.</td></tr>'}</tbody>
      </table>
    </div>

    <div style="display:flex; justify-content:space-between; align-items:center; margin-top:16px; font-size:13px; color:var(--color-steel-400);">
      <span>Showing ${start + 1}–${Math.min(start + ADMIN_PRODUCTS_PER_PAGE, filtered.length)} of ${filtered.length}</span>
      <div style="display:flex; gap:8px;">
        <button class="btn btn-secondary" id="admin-prod-prev" ${adminProductsPage <= 1 ? 'disabled' : ''} style="padding:6px 12px; font-size:12px;">← Prev</button>
        <span style="padding:6px 8px;">Page ${adminProductsPage} / ${totalPages}</span>
        <button class="btn btn-secondary" id="admin-prod-next" ${adminProductsPage >= totalPages ? 'disabled' : ''} style="padding:6px 12px; font-size:12px;">Next →</button>
      </div>
    </div>
  `;

  // Bind search
  document.getElementById('admin-product-search')?.addEventListener('input', (e) => {
    adminProductsPage = 1;
    renderProductsTable(container, e.target.value.trim());
  });

  // Pagination
  document.getElementById('admin-prod-prev')?.addEventListener('click', () => {
    if (adminProductsPage > 1) { adminProductsPage--; renderProductsTable(container, search); }
  });
  document.getElementById('admin-prod-next')?.addEventListener('click', () => {
    if (adminProductsPage < totalPages) { adminProductsPage++; renderProductsTable(container, search); }
  });

  // Edit
  container.querySelectorAll('.admin-edit-product').forEach(btn => {
    btn.addEventListener('click', () => {
      const prod = allProducts.find(p => p.id === btn.dataset.id);
      if (prod) renderAdminProductForm(container, prod);
    });
  });

  // Delete
  container.querySelectorAll('.admin-delete-product').forEach(btn => {
    btn.addEventListener('click', async () => {
      if (!confirm('Are you sure you want to permanently delete this product?')) return;
      btn.textContent = '...';
      btn.style.pointerEvents = 'none';
      const { error } = await supabase.from('products').delete().eq('id', btn.dataset.id);
      if (error) { alert('Failed: ' + error.message); btn.textContent = 'Delete'; btn.style.pointerEvents = ''; return; }
      allProducts = allProducts.filter(p => p.id !== btn.dataset.id);
      renderProductsTable(container, search);
    });
  });
}

// ═══════════════════════════════════════════════════════════════
// ADMIN PRODUCT EDIT FORM — mirrors supplier dashboard 1:1
// ═══════════════════════════════════════════════════════════════
function renderAdminProductForm(container, prod) {
  const specs = prod.specs || {};

  // Build category <option> hierarchy
  const rootCats = allCategories.filter(c => !c.parent_id);
  const catOptions = [];
  rootCats.forEach(r => {
    const subs = allCategories.filter(c => c.parent_id === r.id);
    if (subs.length === 0) {
      catOptions.push(`<option value="${r.id}" ${prod.category_id === r.id ? 'selected' : ''}>${r.name}</option>`);
    } else {
      catOptions.push(`<optgroup label="${r.name}">`);
      subs.forEach(s => catOptions.push(`<option value="${s.id}" ${prod.category_id === s.id ? 'selected' : ''}>${s.name}</option>`));
      catOptions.push(`</optgroup>`);
    }
  });

  // Supplier select
  const supOptions = allSuppliers.map(s =>
    `<option value="${s.id}" ${prod.supplier_id === s.id ? 'selected' : ''}>${s.name}</option>`
  ).join('');

  // Priority badge helper
  function prioBadge(pr) {
    const c = { required: '#DC2626', recommended: '#D97706', optional: '#94A3B8' };
    return `<span style="color:${c[pr]||c.optional}; font-size:10px; font-weight:700; text-transform:uppercase; margin-left:6px;">${pr || 'optional'}</span>`;
  }

  container.innerHTML = `
    <div class="admin-form-page" style="max-width:1100px;">
      <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:20px; padding-bottom:16px; border-bottom:1px solid rgba(255,255,255,0.05);">
        <button type="button" class="admin-back-btn" id="admin-prod-back" style="margin-bottom:0;">← Back to Products</button>
        <div style="display:flex; gap:12px;">
          <button type="button" class="btn btn-secondary" id="admin-prod-cancel">Cancel</button>
          <button type="submit" form="admin-product-form" class="btn btn-primary">Save Changes</button>
        </div>
      </div>

      <form id="admin-product-form" class="admin-form">

        <!-- Section: Core Identity -->
        <div class="admin-form-section">
          <div class="admin-form-section-title">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18"/><path d="M9 21V9"/></svg>
            Core Product Identity
          </div>
          <div class="admin-form-grid cols-2">
            <div class="admin-field">
              <label>Item Name / Description <span class="req">*</span></label>
              <input type="text" name="description" value="${prod.description || ''}" required placeholder="e.g. 100µF Ceramic Capacitor 25V X7R">
            </div>
            <div class="admin-field">
              <label>Part Number (MPN) <span class="req">*</span></label>
              <input type="text" name="mpn" value="${prod.mpn || ''}" required placeholder="GRM188R71E104KA12D">
            </div>
          </div>
          <div class="admin-form-grid cols-2">
            <div class="admin-field">
              <label>Supplier / Manufacturer <span class="req">*</span></label>
              <select name="supplier_id" required>
                <option value="">Select supplier…</option>
                ${supOptions}
              </select>
            </div>
            <div class="admin-field">
              <label>Category <span class="req">*</span></label>
              <select name="category_id" id="admin-prod-category" required>
                <option value="">Select category…</option>
                ${catOptions.join('')}
              </select>
            </div>
          </div>
          <div class="admin-form-grid cols-2">
            <div class="admin-field">
              <label>Image URL</label>
              <input type="url" name="image_url" value="${prod.image_url || prod.specs?.images?.[0] || ''}" placeholder="https://...">
            </div>
            <div class="admin-field">
              <label>Product ID <span class="hint">(read-only)</span></label>
              <input type="text" value="${prod.id}" readonly style="opacity:0.6; cursor:not-allowed;">
            </div>
          </div>
        </div>

        <!-- Section: Pricing & Inventory -->
        <div class="admin-form-section">
          <div class="admin-form-section-title">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
            Pricing & Inventory
          </div>
          <div class="admin-form-grid cols-3">
            <div class="admin-field">
              <label>Base Price (USD) <span class="req">*</span></label>
              <input type="number" step="any" name="base_price" value="${prod.base_price || ''}" required placeholder="25.99">
            </div>
            <div class="admin-field">
              <label>Stock Quantity</label>
              <input type="number" name="stock_quantity" value="${prod.stock_quantity || 0}" placeholder="0">
            </div>
            <div class="admin-field">
              <label>MOQ</label>
              <input type="number" name="moq" value="${prod.moq || 1}" placeholder="1">
            </div>
          </div>
          
          <div style="margin:16px 0 8px 0; font-size:11px; font-weight:bold; color:var(--color-electric); text-transform:uppercase;">Volume Pricing Breaks</div>
          <div class="admin-form-grid cols-2">
            <div class="admin-field"><label>Qty 1 Price</label><input type="number" step="any" name="spec_price_1" value="${specs.price_1 || ''}"></div>
            <div class="admin-field"><label>Qty 10 Price</label><input type="number" step="any" name="spec_price_10" value="${specs.price_10 || ''}"></div>
          </div>
          <div class="admin-form-grid cols-2">
            <div class="admin-field"><label>Qty 100 Price</label><input type="number" step="any" name="spec_price_100" value="${specs.price_100 || ''}"></div>
            <div class="admin-field"><label>Qty 1000 Price</label><input type="number" step="any" name="spec_price_1000" value="${specs.price_1000 || ''}"></div>
          </div>
          <div class="admin-form-grid cols-2">
            <div class="admin-field"><label>Factory Lead Time</label><input type="text" name="spec_lead_time" value="${specs.lead_time || ''}" placeholder="e.g. 14 Weeks"></div>
          </div>
        </div>

        <!-- Section: Dynamic Parametric Specs -->
        <div class="admin-form-section">
          <div class="admin-form-section-title">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>
            Category-Specific Specifications
          </div>
          <div id="admin-prod-dynamic-params" style="min-height:60px;">
            <div style="color:var(--color-steel-400); font-size:13px; padding:20px; text-align:center;">Loading parameters...</div>
          </div>
        </div>

      </form>
    </div>
  `;

  // Back/Cancel
  document.getElementById('admin-prod-back')?.addEventListener('click', () => renderProductsTable(container));
  document.getElementById('admin-prod-cancel')?.addEventListener('click', () => renderProductsTable(container));

  // Load dynamic params for current category
  function loadDynamicParams(categoryId) {
    const dpc = document.getElementById('admin-prod-dynamic-params');
    if (!categoryId) {
      dpc.innerHTML = `<div style="color:var(--color-steel-400); font-size:13px; padding:20px; text-align:center;">Select a category to see specifications.</div>`;
      return;
    }
    const params = allCategoryParams.filter(p => p.category_id === categoryId);
    if (params.length === 0) {
      dpc.innerHTML = `<div style="color:var(--color-steel-400); font-size:13px; padding:20px; text-align:center;">No specifications defined for this category.</div>`;
      return;
    }

    // Sort by priority
    const order = { required: 0, recommended: 1, optional: 2 };
    const sorted = [...params].sort((a, b) => (order[a.priority] ?? 2) - (order[b.priority] ?? 2));

    let html = '<div class="admin-form-grid cols-2">';
    sorted.forEach(p => {
      const prio = p.priority || 'optional';
      const isReq = prio === 'required';
      const val = specs[p.parameter_name] ?? '';
      let input = '';
      if (p.data_type === 'boolean') {
        input = `<select id="admin-spec-${p.id}" class="admin-spec-field" data-param-name="${p.parameter_name}">
          <option value="true" ${val === true || val === 'true' ? 'selected' : ''}>Yes</option>
          <option value="false" ${val === false || val === 'false' ? 'selected' : ''}>No</option>
        </select>`;
      } else if (p.data_type === 'number') {
        input = `<input type="number" step="any" id="admin-spec-${p.id}" class="admin-spec-field" data-param-name="${p.parameter_name}" value="${val}" ${isReq ? 'required' : ''}>`;
      } else {
        input = `<input type="text" id="admin-spec-${p.id}" class="admin-spec-field" data-param-name="${p.parameter_name}" value="${val}" ${isReq ? 'required' : ''}>`;
      }
      html += `
        <div class="admin-field">
          <label>${isReq ? '<span class="req">*</span> ' : ''}${p.parameter_name}${prioBadge(prio)}${p.unit ? ` <span class="hint">[${p.unit}]</span>` : ''}</label>
          ${input}
        </div>
      `;
    });
    html += '</div>';
    dpc.innerHTML = html;
  }

  // Initial load
  loadDynamicParams(prod.category_id);

  // Category change re-loads params
  document.getElementById('admin-prod-category')?.addEventListener('change', (e) => {
    loadDynamicParams(e.target.value);
  });

  // Form submission
  document.getElementById('admin-product-form')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const form = e.target;
    const btn = form.querySelector('button[type="submit"]');
    const ogText = btn.textContent;
    btn.textContent = 'Saving...';
    btn.style.pointerEvents = 'none';

    // Build specs JSONB
    const specsPayload = {};
    document.querySelectorAll('.admin-spec-field').forEach(el => {
      const name = el.dataset.paramName;
      let val = el.value;
      // Find the param definition for type coercion
      const paramDef = allCategoryParams.find(p => p.parameter_name === name);
      if (paramDef?.data_type === 'number') val = Number(val);
      if (paramDef?.data_type === 'boolean') val = val === 'true';
      specsPayload[name] = val;
    });

    // Add volume pricing & lead time
    const fd = new FormData(form);
    specsPayload.price_1 = fd.get('spec_price_1') || '';
    specsPayload.price_10 = fd.get('spec_price_10') || '';
    specsPayload.price_100 = fd.get('spec_price_100') || '';
    specsPayload.price_1000 = fd.get('spec_price_1000') || '';
    specsPayload.lead_time = fd.get('spec_lead_time') || '';

    const payload = {
      supplier_id: fd.get('supplier_id'),
      category_id: fd.get('category_id'),
      mpn: fd.get('mpn'),
      description: fd.get('description'),
      stock_quantity: Number(fd.get('stock_quantity')) || 0,
      moq: Number(fd.get('moq')) || 1,
      base_price: Number(fd.get('base_price')) || null,
      specs: specsPayload
    };

    const formImageUrl = fd.get('image_url');
    if (formImageUrl) {
        specsPayload.images = [formImageUrl, ...(prod.specs?.images || []).filter(u => u !== formImageUrl)];
    }

    const { error } = await supabase.from('products').update(payload).eq('id', prod.id);
    
    if (error) {
      alert('Failed to update product: ' + error.message);
      btn.textContent = ogText;
      btn.style.pointerEvents = '';
    } else {
      // Update in local cache
      Object.assign(prod, payload);
      btn.textContent = '✓ Saved!';
      setTimeout(() => renderProductsTable(container), 800);
    }
  });
}

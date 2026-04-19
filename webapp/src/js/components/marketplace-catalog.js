/* ═══════════════════════════════════════════════════════════════
   MARKETPLACE CATALOG — DigiKey-Style Parametric Search Engine
   ═══════════════════════════════════════════════════════════════ */

import { supabase } from '../supabase.js';
import { getCurrentUser } from '../services/auth.js';

// ── State ────────────────────────────────────────────────────
let categories = [];
let categoryParams = [];
let activeCategoryId = null;
let activeCategoryPath = []; // Array of {id, name} for breadcrumb

let allProducts = [];   // Full fetch from active category
let filteredProducts = []; // After parametric + search filters
let displayProducts = []; // After sort + paginate

let filterState = {};     // Parametric filter selections {paramName: Set of selected values}
let specColumns = [];      // Dynamic columns to show in table

let currentPage = 1;
let pageSize = 25;

let sortField = null;
let sortDirection = null; // 'asc' | 'desc'

let shoppingCart = JSON.parse(localStorage.getItem('marketplace_cart')) || []; // Persist via localStorage


// ── Init ─────────────────────────────────────────────────────
export async function initMarketplaceCatalog() {
  console.log('[Marketplace] Initializing DigiKey-style Storefront...');

  // 1. Fetch all categories
  const { data: catData, error: catErr } = await supabase.from('component_categories').select('*').eq('is_active', true).order('name');
  if (catErr) {
    console.error('Failed fetching marketplace categories:', catErr);
    return;
  }
  categories = catData || [];

  // 2. Render sidebar tree
  renderTaxonomyTree();

  // 3. Wire up event listeners
  wireEventListeners();

  // 4. Initial fetch — all products
  await fetchAndRenderProducts();

  // 5. Hydrate Cart Badge locally 
  if (typeof window.updateCartBadge === 'function') {
      window.updateCartBadge();
  }
}

// ═══════════════════════════════════════════════════════════════
// TAXONOMY SIDEBAR TREE
// ═══════════════════════════════════════════════════════════════

function renderTaxonomyTree() {
  const container = document.getElementById('catalog-taxonomy-tree');
  if (!container) return;

  const rootCats = categories.filter(c => !c.parent_id);

  function buildNode(cat, depth) {
    const subs = categories.filter(c => c.parent_id === cat.id);
    const hasSubs = subs.length > 0;
    const depthClass = `dk-tree-depth-${depth}`;

    let html = `<div class="${depthClass}">`;
    html += `<div class="dk-tree-node" data-id="${cat.id}" data-name="${cat.name}">`;

    html += `<span class="dk-tree-label" style="flex:1; text-align:left;">${cat.name}</span>`;
    if (hasSubs) {
      html += `<svg class="dk-tree-arrow" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="9 18 15 12 9 6"/></svg>`;
    }
    html += `</div>`;

    if (hasSubs) {
      html += `<div class="dk-tree-children">`;
      subs.forEach(s => { html += buildNode(s, depth + 1); });
      html += `</div>`;
    }

    html += `</div>`;
    return html;
  }

  let html = '';
  rootCats.forEach(rc => { html += buildNode(rc, 0); });
  container.innerHTML = html;

  // Wire click handlers
  container.querySelectorAll('.dk-tree-node').forEach(node => {
    node.addEventListener('click', (e) => {
      e.stopPropagation();
      const catId = node.dataset.id;
      const catName = node.dataset.name;

      // Toggle children
      const arrow = node.querySelector('.dk-tree-arrow');
      const children = node.nextElementSibling;
      if (children && children.classList.contains('dk-tree-children')) {
        children.classList.toggle('open');
        if (arrow) arrow.classList.toggle('expanded');
      }

      // Set active
      container.querySelectorAll('.dk-tree-node').forEach(n => n.classList.remove('active'));
      node.classList.add('active');

      // Build breadcrumb path
      activeCategoryPath = buildCategoryPath(catId);
      activeCategoryId = catId;

      // Update UI
      updateBreadcrumb();
      document.getElementById('catalog-header-title').textContent = catName;

      // Reset filters and page
      filterState = {};
      currentPage = 1;
      sortField = null;
      sortDirection = null;

      // Load parametric filters + products
      loadParametricFilters(catId);
      fetchAndRenderProducts();
    });
  });
}

function buildCategoryPath(catId) {
  const path = [];
  let current = categories.find(c => c.id === catId);
  while (current) {
    path.unshift({ id: current.id, name: current.name });
    current = current.parent_id ? categories.find(c => c.id === current.parent_id) : null;
  }
  return path;
}

function updateBreadcrumb() {
  const bc = document.getElementById('catalog-breadcrumb');
  if (!bc) return;

  let html = `<a data-action="reset" style="cursor:pointer;">Product Index</a>`;
  activeCategoryPath.forEach((p, i) => {
    html += `<span class="dk-bc-sep">›</span>`;
    if (i === activeCategoryPath.length - 1) {
      html += `<span class="dk-bc-current">${p.name}</span>`;
    } else {
      html += `<a data-cat-id="${p.id}" style="cursor:pointer;">${p.name}</a>`;
    }
  });

  bc.innerHTML = html;

  // Wire breadcrumb clicks
  bc.querySelectorAll('a[data-action="reset"]').forEach(a => {
    a.addEventListener('click', () => {
      activeCategoryId = null;
      activeCategoryPath = [];
      filterState = {};
      currentPage = 1;
      document.getElementById('catalog-header-title').textContent = 'All Components';
      updateBreadcrumb();
      clearFiltersUI();
      fetchAndRenderProducts();
      // De-select tree
      document.querySelectorAll('.dk-tree-node').forEach(n => n.classList.remove('active'));
    });
  });

  bc.querySelectorAll('a[data-cat-id]').forEach(a => {
    a.addEventListener('click', () => {
      const id = a.dataset.catId;
      const treeNode = document.querySelector(`.dk-tree-node[data-id="${id}"]`);
      if (treeNode) treeNode.click();
    });
  });
}

// ═══════════════════════════════════════════════════════════════
// PARAMETRIC FILTER COLUMNS (DigiKey-style)
// ═══════════════════════════════════════════════════════════════

async function loadParametricFilters(catId) {
  const grid = document.getElementById('catalog-filters-grid');
  if (!grid) return;

  grid.innerHTML = `<div style="padding:16px; color:#999; font-size:12px;">Loading filters...</div>`;

  // Fetch category parameters
  const { data, error } = await supabase.from('category_parameters').select('*').eq('category_id', catId);
  if (error || !data || data.length === 0) {
    grid.innerHTML = `<div style="padding:16px; color:#999; font-size:12px; width:100%; text-align:center;">No parametric filters defined for this category.</div>`;
    categoryParams = [];
    specColumns = [];
    return;
  }

  categoryParams = data;
  specColumns = data.map(p => p.parameter_name);

  // We need to know the unique values for each parameter from existing products
  // First fetch products to extract unique spec values
  const { data: products } = await supabase.from('products').select('specs').eq('category_id', catId);
  const specValues = {};
  categoryParams.forEach(p => { specValues[p.parameter_name] = new Set(); });

  (products || []).forEach(prod => {
    const specs = prod.specs || {};
    categoryParams.forEach(p => {
      const val = specs[p.parameter_name];
      if (val !== undefined && val !== null && val !== '') {
        specValues[p.parameter_name].add(String(val));
      }
    });
  });

  // Build filter columns
  let html = '';

  // Always add a Manufacturer/Supplier column first
  html += buildFilterColumn('Supplier', [], 'supplier');

  categoryParams.forEach(p => {
    const values = Array.from(specValues[p.parameter_name]).sort((a, b) => {
      const aNum = parseFloat(a);
      const bNum = parseFloat(b);
      if (!isNaN(aNum) && !isNaN(bNum)) return aNum - bNum;
      return a.localeCompare(b);
    });

    const unitLabel = p.unit ? ` (${p.unit})` : '';
    html += buildFilterColumn(p.parameter_name + unitLabel, values, p.parameter_name);
  });

  grid.innerHTML = html;

  // Wire filter item clicks
  grid.querySelectorAll('.dk-filter-list-item').forEach(item => {
    item.addEventListener('click', () => {
      const paramName = item.dataset.param;
      const value = item.dataset.value;

      if (!filterState[paramName]) filterState[paramName] = new Set();

      if (filterState[paramName].has(value)) {
        filterState[paramName].delete(value);
        item.classList.remove('selected');
      } else {
        filterState[paramName].add(value);
        item.classList.add('selected');
      }
    });
  });

  // Wire filter search inputs
  grid.querySelectorAll('.dk-filter-col-search input').forEach(input => {
    input.addEventListener('input', (e) => {
      const col = input.closest('.dk-filter-column');
      const query = e.target.value.toLowerCase();
      col.querySelectorAll('.dk-filter-list-item').forEach(item => {
        const text = item.textContent.toLowerCase();
        item.style.display = text.includes(query) ? '' : 'none';
      });
    });
  });

  // Update dynamic table headers
  updateDynamicTableColumns();
}

function buildFilterColumn(label, values, paramKey) {
  let html = `<div class="dk-filter-column">`;
  html += `<div class="dk-filter-col-header" title="${label}">${label}</div>`;
  html += `<div class="dk-filter-col-search"><input type="text" placeholder="Search Filter"></div>`;
  html += `<div class="dk-filter-col-list">`;

  if (values.length === 0) {
    html += `<div style="padding:8px; color:#BBB; font-size:11px; font-style:italic;">No values</div>`;
  } else {
    values.forEach(v => {
      html += `<div class="dk-filter-list-item" data-param="${paramKey}" data-value="${v}">${v}</div>`;
    });
  }

  html += `</div></div>`;
  return html;
}

function clearFiltersUI() {
  const grid = document.getElementById('catalog-filters-grid');
  if (grid) {
    grid.innerHTML = `<div style="padding:20px; color:#999; font-size:12px; text-align:center; width:100%;">Select a category from the sidebar to load parametric filters.</div>`;
  }
  specColumns = [];
  categoryParams = [];
  updateDynamicTableColumns();
}

function updateDynamicTableColumns() {
  const headRow = document.getElementById('catalog-table-head');
  const filterRow = document.getElementById('catalog-filter-row');
  if (!headRow || !filterRow) return;

  // Remove old dynamic columns
  headRow.querySelectorAll('.dk-dynamic-col').forEach(el => el.remove());
  filterRow.querySelectorAll('.dk-dynamic-col').forEach(el => el.remove());

  // Add new dynamic columns from spec parameters
  specColumns.forEach(colName => {
    const th = document.createElement('th');
    th.className = 'dk-dynamic-col';
    th.dataset.sort = `spec_${colName}`;
    th.innerHTML = `${colName} <span class="dk-sort-arrows"><span class="sort-up">▲</span><span class="sort-down">▼</span></span>`;
    headRow.appendChild(th);

    const fth = document.createElement('th');
    fth.className = 'dk-dynamic-col';
    fth.innerHTML = `<input type="text" placeholder="▲ ▼" data-col-filter="spec_${colName}">`;
    filterRow.appendChild(fth);
  });
}

// ═══════════════════════════════════════════════════════════════
// DATA FETCHING & RENDERING
// ═══════════════════════════════════════════════════════════════

async function fetchAndRenderProducts(searchQuery = '') {
  const tbody = document.getElementById('catalog-table-body');
  if (tbody) {
    tbody.innerHTML = `<tr><td colspan="20" class="dk-loading"><div class="dk-loading-spinner"></div>Querying database...</td></tr>`;
  }

  // Build query
  let queryBuilder = supabase.from('products').select('*, suppliers(name)');

  if (activeCategoryId) {
    // Include child categories
    const childIds = getAllChildCategoryIds(activeCategoryId);
    queryBuilder = queryBuilder.in('category_id', [activeCategoryId, ...childIds]);
  }

  const { data, error } = await queryBuilder;

  if (error) {
    console.error('Marketplace fetch error:', error);
    if (tbody) {
      tbody.innerHTML = `<tr><td colspan="20" style="text-align:center; padding:40px; color:#CC0000;">Database Error: ${error.message}</td></tr>`;
    }
    return;
  }

  allProducts = data || [];

  // Apply filters and render
  applyFiltersAndRender(searchQuery);
}

function getAllChildCategoryIds(parentId) {
  const children = categories.filter(c => c.parent_id === parentId);
  let ids = children.map(c => c.id);
  children.forEach(c => {
    ids = ids.concat(getAllChildCategoryIds(c.id));
  });
  return ids;
}

function applyFiltersAndRender(searchQuery = '') {
  const searchInput = document.getElementById('catalog-search');
  const query = searchQuery || (searchInput ? searchInput.value.trim() : '');

  let results = [...allProducts];

  // 1. Search filter
  if (query) {
    const q = query.toLowerCase();
    results = results.filter(p => {
      const text = `${p.mpn || ''} ${p.name || ''} ${p.suppliers?.name || ''} ${JSON.stringify(p.specs || {})}`.toLowerCase();
      return text.includes(q);
    });
  }

  // 2. Parametric filter (selected values in filter columns)
  for (const [paramName, selectedValues] of Object.entries(filterState)) {
    if (selectedValues.size === 0) continue;

    if (paramName === 'supplier') {
      results = results.filter(p => {
        return selectedValues.has(p.suppliers?.name || '');
      });
    } else {
      results = results.filter(p => {
        const specs = p.specs || {};
        const val = String(specs[paramName] || '');
        return selectedValues.has(val);
      });
    }
  }

  // 3. In-stock filter
  if (document.getElementById('filter-in-stock')?.checked) {
    results = results.filter(p => (p.stock_qty || 0) > 0);
  }

  filteredProducts = results;

  // Update counts
  updateCounts();

  // Sort
  applySorting();

  // Paginate and render
  renderPage();
}

function applySorting() {
  if (!sortField || !sortDirection) {
    displayProducts = [...filteredProducts];
    return;
  }

  displayProducts = [...filteredProducts].sort((a, b) => {
    let aVal, bVal;

    switch (sortField) {
      case 'mpn':
        aVal = (a.mpn || '').toLowerCase();
        bVal = (b.mpn || '').toLowerCase();
        break;
      case 'price':
        aVal = a.base_price || 999999;
        bVal = b.base_price || 999999;
        break;
      case 'stock':
        aVal = a.stock_qty || 0;
        bVal = b.stock_qty || 0;
        break;
      case 'supplier':
        aVal = (a.suppliers?.name || '').toLowerCase();
        bVal = (b.suppliers?.name || '').toLowerCase();
        break;
      default:
        if (sortField.startsWith('spec_')) {
          const specKey = sortField.replace('spec_', '');
          aVal = a.specs?.[specKey] ?? '';
          bVal = b.specs?.[specKey] ?? '';
          // Try numeric sort
          const aNum = parseFloat(aVal);
          const bNum = parseFloat(bVal);
          if (!isNaN(aNum) && !isNaN(bNum)) {
            aVal = aNum;
            bVal = bNum;
          } else {
            aVal = String(aVal).toLowerCase();
            bVal = String(bVal).toLowerCase();
          }
        }
        break;
    }

    if (aVal < bVal) return sortDirection === 'asc' ? -1 : 1;
    if (aVal > bVal) return sortDirection === 'asc' ? 1 : -1;
    return 0;
  });
}

function renderPage() {
  const data = displayProducts.length > 0 ? displayProducts : filteredProducts;
  const totalPages = Math.ceil(data.length / pageSize);

  if (currentPage > totalPages) currentPage = 1;

  const startIdx = (currentPage - 1) * pageSize;
  const endIdx = Math.min(startIdx + pageSize, data.length);
  const pageData = data.slice(startIdx, endIdx);

  renderTableData(pageData);
  renderPagination(data.length, totalPages);
  updateShowingText(startIdx + 1, endIdx, data.length);
}

function updateCounts() {
  const totalEl = document.getElementById('catalog-total-count');
  const filteredEl = document.getElementById('catalog-filtered-count');
  if (totalEl) totalEl.textContent = allProducts.length;
  if (filteredEl) filteredEl.textContent = filteredProducts.length;
}

function updateShowingText(from, to, total) {
  const text = total === 0 ? 'No results' : `Showing ${from} - ${to} of ${total}`;
  const el1 = document.getElementById('catalog-showing-text');
  const el2 = document.getElementById('catalog-bottom-showing');
  if (el1) el1.textContent = text;
  if (el2) el2.textContent = text;
}

function renderTableData(products) {
  const tbody = document.getElementById('catalog-table-body');
  if (!tbody) return;

  if (products.length === 0) {
    tbody.innerHTML = `<tr><td colspan="20"><div class="dk-empty-state"><h3>No components match your specifications</h3><p>Try adjusting your filters or selecting a different category.</p></div></td></tr>`;
    return;
  }

  const html = products.map((p, idx) => {
    const suppName = p.suppliers?.name || 'Unknown';
    const mpn = p.mpn || 'N/A';
    const desc = p.name || p.description || '';
    const price = p.base_price ? `$${Number(p.base_price).toFixed(5)}` : 'RFQ';
    const moq = p.moq || 1;
    const stockQty = p.stock_qty || Math.floor(Math.random() * 50000); // Fallback for demo
    const stockFormatted = stockQty.toLocaleString();
    const leadTime = p.specs?.lead_time || 'Factory Stock';

    // Parse pricing tiers
    const p1 = p.specs?.price_1 ? `1: $${Number(p.specs.price_1).toFixed(5)}<br>` : '';
    const p10 = p.specs?.price_10 ? `10: $${Number(p.specs.price_10).toFixed(5)}<br>` : '';
    const p100 = p.specs?.price_100 ? `100: $${Number(p.specs.price_100).toFixed(5)}<br>` : '';
    const p1000 = p.specs?.price_1000 ? `1,000: $${Number(p.specs.price_1000).toFixed(5)}` : '';
    const pricingHTML = p1+p10+p100+p1000 || (p.base_price ? `1: $${Number(p.base_price).toFixed(5)}` : 'RFQ');

    // Build spec cells
    const specCells = specColumns.map(col => {
      // Don't render internal pricing columns as standard specs
      if (['price_1','price_10','price_100','price_1000','lead_time'].includes(col)) return '';
      const val = p.specs?.[col] ?? '-';
      return `<td>${val}</td>`;
    }).join('');

    return `
      <tr>
        <td class="dk-col-checkbox"><input type="checkbox" data-product-id="${p.id}"></td>
        <td class="dk-col-image">
          ${(() => {
            const listImg = p.image_url || p.specs?.image_url || p.specs?.images?.[0];
            return listImg 
              ? `<img src="${listImg}" alt="${mpn}" loading="lazy">`
              : `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#CCC" stroke-width="1"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="M21 15l-5-5L5 21"/></svg>`;
          })()}
        </td>
        <td>
          <a class="dk-part-link" data-product-id="${p.id}">${mpn}</a>
          <span class="dk-part-desc">${desc}</span>
          <span class="dk-supplier-link">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
            ${suppName}
          </span>
        </td>
        <td>
          <div class="dk-stock-qty">${stockFormatted}</div>
          <div class="dk-stock-status">${stockQty > 0 ? 'In Stock' : leadTime}</div>
        </td>
        <td class="dk-price-cell">
          <div class="dk-price-value">${pricingHTML}</div>
        </td>
        <td>${suppName}</td>
        <td><span class="dk-status-active">Active</span></td>
        ${specCells}
      </tr>
    `;
  }).join('');

  tbody.innerHTML = html;
}

function renderPagination(totalItems, totalPages) {
  const containerTop = document.getElementById('catalog-pagination-top');
  const containerBottom = document.getElementById('catalog-pagination-bottom');

  if (totalPages <= 1) {
    if (containerTop) containerTop.innerHTML = '';
    if (containerBottom) containerBottom.innerHTML = '';
    return;
  }

  let html = '';

  // Previous
  html += `<button ${currentPage === 1 ? 'disabled' : ''} data-page="${currentPage - 1}">‹ Prev</button>`;

  // Page numbers (show max 7 around current)
  const maxVisible = 7;
  let startPage = Math.max(1, currentPage - Math.floor(maxVisible / 2));
  let endPage = Math.min(totalPages, startPage + maxVisible - 1);
  if (endPage - startPage < maxVisible - 1) {
    startPage = Math.max(1, endPage - maxVisible + 1);
  }

  if (startPage > 1) {
    html += `<button data-page="1">1</button>`;
    if (startPage > 2) html += `<span style="padding:0 4px; color:#999;">...</span>`;
  }

  for (let i = startPage; i <= endPage; i++) {
    html += `<button data-page="${i}" class="${i === currentPage ? 'active' : ''}">${i}</button>`;
  }

  if (endPage < totalPages) {
    if (endPage < totalPages - 1) html += `<span style="padding:0 4px; color:#999;">...</span>`;
    html += `<button data-page="${totalPages}">${totalPages}</button>`;
  }

  // Next
  html += `<button ${currentPage === totalPages ? 'disabled' : ''} data-page="${currentPage + 1}">Next ›</button>`;

  if (containerTop) containerTop.innerHTML = html;
  if (containerBottom) containerBottom.innerHTML = html;

  // Wire clicks
  [containerTop, containerBottom].forEach(cont => {
    if (!cont) return;
    cont.querySelectorAll('button[data-page]').forEach(btn => {
      btn.addEventListener('click', () => {
        const page = parseInt(btn.dataset.page);
        if (page >= 1 && page <= totalPages) {
          currentPage = page;
          renderPage();
          // Scroll table to top
          document.getElementById('catalog-table-wrapper')?.scrollTo(0, 0);
        }
      });
    });
  });
}

// ═══════════════════════════════════════════════════════════════
// EVENT LISTENERS
// ═══════════════════════════════════════════════════════════════

function wireEventListeners() {
  // Page size
  document.getElementById('catalog-page-size')?.addEventListener('change', (e) => {
    pageSize = parseInt(e.target.value) || 25;
    currentPage = 1;
    applyFiltersAndRender(document.getElementById('catalog-search')?.value.trim());
  });

  // ── Global Checkout Navigation Helpers ───────────────────────────────────
  // Hide all catalog sub-pages and show only the requested one
  function showCatalogPage(pageId) {
    ['catalog-layout','catalog-pdp','cart-page-layout','checkout-page-layout','thank-you-layout',
     'mkt-manufacturers-layout','mkt-resources-layout','mkt-rfq-layout']
      .forEach(id => document.getElementById(id)?.classList.add('hidden'));
    document.getElementById(pageId)?.classList.remove('hidden');

    // Move the shared marketplace footer into the active sub-page so it scrolls with content
    const footer = document.getElementById('mkt-shared-footer');
    if (footer) {
      const subPages = ['mkt-manufacturers-layout','mkt-resources-layout','mkt-rfq-layout'];
      if (subPages.includes(pageId)) {
        const page = document.getElementById(pageId);
        if (page) page.appendChild(footer);
        footer.style.display = '';
      } else {
        footer.style.display = 'none';
      }
    }
  }

  // ── Marketplace Navigation (Products / Manufacturers / Resources / RFQ) ──
  const navMap = {
    'catalog-layout':           'mkt-nav-products',
    'mkt-manufacturers-layout': 'mkt-nav-manufacturers',
    'mkt-resources-layout':     'mkt-nav-resources',
    'mkt-rfq-layout':           'mkt-nav-rfq'
  };

  window.mktShowPage = function(pageId) {
    showCatalogPage(pageId);

    // Update active nav link
    Object.values(navMap).forEach(id => document.getElementById(id)?.classList.remove('mkt-nav-active'));
    const activeNavId = navMap[pageId];
    if (activeNavId) document.getElementById(activeNavId)?.classList.add('mkt-nav-active');

    // Render page-specific content
    if (pageId === 'mkt-manufacturers-layout') renderManufacturersPage();
  };

  // Bind nav links explicitly
  document.querySelectorAll('[data-mkt-page]').forEach(link => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation(); // prevent global active link click interceptors
      const pageId = e.currentTarget.getAttribute('data-mkt-page');
      if (pageId) window.mktShowPage(pageId);
    });
  });

  // ── Manufacturers Page Rendering ─────────────────────────────────────────
  function renderManufacturersPage(searchQuery = '') {
    const grid = document.getElementById('mkt-mfg-grid');
    const countEl = document.getElementById('mkt-mfg-count');
    if (!grid) return;

    // Extract unique manufacturers from allProducts
    const mfgMap = {};
    allProducts.forEach(p => {
      const name = p.suppliers?.name || 'Unknown';
      if (!mfgMap[name]) {
        mfgMap[name] = { name, productCount: 0, categories: new Set(), image: null };
      }
      mfgMap[name].productCount++;
      // Find category name
      const cat = categories.find(c => c.id === p.category_id);
      if (cat) mfgMap[name].categories.add(cat.name);
      // Use first product image as fallback
      if (!mfgMap[name].image) mfgMap[name].image = p.image_url || p.specs?.image_url || null;
    });

    let mfgList = Object.values(mfgMap).sort((a, b) => b.productCount - a.productCount);

    // Filter by search
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      mfgList = mfgList.filter(m => m.name.toLowerCase().includes(q));
    }

    if (countEl) countEl.textContent = mfgList.length + ' manufacturer' + (mfgList.length !== 1 ? 's' : '');

    if (mfgList.length === 0) {
      grid.innerHTML = '<div style="grid-column:1/-1; text-align:center; padding:60px; color:#888; font-size:15px;">No manufacturers found.</div>';
      return;
    }

    grid.innerHTML = mfgList.map(m => {
      const initial = m.name.charAt(0).toUpperCase();
      const catList = [...m.categories].slice(0, 3).join(', ') || 'General';
      const colors = ['#0e7490','#7c3aed','#dc2626','#d97706','#16a34a','#2563eb','#be185d','#0369a1'];
      const bgColor = colors[initial.charCodeAt(0) % colors.length];

      return `
        <div class="mkt-mfg-card" onclick="window.mktViewSupplierProducts('${m.name.replace(/'/g, "\\'")}')">
          <div class="mkt-mfg-card-header">
            <div class="mkt-mfg-avatar" style="background:${bgColor};">${initial}</div>
            <div>
              <div class="mkt-mfg-name">${m.name}</div>
              <div class="mkt-mfg-meta">${m.productCount} product${m.productCount > 1 ? 's' : ''} listed</div>
            </div>
          </div>
          <div class="mkt-mfg-categories">
            <span style="font-size:11px; color:#888; text-transform:uppercase; letter-spacing:0.5px; font-weight:600;">Categories:</span>
            <span style="font-size:12px; color:#333;">${catList}</span>
          </div>
          <div class="mkt-mfg-cta">View Products →</div>
        </div>
      `;
    }).join('');
  }

  // View a specific supplier's products
  window.mktViewSupplierProducts = function(supplierName) {
    // Switch to Products page
    window.mktShowPage('catalog-layout');
    // Set the supplier filter active
    if (!filterState.supplier) filterState.supplier = new Set();
    filterState.supplier.clear();
    filterState.supplier.add(supplierName);
    currentPage = 1;
    applyFiltersAndRender();
  };

  // ── Manufacturers search wiring ──────────────────────────────────────────
  document.getElementById('mkt-mfg-search')?.addEventListener('input', (e) => {
    renderManufacturersPage(e.target.value.trim());
  });

  // ── RFQ Form Submission ──────────────────────────────────────────────────
  document.getElementById('mkt-rfq-form')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const user = await getCurrentUser();
    if (!user) { alert('Please log in to submit a quote request.'); return; }

    const btn = document.getElementById('mkt-rfq-submit');
    btn.disabled = true;
    btn.textContent = 'Submitting…';

    const rfqType = document.querySelector('input[name="rfq-type"]:checked')?.value || 'high-volume';
    const certs = [...document.querySelectorAll('input[name="rfq-cert"]:checked')].map(cb => cb.value);

    const payload = {
      type: 'marketplace_rfq',
      rfq_type: rfqType,
      mpn: document.getElementById('rfq-mpn')?.value || '',
      description: document.getElementById('rfq-desc')?.value || '',
      quantity: parseInt(document.getElementById('rfq-qty')?.value) || 0,
      target_price: document.getElementById('rfq-target-price')?.value || '',
      delivery_date: document.getElementById('rfq-delivery-date')?.value || '',
      preferred_mfg: document.getElementById('rfq-mfg')?.value || '',
      certifications: certs,
      notes: document.getElementById('rfq-notes')?.value || ''
    };

    try {
      const { error } = await supabase.from('rfq_history').insert({
        id: window.crypto?.randomUUID?.() || null,
        user_id: user.id,
        rfq_data: payload,
        status: 'pending'
      });

      if (error) throw error;

      btn.style.background = '#10b981';
      btn.textContent = '✓ RFQ Submitted!';
      setTimeout(() => {
        btn.style.background = '#007185';
        btn.textContent = 'Submit RFQ';
        btn.disabled = false;
        document.getElementById('mkt-rfq-form')?.reset();
      }, 3000);
    } catch (err) {
      console.error('RFQ submission error:', err);
      alert('Failed to submit. Please try again.');
      btn.style.background = '#007185';
      btn.textContent = 'Submit RFQ';
      btn.disabled = false;
    }
  });

  // ── RFQ type radio visual feedback ───────────────────────────────────────
  document.querySelectorAll('.mkt-rfq-type-option input[type="radio"]').forEach(radio => {
    radio.addEventListener('change', () => {
      document.querySelectorAll('.mkt-rfq-type-option').forEach(opt => {
        opt.style.borderColor = '#e2e8f0';
        opt.style.background = '#fff';
      });
      if (radio.checked) {
        radio.closest('.mkt-rfq-type-option').style.borderColor = '#007185';
        radio.closest('.mkt-rfq-type-option').style.background = '#f8fdfd';
      }
    });
  });

  window.goBackToMarketplace = function() {
    showCatalogPage('catalog-layout');
    // Also reset nav active state
    Object.values(navMap).forEach(id => document.getElementById(id)?.classList.remove('mkt-nav-active'));
    document.getElementById('mkt-nav-products')?.classList.add('mkt-nav-active');
  };

  window.goToCart = function() {
    showCatalogPage('cart-page-layout');
    renderCartPageUI();
  };

  window.chkGoToStep = function(step) {
    const dot1   = document.getElementById('chk-step-dot-1');
    const dot2   = document.getElementById('chk-step-dot-2');
    const label1 = document.getElementById('chk-step-label-1');
    const label2 = document.getElementById('chk-step-label-2');
    const fill   = document.getElementById('chk-progress-fill');
    const crumb  = document.getElementById('chk-breadcrumb-step');
    const CHECK  = '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><polyline points="20 6 9 17 4 12"></polyline></svg>';

    if (step === 1) {
      if (dot1)   { dot1.textContent='2'; dot1.style.background='#007185'; dot1.style.borderColor='#007185'; dot1.style.color='#fff'; dot1.style.boxShadow='0 2px 6px rgba(0,113,133,0.3)'; }
      if (dot2)   { dot2.textContent='3'; dot2.style.background='#fff'; dot2.style.borderColor='#d1d5db'; dot2.style.color='#9ca3af'; dot2.style.boxShadow='none'; }
      if (label1) { label1.style.color='#007185'; label1.style.fontWeight='700'; }
      if (label2) { label2.style.color='#9ca3af'; label2.style.fontWeight='600'; }
      if (fill)   fill.style.width='0%';
      if (crumb)  crumb.textContent='Shipping & Billing';
      document.getElementById('checkout-page-layout')?.scrollTo({top:0, behavior:'smooth'});

    } else if (step === 2) {
      // For new single-page layout: just mark step 2 active and populate previews
      if (dot1)   { dot1.innerHTML=CHECK; dot1.style.background='#10b981'; dot1.style.borderColor='#10b981'; dot1.style.boxShadow='0 2px 6px rgba(16,185,129,0.3)'; }
      if (dot2)   { dot2.textContent='3'; dot2.style.background='#007185'; dot2.style.borderColor='#007185'; dot2.style.color='#fff'; dot2.style.boxShadow='0 2px 6px rgba(0,113,133,0.3)'; }
      if (label1) { label1.style.color='#10b981'; }
      if (label2) { label2.style.color='#007185'; label2.style.fontWeight='700'; }
      if (fill)   fill.style.width='100%';
      if (crumb)  crumb.textContent='Review & Confirm';
      document.getElementById('checkout-page-layout')?.scrollTo({top:0, behavior:'smooth'});

      // Populate delivery address preview from Step 1 form values
      const name  = document.getElementById('chk-name')?.value?.trim()    || '—';
      const addr1 = document.getElementById('chk-address1')?.value?.trim() || '—';
      const addr2 = document.getElementById('chk-address2')?.value?.trim() || '';
      const city  = document.getElementById('chk-city')?.value?.trim()    || '—';
      const state = document.getElementById('chk-state')?.value?.trim()   || '';
      const zip   = document.getElementById('chk-zip')?.value?.trim()     || '';

      const nameEl    = document.getElementById('chk-addr-preview-name');
      const streetEl  = document.getElementById('chk-addr-preview-street');
      const cityEl    = document.getElementById('chk-addr-preview-city');
      const countryEl = document.getElementById('chk-addr-preview-country');
      if (nameEl)    nameEl.textContent    = name;
      if (streetEl)  streetEl.textContent  = addr1 + (addr2 ? ', ' + addr2 : '');
      if (cityEl)    cityEl.textContent    = [city, state, zip].filter(Boolean).join(', ');
      if (countryEl) countryEl.textContent = '';

      // Mirror to billing preview
      const billName = document.getElementById('chk-bill-name-preview');
      const billAddr = document.getElementById('chk-bill-addr-preview');
      if (billName) billName.textContent = name;
      if (billAddr) billAddr.innerHTML = addr1 + (addr2 ? '<br>' + addr2 : '') + '<br>' + [city, state, zip].filter(Boolean).join(', ');
    }
  };


  // Cart Handlers
  document.getElementById('catalog-cart-btn')?.addEventListener('click', () => {
    window.goToCart();
  });

  document.getElementById('cart-go-checkout-btn')?.addEventListener('click', () => {
    if (shoppingCart.length === 0) return;
    showCatalogPage('checkout-page-layout');
    window.chkGoToStep(1);

    // ── Populate Order Summary ─────────────────────────────────────────────
    let pretax = 0;
    shoppingCart.forEach(i => pretax += (i.price||0)*i.quantity);
    const fmt = v => '$' + v.toLocaleString(undefined, {minimumFractionDigits:2, maximumFractionDigits:2});
    const gst = pretax * 0.1;

    const itemLabel = document.getElementById('chk-summary-item-label');
    if (itemLabel) itemLabel.textContent = shoppingCart.length + ' item' + (shoppingCart.length > 1 ? 's' : '');

    const itemsEl = document.getElementById('chk-summary-items');
    const gstEl   = document.getElementById('chk-summary-gst');
    const totalEl = document.getElementById('chk-summary-total');
    if (itemsEl) itemsEl.textContent = fmt(pretax);
    if (gstEl)   gstEl.textContent   = fmt(gst);
    if (totalEl) totalEl.textContent  = fmt(pretax + gst);

    // ── Populate Product Count heading ─────────────────────────────────────
    const countEl = document.getElementById('chk-product-count');
    if (countEl) countEl.textContent = shoppingCart.length + ' item' + (shoppingCart.length > 1 ? 's' : '');

    // ── Populate Product List rows ─────────────────────────────────────────
    const listEl = document.getElementById('chk-product-list');
    if (listEl) {
      listEl.innerHTML = shoppingCart.map(item => `
        <div style="display:flex; align-items:center; gap:16px; padding:16px; background:#f9f9f9; border-radius:4px; border:1px solid #e8e8e8;">
          <img src="${item.image_url || '/placeholder.png'}" alt="${item.mpn || ''}" onerror="this.src='https://via.placeholder.com/64x64.png?text=No+Image'" style="width:64px; height:64px; object-fit:contain; border-radius:4px; background:#fff; border:1px solid #eee; flex-shrink:0;">
          <div style="flex:1; min-width:0;">
            <div style="display:inline-flex; align-items:center; gap:6px; margin-bottom:6px;">
              <span style="background:#e8f5e9; color:#2e7d32; font-size:10px; font-weight:700; padding:2px 8px; border-radius:20px; white-space:nowrap;">● In Stock</span>
            </div>
            <div style="font-size:14px; font-weight:600; color:#111; margin-bottom:4px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${item.name}</div>
            <div style="font-size:12px; color:#666;">MPN: ${item.mpn || '—'}</div>
          </div>
          <div style="text-align:right; flex-shrink:0;">
            <div style="font-size:15px; font-weight:700; color:#111;">${fmt(item.price||0)}</div>
            <div style="font-size:11px; color:#888; margin-bottom:4px;">each</div>
            <div style="font-size:20px; font-weight:700; color:#333;">${item.quantity}</div>
            <div style="font-size:11px; color:#888;">Qty</div>
          </div>
        </div>
      `).join('');
    }

    // ── Wire colleague email toggle ────────────────────────────────────────
    const notifyChk = document.getElementById('chk-notify-colleague');
    const colleagueEmail = document.getElementById('chk-colleague-email');
    if (notifyChk && colleagueEmail) {
      notifyChk.addEventListener('change', () => {
        colleagueEmail.style.display = notifyChk.checked ? 'block' : 'none';
      });
    }
  });

  document.getElementById('final-place-order-btn')?.addEventListener('click', checkoutCart);
  
  document.getElementById('chk-address-search')?.addEventListener('input', (e) => {
    if (e.target.value.toLowerCase().includes('123') || e.target.value.toLowerCase().includes('atlas')) {
       document.getElementById('chk-name').value = 'Procurement Dept.';
       document.getElementById('chk-address1').value = '123 Innovation Drive';
       document.getElementById('chk-address2').value = 'Suite 400';
       document.getElementById('chk-city').value = 'San Jose';
       document.getElementById('chk-state').value = 'CA';
       document.getElementById('chk-zip').value = '95134';
       e.target.style.borderColor = '#10b981';
       e.target.style.backgroundColor = '#f4fcf7';
    }
  });

  document.getElementById('thank-you-return-btn')?.addEventListener('click', () => {
    document.getElementById('thank-you-layout')?.classList.add('hidden');
    document.getElementById('catalog-layout')?.classList.remove('hidden');
  });

  // Search
  const searchInput = document.getElementById('catalog-search');
  const searchBtn = document.getElementById('catalog-search-btn');

  searchInput?.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      currentPage = 1;
      applyFiltersAndRender();
    }
  });
  searchBtn?.addEventListener('click', () => {
    currentPage = 1;
    applyFiltersAndRender();
  });

  // Handle PDP (Product Detail Page) Clicks
  document.getElementById('catalog-table-body')?.addEventListener('click', (e) => {
    const link = e.target.closest('.dk-part-link');
    if (link) {
      e.preventDefault();
      const id = link.dataset.productId;
      openPDP(id);
    }
  });

  // Handle PDP breadcrumb back actions
  document.getElementById('pdp-breadcrumb')?.addEventListener('click', (e) => {
    if (e.target.closest('a[data-action="reset"]') || e.target.closest('#pdp-cat-link')) {
      e.preventDefault();
      closePDP();
    }
  });

  // Apply All button
  document.getElementById('catalog-apply-filters')?.addEventListener('click', () => {
    currentPage = 1;
    applyFiltersAndRender();
  });

  // Sort select
  document.getElementById('catalog-sort-select')?.addEventListener('change', (e) => {
    const val = e.target.value;
    switch (val) {
      case 'mpn-asc': sortField = 'mpn'; sortDirection = 'asc'; break;
      case 'mpn-desc': sortField = 'mpn'; sortDirection = 'desc'; break;
      case 'price-asc': sortField = 'price'; sortDirection = 'asc'; break;
      case 'price-desc': sortField = 'price'; sortDirection = 'desc'; break;
      case 'stock-desc': sortField = 'stock'; sortDirection = 'desc'; break;
      default: sortField = null; sortDirection = null;
    }
    currentPage = 1;
    applySorting();
    renderPage();
  });

  // Column header sort clicks
  document.getElementById('catalog-table-head')?.addEventListener('click', (e) => {
    const th = e.target.closest('th[data-sort]');
    if (!th) return;

    const field = th.dataset.sort;

    if (sortField === field) {
      sortDirection = sortDirection === 'asc' ? 'desc' : 'asc';
    } else {
      sortField = field;
      sortDirection = 'asc';
    }

    // Update visual indicators
    document.querySelectorAll('.dk-sort-arrows .sort-up, .dk-sort-arrows .sort-down')
      .forEach(el => el.classList.remove('active'));

    const arrows = th.querySelector('.dk-sort-arrows');
    if (arrows) {
      if (sortDirection === 'asc') {
        arrows.querySelector('.sort-up')?.classList.add('active');
      } else {
        arrows.querySelector('.sort-down')?.classList.add('active');
      }
    }

    currentPage = 1;
    applySorting();
    renderPage();
  });

  // Select all checkbox
  document.getElementById('catalog-select-all')?.addEventListener('change', (e) => {
    const checked = e.target.checked;
    document.querySelectorAll('#catalog-table-body input[type="checkbox"]').forEach(cb => {
      cb.checked = checked;
    });
  });

  // Download table as CSV
  document.getElementById('catalog-download-btn')?.addEventListener('click', () => {
    downloadTableCSV();
  });

  // Filter toggle buttons
  document.getElementById('dk-filter-stacked')?.addEventListener('click', () => {
    document.getElementById('dk-filter-stacked').classList.add('active');
    document.getElementById('dk-filter-sorting')?.classList.remove('active');
    document.getElementById('catalog-filters-section').style.display = '';
  });

  document.getElementById('dk-filter-sorting')?.addEventListener('click', () => {
    document.getElementById('dk-filter-sorting').classList.add('active');
    document.getElementById('dk-filter-stacked')?.classList.remove('active');
    document.getElementById('catalog-filters-section').style.display = 'none';
  });
}

// ═══════════════════════════════════════════════════════════════
// CSV DOWNLOAD
// ═══════════════════════════════════════════════════════════════

function downloadTableCSV() {
  if (filteredProducts.length === 0) return;

  const headers = ['MPN', 'Name', 'Supplier', 'Price', 'MOQ', 'Status', ...specColumns];
  const rows = filteredProducts.map(p => {
    const base = [
      p.mpn || '',
      p.name || '',
      p.suppliers?.name || '',
      p.base_price || '',
      p.moq || '',
      'Active'
    ];
    const specVals = specColumns.map(col => p.specs?.[col] ?? '');
    return [...base, ...specVals];
  });

  let csv = headers.join(',') + '\n';
  rows.forEach(row => {
    csv += row.map(v => `"${String(v).replace(/"/g, '""')}"`).join(',') + '\n';
  });

  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `catalog-export-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

// ═══════════════════════════════════════════════════════════════
// PRODUCT DETAIL PAGE (PDP) LOGIC
// ═══════════════════════════════════════════════════════════════

function openPDP(productId) {
  const p = allProducts.find(x => String(x.id) === String(productId));
  if (!p) return;

  // UI State toggles
  document.getElementById('catalog-layout').style.display = 'none';
  const pdp = document.getElementById('catalog-pdp');
  pdp.classList.remove('hidden');
  pdp.style.display = 'block';

  // Populate Breadcrumb
  const catName = activeCategoryPath.length ? activeCategoryPath[activeCategoryPath.length-1].name : 'Category';
  document.getElementById('pdp-cat-link').textContent = catName;
  document.getElementById('pdp-current-mpn').textContent = p.mpn;

  // Header Details
  document.getElementById('pdp-mpn').textContent = p.name || p.description || p.mpn;
  document.getElementById('pdp-desc').textContent = p.description || '';
  const mfgName = p.suppliers?.name || 'Unknown Manufacturer';
  document.getElementById('pdp-supplier').textContent = mfgName;

  // Media - initialise carousel
  const mediaItems = [];
  const imgUrl = p.image_url || p.specs?.image_url;
  if (imgUrl) mediaItems.push({ src: imgUrl, thumb: imgUrl });
  
  // Additional images stored as JSON array in p.images or p.specs.images field
  const moreImages = p.images || p.specs?.images;
  if (Array.isArray(moreImages)) {
    moreImages.forEach(u => {
      // Prevent duplicate of main image
      if (u !== imgUrl) mediaItems.push({ src: u, thumb: u });
    });
  }
  
  if (mediaItems.length === 0) mediaItems.push({ src: '/placeholder.png' });
  if (typeof window.pdpInitCarousel === 'function') window.pdpInitCarousel(mediaItems);
  else { const imgEL = document.getElementById('pdp-image'); if(imgEL) imgEL.src = mediaItems[0].src; }

  // Middle Component Properties table
  document.getElementById('pdp-internal-sku').textContent = String(p.id).substring(0,10).toUpperCase() + '-ND';
  const mfgLink = document.getElementById('pdp-mfg-link');
  if(mfgLink) { mfgLink.textContent = mfgName; mfgLink.href = '#'; }
  document.getElementById('pdp-mfg-mpn').textContent = p.mpn;
  
  const dsCell = document.getElementById('pdp-pdf-cell');
  if (dsCell) dsCell.innerHTML = `<span style="color:#999;font-style:italic;">No datasheet available</span>`;

  // Description and Specs
  const richDesc = document.getElementById('pdp-rich-desc');
  if(richDesc) richDesc.innerHTML = p.rich_description || p.description || 'No overview available.';
  
  // Specifications Build (2 Column)
  const col1 = document.getElementById('pdp-specs-col1');
  const col2 = document.getElementById('pdp-specs-col2');
  if (col1 && col2) {
    let s1 = '', s2 = '';
    const ignoreKeys = ['price_1', 'price_10', 'price_100', 'price_1000', 'lead_time', 'price', 'pricing_tiers', 'features'];
    
    // Add Base Specs
    const specsArray = [];
    specsArray.push({k: 'Manufacturer', v: mfgName});
    specsArray.push({k: 'Product Range', v: 'Standard Series'});
    specsArray.push({k: 'Part Status', v: 'Active'});
    
    // Dynamic JSONB specs
    if (p.specs && typeof p.specs === 'object' && !Array.isArray(p.specs)) {
      Object.keys(p.specs).forEach(k => {
        if (!ignoreKeys.includes(k) && p.specs[k] !== null && p.specs[k] !== '') {
          const capKey = k.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
          specsArray.push({k: capKey, v: p.specs[k]});
        }
      });
    }
    
    // distribute evenly
    const half = Math.ceil(specsArray.length / 2);
    specsArray.forEach((s, idx) => {
        const row = `<tr style="border-bottom:1px solid #f0f0f0;"><td style="padding:8px; color:#666; width:40%;">${s.k}</td><td style="padding:8px;">${s.v}</td></tr>`;
        if(idx < half) s1 += row; else s2 += row;
    });
    col1.innerHTML = s1;
    col2.innerHTML = s2;
  }

  // Buy Box Data
  const stockQty = p.stock_qty || Math.floor(Math.random() * 50000);
  document.getElementById('pdp-stock-val').textContent = stockQty.toLocaleString();
  document.getElementById('pdp-lead-time').innerHTML = `Delivery in <b>${p.specs?.lead_time || '3-5'} Days</b> <span style="font-weight:normal; font-size:12px; color:#666;">(Factory stock)</span>`;

  const moqVal = p.moq || 1;
  document.getElementById('pdp-moq').innerHTML = "Minimum: <strong>" + moqVal + "</strong>";
  document.getElementById('pdp-multiples').innerHTML = "Multiple: <strong>" + moqVal + "</strong>";
  const qtyInput = document.getElementById('pdp-qty-input');
  if(qtyInput) {
    qtyInput.value = moqVal;
    qtyInput.min = moqVal;
    qtyInput.step = moqVal;
  }

  // Build Pricing Table
  const pTbody = document.getElementById('pdp-pricing-tbody');
  const hlPrice = document.getElementById('pdp-highlight-price');
  if(pTbody) {
    let ptHtml = '';
    const baseP = p.base_price ? Number(p.base_price) : 0;
    
    if (p.specs && p.specs.pricing_tiers && p.specs.pricing_tiers.length > 0) {
        const tiers = [...p.specs.pricing_tiers].sort((a,b)=>a.quantity - b.quantity);
        tiers.forEach((t, i) => {
           ptHtml += `<tr style="border-bottom:1px solid #f0f0f0; ${i===0?'background:#f4fcf7;':''}"><td style="padding:8px;">${t.quantity}+</td><td style="text-align:right; padding:8px;">$${Number(t.price).toFixed(3)}</td></tr>`;
           if (i === 0 && hlPrice) hlPrice.innerHTML = `$${Number(t.price).toFixed(3)} <span style="font-size:11px; font-weight:normal; color:#666;">(Unit Price)</span>`;
        });
    } else {
        const t1 = p.specs?.price_1 ? Number(p.specs.price_1) : baseP;
        const t10 = p.specs?.price_10 ? Number(p.specs.price_10) : (baseP * 0.95);
        const t100 = p.specs?.price_100 ? Number(p.specs.price_100) : (baseP * 0.90);
        const t1000 = p.specs?.price_1000 ? Number(p.specs.price_1000) : (baseP * 0.85);
    
        if (t1 > 0) {
            ptHtml += `<tr style="background:#f4fcf7; border-bottom:1px solid #f0f0f0;"><td style="padding:8px;">1+</td><td style="text-align:right; padding:8px;">$${t1.toFixed(3)}</td></tr>`;
            if(hlPrice) hlPrice.innerHTML = `$${t1.toFixed(3)} <span style="font-size:11px; font-weight:normal; color:#666;">(Unit Price)</span>`;
        }
        if (t10 > 1 && t10 !== t1) ptHtml += `<tr style="border-bottom:1px solid #f0f0f0;"><td style="padding:8px;">10+</td><td style="text-align:right; padding:8px;">$${t10.toFixed(3)}</td></tr>`;
        if (t100 > 1 && t100 !== t10) ptHtml += `<tr style="border-bottom:1px solid #f0f0f0;"><td style="padding:8px;">100+</td><td style="text-align:right; padding:8px;">$${t100.toFixed(3)}</td></tr>`;
        if (t1000 > 1 && t1000 !== t100) ptHtml += `<tr style="border-bottom:1px solid #f0f0f0;"><td style="padding:8px;">1,000+</td><td style="text-align:right; padding:8px;">$${t1000.toFixed(3)}</td></tr>`;
    }

    if(ptHtml === '') {
      ptHtml = `<tr><td colspan="2" style="text-align:center; padding:16px;">Request Quote for Pricing</td></tr>`;
      if(hlPrice) hlPrice.innerHTML = `Quote Required`;
    }
    pTbody.innerHTML = ptHtml;
  }

  // Bind Add to Basket to create RFQ
  const addBtn = document.getElementById('pdp-add-to-basket');
  if (addBtn) {
    // Clear previous listeners to avoid double submit if opening multiple PDPs
    const newBtn = addBtn.cloneNode(true);
    addBtn.parentNode.replaceChild(newBtn, addBtn);
    newBtn.addEventListener('click', async () => {
      const user = await getCurrentUser();
      if (!user) { alert('You must be logged in to add items to your basket.'); return; }
      
      const qtyInput = document.getElementById('pdp-qty-input');
      const reqQty = parseInt(qtyInput ? qtyInput.value : 1);
      
      newBtn.disabled = true;
      newBtn.innerHTML = 'Adding...';

      let unitPrice = p.base_price ? Number(p.base_price) : 0;
      if (p.specs && p.specs.pricing_tiers && p.specs.pricing_tiers.length > 0) {
          const tiers = [...p.specs.pricing_tiers].sort((a,b)=>b.quantity - a.quantity);
          const matched = tiers.find(t => reqQty >= t.quantity);
          if (matched) unitPrice = Number(matched.price);
      } else {
          if (reqQty >= 1000 && p.specs?.price_1000) unitPrice = Number(p.specs.price_1000);
          else if (reqQty >= 100 && p.specs?.price_100) unitPrice = Number(p.specs.price_100);
          else if (reqQty >= 10 && p.specs?.price_10) unitPrice = Number(p.specs.price_10);
          else if (reqQty >= 1 && p.specs?.price_1) unitPrice = Number(p.specs.price_1);
      }

      const rfqData = {
        type: 'marketplace_order',
        product_id: p.id,
        mpn: p.mpn,
        supplier_id: p.supplier_id || p.suppliers?.id,
        supplier_name: mfgName,
        quantity: reqQty,
        specs_snapshot: p.specs,
        price: unitPrice || 0,
        image_url: p.image_url || p.specs?.image_url
      };

      shoppingCart.push(rfqData);
      localStorage.setItem('marketplace_cart', JSON.stringify(shoppingCart));
      updateCartBadge();

      newBtn.style.background = '#10b981';
      newBtn.innerHTML = '✓ Basket Updated';
      setTimeout(() => {
        newBtn.style.background = '#007185';
        newBtn.innerHTML = 'Add to Basket';
        newBtn.disabled = false;
      }, 3000);
    });
  }
}

// Ensure closePDP runs cleanly
function closePDP() {
  const pdp = document.getElementById('catalog-pdp');
  if (pdp) {
    pdp.classList.add('hidden');
    pdp.style.display = 'none';
  }
  document.getElementById('catalog-layout').style.display = '';
}

// ═══════════════════════════════════════════════════════════════
// CART UI AND CHECKOUT LOGIC
// ═══════════════════════════════════════════════════════════════

// Making these available on window so event listeners can access them easily if needed
window.updateCartBadge = function() {
  const badge = document.getElementById('catalog-cart-count');
  if (badge) {
    badge.textContent = `${shoppingCart.length} item(s)`;
  }
}
const updateCartBadge = window.updateCartBadge;

window.updateCartPageUI = function() {
  const container = document.getElementById('full-cart-items-container');
  if (!container) return;

  if (shoppingCart.length === 0) {
    container.innerHTML = '<div style="padding:40px; text-align:center; color:#555; background:#fafafa; border-radius:8px;">Your eCommerce basket is currently empty.</div>';
    document.getElementById('cart-total-lines').textContent = '0';
    document.getElementById('cart-total-value').textContent = '$0.00';
    document.getElementById('cart-go-checkout-btn').disabled = true;
    return;
  }
  
  document.getElementById('cart-go-checkout-btn').disabled = false;

  let html = '';
  let subtotal = 0;

  shoppingCart.forEach((item, index) => {
    const lineVal = (item.price || 0) * item.quantity;
    subtotal += lineVal;

    html += `
      <div style="display:flex; border-top:1px solid #ddd; padding:24px 0; gap:20px;">
        <div style="width:140px; height:140px; background:#fafafa; display:flex; align-items:center; justify-content:center; border:1px solid #eaeaea; border-radius:4px;">
           <img src="${item.image_url || 'https://via.placeholder.com/120x120.png?text=No+Image'}" onerror="this.src='https://via.placeholder.com/120x120.png?text=No+Image'" style="max-width:100%; max-height:100%; object-fit:contain;">
        </div>
        <div style="flex:1;">
           <div style="display:flex; justify-content:space-between; align-items:flex-start;">
              <div>
                 <h3 style="font-size:18px; margin:0 0 8px 0; color:#0e7490;">${item.mpn || 'Unknown Part'}</h3>
                 <p style="font-size:14px; color:#555; margin:0 0 4px 0;">Supplier: <span style="color:#111;">${item.supplier_name || 'N/A'}</span></p>
                 <p style="font-size:13px; color:#007185; margin:0 0 12px 0;">In stock</p>
              </div>
              <div style="text-align:right;">
                 <strong style="font-size:20px; color:#black;">$${lineVal.toLocaleString(undefined, {minimumFractionDigits:2, maximumFractionDigits:2})}</strong>
              </div>
           </div>
           
           <div style="display:flex; align-items:center; gap:24px; margin-top:24px;">
              <div style="display:flex; align-items:center; background:#f0f2f5; border-radius:100px; padding:4px;">
                 <button onclick="modifyCartQty(${index}, -1)" style="width:28px; height:28px; border-radius:50%; border:none; background:#fff; cursor:pointer; font-weight:700;">-</button>
                 <span style="font-size:14px; font-weight:600; width:48px; text-align:center;">${item.quantity.toLocaleString()}</span>
                 <button onclick="modifyCartQty(${index}, 1)" style="width:28px; height:28px; border-radius:50%; border:none; background:#fff; cursor:pointer; font-weight:700;">+</button>
              </div>
              <div style="border-left:1px solid #ddd; height:24px;"></div>
              <a href="javascript:void(0)" onclick="removeFromCart(${index})" style="color:#007185; font-size:13px; text-decoration:none;">Delete</a>
           </div>
        </div>
      </div>
    `;
  });

  container.innerHTML = html;
  document.getElementById('cart-total-lines').textContent = shoppingCart.length;
  document.getElementById('cart-total-value').textContent = `$${subtotal.toLocaleString(undefined, {minimumFractionDigits:2, maximumFractionDigits:2})}`;
}
const renderCartPageUI = window.updateCartPageUI;
window.renderCartUI = window.updateCartPageUI; // fallback

window.modifyCartQty = function(index, delta) {
  let newQty = shoppingCart[index].quantity + delta;
  if(newQty < 1) newQty = 1;
  shoppingCart[index].quantity = newQty;
  localStorage.setItem('marketplace_cart', JSON.stringify(shoppingCart));
  renderCartPageUI();
}

window.removeFromCart = function(index) {
  shoppingCart.splice(index, 1);
  localStorage.setItem('marketplace_cart', JSON.stringify(shoppingCart));
  updateCartBadge();
  renderCartPageUI();
}

window.checkoutCart = async function() {
  if (shoppingCart.length === 0) return;
  const user = await getCurrentUser();
  if (!user) { alert('You must be logged in to checkout.'); return; }

  // Extract address info
  const shippingInfo = {
    name: document.getElementById('chk-name').value,
    address1: document.getElementById('chk-address1').value,
    address2: document.getElementById('chk-address2').value,
    city: document.getElementById('chk-city').value,
    state: document.getElementById('chk-state').value,
    zip: document.getElementById('chk-zip').value
  };

  if(!shippingInfo.name || !shippingInfo.address1 || !shippingInfo.city || !shippingInfo.state || !shippingInfo.zip) {
    alert("Please complete the required shipping address fields.");
    return;
  }
  
  const chkBtn = document.getElementById('final-place-order-btn');
  chkBtn.disabled = true;
  chkBtn.innerHTML = 'Processing...';

  try {
    const promises = shoppingCart.map(item => {
      // Create a cloned rfq_data payload
      const orderPayload = { ...item };
      orderPayload.shipping_address = shippingInfo;
      orderPayload.billing_same = document.getElementById('chk-billing-same').checked;

      return supabase.from('rfq_history').insert({
         id: window.crypto && window.crypto.randomUUID ? window.crypto.randomUUID() : null,
         user_id: user.id,
         rfq_data: orderPayload,
         status: 'submitted'
      });
    });

    const results = await Promise.all(promises);
    const errors = results.filter(r => r.error).map(r => r.error);
    
    if (errors.length > 0) {
      console.error('Checkout partial or full failure:', errors);
      alert('One or more items failed to submit. Please check your connection and try again.');
      chkBtn.disabled = false;
      chkBtn.innerHTML = 'Place your order';
      return;
    }

    // Success!
    // Capture order data before clearing cart
    const orderedItems  = [...shoppingCart];
    const shippingSnap  = { ...shippingInfo };
    const orderRef      = 'ATL-' + Date.now().toString(36).toUpperCase();
    const pretax        = orderedItems.reduce((s,i) => s+(i.price||0)*i.quantity, 0);
    const gst           = pretax * 0.1;
    const grandTotal    = pretax + gst;
    const fmt           = v => '$' + v.toLocaleString(undefined, {minimumFractionDigits:2, maximumFractionDigits:2});

    shoppingCart = [];
    localStorage.setItem('marketplace_cart', JSON.stringify(shoppingCart));
    updateCartBadge();

    // ── Populate Thank You page ───────────────────────────────────────────
    const setT = (id, v) => { const el = document.getElementById(id); if(el) el.textContent = v; };
    const setH = (id, v) => { const el = document.getElementById(id); if(el) el.innerHTML = v; };

    setT('ty-order-ref', orderRef);
    setT('ty-user-email', user.email || 'your registered email');
    setT('ty-user-name', user.email?.split('@')[0]?.toUpperCase() || '');

    // Totals
    setT('ty-item-count', orderedItems.length.toString());
    setT('ty-item-qty-total', '(' + orderedItems.reduce((s,i)=>s+i.quantity,0) + ')');
    setT('ty-goods-total',  fmt(pretax));
    setT('ty-gst',          fmt(gst));
    setT('ty-grand-total',  fmt(grandTotal));

    // Address
    const addrLines = [
      shippingSnap.name,
      shippingSnap.address1,
      shippingSnap.address2,
      [shippingSnap.city, shippingSnap.state, shippingSnap.zip].filter(Boolean).join(', ')
    ].filter(Boolean).join('<br>');
    setH('ty-delivery-addr', addrLines);
    setH('ty-invoice-addr',  addrLines); // same as delivery (NET30)

    // Recipient (from optional receiver-name field)
    const recipientName = document.getElementById('chk-receiver-name')?.value?.trim() || shippingSnap.name;
    setT('ty-recipient', recipientName);

    // Products count
    setT('ty-products-count', orderedItems.length + ' item' + (orderedItems.length > 1 ? 's' : ''));

    // Product list rows
    const tyList = document.getElementById('ty-product-list');
    if (tyList) {
      tyList.innerHTML = orderedItems.map(item => `
        <div style="display:flex; align-items:center; gap:16px; padding:16px; background:#f9f9f9; border-radius:4px; border:1px solid #e8e8e8;">
          <img src="${item.image_url || '/placeholder.png'}" alt="${item.mpn || ''}" onerror="this.src='https://via.placeholder.com/64x64.png?text=No+Image'" style="width:64px; height:64px; object-fit:contain; background:#fff; border:1px solid #eee; border-radius:4px; flex-shrink:0;">
          <div style="flex:1; min-width:0;">
            <div style="display:inline-flex; align-items:center; gap:6px; margin-bottom:6px;">
              <span style="background:#e8f5e9; color:#2e7d32; font-size:10px; font-weight:700; padding:2px 8px; border-radius:20px;">● In Stock</span>
            </div>
            <div style="font-size:14px; font-weight:600; color:#111; margin-bottom:4px;">${item.name}</div>
            <div style="font-size:12px; color:#888;">RS Stock No. &nbsp;&nbsp;&nbsp; ${item.mpn || '—'}</div>
          </div>
          <div style="text-align:right; flex-shrink:0;">
            <div style="font-size:15px; font-weight:700; color:#111;">${fmt(item.price||0)}</div>
            <div style="font-size:11px; color:#888; margin-bottom:4px;">Each</div>
            <div style="font-size:20px; font-weight:700; color:#333;">${item.quantity}</div>
            <div style="font-size:11px; color:#888;">Qty</div>
          </div>
        </div>
      `).join('');
    }

    // ── Rating widget handler ─────────────────────────────────────────────
    window.tyRate = function(n) {
      document.querySelectorAll('.ty-rate-btn').forEach((btn, i) => {
        btn.style.background = i < n ? '#005f6b' : '#fff';
        btn.style.color      = i < n ? '#fff'    : '#007185';
      });
      const thanks = document.getElementById('ty-rating-thanks');
      if (thanks) { thanks.style.display = 'block'; }
    };

    // UI transition
    chkBtn.innerHTML = 'Success!';
    setTimeout(() => {
      document.getElementById('checkout-page-layout').classList.add('hidden');
      document.getElementById('thank-you-layout').classList.remove('hidden');
      document.getElementById('thank-you-layout').scrollTo({top:0, behavior:'smooth'});
      chkBtn.innerHTML = 'Place order now';
      chkBtn.disabled = false;
    }, 1500);


  } catch (err) {
    console.error('Unhandled checkout error', err);
    alert('An unexpected error occurred during checkout.');
    chkBtn.disabled = false;
    chkBtn.innerHTML = 'Place your order';
  }
}
const checkoutCart = window.checkoutCart;

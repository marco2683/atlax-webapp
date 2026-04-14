/* ═══════════════════════════════════════════════════════════════
   MARKETPLACE CATALOG — DigiKey-Style Parametric Search Engine
   ═══════════════════════════════════════════════════════════════ */

import { supabase } from '../supabase.js';

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
const PAGE_SIZE = 25;

let sortField = null;
let sortDirection = null; // 'asc' | 'desc'

// ── Init ─────────────────────────────────────────────────────
export async function initMarketplaceCatalog() {
  console.log('[Marketplace] Initializing DigiKey-style Storefront...');

  // 1. Fetch all categories
  const { data: catData, error: catErr } = await supabase.from('component_categories').select('*').order('name');
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

    if (hasSubs) {
      html += `<svg class="dk-tree-arrow" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="9 18 15 12 9 6"/></svg>`;
    } else {
      html += `<span style="width:12px; display:inline-block;"></span>`;
    }
    html += `${cat.name}`;
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
  const totalPages = Math.ceil(data.length / PAGE_SIZE);

  if (currentPage > totalPages) currentPage = 1;

  const startIdx = (currentPage - 1) * PAGE_SIZE;
  const endIdx = Math.min(startIdx + PAGE_SIZE, data.length);
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
          ${p.image_url
            ? `<img src="${p.image_url}" alt="${mpn}" loading="lazy">`
            : `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#CCC" stroke-width="1"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="M21 15l-5-5L5 21"/></svg>`
          }
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
  const container = document.getElementById('catalog-pagination');
  if (!container) return;

  if (totalPages <= 1) {
    container.innerHTML = '';
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

  container.innerHTML = html;

  // Wire clicks
  container.querySelectorAll('button[data-page]').forEach(btn => {
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
}

// ═══════════════════════════════════════════════════════════════
// EVENT LISTENERS
// ═══════════════════════════════════════════════════════════════

function wireEventListeners() {
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

import { supabase } from '../supabase.js';

let categories = [];
let categoryParams = [];
let activeCategoryId = null;

let filterState = {}; // Holds parametric filter data
let activeProducts = [];

export async function initMarketplaceCatalog() {
  console.log('[Marketplace] Initializing Storefront...');

  // 1. Fetch Categories
  const { data: catData, error: catErr } = await supabase.from('component_categories').select('*').order('name');
  if (catErr) {
    console.error('Failed fetching marketplace categories:', catErr);
    return;
  }
  categories = catData || [];

  renderTaxonomyTree();
  
  // By default, fetch all products
  await fetchAndRenderProducts();

  // Search Bar trigger
  document.getElementById('catalog-search').addEventListener('input', (e) => {
    fetchAndRenderProducts(e.target.value.trim());
  });
}

function renderTaxonomyTree() {
  const container = document.getElementById('catalog-taxonomy-tree');
  
  const rootCats = categories.filter(c => !c.parent_id);
  
  let html = `<ul style="list-style:none; padding:0; margin:0;">`;
  
  // Recursion for standard depth
  function buildNode(cat, depth) {
    const subs = categories.filter(c => c.parent_id === cat.id);
    const hasSubs = subs.length > 0;
    
    let res = `
      <li style="margin-bottom:4px;">
        <div class="tax-node" data-id="${cat.id}" style="padding:6px 8px; padding-left:${depth * 12}px; cursor:pointer; color:var(--color-steel-300); font-size:13px; border-radius:4px; display:flex; align-items:center; gap:6px; transition:0.2s;">
          ${hasSubs ? `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="9 18 15 12 9 6"></polyline></svg>` : `<span style="width:12px;"></span>`}
          ${cat.name}
        </div>
    `;
    
    if (hasSubs) {
      res += `<ul style="list-style:none; padding:0; margin:0;" class="tax-children hidden">`;
      subs.forEach(s => res += buildNode(s, depth + 1));
      res += `</ul>`;
    }
    
    res += `</li>`;
    return res;
  }

  rootCats.forEach(rc => {
    html += buildNode(rc, 0);
  });
  
  html += `</ul>`;
  container.innerHTML = html;

  // Add interaction
  container.querySelectorAll('.tax-node').forEach(node => {
    node.addEventListener('click', (e) => {
      e.stopPropagation();
      
      // Toggle Expansion
      const children = node.nextElementSibling;
      if (children && children.classList.contains('tax-children')) {
        children.classList.toggle('hidden');
        const svg = node.querySelector('svg');
        if (svg) {
          if (children.classList.contains('hidden')) {
            svg.innerHTML = `<polyline points="9 18 15 12 9 6"></polyline>`;
          } else {
            svg.innerHTML = `<polyline points="6 9 12 15 18 9"></polyline>`;
          }
        }
      }

      // Set Active Category
      container.querySelectorAll('.tax-node').forEach(n => {
        n.style.background = 'transparent'; n.style.color = 'var(--color-steel-300)';
      });
      node.style.background = 'rgba(43,90,255,0.15)';
      node.style.color = 'var(--color-electric)';

      activeCategoryId = node.dataset.id;
      const catName = categories.find(c => c.id === activeCategoryId)?.name || 'Components';
      document.getElementById('catalog-header-title').textContent = catName + ' Database';

      loadParametricFilters(activeCategoryId);
      fetchAndRenderProducts();
    });
  });
}

async function loadParametricFilters(catId) {
  const container = document.getElementById('catalog-filters-container');
  container.innerHTML = `<div style="font-size:12px; color:var(--color-electric);">Loading specs...</div>`;
  filterState = {};

  const { data, error } = await supabase.from('category_parameters').select('*').eq('category_id', catId);
  if (error || !data || data.length === 0) {
    container.innerHTML = `<p style="font-size:12px; color:var(--color-steel-500);">No specific filters exist for this tier.</p>`;
    return;
  }

  categoryParams = data;
  let html = '';

  categoryParams.forEach(p => {
    html += `<div style="margin-bottom:16px;">`;
    html += `<label style="display:block; font-size:11px; font-weight:600; color:var(--text-main); margin-bottom:6px; text-transform:uppercase;">${p.parameter_name} ${p.unit ? `(${p.unit})` : ''}</label>`;
    
    if (p.data_type === 'number') {
      html += `
        <div style="display:flex; gap:8px;">
           <input type="number" data-param-id="${p.id}" data-type="min" placeholder="Min" class="neo-input param-input" style="width:50%; background:rgba(0,0,0,0.2); border:1px solid rgba(255,255,255,0.1); color:white; padding:6px; font-size:12px; border-radius:4px;">
           <input type="number" data-param-id="${p.id}" data-type="max" placeholder="Max" class="neo-input param-input" style="width:50%; background:rgba(0,0,0,0.2); border:1px solid rgba(255,255,255,0.1); color:white; padding:6px; font-size:12px; border-radius:4px;">
        </div>
      `;
    } else if (p.data_type === 'boolean') {
      html += `
        <select data-param-id="${p.id}" class="neo-input param-input" style="width:100%; background:rgba(0,0,0,0.2); border:1px solid rgba(255,255,255,0.1); color:white; padding:6px; font-size:12px; border-radius:4px;">
          <option value="">Any</option>
          <option value="true">Yes</option>
          <option value="false">No</option>
        </select>
      `;
    } else {
      html += `<input type="text" data-param-id="${p.id}" placeholder="Contains..." class="neo-input param-input" style="width:100%; background:rgba(0,0,0,0.2); border:1px solid rgba(255,255,255,0.1); color:white; padding:6px; font-size:12px; border-radius:4px;">`;
    }
    
    html += `</div>`;
  });

  html += `<button id="btn-apply-parametric" class="btn btn-primary" style="width:100%; padding:8px; font-size:12px;">Update Search Query</button>`;
  container.innerHTML = html;

  document.getElementById('btn-apply-parametric').addEventListener('click', () => {
    // Harvest State
    filterState = {};
    document.querySelectorAll('.param-input').forEach(input => {
      const pid = input.dataset.paramId;
      const type = input.dataset.type; // min/max
      const val = input.value;
      if (!val) return;

      const pDef = categoryParams.find(p => p.id === pid);
      if(!pDef) return;

      if (!filterState[pDef.parameter_name]) {
        filterState[pDef.parameter_name] = { type: pDef.data_type, queries: {} };
      }

      if (pDef.data_type === 'number') {
        filterState[pDef.parameter_name].queries[type] = Number(val);
      } else if (pDef.data_type === 'boolean') {
        filterState[pDef.parameter_name].queries['eq'] = val === 'true';
      } else {
        filterState[pDef.parameter_name].queries['ilike'] = val.toLowerCase();
      }
    });

    fetchAndRenderProducts();
  });
}

async function fetchAndRenderProducts(searchQuery = '') {
  document.getElementById('catalog-table-body').innerHTML = `<tr><td colspan="6" style="text-align:center; padding:40px; color:var(--color-electric);">Querying database...</td></tr>`;

  let queryBuilder = supabase.from('products').select('*, suppliers(name)');

  if (activeCategoryId) {
    queryBuilder = queryBuilder.eq('category_id', activeCategoryId);
  }

  if (searchQuery) {
    queryBuilder = queryBuilder.ilike('mpn', `%${searchQuery}%`);
  }

  // Inject parametric JSONB filters
  for (const [key, filterData] of Object.entries(filterState)) {
    if (filterData.type === 'number') {
      if (filterData.queries.min !== undefined) {
         // using the strictly typed shorthand syntax for jsonb in postgrest: column->>key::numeric >= min
         // Supabase js approach:
         // Luckily, supabase allows complex filters if the postgres function is exposed, but inline we can do:
         // Unfortunately supabase-js native methods struggle with casted jsonb gt/lt.
         // A safe fallback is to load them and filter memory-side if we don't have RPCs configured.
         // For production, we'd write an RPC or use pure PostgREST syntax with filter() method.
      }
    }
  }

  const { data, error } = await queryBuilder;
  
  if (error) {
    console.error("Marketplace fetch error:", error);
    document.getElementById('catalog-table-body').innerHTML = `<tr><td colspan="6" style="text-align:center; padding:40px; color:red;">Database Error</td></tr>`;
    return;
  }

  let finalData = data || [];

  // Memory-side secondary filtering for JSONB numbers (since PostgREST casted jsonb comparisons are tricky without RPCs)
  finalData = finalData.filter(item => {
    let keep = true;
    const specs = item.specs || {};
    
    for (const [key, fData] of Object.entries(filterState)) {
      const actualVal = specs[key];
      if (actualVal === undefined) return false;

      if (fData.type === 'number') {
        if (fData.queries.min !== undefined && Number(actualVal) < fData.queries.min) keep = false;
        if (fData.queries.max !== undefined && Number(actualVal) > fData.queries.max) keep = false;
      } else if (fData.type === 'boolean') {
        if (fData.queries.eq !== undefined && Boolean(actualVal) !== fData.queries.eq) keep = false;
      } else {
        if (fData.queries.ilike && !String(actualVal).toLowerCase().includes(fData.queries.ilike)) keep = false;
      }
    }
    return keep;
  });

  renderTableData(finalData);
}

function renderTableData(products) {
  const tbody = document.getElementById('catalog-table-body');
  
  if (products.length === 0) {
    tbody.innerHTML = `<tr><td colspan="6" style="text-align:center; padding:40px; color:var(--color-steel-500);">No components match your rigorous specifications.</td></tr>`;
    return;
  }

  const html = products.map(p => {
    const catName = categories.find(c => c.id === p.category_id)?.name || '—';
    const suppName = p.suppliers?.name || 'Unknown Vendor';
    
    // Flatten specs
    const keys = Object.keys(p.specs || {}).slice(0, 4);
    const specTags = keys.length ? keys.map(k => `<span style="background:rgba(16,185,129,0.1); color:var(--color-emerald); padding:2px 6px; border-radius:4px; font-size:10px; margin-right:4px; border:1px solid rgba(16,185,129,0.2);">${k}: ${p.specs[k]}</span>`).join('') : '<span style="color:#666; font-size:10px;">No public specs</span>';

    return `
      <tr style="border-bottom:1px solid rgba(255,255,255,0.05); transition:background 0.2s; cursor:pointer;" onmouseover="this.style.background='rgba(255,255,255,0.02)'" onmouseout="this.style.background='transparent'">
        <td style="padding:16px 12px; font-weight:600; color:white; font-size:13px; font-family:var(--font-mono);">${p.mpn}</td>
        <td style="padding:16px 12px; color:var(--color-steel-300); font-size:12px;">${catName}</td>
        <td style="padding:16px 12px; color:var(--color-electric); font-size:13px; font-weight:600;">${p.base_price ? '$'+p.base_price.toFixed(2) : 'RFQ'} <span style="color:var(--color-steel-500); font-size:10px;">@ ${p.moq} MOQ</span></td>
        <td style="padding:16px 12px; color:var(--color-steel-400); font-size:12px;">${suppName}</td>
        <td style="padding:16px 12px;">${specTags}</td>
        <td style="padding:16px 12px;">
          <div style="display:flex; gap:8px;">
            <button title="View Datasheet" style="background:transparent; border:none; cursor:pointer; color:var(--color-steel-400);"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"></path><polyline points="14 2 14 8 20 8"></polyline></svg></button>
          </div>
        </td>
      </tr>
    `;
  }).join('');

  tbody.innerHTML = html;
}

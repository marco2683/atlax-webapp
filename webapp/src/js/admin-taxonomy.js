import { supabase } from './supabase.js';

let categories = [];
let parameters = [];
let selectedCategoryId = null;

export async function renderMarketplaceTaxonomy(container) {
  container.innerHTML = `
    <div style="display: flex; height: 100%; min-height: 600px; gap: 20px; font-family: var(--font-primary);">
      
      <!-- Left Pane: Categories -->
      <div style="flex: 1; display: flex; flex-direction: column; gap: 16px; background: var(--bg-panel, rgba(255,255,255,0.02)); border: 1px solid var(--border-color, rgba(255,255,255,0.05)); border-radius: 12px; padding: 20px;">
        <div style="display: flex; justify-content: space-between; align-items: center;">
          <h3 style="margin: 0; font-size: 18px; color: var(--color-electric); font-weight: 600;">Taxonomy Tree</h3>
          <button class="btn btn-primary" id="btn-add-root-cat" style="padding: 6px 12px; font-size: 12px;">+ Root Category</button>
        </div>
        <div id="taxonomy-tree-container" style="flex: 1; overflow-y: auto; padding-right: 8px;">
          <div style="color: var(--color-steel-400); text-align: center; padding: 20px;">Loading categories...</div>
        </div>
      </div>

      <!-- Right Pane: Parameters -->
      <div style="flex: 1.5; display: flex; flex-direction: column; gap: 16px; background: var(--bg-panel, rgba(255,255,255,0.02)); border: 1px solid var(--border-color, rgba(255,255,255,0.05)); border-radius: 12px; padding: 20px;">
        
        <div style="display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 1px solid var(--border-color, rgba(255,255,255,0.05)); padding-bottom: 16px;">
          <div>
            <h3 style="margin: 0 0 4px 0; font-size: 22px; font-weight: 700; color: var(--text-main, #fff);" id="param-pane-title">No Category Selected</h3>
            <p style="margin: 0; font-size: 12px; color: var(--color-steel-400);" id="param-pane-subtitle">Select a category from the tree to define its custom JSONB parameters.</p>
          </div>
          <div style="display: flex; gap: 8px;">
            <button class="btn btn-secondary" id="btn-add-subcat" style="padding: 8px 16px; font-size: 13px; display: none;">+ Add Sub-Category</button>
            <button class="btn btn-primary" id="btn-add-param" style="padding: 8px 16px; font-size: 13px; display: none;">+ Add Parameter</button>
            <button class="btn btn-secondary" id="btn-delete-cat" style="padding: 8px 16px; font-size: 13px; display: none; color: #ef4444; border-color: rgba(239,68,68,0.2);">Delete Category</button>
          </div>
        </div>
        
        <div id="param-list-container" style="flex: 1; overflow-y: auto;">
          <div style="color: var(--color-steel-400); text-align: center; padding: 40px;">Select a category to view or edit its parameters.</div>
        </div>

      </div>
    </div>
  `;

  await loadTaxonomyData();
  renderTree();
  bindGlobalEvents();
}

async function loadTaxonomyData() {
  try {
    const [catRes, paramRes] = await Promise.all([
      supabase.from('component_categories').select('*').order('name'),
      supabase.from('category_parameters').select('*').order('parameter_name')
    ]);
    
    if (catRes.error) throw catRes.error;
    if (paramRes.error) throw paramRes.error;

    categories = catRes.data || [];
    parameters = paramRes.data || [];
  } catch (err) {
    console.error("Error loading taxonomy", err);
    alert("Failed to load taxonomy data. Check console.");
  }
}

function renderTree() {
  const container = document.getElementById('taxonomy-tree-container');
  if (!container) return;

  if (categories.length === 0) {
    container.innerHTML = `<div style="color: var(--color-steel-400); text-align: center; padding: 20px;">No categories exist yet.</div>`;
    return;
  }

  // Build hierarchy
  const rootNodes = categories.filter(c => !c.parent_id);
  
  function buildHtml(nodes, level = 0) {
    if (!nodes || nodes.length === 0) return '';
    let html = `<ul style="list-style: none; padding-left: ${level === 0 ? '0' : '20px'}; margin: 0; margin-top: ${level === 0 ? '0' : '8px'};">`;
    
    nodes.forEach(node => {
      const children = categories.filter(c => c.parent_id === node.id);
      const isSelected = selectedCategoryId === node.id;
      
      html += `
        <li style="margin-bottom: 8px;">
          <div class="tax-node ${isSelected ? 'active' : ''}" data-id="${node.id}" style="
            display: flex; align-items: center; padding: 8px 12px; border-radius: 6px; cursor: pointer;
            background: ${isSelected ? 'rgba(43,90,255,0.1)' : 'transparent'};
            border: 1px solid ${isSelected ? 'var(--color-electric)' : 'transparent'};
            color: ${isSelected ? 'var(--color-electric)' : 'var(--text-main, #fff)'};
            transition: all 0.2s;
          "
          onmouseover="if(!${isSelected}) { this.style.background='rgba(255,255,255,0.05)' }"
          onmouseout="if(!${isSelected}) { this.style.background='transparent' }"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="margin-right: 8px; flex-shrink: 0; ${children.length > 0 ? '' : 'opacity: 0.3;'}">
              ${children.length > 0 
                ? '<polyline points="6 9 12 15 18 9"></polyline>' 
                : '<circle cx="12" cy="12" r="3"></circle>'}
            </svg>
            <span style="font-size: 14px; font-weight: ${level === 0 ? '600' : '400'};">${node.name}</span>
          </div>
          ${buildHtml(children, level + 1)}
        </li>
      `;
    });
    html += '</ul>';
    return html;
  }

  container.innerHTML = buildHtml(rootNodes);

  // Bind clicks
  container.querySelectorAll('.tax-node').forEach(el => {
    el.addEventListener('click', (e) => {
      e.stopPropagation();
      selectedCategoryId = el.dataset.id;
      renderTree();
      renderParametersPane();
    });
  });
}

function renderParametersPane() {
  const title = document.getElementById('param-pane-title');
  const subtitle = document.getElementById('param-pane-subtitle');
  const addSubBtn = document.getElementById('btn-add-subcat');
  const addParamBtn = document.getElementById('btn-add-param');
  const delCatBtn = document.getElementById('btn-delete-cat');
  const container = document.getElementById('param-list-container');

  if (!selectedCategoryId) {
    title.textContent = "No Category Selected";
    subtitle.textContent = "Select a category from the tree to define its custom JSONB parameters.";
    addSubBtn.style.display = 'none';
    addParamBtn.style.display = 'none';
    delCatBtn.style.display = 'none';
    container.innerHTML = `<div style="color: var(--color-steel-400); text-align: center; padding: 40px;">Select a category to view or edit its parameters.</div>`;
    return;
  }

  const selectedCat = categories.find(c => c.id === selectedCategoryId);
  title.textContent = selectedCat.name;
  subtitle.textContent = `Slug: ${selectedCat.slug} | ID: ${selectedCat.id}`;
  
  addSubBtn.style.display = 'inline-block';
  addParamBtn.style.display = 'inline-block';
  delCatBtn.style.display = 'inline-block';

  const catParams = parameters.filter(p => p.category_id === selectedCategoryId);

  if (catParams.length === 0) {
    container.innerHTML = `
      <div style="background: rgba(255,255,255,0.02); border: 1px dashed rgba(255,255,255,0.1); border-radius: 8px; padding: 40px; text-align: center;">
        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="var(--color-steel-400)" stroke-width="1.5" style="margin-bottom: 16px;">
          <circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="16"></line><line x1="8" y1="12" x2="16" y2="12"></line>
        </svg>
        <div style="font-size: 16px; font-weight: 500; color: var(--text-main, #fff); margin-bottom: 8px;">No parameters defined</div>
        <div style="font-size: 13px; color: var(--color-steel-400);">This category currently has no technical specifications.</div>
      </div>
    `;
    return;
  }

  // Render parameter grid
  let html = `
    <table style="width: 100%; border-collapse: collapse; margin-top: 8px;">
      <thead>
        <tr style="border-bottom: 1px solid rgba(255,255,255,0.1); color: var(--color-steel-400); font-size: 12px; text-transform: uppercase;">
          <th style="text-align: left; padding: 12px 8px; font-weight: 600;">Parameter Name</th>
          <th style="text-align: left; padding: 12px 8px; font-weight: 600; width: 120px;">Data Type</th>
          <th style="text-align: left; padding: 12px 8px; font-weight: 600; width: 100px;">Unit</th>
          <th style="text-align: right; padding: 12px 8px; font-weight: 600; width: 80px;">Actions</th>
        </tr>
      </thead>
      <tbody>
  `;

  catParams.forEach(p => {
    html += `
      <tr style="border-bottom: 1px solid rgba(255,255,255,0.05);">
        <td style="padding: 16px 8px; color: var(--text-main, #fff); font-weight: 500; font-size: 14px;">${p.parameter_name}</td>
        <td style="padding: 16px 8px;">
          <span style="background: rgba(255,255,255,0.05); padding: 4px 8px; border-radius: 4px; font-size: 12px; font-family: monospace; color: var(--color-electric);">${p.data_type}</span>
        </td>
        <td style="padding: 16px 8px; color: var(--color-steel-300); font-size: 13px;">${p.unit || '—'}</td>
        <td style="padding: 16px 8px; text-align: right;">
          <button class="btn-del-param" data-id="${p.id}" style="background: transparent; border: none; color: #ef4444; cursor: pointer; padding: 4px;">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
          </button>
        </td>
      </tr>
    `;
  });

  html += `</tbody></table>`;
  container.innerHTML = html;

  container.querySelectorAll('.btn-del-param').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      if(!confirm("Delete this parameter? Existing products won't lose data, but it will vanish from search filters.")) return;
      const pid = e.currentTarget.dataset.id;
      const { error } = await supabase.from('category_parameters').delete().eq('id', pid);
      if (error) { alert("Error deleting: " + error.message); return; }
      await loadTaxonomyData();
      renderParametersPane();
    });
  });
}

function bindGlobalEvents() {
  document.getElementById('btn-add-root-cat')?.addEventListener('click', () => promptAddCategory(null));
  document.getElementById('btn-add-subcat')?.addEventListener('click', () => promptAddCategory(selectedCategoryId));
  
  document.getElementById('btn-delete-cat')?.addEventListener('click', async () => {
    if (!selectedCategoryId) return;
    const cat = categories.find(c => c.id === selectedCategoryId);
    if(!confirm(`Are you sure you want to completely delete "${cat.name}" and ALL its sub-categories AND parameters? This could break existing products.`)) return;
    
    // Deleting root node cascade deletes everything due to ON DELETE CASCADE
    const { error } = await supabase.from('component_categories').delete().eq('id', selectedCategoryId);
    if(error) { alert("Error: " + error.message); return; }
    
    selectedCategoryId = null;
    await loadTaxonomyData();
    renderTree();
    renderParametersPane();
  });

  document.getElementById('btn-add-param')?.addEventListener('click', () => {
    if (!selectedCategoryId) return;
    const name = prompt("Enter Parameter Name (e.g. Max Flow Rate):");
    if(!name) return;
    const type = prompt("Enter Data Type (text, number, boolean):", "text");
    if(!type) return;
    const unit = prompt("Enter Unit (optional, e.g. L/min):", "");

    supabase.from('category_parameters').insert({
      category_id: selectedCategoryId,
      parameter_name: name,
      data_type: type.toLowerCase(),
      unit: unit || null
    }).then(({error}) => {
      if(error) alert(error.message);
      else {
        loadTaxonomyData().then(renderParametersPane);
      }
    });
  });
}

async function promptAddCategory(parentId) {
  const name = prompt("Enter Category Name:");
  if (!name) return;
  const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '');
  
  const { data, error } = await supabase.from('component_categories').insert({
    parent_id: parentId,
    name: name,
    slug: slug + '-' + Math.floor(Math.random()*1000) // Prevent slug collisions easily
  }).select('*');
  
  if (error) {
    alert("Error creating category: " + error.message);
  } else {
    // Select the new newly created one
    if (data && data.length > 0) {
      selectedCategoryId = data[0].id;
    }
    await loadTaxonomyData();
    renderTree();
    renderParametersPane();
  }
}

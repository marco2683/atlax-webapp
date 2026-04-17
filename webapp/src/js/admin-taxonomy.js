import { supabase } from './supabase.js';

let categories = [];
let parameters = [];
let selectedCategoryId = null;
let expandedCategories = new Set();
let hideDisabled = false;
let draggedNodeId = null;

export async function renderMarketplaceTaxonomy(container) {
  container.innerHTML = `
    <div style="display: flex; height: 100%; min-height: 600px; gap: 20px; font-family: var(--font-primary);">
      
      <!-- Left Pane: Categories -->
      <div style="flex: 1; display: flex; flex-direction: column; gap: 16px; background: var(--section-bg); border: 1px solid var(--color-slate-800); border-radius: 12px; padding: 20px;">
        <div style="display: flex; justify-content: space-between; align-items: flex-end;">
          <div>
            <h3 style="margin: 0 0 8px 0; font-size: 18px; color: var(--color-electric); font-weight: 600;">Marketplace Categories</h3>
            <div style="display: flex; gap: 12px; align-items: center;">
              <button class="btn btn-secondary" id="btn-check-all-cats" style="padding: 4px 8px; font-size: 11px;">Enable All</button>
              <label style="font-size: 11px; color: var(--color-steel-300); display: flex; align-items: center; gap: 4px; cursor: pointer;">
                <input type="checkbox" id="cb-hide-disabled" style="accent-color: var(--color-electric);"> Hide Disabled
              </label>
            </div>
          </div>
          <div style="display: flex; gap: 8px;">
            <button class="btn btn-secondary" id="btn-seed-json" style="padding: 6px 12px; font-size: 12px;" title="Seed DB with src/data/oem-taxonomy.json">Seed JSON</button>
            <button class="btn btn-primary" id="btn-add-root-cat" style="padding: 6px 12px; font-size: 12px;">+ Root Category</button>
          </div>
        </div>
        <div id="taxonomy-tree-container" style="flex: 1; overflow-y: auto; padding-right: 8px;">
          <div id="root-dropzone" style="display: none; padding: 12px; border: 2px dashed var(--color-electric); background: rgba(43,90,255,0.1); text-align: center; color: var(--color-electric); border-radius: 8px; margin-bottom: 16px; font-weight: 600;">
            Drop here to move to ROOT level
          </div>
          <div id="taxonomy-tree-inner">
            <div style="color: var(--color-steel-400); text-align: center; padding: 20px;">Loading categories...</div>
          </div>
        </div>
      </div>

      <!-- Right Pane: Parameters -->
      <div style="flex: 1.5; display: flex; flex-direction: column; gap: 16px; background: var(--section-bg); border: 1px solid var(--color-slate-800); border-radius: 12px; padding: 20px;">
        
        <div style="display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 1px solid var(--color-slate-800); padding-bottom: 16px;">
          <div>
            <h3 style="margin: 0 0 4px 0; font-size: 22px; font-weight: 700; color: var(--color-white);" id="param-pane-title">No Category Selected</h3>
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
  const container = document.getElementById('taxonomy-tree-inner');
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
    
    // Inject global node at root level
    if (level === 0) {
      const isSelected = selectedCategoryId === 'global';
      html += `
        <li style="margin-bottom: 8px;">
          <div class="tax-node ${isSelected ? 'active' : ''}" data-id="global" style="
            display: flex; align-items: center; padding: 8px 12px; border-radius: 6px; cursor: pointer;
            background: ${isSelected ? 'rgba(43,90,255,0.1)' : 'transparent'};
            border: 1px solid ${isSelected ? 'var(--color-electric)' : 'transparent'};
            color: ${isSelected ? 'var(--color-electric)' : 'var(--color-white)'};
            transition: all 0.2s; border-bottom: 2px solid rgba(43,90,255,0.3);
          "
          onmouseover="if(!${isSelected}) { this.style.background='var(--color-slate-800)' }"
          onmouseout="if(!${isSelected}) { this.style.background='transparent' }"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="margin-right: 8px; flex-shrink: 0;">
              <circle cx="12" cy="12" r="10"></circle><line x1="2" y1="12" x2="22" y2="12"></line><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"></path>
            </svg>
            <span style="font-size: 14px; font-weight: 600;">Global Parameters</span>
          </div>
        </li>
      `;
    }

    nodes.forEach(node => {
      const isActive = node.is_active !== false; // defaults to true
      if (hideDisabled && !isActive) return;

      const children = categories.filter(c => c.parent_id === node.id);
      const isSelected = selectedCategoryId === node.id;
      const isExpanded = expandedCategories.has(node.id) || isSelected; // auto-expand if selected
      
      html += `
        <li style="margin-bottom: 8px;">
          <div class="tax-node ${isSelected ? 'active' : ''}" data-id="${node.id}" draggable="true" style="
            display: flex; align-items: center; padding: 8px 12px; border-radius: 6px; cursor: move;
            background: ${isSelected ? 'rgba(43,90,255,0.1)' : 'transparent'};
            border: 1px solid ${isSelected ? 'var(--color-electric)' : 'transparent'};
            color: ${isSelected ? 'var(--color-electric)' : 'var(--color-white)'};
            transition: all 0.2s; user-select: none; -webkit-user-select: none; -webkit-user-drag: element;
            ${!isActive ? 'opacity: 0.5;' : ''}
          "
          onmouseover="if(!${isSelected}) { this.style.background='var(--color-slate-800)' }"
          onmouseout="if(!${isSelected}) { this.style.background='transparent' }"
          >
            <span class="tax-toggle" data-toggle-id="${node.id}" style="display:flex; align-items:center; padding: 4px; margin-right: 4px; border-radius:4px; ${children.length > 0 ? 'cursor:pointer;' : 'opacity:0.3;'}" onmouseover="this.style.background='var(--color-slate-700)'" onmouseout="this.style.background='transparent'">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                ${children.length > 0 
                  ? (isExpanded ? '<polyline points="18 15 12 9 6 15"></polyline>' : '<polyline points="6 9 12 15 18 9"></polyline>') 
                  : '<circle cx="12" cy="12" r="3"></circle>'}
              </svg>
            </span>
            <input type="checkbox" class="tax-checkbox" data-id="${node.id}" ${isActive ? 'checked' : ''} title="Enable/Disable Category" style="margin-right: 8px; accent-color: var(--color-electric); cursor: pointer;">
            <span style="font-size: 14px; font-weight: ${level === 0 ? '600' : '400'}; flex: 1;">${node.name} <span style="font-size: 11px; color: var(--color-steel-400); margin-left: 4px; font-weight: normal;">(${children.length} sub)</span></span>
          </div>
          <div style="display: ${isExpanded ? 'block' : 'none'}; border-left: 1px solid var(--color-slate-800); margin-left: 12px;">
            ${buildHtml(children, level + 1)}
          </div>
        </li>
      `;
    });
    html += '</ul>';
    return html;
  }

  container.innerHTML = buildHtml(rootNodes);

  container.querySelectorAll('.tax-node').forEach(el => {
    el.addEventListener('dragstart', (e) => {
      if (el.dataset.id === 'global') {
        e.preventDefault();
        return;
      }
      draggedNodeId = el.dataset.id;
      e.dataTransfer.effectAllowed = 'move';
      e.dataTransfer.setData('text/plain', el.dataset.id);
      el.style.opacity = '0.4';
      document.getElementById('root-dropzone').style.display = 'block';
    });
    
    el.addEventListener('dragend', (e) => {
      el.style.opacity = el.dataset.active !== 'false' ? '1' : '0.5';
      document.getElementById('root-dropzone').style.display = 'none';
      container.querySelectorAll('.tax-node').forEach(n => {
        n.style.border = n.classList.contains('active') ? '1px solid var(--color-electric)' : '1px solid transparent';
      });
      draggedNodeId = null;
    });

    el.addEventListener('dragover', (e) => {
      e.preventDefault();
      if (!draggedNodeId || draggedNodeId === el.dataset.id || el.dataset.id === 'global') return;
      e.dataTransfer.dropEffect = 'move';
      if (!el.classList.contains('active')) {
        el.style.border = '1px solid var(--color-electric)';
      }
    });

    el.addEventListener('dragleave', (e) => {
      if (!draggedNodeId || draggedNodeId === el.dataset.id) return;
      if (!el.classList.contains('active')) {
        el.style.border = '1px solid transparent';
      }
    });

    el.addEventListener('drop', async (e) => {
      e.preventDefault();
      e.stopPropagation();
      const targetId = el.dataset.id;
      if (!draggedNodeId || targetId === 'global' || draggedNodeId === targetId) return;

      // Ensure we aren't dropping into our own children!
      let current = categories.find(c => c.id === targetId);
      while(current) {
        if (current.id === draggedNodeId) {
          alert('Cannot move a category inside its own child.');
          return;
        }
        current = categories.find(c => c.id === current.parent_id);
      }

      await updateCategoryParent(draggedNodeId, targetId);
    });

    el.addEventListener('click', (e) => {
      // Do nothing if clicked the checkbox
      if (e.target.classList.contains('tax-checkbox')) return;
      
      e.stopPropagation();
      const id = el.dataset.id;
      
      const isChevron = e.target.closest('.tax-toggle');
      if (isChevron && id !== 'global') {
        // Toggle chevron expands/collapses without necessarily selecting
        if (expandedCategories.has(id)) expandedCategories.delete(id);
        else expandedCategories.add(id);
        renderTree();
        return;
      }

      // If clicked the node generally, select it. Also expand if not already.
      selectedCategoryId = id;
      if (id !== 'global' && !expandedCategories.has(id)) {
        expandedCategories.add(id);
      }
      renderTree();
      renderParametersPane();
    });
  });

  // Root dropzone events
  const dropzone = document.getElementById('root-dropzone');
  if (dropzone) {
    dropzone.addEventListener('dragover', (e) => { e.preventDefault(); e.dataTransfer.dropEffect = 'move'; dropzone.style.background = 'rgba(43,90,255,0.2)'; });
    dropzone.addEventListener('dragleave', (e) => { dropzone.style.background = 'rgba(43,90,255,0.1)'; });
    dropzone.addEventListener('drop', async (e) => {
      e.preventDefault();
      if (!draggedNodeId) return;
      await updateCategoryParent(draggedNodeId, null);
    });
  }

  // Bind checkboxes
  container.querySelectorAll('.tax-checkbox').forEach(cb => {
    cb.addEventListener('click', async (e) => {
      e.stopPropagation(); // very important
      const id = cb.dataset.id;
      const isActive = cb.checked;
      cb.disabled = true;
      const { error } = await supabase.from('component_categories').update({ is_active: isActive }).eq('id', id);
      cb.disabled = false;
      if (error) {
        alert("Error updating status: " + error.message);
        cb.checked = !isActive;
      } else {
        const cat = categories.find(c => c.id === id);
        if (cat) cat.is_active = isActive;
        renderTree(); // refresh UI style (opacity and hide rules)
      }
    });
  });
}

async function updateCategoryParent(nodeId, newParentId) {
  try {
    const container = document.getElementById('taxonomy-tree-inner');
    container.style.opacity = '0.5';
    container.style.pointerEvents = 'none';
    
    const { error } = await supabase.from('component_categories')
      .update({ parent_id: newParentId })
      .eq('id', nodeId);
      
    if (error) throw error;
    
    // Update local state
    const node = categories.find(c => c.id === nodeId);
    if (node) node.parent_id = newParentId;
    
    // Auto-expand new parent so user can see it
    if (newParentId) expandedCategories.add(newParentId);
    
    renderTree();
  } catch(err) {
    console.error("D&D Error:", err);
    alert("Error updating category parent: " + err.message);
  } finally {
    const container = document.getElementById('taxonomy-tree-inner');
    if (container) {
      container.style.opacity = '1';
      container.style.pointerEvents = 'all';
    }
  }
}

// ── Priority badge helper ────────────────────────────────
function priorityBadge(priority) {
  const colors = {
    required:    { bg: 'rgba(239,68,68,0.12)', border: 'rgba(239,68,68,0.3)', text: '#ef4444' },
    recommended: { bg: 'rgba(245,158,11,0.12)', border: 'rgba(245,158,11,0.3)', text: '#f59e0b' },
    optional:    { bg: 'rgba(100,116,139,0.12)', border: 'rgba(100,116,139,0.3)', text: '#94a3b8' }
  };
  const c = colors[priority] || colors.optional;
  return `<span style="
    background: ${c.bg}; border: 1px solid ${c.border}; color: ${c.text};
    padding: 3px 10px; border-radius: 4px; font-size: 11px; font-weight: 600;
    text-transform: uppercase; letter-spacing: 0.5px;
  ">${priority || 'optional'}</span>`;
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

  if (selectedCategoryId === 'global') {
    title.textContent = "Global Product Fields";
    subtitle.textContent = "These parameters apply to all products across all categories.";
    addSubBtn.style.display = 'none';
    delCatBtn.style.display = 'none';
    addParamBtn.style.display = 'inline-block';
  } else {
    const selectedCat = categories.find(c => c.id === selectedCategoryId);
    if (selectedCat) {
      title.textContent = selectedCat.name;
      subtitle.textContent = `Slug: ${selectedCat.slug} | ID: ${selectedCat.id}`;
    }
    
    addSubBtn.style.display = 'inline-block';
    addParamBtn.style.display = 'inline-block';
    delCatBtn.style.display = 'inline-block';
  }

  const catParams = parameters.filter(p => p.category_id === (selectedCategoryId === 'global' ? null : selectedCategoryId));

  if (catParams.length === 0) {
    container.innerHTML = `
      <div style="background: var(--section-bg); border: 1px dashed var(--color-slate-700); border-radius: 8px; padding: 40px; text-align: center;">
        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="var(--color-steel-400)" stroke-width="1.5" style="margin-bottom: 16px;">
          <circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="16"></line><line x1="8" y1="12" x2="16" y2="12"></line>
        </svg>
        <div style="font-size: 16px; font-weight: 500; color: var(--color-white); margin-bottom: 8px;">No parameters defined</div>
        <div style="font-size: 13px; color: var(--color-steel-400);">This category currently has no technical specifications.</div>
      </div>
    `;
    return;
  }

  // Sort: required first, then recommended, then optional
  const priorityOrder = { required: 0, recommended: 1, optional: 2 };
  const sortedParams = [...catParams].sort((a, b) => {
    return (priorityOrder[a.priority] ?? 2) - (priorityOrder[b.priority] ?? 2);
  });

  // Render parameter grid
  let html = `
    <table style="width: 100%; border-collapse: collapse; margin-top: 8px;">
      <thead>
        <tr style="border-bottom: 1px solid var(--color-slate-700); color: var(--color-steel-400); font-size: 12px; text-transform: uppercase;">
          <th style="text-align: left; padding: 12px 8px; font-weight: 600;">Parameter Name</th>
          <th style="text-align: left; padding: 12px 8px; font-weight: 600; width: 120px;">Data Type</th>
          <th style="text-align: left; padding: 12px 8px; font-weight: 600; width: 100px;">Unit</th>
          <th style="text-align: left; padding: 12px 8px; font-weight: 600; width: 120px;">Filter UI</th>
          <th style="text-align: center; padding: 12px 8px; font-weight: 600; width: 80px;">Req</th>
          <th style="text-align: center; padding: 12px 8px; font-weight: 600; width: 80px;">Facet</th>
          <th style="text-align: right; padding: 12px 8px; font-weight: 600; width: 60px;">Act</th>
        </tr>
      </thead>
      <tbody>
  `;

  catParams.forEach(p => {
    html += `
      <tr style="border-bottom: 1px solid var(--color-slate-800);">
        <td style="padding: 16px 8px; color: var(--color-white); font-weight: 500; font-size: 14px;">${p.parameter_name}<br><small style="color:var(--color-steel-400); font-family:monospace;">${p.parameter_id}</small></td>
        <td style="padding: 16px 8px;">
          <span style="background: var(--color-slate-800); padding: 4px 8px; border-radius: 4px; font-size: 12px; font-family: monospace; color: var(--color-electric);">${p.data_type}</span>
        </td>
        <td style="padding: 16px 8px; color: var(--color-steel-300); font-size: 13px;">${p.unit || '—'}</td>
        <td style="padding: 16px 8px; color: var(--color-steel-300); font-size: 13px;">${p.filter_ui || '—'}</td>
        <td style="padding: 16px 8px; text-align: center;">
          <input type="checkbox" disabled ${p.supplier_required ? 'checked' : ''} style="accent-color: var(--color-electric);">
        </td>
        <td style="padding: 16px 8px; text-align: center;">
          <input type="checkbox" disabled ${p.facetable ? 'checked' : ''} style="accent-color: var(--color-electric);">
        </td>
        <td style="padding: 16px 8px; text-align: right;">
          <button class="btn-del-param" data-id="${p.id}" style="background: transparent; border: none; color: #ef4444; cursor: pointer; padding: 4px;">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
          </button>
        </td>
      </tr>
    `;
  });

  html += `</tbody></table>`;

  html += `
    <div style="display: flex; gap: 16px; margin-top: 16px; padding-top: 16px; border-top: 1px solid var(--color-slate-800); font-size: 12px; color: var(--color-steel-400);">
      <span style="margin-left:auto; font-weight:500;">${catParams.length} total parameters</span>
    </div>
  `;

  container.innerHTML = html;

  // Bind delete buttons
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

  // Bind priority dropdowns
  container.querySelectorAll('.param-priority-select').forEach(sel => {
    sel.addEventListener('change', async (e) => {
      const paramId = e.target.dataset.id;
      const newPriority = e.target.value;
      
      e.target.style.opacity = '0.5';
      const { error } = await supabase.from('category_parameters')
        .update({ priority: newPriority })
        .eq('id', paramId);
      
      if (error) {
        alert("Error updating priority: " + error.message);
      } else {
        // Update local cache
        const p = parameters.find(x => x.id === paramId);
        if (p) p.priority = newPriority;
      }
      e.target.style.opacity = '1';
      // Re-render to re-sort
      renderParametersPane();
    });
  });
}

function bindGlobalEvents() {
  document.getElementById('cb-hide-disabled')?.addEventListener('change', (e) => {
    hideDisabled = e.target.checked;
    renderTree();
  });

  document.getElementById('btn-check-all-cats')?.addEventListener('click', async (e) => {
    if (!confirm("This will enable all currently disabled categories. Warning: this edits the DB for all records. Proceed?")) return;
    e.target.disabled = true;
    e.target.textContent = "Updating...";
    
    // Perform bulk update using rpc or update without returning if possible, 
    // Supabase allows bulk updates if you provide eq/in, or if you omit it updates all (only if safe updates are off, but we can do it via eq is_active false)
    const disabledIds = categories.filter(c => c.is_active === false).map(c => c.id);
    if(disabledIds.length > 0) {
      const { error } = await supabase.from('component_categories').update({ is_active: true }).in('id', disabledIds);
      if(error) alert("Error batch enabling: " + error.message);
      else {
        categories.forEach(c => c.is_active = true);
        renderTree();
      }
    }
    e.target.disabled = false;
    e.target.textContent = "Enable All";
  });

  document.getElementById('btn-add-root-cat')?.addEventListener('click', () => promptAddCategory(null));
  document.getElementById('btn-add-subcat')?.addEventListener('click', () => promptAddCategory(selectedCategoryId));
  
  document.getElementById('btn-seed-json')?.addEventListener('click', async (e) => {
    if(!confirm("This will import the taxonomy from src/data/oem-taxonomy.json. It may take a minute. Ensure your schema is migrated. Proceed?")) return;
    e.target.textContent = "Seeding...";
    e.target.disabled = true;
    try {
      await seedTaxonomyFromJSON();
      alert("Seeding complete! Refreshing tree.");
      await loadTaxonomyData();
      renderTree();
      renderParametersPane();
    } catch(err) {
      console.error(err);
      alert("Seeding failed: " + err.message);
    } finally {
      e.target.textContent = "Seed JSON";
      e.target.disabled = false;
    }
  });

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
    const pid = prompt("Enter Parameter ID (machine readable, e.g. flow_rate):");
    if(!pid) return;
    const name = prompt("Enter Parameter Name (display name, e.g. Flow Rate):", pid);
    if(!name) return;
    const type = prompt("Enter Data Type (text, number, boolean, enum, multienum):", "text");
    if(!type) return;

    supabase.from('category_parameters').insert({
      category_id: selectedCategoryId === 'global' ? null : selectedCategoryId,
      parameter_id: pid,
      parameter_name: name,
      data_type: type.toLowerCase(),
      unit: null,
      filter_ui: 'text_search',
      supplier_required: false,
      facetable: true
    }).then(({error}) => {
      if(error) alert(error.message);
      else {
        loadTaxonomyData().then(renderParametersPane);
      }
    });
  });
}

async function seedTaxonomyFromJSON() {
  const res = await fetch('/src/data/oem-taxonomy.json');
  const schema = await res.json();
  
  // 1. Insert Global Parameters (category_id = null)
  for (const p of schema.global_product_fields) {
    const { error } = await supabase.from('category_parameters').upsert({
      category_id: null,
      parameter_id: p.id,
      parameter_name: p.label,
      data_type: p.data_type,
      unit: p.unit || null,
      filter_ui: p.filter_ui,
      supplier_required: p.supplier_required,
      facetable: p.facetable
    }, { onConflict: 'category_id,parameter_id' });
    if (error && !error.message.includes("violates unique constraint")) console.warn("Global param insert warn:", error);
  }

  // 2. Insert Categories and their parameters
  for (const cat of schema.categories) {
    // Upsert Root Category
    let { data: catNodes, error: catError } = await supabase.from('component_categories')
      .upsert({ slug: cat.id, name: cat.label, parent_id: null }, { onConflict: 'slug' })
      .select('id');
    
    // Fallback if upsert returns empty due to constraint weirdness
    if (!catNodes || catNodes.length === 0) {
      const g = await supabase.from('component_categories').select('id').eq('slug', cat.id);
      catNodes = g.data;
    }
    
    if (catError) throw new Error(`Root Cat Error: ${catError.message}`);
    if (!catNodes || catNodes.length === 0) continue;
    const rootCatId = catNodes[0].id;

    // Insert Common Parameters
    if (cat.common_parameters) {
      for (const p of cat.common_parameters) {
        const { error } = await supabase.from('category_parameters').upsert({
          category_id: rootCatId, parameter_id: p.id, parameter_name: p.label,
          data_type: p.data_type, unit: p.unit || null, filter_ui: p.filter_ui,
          supplier_required: p.supplier_required, facetable: p.facetable
        }, { onConflict: 'category_id,parameter_id' });
        if (error) throw new Error(`Common Param ${p.id} Error: ${error.message}`);
      }
    }

    // Insert Subcategories
    if (cat.subcategories) {
      for (const sub of cat.subcategories) {
        let { data: subNodes, error: subError } = await supabase.from('component_categories')
          .upsert({ slug: sub.id, name: sub.label, parent_id: rootCatId }, { onConflict: 'slug' })
          .select('id');
        
        if (!subNodes || subNodes.length === 0) {
          const g2 = await supabase.from('component_categories').select('id').eq('slug', sub.id);
          subNodes = g2.data;
        }

        if (subError) throw new Error(`Sub Cat Error: ${subError.message}`);
        if (!subNodes || subNodes.length === 0) continue;
        const subCatId = subNodes[0].id;

        // Insert Sub parameters
        if (sub.parameters) {
          for (const p of sub.parameters) {
            const { error: paramErr } = await supabase.from('category_parameters').upsert({
              category_id: subCatId, parameter_id: p.id, parameter_name: p.label,
              data_type: p.data_type, unit: p.unit || null, filter_ui: p.filter_ui,
              supplier_required: p.supplier_required, facetable: p.facetable
            }, { onConflict: 'category_id,parameter_id' });
            if (paramErr) throw new Error(`Sub Param ${p.id} Error: ${paramErr.message}`);
          }
        }
      }
    }
  }
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

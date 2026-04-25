/* ============================================================
   Atlas DT — Workspace Controller
   Manages the dashboard tabs, data rendering, and user actions
   ============================================================ */

import './css/workspace.css';

import { getCurrentUser, logoutUser } from './js/services/auth.js';
import { getMyProfile, updateMyProfile } from './js/services/profile.js';
import {
  getShortlists, deleteShortlist, renameShortlist,
  getRFQs, cancelRFQ, solicitRFQ, updateRFQStatus,
  getFiles, uploadFile, deleteFile, updateFileMeta,
  getProjects, updateProjectStatus, addProject,
  getSandboxItems, addSandboxItem
} from './js/services/workspace.js';

// ── State ────────────────────────────────────────────────
let currentTab = 'shortlists';
let shortlistsCache = [];
let rfqsCache = [];
let filesCache = [];
let profileCache = null;
let fileViewMode = 'grid'; // 'grid' | 'list'
let currentFolder = null;  // null = root, string = folder name

// ── Boot ─────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', async () => {
  // Auth guard
  const user = await getCurrentUser();
  if (!user) {
    window.location.href = '/index.html';
    return;
  }

  profileCache = await getMyProfile();
  initTheme();
  initSidebar();
  switchTab('shortlists');
});

// ── Theme State ──────────────────────────────────────────
function initTheme() {
  const savedTheme = localStorage.getItem('atlas-theme') || 'dark';
  const isLight = savedTheme === 'light';
  document.body.classList.toggle('theme-light', isLight);
  
  const toggleBtn = document.getElementById('ws-theme-toggle');
  if (toggleBtn) {
    toggleBtn.querySelector('.theme-icon-sun').style.display = isLight ? 'none' : 'block';
    toggleBtn.querySelector('.theme-icon-moon').style.display = isLight ? 'block' : 'none';
    
    toggleBtn.addEventListener('click', () => {
      const currentlyLight = document.body.classList.contains('theme-light');
      const newTheme = currentlyLight ? 'dark' : 'light';
      localStorage.setItem('atlas-theme', newTheme);
      document.body.classList.toggle('theme-light', newTheme === 'light');
      toggleBtn.querySelector('.theme-icon-sun').style.display = newTheme === 'light' ? 'none' : 'block';
      toggleBtn.querySelector('.theme-icon-moon').style.display = newTheme === 'light' ? 'block' : 'none';
    });
  }
}

// ── Sidebar Navigation ──────────────────────────────────
function initSidebar() {
  document.querySelectorAll('.ws-sidebar__item').forEach(item => {
    item.addEventListener('click', () => {
      const tab = item.dataset.tab;
      if (tab) switchTab(tab);
    });
  });

  // Sign out
  document.getElementById('ws-signout')?.addEventListener('click', async () => {
    await logoutUser();
    window.location.href = '/index.html';
  });
}

async function switchTab(tab) {
  if (tab === 'settings') {
    window.location.href = '/profile.html?tab=company';
    return;
  }

  currentTab = tab;

  // Update sidebar active state
  document.querySelectorAll('.ws-sidebar__item').forEach(i => {
    i.classList.toggle('ws-sidebar__item--active', i.dataset.tab === tab);
  });

  // Hide all panels, show active
  document.querySelectorAll('.ws-panel').forEach(p => p.classList.remove('ws-panel--active'));
  const panel = document.getElementById(`panel-${tab}`);
  if (panel) panel.classList.add('ws-panel--active');

  // Update header
  const titles = {
    shortlists: ['Saved Shortlists', 'Your curated lists of manufacturing partners'],
    rfqs:       ['RFQ Management', 'Track, manage, and follow up on your requests for quotation'],
    projects:   ['Projects Board', 'Manage product development lifecycles'],
    sandbox:    ['Taxonomy Sandbox', 'Saved technologies and materials'],
    files:      ['File Vault', 'Your CAD drawings, specs, NDAs, and certificates in one place'],
    templates:  ['Document Generator', 'Auto-generating legal and contracting documents'],
    settings:   ['Account Settings', 'Manage your profile and preferences']
  };
  const [title, subtitle] = titles[tab] || ['Workspace', ''];
  document.getElementById('ws-header-title').textContent = title;
  document.getElementById('ws-header-subtitle').textContent = subtitle;


  // Load data for the tab
  switch (tab) {
    case 'shortlists': await loadShortlists(); break;
    case 'rfqs':       await loadRFQs(); break;
    case 'projects':   await loadProjects(); break;
    case 'sandbox':    await loadSandbox(); break;
    case 'files':      await loadFiles(); break;
    case 'templates':  await loadTemplates(); break;
    case 'settings':   await loadSettings(); break;
  }
}

// ── Shortlists Tab ──────────────────────────────────────
async function loadShortlists() {
  const container = document.getElementById('shortlists-grid');
  if (!container) return;

  container.innerHTML = '<div class="ws-empty"><div class="ws-empty__icon">⏳</div><div class="ws-empty__title">Loading...</div></div>';

  shortlistsCache = await getShortlists();

  if (shortlistsCache.length === 0) {
    container.innerHTML = `
      <div class="ws-empty">
        <div class="ws-empty__icon">📋</div>
        <div class="ws-empty__title">No Saved Shortlists</div>
        <div class="ws-empty__desc">Go to the Manufacturing Engine, search for suppliers, and save your shortlist to see it here.</div>
      </div>`;
    return;
  }

  container.innerHTML = shortlistsCache.map(list => {
    const supplierIds = list.supplier_ids || [];
    // Handle both data formats (profile.js stores items, workspace.js stores suppliers_snapshot)
    const suppliers = list.meta?.suppliers_snapshot || list.meta?.items || [];
    const date = new Date(list.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    const supplierNames = suppliers.slice(0, 3).map(s => {
      const name = s.supplier?.name || s.name || 'Unknown';
      return `<span class="ws-card__pill">${name}</span>`;
    }).join('');
    const moreCount = supplierIds.length - 3;

    // Build expanded supplier rows
    const supplierRows = suppliers.map(s => {
      const sup = s.supplier || s;
      return `
        <div class="ws-card__supplier-row">
          <span class="ws-card__supplier-name">${sup.name || 'Unknown'}</span>
          <span class="ws-card__supplier-detail">📍 ${sup.city || sup.country || '—'}</span>
          <span class="ws-card__supplier-detail">${s.techName || (sup.technologies || []).join(', ') || '—'}</span>
          ${sup.factoryScore ? `<span class="ws-card__supplier-score">${sup.factoryScore}</span>` : ''}
        </div>`;
    }).join('');

    return `
      <div class="ws-card" data-id="${list.id}">
        <div class="ws-card__header">
          <div style="flex:1">
            <h4 class="ws-card__title ws-card__title--editable" data-id="${list.id}" title="Click to rename">${list.name}</h4>
            <div class="ws-card__date">${date} · ${supplierIds.length} supplier${supplierIds.length !== 1 ? 's' : ''}</div>
          </div>
          <button class="ws-card__expand-btn" data-action="toggle-expand" data-id="${list.id}" title="Show suppliers">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="6 9 12 15 18 9"/></svg>
          </button>
        </div>
        <div class="ws-card__body">
          <div class="ws-card__supplier-pills">
            ${supplierNames}
            ${moreCount > 0 ? `<span class="ws-card__pill ws-card__pill--more">+${moreCount} more</span>` : ''}
          </div>
        </div>
        <div class="ws-card__detail" id="detail-${list.id}" style="display:none;">
          <div class="ws-card__detail-header">SUPPLIERS IN THIS LIST</div>
          ${supplierRows || '<div class="ws-td-muted" style="font-size:12px; padding:8px 0;">Supplier details not available — re-save to capture data</div>'}
        </div>
        <div class="ws-card__actions">
          <button class="ws-card__btn ws-card__btn--primary" data-action="open-engine" data-id="${list.id}">
            <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M2 12h20"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>
            Open in Engine
          </button>
          <button class="ws-card__btn ws-card__btn--ghost" data-action="export-csv" data-id="${list.id}">
            Export CSV
          </button>
          <button class="ws-card__btn ws-card__btn--ghost" data-action="rename-list" data-id="${list.id}">
            Rename
          </button>
          <button class="ws-card__btn ws-card__btn--danger" data-action="delete-list" data-id="${list.id}">
            Delete
          </button>
        </div>
      </div>`;
  }).join('');

  // Attach handlers
  container.querySelectorAll('[data-action="delete-list"]').forEach(btn => {
    btn.addEventListener('click', async () => {
      const id = btn.dataset.id;
      if (confirm('Delete this shortlist permanently?')) {
        await deleteShortlist(id);
        await loadShortlists();
      }
    });
  });

  container.querySelectorAll('[data-action="open-engine"]').forEach(btn => {
    btn.addEventListener('click', () => {
      const id = btn.dataset.id;
      const list = shortlistsCache.find(l => l.id === id);
      if (list) {
        // Store the full shortlist data so the engine can load it
        const suppliers = list.meta?.suppliers_snapshot || list.meta?.items || [];
        sessionStorage.setItem('prd-load-shortlist', JSON.stringify({
          id: list.id,
          name: list.name,
          items: suppliers
        }));
      }
      window.location.href = `/app.html?loadList=${id}`;
    });
  });

  // Expand/collapse supplier details
  container.querySelectorAll('[data-action="toggle-expand"]').forEach(btn => {
    btn.addEventListener('click', () => {
      const id = btn.dataset.id;
      const detail = document.getElementById(`detail-${id}`);
      if (!detail) return;
      const isVisible = detail.style.display !== 'none';
      detail.style.display = isVisible ? 'none' : 'block';
      btn.classList.toggle('ws-card__expand-btn--open', !isVisible);
    });
  });

  container.querySelectorAll('[data-action="export-csv"]').forEach(btn => {
    btn.addEventListener('click', () => {
      const id = btn.dataset.id;
      const list = shortlistsCache.find(l => l.id === id);
      if (!list) return;
      exportShortlistCSV(list);
    });
  });

  // Rename via button
  container.querySelectorAll('[data-action="rename-list"]').forEach(btn => {
    btn.addEventListener('click', async () => {
      const id = btn.dataset.id;
      const list = shortlistsCache.find(l => l.id === id);
      if (!list) return;
      const newName = prompt('Rename shortlist:', list.name);
      if (!newName || newName.trim() === list.name) return;
      await renameShortlist(id, newName.trim());
      await loadShortlists();
    });
  });

  // Rename via clicking the title
  container.querySelectorAll('.ws-card__title--editable').forEach(titleEl => {
    titleEl.addEventListener('click', async (e) => {
      e.preventDefault();
      const id = titleEl.dataset.id;
      const list = shortlistsCache.find(l => l.id === id);
      if (!list) return;
      const newName = prompt('Rename shortlist:', list.name);
      if (!newName || newName.trim() === list.name) return;
      await renameShortlist(id, newName.trim());
      await loadShortlists();
    });
  });
}

function exportShortlistCSV(list) {
  const suppliers = list.meta?.suppliers_snapshot || [];
  const headers = ['Name', 'City', 'Country', 'Technologies', 'Factory Score'];
  const rows = suppliers.map(s => {
    const sup = s.supplier || s;
    return [
      sup.name || '',
      sup.city || '',
      sup.country || '',
      (sup.technologies || []).join('; '),
      sup.factoryScore || ''
    ].map(v => `"${String(v).replace(/"/g, '""')}"`).join(',');
  });
  const csv = [headers.join(','), ...rows].join('\n');
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${list.name.replace(/[^a-z0-9]/gi, '_')}_suppliers.csv`;
  a.click();
  URL.revokeObjectURL(url);
}


// ── RFQ Tab ─────────────────────────────────────────────
async function loadRFQs() {
  const container = document.getElementById('rfqs-table-body');
  if (!container) return;

  container.innerHTML = '<tr><td colspan="7" class="ws-td-muted" style="text-align:center; padding:40px;">Loading...</td></tr>';

  rfqsCache = await getRFQs();

  if (rfqsCache.length === 0) {
    container.innerHTML = `
      <tr><td colspan="7">
        <div class="ws-empty">
          <div class="ws-empty__icon">📨</div>
          <div class="ws-empty__title">No RFQs Yet</div>
          <div class="ws-empty__desc">When you submit a Project Quote request, it will appear here for tracking.</div>
        </div>
      </td></tr>`;
    return;
  }

  const statusConfig = {
    submitted:    { label: 'Submitted',    cssClass: 'ws-status--submitted' },
    under_review: { label: 'Under Review', cssClass: 'ws-status--under_review' },
    in_progress:  { label: 'In Progress',  cssClass: 'ws-status--in_progress' },
    done:         { label: 'Done',         cssClass: 'ws-status--done' },
    cancelled:    { label: 'Cancelled',    cssClass: 'ws-status--cancelled' }
  };

  const serviceLabels = {
    'mfg-only': 'Manufacturing Only',
    'design-mfg': 'Design + Mfg',
    'prototype': 'Prototyping',
    'full-turnkey': 'Full Turnkey',
    'consult': 'Consultation'
  };

  container.innerHTML = rfqsCache.map(rfq => {
    const data = rfq.rfq_data || {};
    const date = new Date(rfq.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    const projectName = data.project_name || data.supplier_name || 'Unnamed Project';
    
    const typeLabel = data.type === 'instant' ? 'Instant Quote' : 'Project Quote';
    const service = data.type === 'instant' ? 'Instant RFQ' : (serviceLabels[data.service] || data.service || '—');
    const totalEstimate = data.type === 'instant' && data.total_price ? `$${data.total_price.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})}` : '—';
    
    const statusVal = rfq.status || data.status || 'submitted';
    const fileCount = (data.files || []).length;
    const cfg = statusConfig[statusVal] || statusConfig[rfq.status] || { label: statusVal, cssClass: '' };

    return `
      <tr data-rfq-id="${rfq.id}">
        <td>
          <div class="ws-td-primary" style="font-weight: 600;">${projectName}</div>
        </td>
        <td class="ws-td-muted" style="font-size: 12px; font-weight: 600; color: var(--color-electric);">${typeLabel}</td>
        <td class="ws-td-muted" style="font-size: 12px;">${service}</td>
        <td class="ws-td-muted">${date}</td>
        <td class="ws-td-muted" style="font-weight: 600; color: #16a34a;">${totalEstimate}</td>
        <td>
          <span class="ws-status ${cfg.cssClass}">
            <span class="ws-status__dot"></span>
            ${cfg.label}
          </span>
        </td>
        <td class="ws-td-muted" style="font-size: 12px;">${fileCount} file${fileCount !== 1 ? 's' : ''}</td>
      </tr>`;
  }).join('');

  container.querySelectorAll('tr[data-rfq-id]').forEach(row => {
    row.style.cursor = 'pointer';
    row.addEventListener('dblclick', () => {
      const rfqId = row.dataset.rfqId;
      const rfq = rfqsCache.find(r => r.id === rfqId);
      if (rfq) openRFQPreviewModal(rfq);
    });
  });
}

function openRFQPreviewModal(rfq) {
  const data = rfq.rfq_data || {};
  let parts = data.type === 'instant' ? (data.parts || []) : (data.files || []);
  if (parts.length === 0) {
    alert("No files or parts associated with this RFQ.");
    return;
  }
  let currentPartIndex = 0;

  const modalHtml = `
    <div id="rfq-preview-modal" style="position:fixed;inset:0;background:rgba(15,23,42,0.8);backdrop-filter:blur(8px);z-index:9999;display:flex;align-items:center;justify-content:center;">
      <div style="background:#fff;border-radius:16px;width:1100px;max-width:95vw;height:700px;max-height:90vh;display:flex;flex-direction:column;overflow:hidden;box-shadow:0 25px 50px -12px rgba(0,0,0,0.5);">
        
        <!-- Top Summary Bar -->
        <div style="padding: 16px 24px; border-bottom: 1px solid #e2e8f0; display:flex; justify-content:space-between; align-items:center; background:#f8fafc; flex-shrink:0;">
          <div>
            <div style="font-size:12px; color:#3b82f6; font-weight:700; text-transform:uppercase; letter-spacing:0.5px; margin-bottom:4px;">${data.project_name || 'Instant RFQ Project'}</div>
            <div style="display:flex; align-items:center; gap: 12px;">
              <h2 style="margin:0; font-size:20px; color:#0f172a; font-weight:700;">Quote Overview</h2>
              <span style="font-size:11px; font-weight:600; background:#e0e7ff; color:#4338ca; padding:4px 8px; border-radius:4px; text-transform:uppercase;">Status: ${rfq.status || 'Pending'}</span>
            </div>
          </div>
          <div style="display:flex; gap: 24px; align-items:center;">
            <div style="text-align:right;">
              <div style="font-size:11px; color:#64748b; font-weight:600; text-transform:uppercase;">Total Value</div>
              <div style="font-size:16px; color:#0f172a; font-weight:700;">$${data.total_price || '0.00'}</div>
            </div>
            <div style="text-align:right;">
              <div style="font-size:11px; color:#64748b; font-weight:600; text-transform:uppercase;">Total Parts</div>
              <div style="font-size:16px; color:#0f172a; font-weight:700;">${parts.length}</div>
            </div>
            <div style="text-align:right; padding-left:24px; border-left:1px solid #e2e8f0;">
              <div style="font-size:11px; color:#64748b; font-weight:600; text-transform:uppercase;">Assigned Engineer</div>
              <div style="font-size:14px; color:#0f172a; font-weight:600;">${rfq.assigned_to_name || 'Unassigned'}</div>
              <div style="font-size:12px; color:#64748b;">${rfq.assigned_to_email || 'Waiting for assignment'}</div>
            </div>
            <button id="rfq-preview-close" style="background:none; border:none; color:#94a3b8; font-size:28px; cursor:pointer; padding:0 0 0 16px; line-height:1; transition:0.2s;">&times;</button>
          </div>
        </div>

        <!-- Main Content Split -->
        <div style="display:flex; flex:1; overflow:hidden;">
          <!-- Viewer Column -->
          <div style="flex:1; background:#0e1117; position:relative; display:flex; flex-direction:column;">
            <div id="rfq-preview-3d-container" style="flex:1; width:100%;"></div>
            
            <div style="position:absolute; bottom:20px; left:0; right:0; display:flex; justify-content:center; gap:16px; pointer-events:none;">
              <button id="rfq-prev-btn" style="pointer-events:auto; background:rgba(255,255,255,0.1); color:#fff; border:none; border-radius:50%; width:40px; height:40px; cursor:pointer; display:flex; align-items:center; justify-content:center; backdrop-filter:blur(4px); transition:0.2s;">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="15 18 9 12 15 6"></polyline></svg>
              </button>
              <div id="rfq-part-counter" style="color:#fff; display:flex; align-items:center; font-size:14px; font-weight:600;">1 / ${parts.length}</div>
              <button id="rfq-next-btn" style="pointer-events:auto; background:rgba(255,255,255,0.1); color:#fff; border:none; border-radius:50%; width:40px; height:40px; cursor:pointer; display:flex; align-items:center; justify-content:center; backdrop-filter:blur(4px); transition:0.2s;">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="9 18 15 12 9 6"></polyline></svg>
              </button>
            </div>
          </div>
          
          <!-- Info Column -->
          <div style="width:360px; background:#fff; padding:24px; border-left:1px solid #e2e8f0; display:flex; flex-direction:column; overflow-y:auto;">
            <div style="margin-bottom:20px;">
              <div style="font-size:11px; color:#64748b; font-weight:700; text-transform:uppercase; letter-spacing:0.5px; margin-bottom:4px;">Part Details</div>
              <h3 id="rfq-part-name" style="margin:0; font-size:16px; color:#0f172a; font-weight:700; word-break:break-word;"></h3>
            </div>
            
            <div id="rfq-part-info" style="display:flex; flex-direction:column; gap:16px;"></div>
            
            <div style="margin-top:auto; padding-top:24px; border-top:1px solid #e2e8f0;">
               <a id="rfq-download-btn" href="#" target="_blank" style="display:block; width:100%; text-align:center; padding:12px; background:#f1f5f9; color:#0f172a; font-weight:600; font-size:14px; text-decoration:none; border-radius:8px; border:1px solid #e2e8f0; transition:0.2s;">Download Source File</a>
            </div>
          </div>
        </div>
        
      </div>
    </div>
  `;
  document.body.insertAdjacentHTML('beforeend', modalHtml);

  const modal = document.getElementById('rfq-preview-modal');
  const prevBtn = document.getElementById('rfq-prev-btn');
  const nextBtn = document.getElementById('rfq-next-btn');
  const counterEl = document.getElementById('rfq-part-counter');
  const nameEl = document.getElementById('rfq-part-name');
  const infoEl = document.getElementById('rfq-part-info');
  const dlBtn = document.getElementById('rfq-download-btn');
  const container = document.getElementById('rfq-preview-3d-container');

  if (parts.length <= 1) {
    prevBtn.style.display = 'none';
    nextBtn.style.display = 'none';
    counterEl.style.display = 'none';
  }

  const renderCurrentPart = () => {
    const p = parts[currentPartIndex];
    const fileName = p.name || p.file_name || `Part ${currentPartIndex + 1}`;
    counterEl.textContent = `${currentPartIndex + 1} / ${parts.length}`;
    nameEl.textContent = fileName;
    
    // Info Panel
    let infoHtml = '';
    const addRow = (lbl, val) => `<div style="background:#f8fafc; padding:12px 16px; border-radius:8px; border:1px solid #f1f5f9;"><div style="font-size:10px; color:#94a3b8; text-transform:uppercase; letter-spacing:0.5px; font-weight:600; margin-bottom:2px;">${lbl}</div><div style="font-size:14px; color:#0f172a; font-weight:600;">${val}</div></div>`;
    
    if (data.type === 'instant') {
      infoHtml += addRow('Technology', p.process || '—');
      infoHtml += addRow('Material', p.material || '—');
      infoHtml += addRow('Finish', p.finish || '—');
      infoHtml += `<div style="display:grid; grid-template-columns:1fr 1fr; gap:12px;">${addRow('Qty', p.qty || 1)}${addRow('Price', '$' + (p.price||0).toLocaleString(undefined, {minimumFractionDigits:2}))}</div>`;
    } else {
      infoHtml += addRow('Service', data.service || '—');
      infoHtml += addRow('Timeline', data.timeline || '—');
      infoHtml += addRow('Qty Required', data.quantity || '—');
      if (p.size) infoHtml += addRow('File Size', `${(p.size/1024).toFixed(1)} KB`);
    }
    infoEl.innerHTML = infoHtml;
    
    // Download Link
    const path = p.storage_path || p.path;
    const bucket = p.bucket || 'rfq-uploads';
    if (path) {
      dlBtn.href = `${import.meta.env.VITE_SUPABASE_URL || 'https://qvxrwbcmyrugjevgvujb.supabase.co'}/storage/v1/object/public/${bucket}/${path}`;
      dlBtn.download = fileName;
      dlBtn.style.display = 'block';
      
      const fileExt = fileName.split('.').pop()?.toLowerCase() || '';
      render3DPreview({ storage_path: path, file_type: fileExt }, container);
    } else {
      dlBtn.style.display = 'none';
      container.innerHTML = '<div style="display:flex; height:100%; align-items:center; justify-content:center; color:#64748b; flex-direction:column;"><div style="font-size:48px; margin-bottom:16px;">🧊</div><div>3D Preview Unavailable</div><div style="font-size:12px; margin-top:8px;">File not uploaded to storage</div></div>';
    }
  };

  prevBtn.addEventListener('click', () => {
    currentPartIndex = (currentPartIndex - 1 + parts.length) % parts.length;
    renderCurrentPart();
  });
  nextBtn.addEventListener('click', () => {
    currentPartIndex = (currentPartIndex + 1) % parts.length;
    renderCurrentPart();
  });

  document.getElementById('rfq-preview-close').addEventListener('click', () => {
    modal.remove();
  });
  modal.addEventListener('click', (e) => { if (e.target === modal) modal.remove(); });

  renderCurrentPart();
}


// ── Files Tab ───────────────────────────────────────────
let uploadZoneBound = false;
let selectedFiles = new Set();
let virtualFolders = []; // folders created by user that may be empty

function updateSelectionUI() {
  const count = selectedFiles.size;
  const countEl = document.getElementById('files-selection-count');
  const dlBtn = document.getElementById('btn-download-selected');
  const delBtn = document.getElementById('btn-delete-selected');
  if (countEl) { countEl.textContent = `${count} selected`; countEl.style.display = count > 0 ? '' : 'none'; }
  if (dlBtn) dlBtn.style.display = count > 0 ? '' : 'none';
  if (delBtn) delBtn.style.display = count > 0 ? '' : 'none';

  // Update checkbox visuals
  document.querySelectorAll('.ws-file-select').forEach(cb => {
    cb.checked = selectedFiles.has(cb.dataset.fileId);
  });
}

function initUploadZone() {
  if (uploadZoneBound) return;
  uploadZoneBound = true;

  const uploadZone = document.getElementById('upload-zone');
  const fileInput = document.getElementById('file-input');
  if (!uploadZone || !fileInput) return;

  uploadZone.addEventListener('click', () => fileInput.click());
  uploadZone.addEventListener('dragover', (e) => { e.preventDefault(); uploadZone.classList.add('dragging'); });
  uploadZone.addEventListener('dragleave', () => uploadZone.classList.remove('dragging'));
  uploadZone.addEventListener('drop', async (e) => {
    e.preventDefault();
    uploadZone.classList.remove('dragging');
    await handleFileUpload(Array.from(e.dataTransfer.files));
  });

  fileInput.addEventListener('change', async () => {
    await handleFileUpload(Array.from(fileInput.files));
    fileInput.value = '';
  });

  // ── Toolbar: View toggles ──
  document.getElementById('btn-view-grid')?.addEventListener('click', () => {
    fileViewMode = 'grid';
    document.getElementById('btn-view-grid').classList.add('ws-view-toggle--active');
    document.getElementById('btn-view-list').classList.remove('ws-view-toggle--active');
    selectedFiles.clear();
    updateSelectionUI();
    renderFiles();
  });

  document.getElementById('btn-view-list')?.addEventListener('click', () => {
    fileViewMode = 'list';
    document.getElementById('btn-view-list').classList.add('ws-view-toggle--active');
    document.getElementById('btn-view-grid').classList.remove('ws-view-toggle--active');
    selectedFiles.clear();
    updateSelectionUI();
    renderFiles();
  });

  // ── Toolbar: New Folder ──
  const newFolderBtn = document.getElementById('btn-new-folder');
  newFolderBtn?.addEventListener('click', (e) => {
    e.preventDefault();
    e.stopPropagation();
    // If input already exists, focus it
    if (document.getElementById('new-folder-input')) {
      document.getElementById('new-folder-input').focus();
      return;
    }
    // Create inline input next to the button
    const input = document.createElement('input');
    input.type = 'text';
    input.id = 'new-folder-input';
    input.className = 'ws-folder-inline-input';
    input.placeholder = 'Folder name…';
    input.setAttribute('autocomplete', 'off');
    newFolderBtn.parentNode.insertBefore(input, newFolderBtn.nextSibling);
    input.focus();

    const createFolder = () => {
      const folderName = input.value.trim();
      input.remove();
      if (!folderName) return;
      if (!virtualFolders.includes(folderName)) {
        virtualFolders.push(folderName);
      }
      currentFolder = null;
      renderFiles();
    };

    input.addEventListener('keydown', (ev) => {
      if (ev.key === 'Enter') { ev.preventDefault(); createFolder(); }
      if (ev.key === 'Escape') { input.remove(); }
    });
    input.addEventListener('blur', createFolder);
  });

  // ── Toolbar: Select All ──
  document.getElementById('btn-select-all')?.addEventListener('click', () => {
    const visibleIds = [...document.querySelectorAll('.ws-file-select')].map(cb => cb.dataset.fileId);
    if (visibleIds.every(id => selectedFiles.has(id))) {
      selectedFiles.clear(); // deselect all
    } else {
      visibleIds.forEach(id => selectedFiles.add(id));
    }
    updateSelectionUI();
  });

  // ── Toolbar: Download Selected ──
  document.getElementById('btn-download-selected')?.addEventListener('click', () => {
    selectedFiles.forEach(id => {
      const file = filesCache.find(f => f.id === id);
      if (file?.storage_path) {
        // Build download URL from Supabase storage
        const url = `${import.meta.env.VITE_SUPABASE_URL}/storage/v1/object/public/user-files/${file.storage_path}`;
        const a = document.createElement('a');
        a.href = url; a.download = file.file_name; a.target = '_blank';
        document.body.appendChild(a); a.click(); a.remove();
      }
    });
  });

  // ── Toolbar: Delete Selected ──
  document.getElementById('btn-delete-selected')?.addEventListener('click', async () => {
    if (selectedFiles.size === 0) return;
    if (!confirm(`Delete ${selectedFiles.size} file${selectedFiles.size > 1 ? 's' : ''} permanently?`)) return;
    for (const id of selectedFiles) {
      await deleteFile(id);
    }
    selectedFiles.clear();
    updateSelectionUI();
    await renderFiles();
  });
}

async function handleFileUpload(files) {
  if (files.length === 0) return;
  const uploadZone = document.getElementById('upload-zone');
  const originalHTML = uploadZone?.innerHTML;

  // Show uploading state
  if (uploadZone) {
    uploadZone.innerHTML = `
      <div class="ws-upload-zone__icon">⏳</div>
      <div class="ws-upload-zone__text" style="color: #60a5fa;">
        <strong>Uploading ${files.length} file${files.length > 1 ? 's' : ''}...</strong>
      </div>`;
  }

  let successCount = 0;
  let lastError = null;
  for (const file of files) {
    const ext = file.name.split('.').pop().toLowerCase();
    const category = categorizeFile(ext);
    const { error } = await uploadFile(file, category);
    if (!error) {
      successCount++;
    } else {
      lastError = error;
      console.error(`[FileVault] Upload failed for ${file.name}:`, error.message || error);
    }
  }

  // Show result
  if (uploadZone) {
    if (successCount > 0) {
      uploadZone.innerHTML = `
        <div class="ws-upload-zone__icon">✅</div>
        <div class="ws-upload-zone__text" style="color: #34d399;">
          <strong>${successCount} file${successCount > 1 ? 's' : ''} uploaded successfully</strong>
        </div>`;
      setTimeout(() => { if (uploadZone) uploadZone.innerHTML = originalHTML; }, 2500);
    } else {
      const errMsg = lastError?.message || 'Storage upload failed';
      uploadZone.innerHTML = `
        <div class="ws-upload-zone__icon">❌</div>
        <div class="ws-upload-zone__text" style="color: #f87171;">
          <strong>Upload failed</strong>
          <div style="font-size: 11px; margin-top: 4px; opacity: 0.7;">${errMsg}</div>
        </div>`;
      setTimeout(() => { if (uploadZone) uploadZone.innerHTML = originalHTML; }, 5000);
    }
  }

  // Refresh file list
  await renderFiles();
}

async function loadFiles() {
  initUploadZone();
  await renderFiles();
}

async function renderFiles() {
  const grid = document.getElementById('files-grid');
  if (!grid) return;

  grid.innerHTML = '<div class="ws-td-muted" style="grid-column:1/-1; text-align:center; padding:40px;">Loading files...</div>';

  filesCache = await getFiles();

  if (filesCache.length === 0) {
    grid.className = 'ws-file-grid';
    grid.innerHTML = `
      <div class="ws-empty" style="grid-column:1/-1;">
        <div class="ws-empty__icon">📁</div>
        <div class="ws-empty__title">No Files Yet</div>
        <div class="ws-empty__desc">Drag and drop your CAD files, specs, or documents here. STEP, STL, PDF, and more are supported.</div>
      </div>`;
    return;
  }

  if (fileViewMode === 'grid') {
    renderFilesGrid(grid);
  } else {
    renderFilesList(grid);
  }
}

// ── Grid View ──────────────────────────────────────
function renderFilesGrid(container) {
  container.className = 'ws-file-grid';
  
  // Filter by current folder
  const filtered = currentFolder
    ? filesCache.filter(f => (f.meta?.folder || null) === currentFolder)
    : filesCache;

  // Breadcrumb
  const breadcrumb = currentFolder
    ? `<div class="ws-breadcrumb" style="grid-column:1/-1;">
         <span class="ws-breadcrumb__link" data-goto-root>📁 All Files</span>
         <span class="ws-breadcrumb__sep">›</span>
         <span class="ws-breadcrumb__current">${currentFolder}</span>
       </div>`
    : '';

  // Get unique folders for folder cards (only at root level) — merge file-derived + virtual
  const fileFolders = filesCache.map(f => f.meta?.folder).filter(Boolean);
  const folders = [...new Set([...fileFolders, ...virtualFolders])];
  const folderCards = (!currentFolder && folders.length > 0) ? folders.map(fname => {
    const count = filesCache.filter(f => f.meta?.folder === fname).length;
    return `<div class="ws-file-card ws-file-card--folder" data-folder-name="${fname}">
              <div class="ws-file-card__icon ws-file-card__icon--folder">📂</div>
              <div class="ws-file-card__name" title="${fname}">${fname}</div>
              <div class="ws-file-card__meta">${count} file${count !== 1 ? 's' : ''}</div>
            </div>`;
  }).join('') : '';

  // Files without folder (at root) or files in current folder
  const displayFiles = currentFolder
    ? filtered
    : filesCache.filter(f => !f.meta?.folder);

  const fileCards = displayFiles.map(file => {
    const ext = (file.file_type || '').toLowerCase();
    const iconClass = getFileIconClass(ext);
    const iconEmoji = getFileIcon(ext);
    const size = formatBytes(file.file_size || 0);
    const date = new Date(file.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    const is3D = ['step', 'stp', 'stl', 'obj', 'iges', 'igs'].includes(ext);

    const checked = selectedFiles.has(file.id) ? 'checked' : '';
    return `
      <div class="ws-file-card ${selectedFiles.has(file.id) ? 'ws-file-card--selected' : ''}" data-file-id="${file.id}" data-ext="${ext}" draggable="true">
        <input type="checkbox" class="ws-file-select" data-file-id="${file.id}" ${checked} />
        <div class="ws-file-card__icon ${iconClass}">${iconEmoji}</div>
        <div class="ws-file-card__name" title="${file.file_name}">${file.file_name}</div>
        <div class="ws-file-card__meta">${size} · ${date}</div>
      </div>`;
  }).join('');

  container.innerHTML = breadcrumb + folderCards + fileCards;
  attachFileHandlers(container);
}

// ── List View ──────────────────────────────────────
function renderFilesList(container) {
  container.className = 'ws-file-list-container';

  // Get unique folders
  const fileFolders = filesCache.map(f => f.meta?.folder).filter(Boolean);
  const folders = [...new Set([...fileFolders, ...virtualFolders])];
  const allFolderNames = folders;
  const unfiled = filesCache.filter(f => !f.meta?.folder);

  // Breadcrumb for folder view
  const breadcrumb = currentFolder
    ? `<div class="ws-breadcrumb">
         <span class="ws-breadcrumb__link" data-goto-root>📁 All Files</span>
         <span class="ws-breadcrumb__sep">›</span>
         <span class="ws-breadcrumb__current">${currentFolder}</span>
       </div>`
    : '';

  let html = breadcrumb;

  // List table
  html += `<table class="ws-table ws-file-table">
    <thead>
      <tr>
        <th style="width:32px;"></th>
        <th style="width:40px;"></th>
        <th>Name</th>
        <th>Type</th>
        <th>Size</th>
        <th>Date</th>
        <th>Folder</th>
        <th style="width:60px;">Actions</th>
      </tr>
    </thead>
    <tbody>`;

  // If at root, show folders first
  if (!currentFolder) {
    folders.forEach(fname => {
      const count = filesCache.filter(f => f.meta?.folder === fname).length;
      html += `
        <tr class="ws-file-row ws-file-row--folder" data-folder-name="${fname}">
          <td></td>
          <td style="font-size:18px;">📂</td>
          <td style="font-weight:600; cursor:pointer;" class="ws-folder-link ws-td-primary" data-folder-name="${fname}">${fname}</td>
          <td class="ws-td-muted">Folder</td>
          <td class="ws-td-muted">${count} item${count !== 1 ? 's' : ''}</td>
          <td></td>
          <td></td>
          <td>
            <div class="ws-action-btns">
              <button class="ws-action-btn" data-action="rename-folder" data-folder="${fname}" title="Rename folder">
                <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
              </button>
            </div>
          </td>
        </tr>`;
    });
  }

  // Files to display
  const displayFiles = currentFolder
    ? filesCache.filter(f => (f.meta?.folder || null) === currentFolder)
    : unfiled;

  displayFiles.forEach(file => {
    const ext = (file.file_type || '').toLowerCase();
    const iconEmoji = getFileIcon(ext);
    const size = formatBytes(file.file_size || 0);
    const date = new Date(file.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    const is3D = ['step', 'stp', 'stl', 'obj', 'iges', 'igs'].includes(ext);
    const folder = file.meta?.folder || '—';

    // Folder move options
    const folderOptions = allFolderNames.map(f =>
      `<option value="${f}" ${f === file.meta?.folder ? 'selected' : ''}>${f}</option>`
    ).join('');

    const checked = selectedFiles.has(file.id) ? 'checked' : '';
    html += `
      <tr class="ws-file-row ${selectedFiles.has(file.id) ? 'ws-file-row--selected' : ''}" data-file-id="${file.id}">
        <td><input type="checkbox" class="ws-file-select" data-file-id="${file.id}" ${checked} /></td>
        <td style="font-size:16px;">${iconEmoji}</td>
        <td>
          <span class="ws-file-row__name ${is3D ? 'ws-file-row__name--viewable' : ''}" ${is3D ? `data-viewable="true" data-file-id="${file.id}"` : ''}>${file.file_name}</span>
        </td>
        <td class="ws-td-muted" style="text-transform:uppercase; font-size:11px;">${ext || '—'}</td>
        <td class="ws-td-muted" style="font-size:12px;">${size}</td>
        <td class="ws-td-muted" style="font-size:12px;">${date}</td>
        <td>
          <select class="ws-folder-select" data-file-id="${file.id}">
            <option value="">— None —</option>
            ${folderOptions}
          </select>
        </td>
        <td>
          <div class="ws-action-btns">
            <button class="ws-action-btn ws-action-btn--cancel" data-action="delete-file" data-file-id="${file.id}" title="Delete file">
              <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
            </button>
          </div>
        </td>
      </tr>`;
  });

  html += '</tbody></table>';
  container.innerHTML = html;
  attachFileHandlers(container);

  // Attach list-specific handlers
  // Folder links (click to navigate into)
  container.querySelectorAll('.ws-folder-link').forEach(link => {
    link.addEventListener('click', () => {
      currentFolder = link.dataset.folderName;
      renderFiles();
    });
  });

  // Folder move select
  container.querySelectorAll('.ws-folder-select').forEach(sel => {
    sel.addEventListener('change', async () => {
      const fileId = sel.dataset.fileId;
      const file = filesCache.find(f => f.id === fileId);
      if (!file) return;
      const newFolder = sel.value || null;
      const meta = { ...(file.meta || {}), folder: newFolder };
      await updateFileMeta(fileId, { meta });
      await renderFiles();
    });
  });

  // Delete file
  container.querySelectorAll('[data-action="delete-file"]').forEach(btn => {
    btn.addEventListener('click', async () => {
      if (confirm('Delete this file permanently?')) {
        await deleteFile(btn.dataset.fileId);
        await renderFiles();
      }
    });
  });

  // Rename folder
  container.querySelectorAll('[data-action="rename-folder"]').forEach(btn => {
    btn.addEventListener('click', async () => {
      const oldName = btn.dataset.folder;
      const newName = prompt('Rename folder:', oldName);
      if (!newName || !newName.trim() || newName === oldName) return;
      // Update all files in this folder
      const folderFiles = filesCache.filter(f => f.meta?.folder === oldName);
      for (const file of folderFiles) {
        const meta = { ...(file.meta || {}), folder: newName.trim() };
        await updateFileMeta(file.id, { meta });
      }
      if (currentFolder === oldName) currentFolder = newName.trim();
      await renderFiles();
    });
  });
}

// ── Common file handlers (grid + list) ─────────────
function attachFileHandlers(container) {
  // Navigate to root
  container.querySelectorAll('[data-goto-root]').forEach(el => {
    el.addEventListener('click', () => { currentFolder = null; renderFiles(); });
  });

  // ── Drag & Drop: File cards are draggable ──
  container.querySelectorAll('.ws-file-card[data-file-id][draggable="true"]').forEach(card => {
    card.addEventListener('dragstart', (e) => {
      e.dataTransfer.setData('text/plain', card.dataset.fileId);
      e.dataTransfer.effectAllowed = 'move';
      card.classList.add('ws-file-card--dragging');
    });
    card.addEventListener('dragend', () => {
      card.classList.remove('ws-file-card--dragging');
      container.querySelectorAll('.ws-file-card--drag-over').forEach(el => el.classList.remove('ws-file-card--drag-over'));
    });
  });

  // ── Drag & Drop: Folder cards are drop targets ──
  container.querySelectorAll('.ws-file-card--folder').forEach(folderCard => {
    folderCard.addEventListener('dragover', (e) => {
      e.preventDefault();
      e.dataTransfer.dropEffect = 'move';
      folderCard.classList.add('ws-file-card--drag-over');
    });
    folderCard.addEventListener('dragleave', () => {
      folderCard.classList.remove('ws-file-card--drag-over');
    });
    folderCard.addEventListener('drop', async (e) => {
      e.preventDefault();
      folderCard.classList.remove('ws-file-card--drag-over');
      const fileId = e.dataTransfer.getData('text/plain');
      if (!fileId) return;
      const folderName = folderCard.dataset.folderName;
      const file = filesCache.find(f => f.id === fileId);
      if (!file) return;
      const meta = { ...(file.meta || {}), folder: folderName };
      await updateFileMeta(file.id, { meta });
      await renderFiles();
    });

    // Click to navigate into folder (not when dropping)
    folderCard.addEventListener('click', (e) => {
      if (e.defaultPrevented) return;
      currentFolder = folderCard.dataset.folderName;
      renderFiles();
    });
  });

  // ── File click → open file preview (all types) ──
  container.querySelectorAll('.ws-file-card[data-file-id][draggable="true"]').forEach(card => {
    card.addEventListener('click', (e) => {
      if (e.target.classList.contains('ws-file-select')) return;
      const file = filesCache.find(f => f.id === card.dataset.fileId);
      if (file) openFilePreview(file);
    });
  });

  // List view: file name click → preview
  container.querySelectorAll('.ws-file-row__name').forEach(name => {
    name.style.cursor = 'pointer';
    name.addEventListener('click', () => {
      const row = name.closest('.ws-file-row');
      const file = filesCache.find(f => f.id === row?.dataset.fileId);
      if (file) openFilePreview(file);
    });
  });

  // Selection checkboxes
  container.querySelectorAll('.ws-file-select').forEach(cb => {
    cb.addEventListener('change', () => {
      const fid = cb.dataset.fileId;
      if (cb.checked) {
        selectedFiles.add(fid);
        cb.closest('.ws-file-card, .ws-file-row')?.classList.add(
          cb.closest('.ws-file-card') ? 'ws-file-card--selected' : 'ws-file-row--selected'
        );
      } else {
        selectedFiles.delete(fid);
        cb.closest('.ws-file-card, .ws-file-row')?.classList.remove('ws-file-card--selected', 'ws-file-row--selected');
      }
      updateSelectionUI();
    });
  });
}

function categorizeFile(ext) {
  if (['step', 'stp', 'stl', 'obj', 'iges', 'igs', '3mf'].includes(ext)) return 'cad';
  if (['pdf', 'dxf', 'dwg'].includes(ext)) return 'drawing';
  if (['doc', 'docx', 'xlsx', 'txt', 'csv'].includes(ext)) return 'specification';
  return 'general';
}

function getFileIconClass(ext) {
  if (['step', 'stp', 'stl', 'obj', 'iges', 'igs', '3mf'].includes(ext)) return 'ws-file-card__icon--cad';
  if (['pdf', 'dxf', 'dwg'].includes(ext)) return 'ws-file-card__icon--pdf';
  if (['jpg', 'jpeg', 'png', 'svg', 'webp'].includes(ext)) return 'ws-file-card__icon--img';
  return 'ws-file-card__icon--other';
}

function getFileIcon(ext) {
  if (['step', 'stp', 'stl', 'obj', 'iges', 'igs', '3mf'].includes(ext)) return '🧊';
  if (['pdf'].includes(ext)) return '📄';
  if (['dxf', 'dwg'].includes(ext)) return '📐';
  if (['jpg', 'jpeg', 'png', 'svg', 'webp'].includes(ext)) return '🖼️';
  if (['doc', 'docx'].includes(ext)) return '📝';
  if (['xlsx', 'csv'].includes(ext)) return '📊';
  return '📎';
}

function formatBytes(bytes) {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}


// ── File Preview Modal (Universal) ─────────────────────
let activePreviewFile = null;
let activeAnimationId = null;

function buildPreviewModal() {
  let backdrop = document.getElementById('ws-preview-backdrop');
  if (backdrop) return backdrop;

  backdrop = document.createElement('div');
  backdrop.id = 'ws-preview-backdrop';
  backdrop.className = 'ws-preview-backdrop';
  backdrop.innerHTML = `
    <div class="ws-preview-modal">
      <div class="ws-preview-modal__header">
        <div class="ws-preview-modal__title">
          <span id="ws-preview-icon">📄</span>
          <span id="ws-preview-filename">File Name</span>
        </div>
        <div class="ws-preview-modal__actions">
          <button class="ws-preview-btn" id="ws-preview-download" title="Download file">
            <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
          </button>
          <button class="ws-preview-btn" id="ws-preview-delete" title="Delete file">
            <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
          </button>
          <button class="ws-preview-btn ws-preview-close" id="ws-preview-close" title="Close">
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
        </div>
      </div>
      <div class="ws-preview-modal__body">
        <div class="ws-preview-modal__viewer" id="ws-preview-viewer">
          <div class="ws-preview-modal__loading">Loading preview…</div>
        </div>
        <div class="ws-preview-modal__sidebar">
          <div class="ws-preview-sidebar__section">
            <h4>Details</h4>
            <div class="ws-preview-details" id="ws-preview-details"></div>
          </div>
          <div class="ws-preview-sidebar__section">
            <h4>Notes</h4>
            <textarea class="ws-preview-notes" id="ws-preview-notes" placeholder="Add notes about this file…" rows="6"></textarea>
            <button class="ws-preview-notes-save" id="ws-preview-notes-save">Save Notes</button>
            <span class="ws-preview-notes-feedback" id="ws-preview-notes-feedback"></span>
          </div>
        </div>
      </div>
    </div>`;
  document.body.appendChild(backdrop);

  // Event wiring
  document.getElementById('ws-preview-close').addEventListener('click', closeFilePreview);
  backdrop.addEventListener('click', (e) => { if (e.target === backdrop) closeFilePreview(); });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeFilePreview(); });

  document.getElementById('ws-preview-download').addEventListener('click', () => {
    if (!activePreviewFile?.storage_path) return;
    const url = `${import.meta.env.VITE_SUPABASE_URL}/storage/v1/object/public/user-files/${activePreviewFile.storage_path}`;
    const a = document.createElement('a');
    a.href = url; a.download = activePreviewFile.file_name; a.target = '_blank';
    document.body.appendChild(a); a.click(); a.remove();
  });

  document.getElementById('ws-preview-delete').addEventListener('click', async () => {
    if (!activePreviewFile) return;
    if (!confirm(`Delete "${activePreviewFile.file_name}" permanently?`)) return;
    await deleteFile(activePreviewFile.id);
    closeFilePreview();
    await renderFiles();
  });

  document.getElementById('ws-preview-notes-save').addEventListener('click', async () => {
    if (!activePreviewFile) return;
    const notes = document.getElementById('ws-preview-notes').value;
    const meta = { ...(activePreviewFile.meta || {}), notes };
    await updateFileMeta(activePreviewFile.id, { meta });
    activePreviewFile.meta = meta;
    const feedback = document.getElementById('ws-preview-notes-feedback');
    feedback.textContent = '✓ Saved';
    feedback.style.color = '#34d399';
    setTimeout(() => { feedback.textContent = ''; }, 2000);
  });

  return backdrop;
}

async function openFilePreview(file) {
  activePreviewFile = file;
  const backdrop = buildPreviewModal();
  const ext = (file.file_type || '').toLowerCase();
  const is3D = ['step', 'stp', 'stl', 'obj', 'iges', 'igs'].includes(ext);
  const isImage = ['jpg', 'jpeg', 'png', 'svg', 'webp', 'gif', 'bmp'].includes(ext);
  const isPDF = ext === 'pdf';

  // Set header
  document.getElementById('ws-preview-icon').textContent = getFileIcon(ext);
  document.getElementById('ws-preview-filename').textContent = file.file_name;

  // Set details
  const detailsEl = document.getElementById('ws-preview-details');
  detailsEl.innerHTML = `
    <div class="ws-detail-row"><span class="ws-detail-label">Type</span><span class="ws-detail-value">${ext.toUpperCase()}</span></div>
    <div class="ws-detail-row"><span class="ws-detail-label">Size</span><span class="ws-detail-value">${formatBytes(file.file_size || 0)}</span></div>
    <div class="ws-detail-row"><span class="ws-detail-label">Uploaded</span><span class="ws-detail-value">${new Date(file.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span></div>
    <div class="ws-detail-row"><span class="ws-detail-label">Category</span><span class="ws-detail-value">${file.category || 'General'}</span></div>
    <div class="ws-detail-row"><span class="ws-detail-label">Folder</span><span class="ws-detail-value">${file.meta?.folder || '— None —'}</span></div>
    ${is3D ? '<div class="ws-detail-row ws-detail-row--hint"><span>🖱 Drag to rotate · Scroll to zoom</span></div>' : ''}`;

  // Set notes
  document.getElementById('ws-preview-notes').value = file.meta?.notes || '';
  document.getElementById('ws-preview-notes-feedback').textContent = '';

  // Show modal
  backdrop.classList.add('ws-preview-backdrop--visible');

  // Render preview content
  const viewer = document.getElementById('ws-preview-viewer');
  viewer.innerHTML = '<div class="ws-preview-modal__loading">Loading preview…</div>';

  if (is3D) {
    await render3DPreview(file, viewer);
  } else if (isImage && file.storage_path) {
    const url = `${import.meta.env.VITE_SUPABASE_URL}/storage/v1/object/public/user-files/${file.storage_path}`;
    viewer.innerHTML = `<div class="ws-preview-image-wrap"><img src="${url}" alt="${file.file_name}" class="ws-preview-image" /></div>`;
  } else if (isPDF && file.storage_path) {
    const url = `${import.meta.env.VITE_SUPABASE_URL}/storage/v1/object/public/user-files/${file.storage_path}`;
    viewer.innerHTML = `<iframe src="${url}" class="ws-preview-iframe" title="${file.file_name}"></iframe>`;
  } else {
    // Generic file — show large icon and info
    viewer.innerHTML = `
      <div class="ws-preview-generic">
        <div class="ws-preview-generic__icon">${getFileIcon(ext)}</div>
        <div class="ws-preview-generic__name">${file.file_name}</div>
        <div class="ws-preview-generic__type">${ext.toUpperCase()} file · ${formatBytes(file.file_size || 0)}</div>
        ${file.storage_path ? `<a href="${import.meta.env.VITE_SUPABASE_URL}/storage/v1/object/public/user-files/${file.storage_path}" target="_blank" class="ws-preview-generic__dl">Download to preview</a>` : '<div class="ws-preview-generic__type" style="margin-top:8px;">Storage pending — file not yet downloadable</div>'}
      </div>`;
  }
}

// ── 3D Rendering within preview ──
async function render3DPreview(file, container) {
  if (!file.storage_path) {
    container.innerHTML = '<div class="ws-preview-generic"><div class="ws-preview-generic__icon">🧊</div><div class="ws-preview-generic__name">3D Preview unavailable</div><div class="ws-preview-generic__type">File storage is pending — re-upload to enable preview</div></div>';
    return;
  }
  try {
    const THREE = await import('three');
    const { OrbitControls } = await import('three/addons/controls/OrbitControls.js');

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0e1117);

    const camera = new THREE.PerspectiveCamera(45, container.clientWidth / container.clientHeight, 0.1, 1000);
    camera.position.set(5, 3, 5);

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(container.clientWidth, container.clientHeight);
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.2;
    container.innerHTML = '';
    container.appendChild(renderer.domElement);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.08;

    // Lighting — enhanced studio setup
    scene.add(new THREE.AmbientLight(0xffffff, 0.4));
    const keyLight = new THREE.DirectionalLight(0xffffff, 1.0);
    keyLight.position.set(5, 10, 7);
    scene.add(keyLight);
    const fillLight = new THREE.DirectionalLight(0x8888ff, 0.3);
    fillLight.position.set(-5, 3, -5);
    scene.add(fillLight);
    const rimLight = new THREE.DirectionalLight(0xffffff, 0.2);
    rimLight.position.set(0, -5, 5);
    scene.add(rimLight);

    // Grid
    const grid = new THREE.GridHelper(20, 20, 0x1a1a2e, 0x1a1a2e);
    scene.add(grid);

    const ext = (file.file_type || '').toLowerCase();

    if (['step', 'stp'].includes(ext)) {
      try {
        const occtImportJs = await import('occt-import-js');
        const occt = await occtImportJs.default();
        const { data: fileData } = await import('./js/utils/supabaseClient.js').then(m =>
          m.supabase.storage.from('user-files').download(file.storage_path)
        );
        if (fileData) {
          const buffer = await fileData.arrayBuffer();
          const result = occt.ReadStepFile(new Uint8Array(buffer), null);
          for (const mesh of result.meshes) {
            const geometry = new THREE.BufferGeometry();
            // occt-import-js returns regular arrays — Three.js needs TypedArrays
            const posArray = mesh.attributes.position.array;
            geometry.setAttribute('position', new THREE.BufferAttribute(
              new Float32Array(posArray), 3
            ));
            if (mesh.attributes.normal && mesh.attributes.normal.array) {
              const normArray = mesh.attributes.normal.array;
              geometry.setAttribute('normal', new THREE.BufferAttribute(
                new Float32Array(normArray), 3
              ));
            }
            if (mesh.index) {
              geometry.setIndex(new THREE.BufferAttribute(
                new Uint32Array(mesh.index.array), 1
              ));
            }
            if (!mesh.attributes.normal || !mesh.attributes.normal.array) {
              geometry.computeVertexNormals();
            }
            const material = new THREE.MeshPhysicalMaterial({
              color: 0x60a5fa, metalness: 0.2, roughness: 0.5, clearcoat: 0.3, side: THREE.DoubleSide
            });
            scene.add(new THREE.Mesh(geometry, material));
          }
          autoFrameCamera(scene, camera, controls, THREE);
        }
      } catch (err) {
        console.error('[3D Preview] STEP load error:', err);
        container.innerHTML += `<div style="position:absolute;bottom:20px;left:20px;color:#f87171;font-size:12px;">Error loading STEP: ${err.message}</div>`;
      }
    } else if (['stl'].includes(ext)) {
      try {
        const { STLLoader } = await import('three/addons/loaders/STLLoader.js');
        const loader = new STLLoader();
        const { data: fileData } = await import('./js/utils/supabaseClient.js').then(m =>
          m.supabase.storage.from('user-files').download(file.storage_path)
        );
        if (fileData) {
          const buffer = await fileData.arrayBuffer();
          const geometry = loader.parse(buffer);
          geometry.computeVertexNormals();
          const material = new THREE.MeshPhysicalMaterial({
            color: 0x60a5fa, metalness: 0.2, roughness: 0.5, clearcoat: 0.3
          });
          scene.add(new THREE.Mesh(geometry, material));
          autoFrameCamera(scene, camera, controls, THREE);
        }
      } catch (err) {
        console.error('[3D Preview] STL load error:', err);
      }
    } else {
      // Placeholder for OBJ/IGES etc.
      const geometry = new THREE.BoxGeometry(1, 1, 1);
      const material = new THREE.MeshPhysicalMaterial({ color: 0x60a5fa, wireframe: true });
      scene.add(new THREE.Mesh(geometry, material));
    }

    // Animation loop
    function animate() {
      if (!document.getElementById('ws-preview-backdrop')?.classList.contains('ws-preview-backdrop--visible')) return;
      activeAnimationId = requestAnimationFrame(animate);
      controls.update();
      renderer.render(scene, camera);
    }
    animate();

    // Handle resize
    const resizeObserver = new ResizeObserver(() => {
      if (!container.clientWidth || !container.clientHeight) return;
      camera.aspect = container.clientWidth / container.clientHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(container.clientWidth, container.clientHeight);
    });
    resizeObserver.observe(container);

  } catch (err) {
    console.error('[3D Preview] Init error:', err);
    container.innerHTML = `<div style="display:flex;align-items:center;justify-content:center;height:100%;color:#f87171;">Failed to load 3D viewer: ${err.message}</div>`;
  }
}

function autoFrameCamera(scene, camera, controls, THREE) {
  // Compute bounding box from ONLY mesh geometry (skip grids, lights, helpers)
  const box = new THREE.Box3();
  let hasMesh = false;
  scene.traverse((child) => {
    if (child.isMesh && child.geometry) {
      child.geometry.computeBoundingBox();
      const childBox = child.geometry.boundingBox.clone();
      childBox.applyMatrix4(child.matrixWorld);
      box.union(childBox);
      hasMesh = true;
    }
  });

  if (!hasMesh) return;

  const center = box.getCenter(new THREE.Vector3());
  const size = box.getSize(new THREE.Vector3());
  const maxDim = Math.max(size.x, size.y, size.z);
  const fitFactor = 1.5; // How much padding around the model

  // Position camera at a good distance from the model center
  camera.position.set(
    center.x + maxDim * fitFactor,
    center.y + maxDim * fitFactor * 0.6,
    center.z + maxDim * fitFactor
  );

  // Set orbit target to the exact center of the model
  controls.target.copy(center);
  controls.minDistance = maxDim * 0.2;
  controls.maxDistance = maxDim * 10;
  controls.update();
}

function closeFilePreview() {
  activePreviewFile = null;
  if (activeAnimationId) { cancelAnimationFrame(activeAnimationId); activeAnimationId = null; }
  const backdrop = document.getElementById('ws-preview-backdrop');
  if (backdrop) backdrop.classList.remove('ws-preview-backdrop--visible');
  // Clean up renderer
  const canvas = document.querySelector('#ws-preview-viewer canvas');
  if (canvas) canvas.remove();
}



// ── Projects Tab (Kanban) ─────────────────────────────
async function loadProjects() {
  const defaultProjects = [
    { id: '1', title: 'Injection Molding Tooling', desc: 'Sourcing P20 steel mold for main shell.', status: 'planning', tag: 'Tooling' },
    { id: '2', title: 'PCB Assembly Prototype', desc: 'V1 board fabrication and assembly.', status: 'design', tag: 'Electronics' },
    { id: '3', title: 'Packaging Design', desc: 'Eco-friendly retail box design.', status: 'production', tag: 'Packaging' }
  ];

  let projects = await getProjects();
  if (projects.length === 0) {
    projects = defaultProjects;
  }

  // Clear columns
  ['planning', 'design', 'production', 'completed'].forEach(col => {
    const el = document.getElementById(`kanban-${col}`);
    if (el) el.innerHTML = '';
  });

  // Render cards
  projects.forEach(p => {
    const col = document.getElementById(`kanban-${p.status}`);
    if (col) {
      col.innerHTML += `
        <div class="ws-kanban-card" draggable="true" data-id="${p.id}">
          <span class="ws-kanban-card__tag">${p.tag || 'General'}</span>
          <h4>${p.title}</h4>
          <p>${p.description || p.desc}</p>
        </div>
      `;
    }
  });

  // Update counts
  ['planning', 'design', 'production', 'completed'].forEach(col => {
    const columnDiv = document.querySelector(`.ws-kanban-column[data-status="${col}"]`);
    if (columnDiv) {
      const cnt = columnDiv.querySelectorAll('.ws-kanban-card').length;
      const badge = columnDiv.querySelector('.ws-badge');
      if (badge) badge.textContent = cnt;
    }
  });

  // Simple drag & drop
  const cards = document.querySelectorAll('.ws-kanban-card');
  const columns = document.querySelectorAll('.ws-kanban-column');

  cards.forEach(card => {
    card.addEventListener('dragstart', (e) => {
      e.dataTransfer.setData('text/plain', card.dataset.id);
      setTimeout(() => card.style.opacity = '0.5', 0);
    });
    card.addEventListener('dragend', () => {
      card.style.opacity = '1';
    });
  });

  columns.forEach(col => {
    col.addEventListener('dragover', (e) => {
      e.preventDefault();
      col.style.background = 'rgba(255,255,255,0.05)';
    });
    col.addEventListener('dragleave', () => {
      col.style.background = '';
    });
    col.addEventListener('drop', async (e) => {
      e.preventDefault();
      col.style.background = '';
      const id = e.dataTransfer.getData('text/plain');
      const draggedCard = document.querySelector(`.ws-kanban-card[data-id="${id}"]`);
      if (draggedCard) {
        const container = col.querySelector('.ws-kanban-cards');
        if (container) container.appendChild(draggedCard);

        // Update stored status
        const proj = projects.find(p => p.id === id);
        if (proj) {
          proj.status = col.dataset.status;
          
          // Only hit Supabase if it's a real record with a UUID
          if (id.length > 5) {
            await updateProjectStatus(id, col.dataset.status);
          }
        }

        // Re-count
        ['planning', 'design', 'production', 'completed'].forEach(c => {
          const colDiv = document.querySelector(`.ws-kanban-column[data-status="${c}"]`);
          if (colDiv) {
            const cnt = colDiv.querySelectorAll('.ws-kanban-card').length;
            const badge = colDiv.querySelector('.ws-badge');
            if (badge) badge.textContent = cnt;
          }
        });
      }
    });
  });
}

// ── Taxonomy Sandbox ──────────────────────────────────
async function loadSandbox() {
  const defaultItems = [
    { title: 'CNC Machining', desc: 'Subtractive manufacturing process', icon: '⚙️' },
    { title: '6061 Aluminum', desc: 'Aerospace grade material', icon: '🔩' },
    { title: 'Anodizing (Type II)', desc: 'Surface finishing', icon: '✨' }
  ];

  let items = await getSandboxItems();
  if (items.length === 0) {
    items = defaultItems;
  }

  const grid = document.getElementById('sandbox-grid');
  if (!grid) return;

  grid.innerHTML = items.map(item => `
    <div class="ws-sandbox-item">
      <div class="ws-sandbox-item__icon">${item.icon || '📌'}</div>
      <div class="ws-sandbox-item__info">
        <h5>${item.title}</h5>
        <p>${item.description || item.desc}</p>
      </div>
    </div>
  `).join('');
}

// ── Document Templates ──────────────────────────────────
const TEMPLATES = {
  nda: `
    [Company_Logo]
    <h1>Mutual Non-Disclosure Agreement</h1>
    <p>This NON-DISCLOSURE AGREEMENT (the "Agreement") is entered into on <span class="ws-document-var">[Date]</span>, by and between:</p>
    <p><strong>Party A:</strong> <span class="ws-document-var">[Company_Name]</span>, located at <span class="ws-document-var">[Address]</span></p>
    <p><strong>Party B:</strong> The Receiving Party</p>
    <h2>1. Definition of Confidential Information</h2>
    <p>For purposes of this Agreement, "Confidential Information" shall include all information or material that has or could have commercial value or other utility in the business in which Disclosing Party is engaged.</p>
    <h2>2. Obligations of Receiving Party</h2>
    <p>Receiving Party shall hold and maintain the Confidential Information in strictest confidence for the sole and exclusive benefit of the Disclosing Party.</p>
    <div class="ws-document-signature-block">
      <div class="ws-document-signature">
        <div class="ws-document-signature-line"></div>
        <div class="ws-document-signature-title">Signature: <span class="ws-document-var">[User_Name]</span></div>
        <div class="ws-document-signature-title">Title: <span class="ws-document-var">[Job_Title]</span></div>
      </div>
      <div class="ws-document-signature">
        <div class="ws-document-signature-line"></div>
        <div class="ws-document-signature-title">Signature: [Receiving Party]</div>
        <div class="ws-document-signature-title">Title: _______________________</div>
      </div>
    </div>
  `,
  tooling: `
    [Company_Logo]
    <h1>Tooling & Molding Ownership Agreement</h1>
    <p>This Tooling Agreement is made effective on <span class="ws-document-var">[Date]</span> between <span class="ws-document-var">[Company_Name]</span> ("Buyer") and the Manufacturer.</p>
    <h2>1. Tooling Ownership</h2>
    <p>The Buyer asserts full ownership of all molds, dies, fixtures, and tooling specifically paid for and created for the manufacture of the Buyer's products.</p>
    <div class="ws-document-signature-block">
      <div class="ws-document-signature">
        <div class="ws-document-signature-line"></div>
        <div class="ws-document-signature-title"><span class="ws-document-var">[Company_Name]</span></div>
      </div>
    </div>
  `,
  manufacturing: `
    [Company_Logo]
    <h1>Standard Manufacturing Contract</h1>
    <p>This agreement governs the manufacturing relationship between <span class="ws-document-var">[Company_Name]</span> and its supply chain partners.</p>
    <p>Industry Segment: <span class="ws-document-var">[Industry]</span></p>
  `,
  rfp: `
    [Company_Logo]
    <h1>Project Request for Proposal (RFP)</h1>
    <p>Prepared by: <span class="ws-document-var">[User_Name]</span>, <span class="ws-document-var">[Company_Name]</span></p>
    <p>Contact: <span class="ws-document-var">[Phone]</span></p>
  `
};

async function loadTemplates() {
  if (!profileCache) profileCache = await getMyProfile();
  
  const safeStr = (str) => str || '_________';
  const dataMap = {
    '[Company_Logo]': profileCache?.company_logo_url ? `<img src="${profileCache.company_logo_url}" style="max-height: 80px; max-width: 250px; display: block; margin: 0 auto 20px auto;">` : '',
    '[Company_Name]': safeStr(profileCache?.company),
    '[User_Name]': `${safeStr(profileCache?.first_name)} ${safeStr(profileCache?.last_name)}`.trim(),
    '[Address]': safeStr(profileCache?.address) || safeStr(profileCache?.country), // fallback to country
    '[Job_Title]': safeStr(profileCache?.job_title),
    '[Phone]': safeStr(profileCache?.phone),
    '[Industry]': safeStr(profileCache?.industry),
    '[Date]': new Date().toLocaleDateString()
  };

  const renderTemplate = (type) => {
    let raw = TEMPLATES[type] || '';
    Object.keys(dataMap).forEach(key => {
      // Need to string replace all instances
      raw = raw.split(key).join(dataMap[key]);
    });
    const paper = document.getElementById('template-paper-content');
    if (paper) paper.innerHTML = raw;
  };

  // Setup click listeners
  const items = document.querySelectorAll('.ws-template-item');
  items.forEach(item => {
    item.addEventListener('click', () => {
      items.forEach(i => i.classList.remove('ws-template-item--active'));
      item.classList.add('ws-template-item--active');
      renderTemplate(item.dataset.template);
    });
  });

  // Render initial
  const active = document.querySelector('.ws-template-item--active');
  if (active) renderTemplate(active.dataset.template);

  // Print bind
  const printBtn = document.getElementById('btn-print-template');
  if (printBtn && !printBtn.dataset.bound) {
    printBtn.dataset.bound = 'true';
    printBtn.addEventListener('click', () => {
      const content = document.getElementById('template-paper-content').innerHTML;
      const win = window.open('', '_blank');
      win.document.write(`
        <html>
          <head>
            <title>Printed Document</title>
            <style>
              body { font-family: "Times New Roman", Times, serif; line-height: 1.6; padding: 40px; }
              h1 { text-align: center; text-transform: uppercase; font-size: 24px; margin-bottom: 30px;}
              h2 { font-size: 16px; margin-top: 24px; }
              .ws-document-signature-block { margin-top: 60px; display: flex; justify-content: space-between; }
              .ws-document-signature { width: 45%; }
              .ws-document-signature-line { border-bottom: 1px solid #000; margin-bottom: 8px; height: 40px; }
              .ws-document-signature-title { font-size: 12px; }
              .ws-document-var { color: #000; font-weight: normal; }
              @media print { body { padding: 0; } }
            </style>
          </head>
          <body>${content}</body>
        </html>
      `);
      win.document.close();
      setTimeout(() => {
        win.print();
      }, 250);
    });
  }
}


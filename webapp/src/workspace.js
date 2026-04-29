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
import { supabase } from './js/utils/supabaseClient.js';


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

  const avatarEl = document.getElementById('ws-user-avatar');
  if (avatarEl && profileCache) {
    const f = profileCache.first_name?.[0] || '';
    const l = profileCache.last_name?.[0] || '';
    const initials = (f + l).toUpperCase() || profileCache.email?.[0]?.toUpperCase() || 'U';
    avatarEl.textContent = initials;
  }
  
  const urlParams = new URLSearchParams(window.location.search);
  const initialTab = urlParams.get('tab') || 'shortlists';
  switchTab(initialTab);
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
    submitted:    { label: 'Submitted',                   cssClass: 'ws-status--submitted' },
    under_review: { label: 'Under Review',                cssClass: 'ws-status--under_review' },
    confirmed:    { label: 'Confirmed — Awaiting Payment', cssClass: 'ws-status--confirmed' },
    paid:         { label: '🟢 Paid',                    cssClass: 'ws-status--paid' },
    processing:   { label: 'Processing',                  cssClass: 'ws-status--in_progress' },
    shipped:      { label: '🚧 Shipped',                  cssClass: 'ws-status--shipped' },
    // legacy fallbacks
    in_progress:  { label: 'In Progress',                 cssClass: 'ws-status--in_progress' },
    done:         { label: 'Done',                        cssClass: 'ws-status--done' },
    cancelled:    { label: 'Cancelled',                   cssClass: 'ws-status--cancelled' }
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
    let cfg = statusConfig[statusVal] || statusConfig[rfq.status] || { label: statusVal, cssClass: '' };

    const isBankTransferPending = data.payment_method === 'bank_transfer' && !['paid', 'shipped', 'done', 'cancelled'].includes(rfq.status);
    if (isBankTransferPending) {
      cfg = { label: '🏦 Bank Transfer Pending', cssClass: 'ws-status--in_progress' };
    }

    return `
      <tr data-rfq-id="${rfq.id}"
          data-sort-name="${projectName.toLowerCase()}"
          data-sort-type="${(data.type || '').toLowerCase()}"
          data-sort-service="${(data.service || data.type || '').toLowerCase()}"
          data-sort-date="${rfq.created_at || ''}"
          data-sort-price="${data.total_price || 0}"
          data-sort-status="${rfq.status || ''}">
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
          ${statusVal === 'paid' && data.paid_at ? `<div style="font-size:10px;color:#16a34a;margin-top:3px;font-weight:600;">Paid ${new Date(data.paid_at).toLocaleDateString('en-US',{day:'numeric',month:'short',year:'numeric'})}</div>` : ''}
        </td>
        <td class="ws-td-muted" style="font-size: 12px;">${fileCount} file${fileCount !== 1 ? 's' : ''}</td>
      </tr>`;
  }).join('');

  container.querySelectorAll('tr[data-rfq-id]').forEach(row => {
    row.style.cursor = 'pointer';
    row.addEventListener('dblclick', async () => {
      const rfqId = row.dataset.rfqId;
      // Always fetch fresh from DB so payment_status / confirmed status is current
      try {
        const { data: freshRow, error } = await supabase
          .from('rfq_history')
          .select('*')
          .eq('id', rfqId)
          .single();
        if (error) throw error;
        // Update local cache too
        const idx = rfqsCache.findIndex(r => r.id === rfqId);
        if (idx !== -1) rfqsCache[idx] = freshRow;
        openRFQPreviewModal(freshRow);
      } catch (e) {
        // Fallback to cached if fetch fails
        const rfq = rfqsCache.find(r => r.id === rfqId);
        if (rfq) openRFQPreviewModal(rfq);
      }
    });
  });

  // Wire up sortable headers
  makeSortable(document.getElementById('rfqs-table-head'), container);
}

/**
 * Generic table sort utility.
 * @param {HTMLElement} thead - The <tr> containing <th data-sort="key"> headers
 * @param {HTMLElement} tbody - The <tbody> to sort
 */
function makeSortable(thead, tbody) {
  if (!thead || !tbody) return;
  let sortKey = null;
  let sortDir = 1; // 1 = asc, -1 = desc

  thead.querySelectorAll('th[data-sort]').forEach(th => {
    th.addEventListener('click', () => {
      const key = th.dataset.sort;
      if (sortKey === key) {
        sortDir *= -1;
      } else {
        sortKey = key;
        sortDir = 1;
      }

      // Update all icons
      thead.querySelectorAll('th[data-sort] .sort-icon').forEach(ic => ic.textContent = '');
      th.querySelector('.sort-icon').textContent = sortDir === 1 ? ' ↑' : ' ↓';

      // Sort rows
      const rows = Array.from(tbody.querySelectorAll('tr[data-rfq-id]'));
      rows.sort((a, b) => {
        let va = a.dataset[`sort${key.charAt(0).toUpperCase()}${key.slice(1)}`] || '';
        let vb = b.dataset[`sort${key.charAt(0).toUpperCase()}${key.slice(1)}`] || '';
        // Numeric sort for price
        if (key === 'price') return (parseFloat(va) - parseFloat(vb)) * sortDir;
        // Date sort
        if (key === 'date') return (new Date(va) - new Date(vb)) * sortDir;
        return va.localeCompare(vb) * sortDir;
      });
      rows.forEach(r => tbody.appendChild(r));
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

  const isBankTransferPending = data.payment_method === 'bank_transfer' && !['paid', 'shipped', 'done', 'cancelled'].includes(rfq.status);

  const statusLabels = {
    'submitted': 'Submitted',
    'under_review': 'Under Review',
    'confirmed': 'Confirmed',
    'processing': 'Processing',
    'paid': 'Paid',
    'shipped': 'Shipped',
    'rejected': 'Rejected',
    'done': 'Done',
    'cancelled': 'Cancelled'
  };
  
  const statusDescriptions = {
    'submitted': 'One of our experts will review and take the quotation on board and bring it forward shortly.',
    'under_review': 'Our engineering team is currently reviewing your files and requirements.',
    'confirmed': 'Your quote is confirmed! Please proceed with payment to begin production.',
    'processing': 'Your project is currently in active production.',
    'paid': 'Payment received. Your project is preparing for production.',
    'shipped': 'Your order has been shipped and is on its way.',
    'rejected': 'This quote could not be processed. Please see the communication history for details.',
    'done': 'This project has been completed.',
    'cancelled': 'This project has been cancelled.'
  };

  const currentStatus = rfq.status || 'submitted';
  const label = isBankTransferPending ? 'Bank Transfer Pending' : (statusLabels[currentStatus] || currentStatus);
  const tooltipText = isBankTransferPending 
    ? 'Please upload your bank transfer receipt. We will confirm it shortly.'
    : statusDescriptions[currentStatus] || 'Status update pending.';

  let badgeBg = '#eef2ff', badgeColor = '#3730a3', badgeBorder = '#c7d2fe';
  if (currentStatus === 'paid' || currentStatus === 'shipped' || currentStatus === 'done') { badgeBg = '#dcfce7'; badgeColor = '#15803d'; badgeBorder = '#bbf7d0'; }
  else if (isBankTransferPending || currentStatus === 'under_review' || currentStatus === 'confirmed') { badgeBg = '#fef9c3'; badgeColor = '#854d0e'; badgeBorder = '#fde68a'; }
  else if (currentStatus === 'rejected' || currentStatus === 'cancelled') { badgeBg = '#fef2f2'; badgeColor = '#dc2626'; badgeBorder = '#fecaca'; }

  const statusHtml = `
    <div style="display:flex; align-items:center;">
      <span style="font-size:12px; font-weight:800; background:${badgeBg}; color:${badgeColor}; padding:6px 12px; border-radius:6px; border:1px solid ${badgeBorder}; text-transform:uppercase; letter-spacing:0.5px; display:flex; align-items:center; gap:8px; box-shadow: 0 2px 4px rgba(0,0,0,0.02);">
        STATUS: ${label}
      </span>
      <div class="rfq-status-tooltip" data-tooltip="${tooltipText}" style="position:relative; margin-left:8px; color:#94a3b8; cursor:help; display:flex; align-items:center; transition: color 0.2s;" onmouseover="this.style.color='#475569'" onmouseout="this.style.color='#94a3b8'">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
          <circle cx="12" cy="12" r="10"></circle>
          <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"></path>
          <line x1="12" y1="17" x2="12.01" y2="17"></line>
        </svg>
      </div>
      ${currentStatus === 'paid' && data.paid_at ? `<span style="font-size:12px; color:#15803d; font-weight:600; margin-left:12px;">Paid ${new Date(data.paid_at).toLocaleDateString('en-US',{day:'numeric',month:'short',year:'numeric'})}</span>` : ''}
    </div>
  `;

  const reminderHtml = isBankTransferPending ? `
    <div style="background:#fffbeb; border:2px solid #f59e0b; border-radius:12px; padding:16px 20px; margin-bottom:24px; box-shadow: 0 4px 12px rgba(245, 158, 11, 0.1);">
      <div style="font-size:14px; color:#92400e; font-weight:800; text-transform:uppercase; letter-spacing:0.5px; margin-bottom:8px; display:flex; align-items:center; gap:8px;">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
        Action Required — Upload Receipt
      </div>
      <div style="font-size:14px; color:#92400e; line-height:1.6; display:flex; flex-direction:column; gap:12px;">
        <div>
          You have selected Bank Transfer. Please send your payment receipt to <strong>info@atlasdt.com</strong> and use reference <strong style="font-family:'SF Mono','Fira Code',monospace; background:#fde68a; padding:2px 6px; border-radius:4px;">ADT-${(rfq.id||'').slice(0,8).toUpperCase()}</strong> to begin production.
        </div>
        <button onclick="const el = document.getElementById('rfq-preview-bank-details'); el.style.display = el.style.display === 'none' ? 'block' : 'none';" style="background:#92400e; color:#fff; border:none; padding:10px 16px; border-radius:8px; font-size:13px; font-weight:600; cursor:pointer; width:100%; transition:0.2s;">View Bank Details</button>
      </div>
      <div id="rfq-preview-bank-details" style="display:none; margin-top:16px; background:#fff; border:1px solid #fcd34d; border-radius:12px; padding:16px;">
        <div style="font-size:11px; color:#92400e; font-weight:700; text-transform:uppercase; letter-spacing:0.5px; margin-bottom:12px;">🏦 Bank Transfer Details</div>
        <div style="display:grid; gap:6px; font-size:13px; color:#92400e;">
          <div style="display:flex; justify-content:space-between; padding:6px 0; border-bottom:1px solid #fef3c7;"><span style="color:#b45309;">Bank Name</span><strong>NAB — National Australia Bank</strong></div>
          <div style="display:flex; justify-content:space-between; padding:6px 0; border-bottom:1px solid #fef3c7;"><span style="color:#b45309;">Account Name</span><strong>Paniani Products Pty Ltd</strong></div>
          <div style="display:flex; justify-content:space-between; padding:6px 0; border-bottom:1px solid #fef3c7;"><span style="color:#b45309;">BSB</span><strong>083-004</strong></div>
          <div style="display:flex; justify-content:space-between; padding:6px 0; border-bottom:1px solid #fef3c7;"><span style="color:#b45309;">Account No.</span><strong>978 360 554</strong></div>
          <div style="display:flex; justify-content:space-between; padding:6px 0; border-bottom:1px solid #fef3c7;"><span style="color:#b45309;">SWIFT / BIC</span><strong>NATAAU3303</strong></div>
          <div style="display:flex; justify-content:space-between; padding:6px 0;"><span style="color:#b45309;">Amount</span><strong style="color:#b45309;">$${Number(data.total_price || 0).toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})} AUD</strong></div>
        </div>
      </div>
    </div>
  ` : '';

  const modalHtml = `
    <div id="rfq-preview-modal" style="position:fixed;inset:0;background:rgba(15,23,42,0.8);backdrop-filter:blur(8px);z-index:9999;display:flex;align-items:center;justify-content:center; font-family: 'Inter', sans-serif;">
      <style>
        .rfq-status-tooltip::after {
          content: attr(data-tooltip); position: absolute; bottom: 100%; left: 50%; transform: translateX(-50%);
          margin-bottom: 8px; padding: 8px 12px; background: #0f172a; color: #fff; font-size: 12px;
          font-weight: 500; white-space: normal; width: max-content; max-width: 280px; text-align: center;
          border-radius: 6px; opacity: 0; pointer-events: none; transition: opacity 0.2s, transform 0.2s;
          box-shadow: 0 4px 12px rgba(0,0,0,0.15); z-index: 10; line-height: 1.4; text-transform: none; letter-spacing: 0;
        }
        .rfq-status-tooltip::before {
          content: ''; position: absolute; bottom: 100%; left: 50%; transform: translateX(-50%);
          margin-bottom: 4px; border-width: 5px; border-style: solid; border-color: #0f172a transparent transparent transparent;
          opacity: 0; pointer-events: none; transition: opacity 0.2s; z-index: 10;
        }
        .rfq-status-tooltip:hover::after, .rfq-status-tooltip:hover::before { opacity: 1; }
      </style>
      <div style="background:#fff;border-radius:16px;width:1100px;max-width:95vw;height:700px;max-height:90vh;display:flex;flex-direction:column;overflow:hidden;box-shadow:0 25px 50px -12px rgba(0,0,0,0.5);">
        
        <!-- Top Summary Bar -->
        <div style="padding: 16px 24px; border-bottom: 1px solid #e2e8f0; display:flex; justify-content:space-between; align-items:center; background:#f8fafc; flex-shrink:0;">
          <div>
            <div style="font-size:12px; color:#3b82f6; font-weight:700; text-transform:uppercase; letter-spacing:0.5px; margin-bottom:4px;">${data.project_name || 'Instant RFQ Project'}</div>
            <div style="display:flex; align-items:center; gap: 12px;">
              <h2 style="margin:0; font-size:20px; color:#0f172a; font-weight:700;">Quote Overview</h2>
              ${statusHtml}
            </div>
          </div>
          <div style="display:flex; gap: 24px; align-items:center;">
            <div style="text-align:right;">
              <div style="font-size:11px; color:#64748b; font-weight:600; text-transform:uppercase;">Total Value</div>
              <div style="font-size:16px; color:#15803d; font-weight:800;">$${Number(data.total_price || 0).toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</div>
            </div>
            <div style="text-align:right;">
              <div style="font-size:11px; color:#64748b; font-weight:600; text-transform:uppercase;">Total Parts</div>
              <div style="font-size:16px; color:#0f172a; font-weight:700;">${parts.length}</div>
            </div>
            <div style="text-align:right; padding-left:24px; border-left:1px solid #e2e8f0;">
              <div style="font-size:11px; color:#64748b; font-weight:600; text-transform:uppercase;">Assigned Engineer</div>
              <div style="font-size:14px; color:#0f172a; font-weight:600;">${data.assigned_to_name || 'Unassigned'}</div>
              <div style="font-size:12px; color:#64748b;">${data.assigned_to_email || 'Waiting for assignment'}</div>
            </div>
            <div style="display:flex; align-items:center; padding-left:24px; border-left:1px solid #e2e8f0;">
              ${rfq.status === 'rejected' ? `<button id="rfq-preview-delete" style="background:#fef2f2; border:1px solid #fecaca; color:#dc2626; font-size:12px; font-weight:700; cursor:pointer; padding:6px 12px; border-radius:6px; margin-right:16px; display:flex; align-items:center; gap:6px; transition:0.2s;"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 6h18"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg> Delete Quote</button>` : ''}
              <button id="rfq-preview-close" style="background:none; border:none; color:#94a3b8; font-size:28px; cursor:pointer; line-height:1; transition:0.2s;">&times;</button>
            </div>
          </div>
        </div>

        <!-- Status Timeline (read-only) -->
        <div id="rfq-user-timeline" style="display: flex; align-items: flex-start; justify-content: space-between; position: relative; padding: 14px 28px 50px 28px; background: #f8fafc; border-bottom: 1px solid #e2e8f0; flex-shrink: 0;"></div>

        <!-- Parts List -->
        <div id="rfq-info-col" style="flex:1; overflow-y:auto; padding:24px 28px;">
          ${reminderHtml}
          <div id="rfq-parts-list" style="display:flex; flex-direction:column; gap:12px;"></div>
        </div>
        
      </div>
    </div>
  `;
  document.body.insertAdjacentHTML('beforeend', modalHtml);

  // ── Populate read-only timeline ──
  {
    const commLog = data.communication_log || [];
    const statusIdx = ['submitted', 'under_review', 'confirmed', 'paid', 'processing', 'shipped'].indexOf(currentStatus);
    const documents = Array.isArray(data.documents) ? data.documents : [];
    const overrides = data.timeline_overrides || {};

    const stepSubmitted = overrides['Submitted'] !== undefined ? overrides['Submitted'] : true;
    const stepReview = overrides['Under Review'] !== undefined ? overrides['Under Review'] : (statusIdx >= 1 || currentStatus !== 'submitted');
    const stepInfo = overrides['Info Req.'] !== undefined ? overrides['Info Req.'] : (commLog.length > 0);
    const hasBeenConfirmed = data.confirmed_at || data.payment_status === 'awaiting_payment' || ['confirmed','paid','processing','shipped','done'].includes(currentStatus);
    const stepConfirmed = overrides['Confirmed'] !== undefined ? overrides['Confirmed'] : (hasBeenConfirmed || statusIdx >= 2);
    const quotedDoc = documents.slice().reverse().find(d => d.type === 'quotation');
    const stepQuote = overrides['Quoted'] !== undefined ? overrides['Quoted'] : !!quotedDoc;
    const stepPaid = overrides['Paid'] !== undefined ? overrides['Paid'] : (data.payment_status === 'paid' || statusIdx >= 3);
    const stepProcessing = overrides['Processing'] !== undefined ? overrides['Processing'] : (statusIdx >= 4);
    const stepFinished = overrides['Finished'] !== undefined ? overrides['Finished'] : (statusIdx >= 5);

    const timelineSteps = [
      { label: 'Submitted', active: stepSubmitted },
      { label: 'Under Review', active: stepReview },
      { label: 'Info Req.', active: stepInfo },
      { label: 'Confirmed', active: stepConfirmed },
      { label: 'Quoted', active: stepQuote },
      { label: 'Paid', active: stepPaid },
      { label: 'Processing', active: stepProcessing },
      { label: 'Finished', active: stepFinished }
    ];

    const tlEl = document.getElementById('rfq-user-timeline');
    if (tlEl) {
      tlEl.innerHTML = `
        <div style="position: absolute; top: 26px; left: 60px; right: 60px; height: 2px; background: #e2e8f0; z-index: 1;"></div>
        ${timelineSteps.map((step, i) => {
          const blockTrack = currentStatus === 'rejected' && i >= 3;
          const isNextActive = timelineSteps[i+1]?.active && !blockTrack;
          const showActiveTrack = step.active && isNextActive && i < timelineSteps.length - 1;
          return `
          <div style="display: flex; flex-direction: column; align-items: center; position: relative; z-index: 2; flex: 1;">
            ${showActiveTrack ? '<div style="position: absolute; top: 12px; left: 50%; right: -50%; height: 2px; background: #10b981; z-index: -1;"></div>' : ''}
            <div style="width: 24px; height: 24px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 11px; font-weight: bold; border: 2px solid #fff; box-shadow: 0 0 0 1px ${(step.active && !blockTrack) ? '#059669' : '#cbd5e1'}; background: ${(step.active && !blockTrack) ? '#10b981' : '#f8fafc'}; color: ${(step.active && !blockTrack) ? '#fff' : '#64748b'}; transition: all 0.2s;">
              ${(step.active && !blockTrack) ? '✓' : (i + 1)}
            </div>
            <div style="font-size: 10px; font-weight: 600; color: ${(step.active && !blockTrack) ? '#0f172a' : '#64748b'}; margin-top: 6px; text-align: center; text-transform: uppercase; letter-spacing: 0.3px;">
              ${step.label}
            </div>
            ${step.label === 'Confirmed' ? `
              <div style="position: absolute; top: 24px; left: 50%; width: 2px; height: 20px; background: ${currentStatus === 'rejected' ? '#ef4444' : '#e2e8f0'}; z-index: -1;"></div>
              <div style="position: absolute; top: 44px; left: 50%; transform: translateX(-50%); display: flex; flex-direction: column; align-items: center;">
                <div style="width: 24px; height: 24px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 11px; font-weight: bold; border: 2px solid #fff; box-shadow: 0 0 0 1px ${currentStatus === 'rejected' ? '#ef4444' : '#cbd5e1'}; background: ${currentStatus === 'rejected' ? '#ef4444' : '#f8fafc'}; color: ${currentStatus === 'rejected' ? '#fff' : '#64748b'}; transition: all 0.2s;">
                  ✕
                </div>
                <div style="font-size: 10px; font-weight: 600; color: ${currentStatus === 'rejected' ? '#ef4444' : '#94a3b8'}; margin-top: 6px; text-transform: uppercase;">Rejected</div>
              </div>
            ` : ''}
          </div>`;
        }).join('')}
      `;
    }
  }

  const modal = document.getElementById('rfq-preview-modal');
  const partsList = document.getElementById('rfq-parts-list');


  // ── Build all part cards ──
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://qvxrwbcmyrugjevgvujb.supabase.co';

  partsList.innerHTML = parts.map((p, idx) => {

    const fileName = p.name || p.file_name || `Part ${idx + 1}`;
    const path = p.storage_path || p.path;
    const bucket = p.bucket || 'rfq-uploads';
    const dlUrl = path ? `${supabaseUrl}/storage/v1/object/public/${bucket}/${path}?download=${encodeURIComponent(fileName)}` : '';

    // Build inline specs as plain text
    let specLines = '';
    if (data.type === 'instant') {
      const items = [];
      if (p.process) items.push(`<span style="font-weight:700; color:#0f172a;">Technology:</span> ${p.process}`);
      if (p.material) items.push(`<span style="font-weight:700; color:#0f172a;">Material:</span> ${p.material}`);
      if (p.finish) items.push(`<span style="font-weight:700; color:#0f172a;">Finish:</span> ${p.finish}`);
      items.push(`<span style="font-weight:700; color:#0f172a;">Qty:</span> ${p.qty || 1}`);
      specLines = `<div style="display:flex; gap:16px; flex-wrap:wrap; margin-top:5px; font-size:12px; color:#475569; line-height:1.6;">${items.join('<span style="color:#cbd5e1;">·</span>')}</div>`;
    } else {
      const items = [`<span style="font-weight:700; color:#0f172a;">Service:</span> ${data.service || '—'}`];
      if (data.timeline) items.push(`<span style="font-weight:700; color:#0f172a;">Timeline:</span> ${data.timeline}`);
      if (data.quantity) items.push(`<span style="font-weight:700; color:#0f172a;">Qty:</span> ${data.quantity}`);
      if (p.size) items.push(`<span style="font-weight:700; color:#0f172a;">File Size:</span> ${(p.size/1024).toFixed(1)} KB`);
      specLines = `<div style="display:flex; gap:16px; flex-wrap:wrap; margin-top:5px; font-size:12px; color:#475569; line-height:1.6;">${items.join('<span style="color:#cbd5e1;">·</span>')}</div>`;
    }

    // Geometry analysis as plain text line
    let geoHtml = '';
    if (p.analysis) {
      const a = p.analysis;
      const geoItems = [];
      if (a.boundingBox) {
        const bb = a.boundingBox;
        const bbL = (bb.length ?? bb.x ?? 0);
        const bbW = (bb.width ?? bb.y ?? 0);
        const bbH = (bb.height ?? bb.z ?? 0);
        geoItems.push(`<span style="font-weight:700; color:#0f172a;">Dimensions:</span> ${Number(bbL).toFixed(1)} × ${Number(bbW).toFixed(1)} × ${Number(bbH).toFixed(1)} mm`);
      }
      if (a.volume) geoItems.push(`<span style="font-weight:700; color:#0f172a;">Volume:</span> ${(a.volume / 1000).toFixed(2)} cm³`);
      if (a.surfaceArea) geoItems.push(`<span style="font-weight:700; color:#0f172a;">Surface:</span> ${(a.surfaceArea / 100).toFixed(2)} cm²`);
      if (a.triangleCount) geoItems.push(`<span style="font-weight:700; color:#0f172a;">Triangles:</span> ${a.triangleCount.toLocaleString()}`);
      if (geoItems.length) {
        geoHtml = `<div style="display:flex; gap:16px; flex-wrap:wrap; font-size:11px; color:#64748b; line-height:1.6; margin-top:3px;">${geoItems.join('<span style="color:#e2e8f0;">·</span>')}</div>`;
      }
    }

    // Customer notes
    let notesHtml = '';
    const partNotes = p.customDetails || p.notes || '';
    if (partNotes && partNotes.trim()) {
      notesHtml = `<div style="margin-top:8px; background:#fffbeb; border:1px solid #fde68a; border-radius:6px; padding:8px 12px; font-size:12px; color:#92400e; line-height:1.5;"><span style="font-weight:700;">📝 Notes:</span> ${partNotes.trim()}</div>`;
    }

    // Price
    const priceHtml = data.type === 'instant' && p.price ? `<div style="font-size:16px; font-weight:800; color:#15803d; white-space:nowrap;">$${Number(p.price).toLocaleString(undefined, {minimumFractionDigits:2, maximumFractionDigits:2})}</div>` : '';

    return `
    <div style="background:#fff; border:1px solid #e2e8f0; border-radius:12px; padding:16px 20px; display:flex; gap:16px; align-items:flex-start; transition: box-shadow 0.2s;" onmouseover="this.style.boxShadow='0 4px 12px rgba(0,0,0,0.06)'" onmouseout="this.style.boxShadow=''">
      <!-- Thumbnail -->
      <div class="rfq-part-thumb" data-idx="${idx}" style="width:72px; height:72px; min-width:72px; background:#0e1117; border-radius:10px; overflow:hidden; display:flex; align-items:center; justify-content:center; cursor:pointer; position:relative;">
        <div style="color:#475569; font-size:28px;">🧊</div>
      </div>

      <!-- Details -->
      <div style="flex:1; min-width:0;">
        <div style="display:flex; justify-content:space-between; align-items:flex-start; gap:12px;">
          <div style="min-width:0;">
            <div style="font-size:14px; font-weight:700; color:#0f172a; word-break:break-word; line-height:1.3;">${fileName}</div>
            ${specLines}
            ${geoHtml}
            ${notesHtml}
          </div>
          <div style="display:flex; flex-direction:column; align-items:flex-end; gap:6px; flex-shrink:0;">
            ${priceHtml}
            ${dlUrl ? `<a href="${dlUrl}" target="_blank" download="${fileName}" style="font-size:11px; color:#3b82f6; text-decoration:none; font-weight:600; display:flex; align-items:center; gap:4px; white-space:nowrap;" onmouseover="this.style.color='#1d4ed8'" onmouseout="this.style.color='#3b82f6'">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
              Download
            </a>` : ''}
          </div>
        </div>
      </div>
    </div>`;
  }).join('');

  // ── Totals Summary ──
  if (data.type === 'instant') {
    const subtotal = parts.reduce((sum, p) => sum + (Number(p.price) || 0), 0);
    const shipping = data.shipping;
    const grandTotal = Number(data.total_price) || subtotal;

    let totalsHtml = `
    <div style="background:#f8fafc; border:1px solid #e2e8f0; border-radius:12px; padding:20px 24px; margin-top:4px;">
      <div style="display:flex; justify-content:space-between; align-items:center; font-size:13px; color:#475569; margin-bottom:8px;">
        <span>Parts Subtotal <span style="color:#94a3b8;">(${parts.length} part${parts.length !== 1 ? 's' : ''})</span></span>
        <span style="font-weight:700; color:#0f172a;">$${subtotal.toLocaleString(undefined, {minimumFractionDigits:2, maximumFractionDigits:2})}</span>
      </div>`;

    if (shipping && shipping.cost > 0) {
      totalsHtml += `
      <div style="display:flex; justify-content:space-between; align-items:center; font-size:13px; color:#475569; margin-bottom:8px;">
        <span>
          <span style="font-weight:600; color:#0f172a;">Shipping</span> — ${shipping.method || 'Economy Air'}
          ${shipping.transit_days ? `<span style="color:#94a3b8; font-size:11px; margin-left:4px;">(${shipping.transit_days})</span>` : ''}
        </span>
        <span style="font-weight:700; color:#0f172a;">$${Number(shipping.cost).toLocaleString(undefined, {minimumFractionDigits:2, maximumFractionDigits:2})}</span>
      </div>`;
      if (shipping.destination) {
        totalsHtml += `
        <div style="font-size:11px; color:#94a3b8; margin-bottom:8px;">
          Destination: ${shipping.destination}
        </div>`;
      }
    } else {
      totalsHtml += `
      <div style="display:flex; align-items:center; gap:6px; font-size:11px; color:#f59e0b; background:rgba(234,179,8,0.06); border:1px solid rgba(234,179,8,0.15); border-radius:6px; padding:6px 10px; margin-bottom:8px;">
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
        Shipping not included in this estimate
      </div>`;
    }

    // Lead time
    const leadTimes = parts.map(p => p.lead_time).filter(Boolean);
    if (leadTimes.length > 0) {
      const maxLead = Math.max(...leadTimes);
      totalsHtml += `
      <div style="display:flex; justify-content:space-between; align-items:center; font-size:12px; color:#64748b; margin-bottom:8px;">
        <span>Est. Production Lead Time</span>
        <span style="font-weight:600; color:#0f172a;">${maxLead} business days</span>
      </div>`;
    }

    totalsHtml += `
      <div style="border-top:2px solid #e2e8f0; padding-top:12px; margin-top:4px; display:flex; justify-content:space-between; align-items:center;">
        <span style="font-size:15px; font-weight:700; color:#0f172a;">Grand Total</span>
        <span style="font-size:20px; font-weight:800; color:#15803d;">$${grandTotal.toLocaleString(undefined, {minimumFractionDigits:2, maximumFractionDigits:2})}</span>
      </div>
    </div>`;

    partsList.innerHTML += totalsHtml;
  }

  // Render 3D thumbnails asynchronously
  partsList.querySelectorAll('.rfq-part-thumb').forEach(thumbEl => {
    const idx = parseInt(thumbEl.dataset.idx);
    const p = parts[idx];
    const path = p.storage_path || p.path;
    const bucket = p.bucket || 'rfq-uploads';
    if (path) {
      const fileExt = (path.split('.').pop() || '').toLowerCase();
      render3DPreview({ storage_path: path, file_type: fileExt, bucket: bucket }, thumbEl);
    }
  });

  // Close & delete handlers
  document.getElementById('rfq-preview-close')?.addEventListener('click', () => {
    modal.remove();
  });
  document.getElementById('rfq-preview-delete')?.addEventListener('click', async () => {
    if (!confirm('Are you sure you want to permanently delete this rejected quote?')) return;
    const btn = document.getElementById('rfq-preview-delete');
    btn.disabled = true;
    btn.textContent = 'Deleting...';
    try {
      const { error } = await supabase.from('rfq_history').delete().eq('id', rfq.id);
      if (error) throw error;
      modal.remove();
      await loadRFQs();
    } catch (e) {
      alert('Failed to delete quote: ' + e.message);
      btn.disabled = false;
      btn.innerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 6h18"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg> Delete Quote`;
    }
  });

  modal.addEventListener('click', (e) => { if (e.target === modal) modal.remove(); });

  // ── Payment Panel (shown when admin has confirmed the quote) ──
  // Show payment options if the RFQ is confirmed and payment has NOT been completed.
  // Accept either explicit awaiting_payment flag OR just the confirmed status (admin may
  // have used the status dropdown rather than the "Confirm to Client" button).
  const paymentPending = data.payment_status === 'awaiting_payment'
    || (rfq.status === 'confirmed' && data.payment_status !== 'paid');
  if (paymentPending && rfq.status === 'confirmed') {
    injectPaymentPanel(rfq, data, modal);
  }
}

function injectPaymentPanel(rfq, data, modal) {
  const infoCol = modal.querySelector('#rfq-info-col');
  if (!infoCol) return; // fallback guard

  const amount = data.confirmed_price || data.total_price || 0;
  const amountFmt = `$${Number(amount).toLocaleString(undefined, {minimumFractionDigits:2, maximumFractionDigits:2})}`;

  const panel = document.createElement('div');
  panel.id = 'rfq-payment-panel';
  panel.style.cssText = 'margin-top:24px; border-top:2px solid #e2e8f0; padding-top:20px;';
  panel.innerHTML = `
    <div style="font-size:10px; color:#15803d; font-weight:800; text-transform:uppercase; letter-spacing:0.6px; margin-bottom:12px;">
      ✅ Quote Confirmed — Payment Required
    </div>
    <div style="font-size:13px; color:#334155; margin-bottom:16px; line-height:1.5;">
      Your quote has been confirmed at <strong style="color:#15803d;">${amountFmt}</strong>.<br>
      Choose how you'd like to proceed:
    </div>

    <!-- Option A: Card payment via Stripe -->
    <button id="rfq-pay-stripe-btn"
      style="width:100%; padding:14px 20px; background:linear-gradient(135deg,#3b82f6,#1d4ed8); color:#fff; border:none; border-radius:12px; font-size:14px; font-weight:700; cursor:pointer; font-family:inherit; display:flex; align-items:center; justify-content:center; gap:10px; margin-bottom:10px; box-shadow:0 4px 14px rgba(59,130,246,0.35); transition:opacity 0.2s;">
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="1" y="4" width="22" height="16" rx="2"/><line x1="1" y1="10" x2="23" y2="10"/></svg>
      Pay ${amountFmt} by Card (Stripe)
    </button>

    <div style="text-align:center; font-size:11px; color:#94a3b8; margin-bottom:10px;">— or —</div>

    <!-- Option B: Bank Transfer -->
    <button id="rfq-pay-bank-btn"
      style="width:100%; padding:12px 20px; background:#f8fafc; color:#0f172a; border:1.5px solid #e2e8f0; border-radius:12px; font-size:13px; font-weight:600; cursor:pointer; font-family:inherit; display:flex; align-items:center; justify-content:center; gap:10px; transition:background 0.2s;">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 9 12 2 21 9"/><path d="M3 9v12h18V9"/><line x1="9" y1="21" x2="9" y2="12"/><line x1="15" y1="21" x2="15" y2="12"/></svg>
      Pay via Bank Transfer
    </button>

    <!-- Bank Transfer details (hidden by default) -->
    <div id="rfq-bank-details" style="display:none; margin-top:16px; background:#f0fdf4; border:1px solid #bbf7d0; border-radius:12px; padding:16px;">
      <div style="font-size:11px; color:#15803d; font-weight:700; text-transform:uppercase; letter-spacing:0.5px; margin-bottom:12px;">🏦 Bank Transfer Details</div>
      <div style="display:grid; gap:6px; font-size:13px; color:#334155;">
        <div style="display:flex; justify-content:space-between; padding:6px 0; border-bottom:1px solid #dcfce7;"><span style="color:#64748b;">Bank Name</span><strong>NAB — National Australia Bank</strong></div>
        <div style="display:flex; justify-content:space-between; padding:6px 0; border-bottom:1px solid #dcfce7;"><span style="color:#64748b;">Account Name</span><strong>Paniani Products Pty Ltd</strong></div>
        <div style="display:flex; justify-content:space-between; padding:6px 0; border-bottom:1px solid #dcfce7;"><span style="color:#64748b;">BSB</span><strong>083-004</strong></div>
        <div style="display:flex; justify-content:space-between; padding:6px 0; border-bottom:1px solid #dcfce7;"><span style="color:#64748b;">Account No.</span><strong>978 360 554</strong></div>
        <div style="display:flex; justify-content:space-between; padding:6px 0; border-bottom:1px solid #dcfce7;"><span style="color:#64748b;">SWIFT / BIC</span><strong>NATAAU3303</strong></div>
        <div style="display:flex; justify-content:space-between; padding:6px 0;"><span style="color:#64748b;">Amount</span><strong style="color:#15803d;">${amountFmt} AUD</strong></div>
      </div>

      <!-- Prominent reference box -->
      <div style="margin-top:14px; background:#fff; border:2px solid #16a34a; border-radius:10px; padding:12px 14px;">
        <div style="font-size:10px; font-weight:700; color:#15803d; text-transform:uppercase; letter-spacing:0.5px; margin-bottom:6px;">⚠️ Payment Reference — use exactly as shown</div>
        <div style="display:flex; align-items:center; justify-content:space-between; gap:10px;">
          <span id="bank-ref-code" style="font-size:17px; font-weight:800; color:#0f172a; letter-spacing:1px; font-family:'SF Mono','Fira Code',monospace;">ADT-${rfq.id?.slice(0,8).toUpperCase()}</span>
          <button id="copy-ref-btn" onclick="navigator.clipboard.writeText('ADT-${rfq.id?.slice(0,8).toUpperCase()}').then(()=>{this.textContent='Copied!';this.style.background='#16a34a';this.style.color='#fff';setTimeout(()=>{this.textContent='Copy';this.style.background='';this.style.color='';},2000)})"
            style="padding:5px 12px; background:#f1f5f9; border:1px solid #e2e8f0; border-radius:6px; font-size:11px; font-weight:700; cursor:pointer; font-family:inherit; color:#0f172a; transition:0.2s; flex-shrink:0;">Copy</button>
        </div>
        <div style="font-size:11px; color:#64748b; margin-top:5px;">This reference is unique to your order and is how we match your payment.</div>
      </div>

      <div style="margin-top:12px; padding:10px 12px; background:#fffbeb; border-radius:8px; border:1px solid #fde68a; font-size:12px; color:#92400e; line-height:1.6;">
        ⏱ Allow <strong>2–3 business days</strong> for the transfer to clear. Your order moves to production once payment is confirmed by our team.
      </div>
      <button id="rfq-accept-bank-btn"
        style="width:100%; margin-top:14px; padding:12px; background:#15803d; color:#fff; border:none; border-radius:10px; font-size:13px; font-weight:700; cursor:pointer; font-family:inherit;">
        ✔ I Confirm &amp; Accept — Bank Transfer
      </button>
    </div>

    <div id="rfq-payment-success-msg" style="display:none; margin-top:16px; text-align:center; padding:16px; background:#f0fdf4; border-radius:12px; border:1px solid #bbf7d0;">
      <div style="font-size:22px; margin-bottom:6px;">🎉</div>
      <div style="font-size:14px; font-weight:700; color:#15803d;">Order Accepted!</div>
      <div style="font-size:12px; color:#64748b; margin-top:4px;">Bank transfer confirmation received. Our team will start production once payment clears.</div>
    </div>
  `;

  infoCol.appendChild(panel);

  // Stripe button
  panel.querySelector('#rfq-pay-stripe-btn')?.addEventListener('click', async () => {
    const btn = panel.querySelector('#rfq-pay-stripe-btn');
    btn.disabled = true;
    btn.innerHTML = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="1" y="4" width="22" height="16" rx="2"/><line x1="1" y1="10" x2="23" y2="10"/></svg> Redirecting to Stripe…`;
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const user = sessionData?.session?.user;

      const res = await fetch('/.netlify/functions/rfq-checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          rfqId: rfq.id,
          amount: amount,
          projectName: data.project_name || 'Manufacturing Order',
          userEmail: user?.email || '',
          userId: user?.id || '',
        }),
      });

      // Safely parse response regardless of content-type header
      const text = await res.text();
      let result = null;
      try { result = JSON.parse(text); } catch (_) { result = null; }

      if (result?.url) {
        // Success — redirect to Stripe
        window.location.href = result.url;
      } else if (window.location.hostname === 'localhost') {
        alert('ℹ️ Stripe checkout requires the deployed site or `netlify dev`.\n\nNot available in the local Vite dev server.');
        btn.disabled = false;
        btn.innerHTML = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="1" y="4" width="22" height="16" rx="2"/><line x1="1" y1="10" x2="23" y2="10"/></svg> Pay ${amountFmt} by Card (Stripe)`;
      } else {
        alert('Could not initiate payment: ' + (result?.error || `HTTP ${res.status}`));
        btn.disabled = false;
        btn.innerHTML = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="1" y="4" width="22" height="16" rx="2"/><line x1="1" y1="10" x2="23" y2="10"/></svg> Pay ${amountFmt} by Card (Stripe)`;
      }
    } catch (err) {
      alert('Payment error: ' + err.message);
      btn.disabled = false;
      btn.innerHTML = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="1" y="4" width="22" height="16" rx="2"/><line x1="1" y1="10" x2="23" y2="10"/></svg> Pay ${amountFmt} by Card (Stripe)`;
    }
  });


  // Bank transfer toggle
  panel.querySelector('#rfq-pay-bank-btn')?.addEventListener('click', () => {
    const details = panel.querySelector('#rfq-bank-details');
    details.style.display = details.style.display === 'none' ? 'block' : 'none';
  });

  // Accept bank transfer
  panel.querySelector('#rfq-accept-bank-btn')?.addEventListener('click', async () => {
    const btn = panel.querySelector('#rfq-accept-bank-btn');
    btn.disabled = true;
    btn.textContent = 'Submitting…';
    try {
      const updatedData = { ...data, payment_method: 'bank_transfer', payment_status: 'bank_transfer_pending' };
      const { error } = await supabase
        .from('rfq_history')
        .update({ status: 'processing', rfq_data: updatedData })
        .eq('id', rfq.id);
      if (error) throw error;

      panel.querySelector('#rfq-bank-details').style.display = 'none';
      panel.querySelector('#rfq-payment-success-msg').style.display = 'block';
      panel.querySelector('#rfq-pay-bank-btn').style.display = 'none';
      panel.querySelector('#rfq-pay-stripe-btn').style.display = 'none';

      // Send Bank Details Email
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: profile } = await supabase.from('profiles').select('first_name, last_name, company').eq('id', user.id).single();
        const clientName = profile ? `${profile.first_name || ''} ${profile.last_name || ''}`.trim() : user.email;
        const amountFmt = Number(data.total_price || 0).toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2});
        const bankRef = `ADT-${(rfq.id||'').slice(0,8).toUpperCase()}`;
        
        await fetch('/.netlify/functions/send-email', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            type: 'bank_transfer_details',
            email: user.email,
            name: clientName,
            projectName: data.project_name,
            amount: amountFmt,
            bankRef: bankRef
          })
        }).catch(e => console.warn('Bank details email skipped:', e));
      }

    } catch (err) {
      alert('Failed to confirm order: ' + err.message);
      btn.disabled = false;
      btn.textContent = '✔ I Confirm & Accept — Bank Transfer';
    }
  });
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

  const folderInput = document.getElementById('folder-input');
  
  const btnFiles = document.getElementById('btn-browse-files');
  const btnFolders = document.getElementById('btn-browse-folders');

  // Prevent default click on uploadZone from opening fileInput if they clicked the buttons
  uploadZone.addEventListener('click', (e) => {
    if (e.target === btnFiles || e.target === btnFolders) return;
    fileInput.click();
  });

  uploadZone.addEventListener('dragover', (e) => { e.preventDefault(); uploadZone.classList.add('dragging'); });
  uploadZone.addEventListener('dragleave', () => uploadZone.classList.remove('dragging'));
  uploadZone.addEventListener('drop', async (e) => {
    e.preventDefault();
    uploadZone.classList.remove('dragging');
    
    const items = e.dataTransfer.items;
    if (!items) {
      await handleFileUpload(Array.from(e.dataTransfer.files));
      return;
    }

    const filesToUpload = [];
    async function traverseFileTree(item, path = '') {
      if (!item) return;
      if (item.isFile) {
        const file = await new Promise(resolve => item.file(resolve));
        file.customPath = path; 
        filesToUpload.push(file);
      } else if (item.isDirectory) {
        const dirReader = item.createReader();
        const entries = await new Promise(resolve => {
          dirReader.readEntries(resolve);
        });
        for (const entry of entries) {
          await traverseFileTree(entry, path + item.name + '/');
        }
      }
    }

    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      if (item.kind === 'file') {
        const entry = item.webkitGetAsEntry();
        if (entry) {
          await traverseFileTree(entry);
        }
      }
    }
    
    if (filesToUpload.length > 0) {
      await handleFileUpload(filesToUpload);
    }
  });

  btnFiles?.addEventListener('click', (e) => {
    e.stopPropagation();
    fileInput.click();
  });

  btnFolders?.addEventListener('click', (e) => {
    e.stopPropagation();
    folderInput.click();
  });

  fileInput.addEventListener('change', async () => {
    await handleFileUpload(Array.from(fileInput.files));
    fileInput.value = '';
  });

  folderInput?.addEventListener('change', async () => {
    const files = Array.from(folderInput.files);
    // folderInput files have webkitRelativePath like "FolderName/Subfolder/file.ext"
    files.forEach(f => {
      if (f.webkitRelativePath) {
        // We want the path excluding the filename itself
        const parts = f.webkitRelativePath.split('/');
        parts.pop(); // remove filename
        f.customPath = parts.join('/');
      }
    });
    await handleFileUpload(files);
    folderInput.value = '';
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
      const fullPath = currentFolder ? currentFolder + '/' + folderName : folderName;
      if (!virtualFolders.includes(fullPath)) {
        virtualFolders.push(fullPath);
      }
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
    
    // Determine the target folder string.
    // Clean up trailing slash from customPath if any.
    let cp = file.customPath || '';
    if (cp.endsWith('/')) cp = cp.slice(0, -1);
    
    let targetFolder = null;
    if (currentFolder && cp) {
      targetFolder = currentFolder + '/' + cp;
    } else if (currentFolder) {
      targetFolder = currentFolder;
    } else if (cp) {
      targetFolder = cp;
    }

    const { error } = await uploadFile(file, category, targetFolder);
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

  if (filesCache.length === 0 && virtualFolders.length === 0) {
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

function getDirectoryContents(files, virtuals, currentPath) {
  const prefix = currentPath ? currentPath + '/' : '';
  
  const folders = new Set();
  const fileList = [];

  // Add virtual folders
  virtuals.forEach(v => {
    if (!currentPath && !v.includes('/')) folders.add(v);
    else if (currentPath && v.startsWith(prefix)) {
      const rest = v.substring(prefix.length);
      const nextSlash = rest.indexOf('/');
      if (nextSlash === -1) folders.add(rest);
      else folders.add(rest.substring(0, nextSlash));
    } else if (!currentPath && v.includes('/')) {
      folders.add(v.split('/')[0]);
    }
  });

  files.forEach(f => {
    const folderPath = f.meta?.folder || '';
    if (folderPath === (currentPath || '')) {
      fileList.push(f);
    } else if (!currentPath && folderPath) {
      folders.add(folderPath.split('/')[0]);
    } else if (currentPath && folderPath.startsWith(prefix)) {
      const rest = folderPath.substring(prefix.length);
      const nextSlash = rest.indexOf('/');
      if (nextSlash === -1) {
        if (rest !== '') folders.add(rest);
      } else {
        folders.add(rest.substring(0, nextSlash));
      }
    }
  });

  return { folders: Array.from(folders), files: fileList };
}

// ── Grid View ──────────────────────────────────────
function renderFilesGrid(container) {
  container.className = 'ws-file-grid';
  
  const dir = getDirectoryContents(filesCache, virtualFolders, currentFolder);

  // Breadcrumb
  let breadcrumb = '';
  if (currentFolder) {
    const parts = currentFolder.split('/');
    let html = `<span class="ws-breadcrumb__link" data-goto-root>📁 All Files</span>`;
    let currentPath = '';
    parts.forEach((p, i) => {
      currentPath += (currentPath ? '/' : '') + p;
      html += `<span class="ws-breadcrumb__sep">›</span>`;
      if (i === parts.length - 1) {
        html += `<span class="ws-breadcrumb__current">${p}</span>`;
      } else {
        html += `<span class="ws-breadcrumb__link" data-goto-folder="${currentPath}">${p}</span>`;
      }
    });
    breadcrumb = `<div class="ws-breadcrumb" style="grid-column:1/-1;">${html}</div>`;
  }

  // Folder cards
  const folderCards = dir.folders.map(fname => {
    // We compute a full path to pass into data-folder-name
    const fullPath = currentFolder ? currentFolder + '/' + fname : fname;
    // Count files deep in this folder
    const count = filesCache.filter(f => (f.meta?.folder || '').startsWith(fullPath)).length;
    return `<div class="ws-file-card ws-file-card--folder" data-folder-name="${fullPath}">
              <div class="ws-file-card__icon ws-file-card__icon--folder">📂</div>
              <div class="ws-file-card__name" title="${fname}">${fname}</div>
              <div class="ws-file-card__meta">${count} file${count !== 1 ? 's' : ''}</div>
            </div>`;
  }).join('');

  const fileCards = dir.files.map(file => {
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

  const fileFolders = filesCache.map(f => f.meta?.folder).filter(Boolean);
  const allFolderNames = [...new Set([...fileFolders, ...virtualFolders])];

  const dir = getDirectoryContents(filesCache, virtualFolders, currentFolder);

  // Breadcrumb
  let breadcrumb = '';
  if (currentFolder) {
    const parts = currentFolder.split('/');
    let html = `<span class="ws-breadcrumb__link" data-goto-root>📁 All Files</span>`;
    let currentPath = '';
    parts.forEach((p, i) => {
      currentPath += (currentPath ? '/' : '') + p;
      html += `<span class="ws-breadcrumb__sep">›</span>`;
      if (i === parts.length - 1) {
        html += `<span class="ws-breadcrumb__current">${p}</span>`;
      } else {
        html += `<span class="ws-breadcrumb__link" data-goto-folder="${currentPath}">${p}</span>`;
      }
    });
    breadcrumb = `<div class="ws-breadcrumb">${html}</div>`;
  }

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

  dir.folders.forEach(fname => {
    const fullPath = currentFolder ? currentFolder + '/' + fname : fname;
    const count = filesCache.filter(f => (f.meta?.folder || '').startsWith(fullPath)).length;
    html += `
      <tr class="ws-file-row ws-file-row--folder" data-folder-name="${fullPath}">
        <td></td>
        <td style="font-size:18px;">📂</td>
        <td style="font-weight:600; cursor:pointer;" class="ws-folder-link ws-td-primary" data-folder-name="${fullPath}">${fname}</td>
        <td class="ws-td-muted">Folder</td>
        <td class="ws-td-muted">${count} item${count !== 1 ? 's' : ''}</td>
        <td></td>
        <td></td>
        <td>
          <div class="ws-action-btns">
            <button class="ws-action-btn" data-action="rename-folder" data-folder="${fullPath}" title="Rename folder">
              <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
            </button>
          </div>
        </td>
      </tr>`;
  });

  dir.files.forEach(file => {
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

  // Navigate to specific folder from breadcrumb
  container.querySelectorAll('[data-goto-folder]').forEach(el => {
    el.addEventListener('click', () => { 
      currentFolder = el.dataset.gotoFolder; 
      renderFiles(); 
    });
  });

  // Navigate to folder from grid card
  container.querySelectorAll('.ws-file-card--folder').forEach(el => {
    el.addEventListener('click', () => {
      currentFolder = el.dataset.folderName;
      renderFiles();
    });
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
  // Show loading spinner while the 3D engine and file load
  container.innerHTML = `
    <div style="display:flex;flex-direction:column;align-items:center;justify-content:center;height:100%;gap:14px;background:#0e1117;">
      <div style="width:40px;height:40px;border:3px solid rgba(255,255,255,0.1);border-top-color:#60a5fa;border-radius:50%;animation:spin3d 0.9s linear infinite;"></div>
      <div style="font-size:12px;color:#64748b;font-family:Inter,sans-serif;">Loading 3D model…</div>
    </div>
    <style>@keyframes spin3d{to{transform:rotate(360deg)}}</style>`;
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
          m.supabase.storage.from(file.bucket || 'user-files').download(file.storage_path)
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
          m.supabase.storage.from(file.bucket || 'user-files').download(file.storage_path)
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
      // Check if container is still in DOM and part of a visible modal
      if (!document.body.contains(container)) return;
      
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


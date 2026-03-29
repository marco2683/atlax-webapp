/**
 * PRD — Shortlist Component
 * Manages the UI for the supplier shortlist.
 */
import { saveShortlist } from '../services/profile.js';

export function renderShortlist(shortlist, tier = 'free') {
  const panel = document.getElementById('shortlist-panel');
  const itemsContainer = document.getElementById('shortlist-items');
  const countBadge = document.getElementById('shortlist-count');

  if (!panel || !itemsContainer || !countBadge) return;

  if (shortlist.length === 0) {
    panel.classList.add('hidden');
    return;
  }

  panel.classList.remove('hidden');
  countBadge.textContent = shortlist.length;

  // Tier gating logic
  const isLocked = tier === 'free' || tier === 'contacts';

  // Add Email + Save buttons to header if they don't exist
  const header = panel.querySelector('.shortlist-panel__header');
  if (!panel.querySelector('.shortlist-panel__email-btn')) {
    const emailBtn = document.createElement('button');
    emailBtn.className = 'shortlist-panel__email-btn btn btn--primary btn--sm';
    emailBtn.innerHTML = `
      <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="m22 2-7 20-4-9-9-4Z"/><path d="M22 2 11 13"/></svg>
      <span>Send to my Email</span>
    `;
    emailBtn.addEventListener('click', () => {
      window.dispatchEvent(new CustomEvent('prd-email-shortlist', { detail: { shortlist } }));
    });
    header.insertBefore(emailBtn, countBadge);
  }

  if (!panel.querySelector('.shortlist-panel__save-btn')) {
    const saveBtn = document.createElement('button');
    saveBtn.className = 'shortlist-panel__save-btn';
    saveBtn.title = 'Save shortlist to your account';
    saveBtn.innerHTML = `
      <svg xmlns="http://www.w3.org/2000/svg" width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/></svg>
      Save
    `;
    saveBtn.addEventListener('click', async () => {
      const defaultName = `Shortlist — ${new Date().toLocaleDateString('en-AU', { day:'numeric', month:'short', year:'numeric' })}`;
      const name = prompt('Name this shortlist:', defaultName);
      if (!name) return; // User cancelled
      const originalHTML = saveBtn.innerHTML;
      saveBtn.innerHTML = 'Saving...';
      saveBtn.disabled = true;
      const ids = shortlist.map(item => item.supplier.id || item.supplier.name);
      const { error } = await saveShortlist(name.trim(), ids, { items: shortlist });
      if (error) {
        saveBtn.innerHTML = '✗ Failed';
      } else {
        saveBtn.innerHTML = '✓ Saved!';
      }
      setTimeout(() => {
        saveBtn.innerHTML = originalHTML;
        saveBtn.disabled = false;
      }, 2500);
    });
    header.insertBefore(saveBtn, countBadge);
  }

  itemsContainer.innerHTML = shortlist.map((item, idx) => {
    const s = item.supplier;
    return `
      <div class="shortlist-item" data-id="${s.id || s.name}" data-idx="${idx}">
        <button class="shortlist-item__remove" title="Remove from Shortlist">
          <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
        </button>

        <div class="shortlist-item__content">
          <span class="shortlist-item__name shortlist-item__name--link" data-supplier-idx="${idx}" title="Open supplier card">${s.name}</span>
          <div class="shortlist-item__meta">
            <span class="shortlist-item__region">📍 ${s.country}</span>
            <span class="shortlist-item__tech">${item.techName}</span>
          </div>
        </div>
        
        <div class="shortlist-item__actions">
          <button class="shortlist-item__action-btn ${isLocked ? 'shortlist-item__action-btn--locked' : ''}" 
                  data-action="ppt" 
                  title="${isLocked ? 'Upgrade to Intelligence to download PPT' : 'Download PPT Presentation'}"
                  ${isLocked ? 'disabled' : ''}>
            ${isLocked ? '<svg class="lock-icon" xmlns="http://www.w3.org/2000/svg" width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><rect width="18" height="11" x="3" y="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>' : ''}
            <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect width="18" height="18" x="3" y="3" rx="2"/><path d="M9 13v-3h6v3"/><path d="M12 10v6"/></svg>
          </button>
          <button class="shortlist-item__action-btn ${isLocked ? 'shortlist-item__action-btn--locked' : ''}" 
                  data-action="form" 
                  title="${isLocked ? 'Upgrade to Intelligence to view onboarding form' : 'View Onboarding Form'}"
                  ${isLocked ? 'disabled' : ''}>
            ${isLocked ? '<svg class="lock-icon" xmlns="http://www.w3.org/2000/svg" width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><rect width="18" height="11" x="3" y="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>' : ''}
            <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/><polyline points="14 2 14 8 20 8"/></svg>
          </button>
          <button class="shortlist-item__action-btn ${isLocked ? 'shortlist-item__action-btn--locked' : ''}" 
                  data-action="cert" 
                  title="${isLocked ? 'Upgrade to Intelligence to download certificates' : 'Download Quality Certificates'}"
                  ${isLocked ? 'disabled' : ''}>
            ${isLocked ? '<svg class="lock-icon" xmlns="http://www.w3.org/2000/svg" width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><rect width="18" height="11" x="3" y="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>' : ''}
            <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="8" r="6"/><path d="M15.477 12.89 17 22l-5-3-5 3 1.523-9.11"/></svg>
          </button>
        </div>
      </div>
    `;
  }).join('');

  // Add remove handlers
  itemsContainer.querySelectorAll('.shortlist-item__remove').forEach((btn, idx) => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      window.dispatchEvent(new CustomEvent('prd-remove-from-shortlist', { detail: { index: idx } }));
    });
  });

  // Add click-to-open-card handlers on supplier names
  itemsContainer.querySelectorAll('.shortlist-item__name--link').forEach(nameEl => {
    nameEl.addEventListener('click', (e) => {
      e.stopPropagation();
      const idx = parseInt(nameEl.dataset.supplierIdx, 10);
      const item = shortlist[idx];
      if (item) {
        window.dispatchEvent(new CustomEvent('prd-open-supplier', {
          detail: { techName: item.techName, supplier: item.supplier }
        }));
      }
    });
  });

  // Add action handlers
  itemsContainer.querySelectorAll('.shortlist-item__action-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const action = btn.getAttribute('data-action');
      const supplierId = btn.closest('.shortlist-item').getAttribute('data-id');
      window.dispatchEvent(new CustomEvent('prd-download-doc', {
        detail: { action, supplierId }
      }));
    });
  });
}

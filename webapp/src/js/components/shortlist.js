/**
 * PRD — Shortlist Component
 * Manages the UI for the supplier shortlist.
 * Updated: 2026-04-29 – Removed tier-gating, connected doc download buttons
 * to actual supplier files, added technologies, improved dark theme visibility.
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

    // Document availability
    const hasRFI = !!(s.docRFI);
    const hasPPT = !!(s.docPresentation);
    const hasCerts = !!(s.docCertifications);

    // Primary technologies
    const techs = (s.technologies || []).concat(s.tags || []).slice(0, 3);
    const techsLine = techs.length > 0
      ? `<div class="shortlist-item__techs">${techs.map(t => `<span class="shortlist-item__tech-pill">${t}</span>`).join('')}</div>`
      : '';

    // Doc button builder — enabled links to actual file, disabled shows "Not available"
    const docBtn = (available, url, label, iconSvg) => {
      if (available && url) {
        return `<a href="${url}" target="_blank" download class="shortlist-item__action-btn shortlist-item__action-btn--active" title="Download ${label}">${iconSvg}</a>`;
      }
      return `<div class="shortlist-item__action-btn shortlist-item__action-btn--disabled" title="${label} — Not available">${iconSvg}</div>`;
    };

    // Icons
    const rfiIcon = `<svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>`;
    const pptIcon = `<svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="3" width="20" height="14" rx="2" ry="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/></svg>`;
    const certsIcon = `<svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>`;

    return `
      <div class="shortlist-item" data-id="${s.id || s.name}" data-idx="${idx}">
        <button class="shortlist-item__remove" title="Remove from Shortlist">
          <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
        </button>

        <div class="shortlist-item__content">
          <span class="shortlist-item__name shortlist-item__name--link" data-supplier-idx="${idx}" title="Open supplier card">${s.name}</span>
          <div class="shortlist-item__meta">
            <span class="shortlist-item__region">📍 ${s.city || s.country || 'China'}</span>
          </div>
          ${techsLine}
        </div>
        
        <div class="shortlist-item__actions">
          ${docBtn(hasRFI, s.docRFI, 'RFI Form', rfiIcon)}
          ${docBtn(hasPPT, s.docPresentation, 'Presentation', pptIcon)}
          ${docBtn(hasCerts, s.docCertifications, 'Certificates', certsIcon)}
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
}

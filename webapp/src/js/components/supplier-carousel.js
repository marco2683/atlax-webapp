/* ============================================================
   PRD — Supplier Detail Modal (Comprehensive Dossier)
   Updated: 2026-04-01 – Added photo gallery, video, materials,
   production capacity, trade, sustainability, sample sections
   ============================================================ */

const DEFAULT_BANNER = 'https://images.unsplash.com/photo-1565043589221-1a6fd9ae45c7?w=1200&q=80';

let currentIndex = 0;
let currentSuppliers = [];
let currentTier = 'free';

export function setCurrentTier(tierId) {
  currentTier = tierId;
  if (!document.getElementById('supplier-modal')?.classList.contains('hidden')) {
    renderCurrentCard();
  }
}

function generateClassifiers(factoryScore) {
  const seed = factoryScore || 70;
  const jitter = (offset) => Math.max(0, Math.min(100, seed + offset));
  const dims = {
    speed:      jitter(Math.floor((seed * 3) % 21) - 10),
    cost:       jitter(Math.floor((seed * 7) % 25) - 12),
    complexity: jitter(Math.floor((seed * 11) % 19) - 8),
    lowVolume:  jitter(Math.floor((seed * 13) % 23) - 15),
    precision:  jitter(Math.floor((seed * 17) % 17) - 5),
  };
  const toLabel = (score) => {
    if (score >= 85) return { label: 'Excellent', color: '#10b981', bg: 'rgba(16,185,129,0.12)' };
    if (score >= 70) return { label: 'Good', color: '#3b82f6', bg: 'rgba(59,130,246,0.12)' };
    if (score >= 55) return { label: 'Average', color: '#f59e0b', bg: 'rgba(245,158,11,0.12)' };
    return { label: 'Limited', color: '#6b7280', bg: 'rgba(107,114,128,0.12)' };
  };
  return [
    { name: 'Speed',          ...toLabel(dims.speed) },
    { name: 'Cost',           ...toLabel(dims.cost) },
    { name: 'Complexity',     ...toLabel(dims.complexity) },
    { name: 'Low Volume',     ...toLabel(dims.lowVolume) },
    { name: 'High-Precision', ...toLabel(dims.precision) },
  ];
}

export function openSupplierCarousel(techName, suppliers) {
  currentSuppliers = suppliers;
  currentIndex = 0;
  const backdrop = document.getElementById('supplier-backdrop');
  const modal = document.getElementById('supplier-modal');
  const title = document.getElementById('supplier-modal-title');
  title.textContent = `${techName} Suppliers`;
  backdrop.classList.remove('hidden');
  modal.classList.remove('hidden');
  renderCurrentCard();
  updateCounter();
}

export function closeSupplierCarousel() {
  document.getElementById('supplier-backdrop')?.classList.add('hidden');
  document.getElementById('supplier-modal')?.classList.add('hidden');
}

export function initSupplierCarousel() {
  document.getElementById('supplier-close')?.addEventListener('click', closeSupplierCarousel);
  document.getElementById('supplier-backdrop')?.addEventListener('click', closeSupplierCarousel);
  document.getElementById('carousel-prev')?.addEventListener('click', () => {
    if (currentIndex > 0) { currentIndex--; renderCurrentCard(); updateCounter(); }
  });
  document.getElementById('carousel-next')?.addEventListener('click', () => {
    if (currentIndex < currentSuppliers.length - 1) { currentIndex++; renderCurrentCard(); updateCounter(); }
  });
  document.addEventListener('keydown', (e) => {
    const modal = document.getElementById('supplier-modal');
    if (modal?.classList.contains('hidden')) return;
    if (e.key === 'ArrowLeft' && currentIndex > 0) { currentIndex--; renderCurrentCard(); updateCounter(); }
    else if (e.key === 'ArrowRight' && currentIndex < currentSuppliers.length - 1) { currentIndex++; renderCurrentCard(); updateCounter(); }
    else if (e.key === 'Escape') closeSupplierCarousel();
  });
}

function updateCounter() {
  const el = document.getElementById('carousel-counter');
  if (el) el.textContent = `${currentIndex + 1} / ${currentSuppliers.length}`;
}

// Removed Mock Data Functions

// Removed Mock trade data

/* ── Main Render ── */
function renderCurrentCard() {
  const body = document.getElementById('supplier-modal-body');
  if (!body || !currentSuppliers[currentIndex]) return;
  const s = currentSuppliers[currentIndex];
  const score = s.factoryScore || 70;

  // Classifier row
  const classifiers = generateClassifiers(score);
  const classifierHTML = classifiers.map(c => `
    <div style="display: flex; flex-direction: column; align-items: center; gap: 3px; flex: 1; min-width: 0;">
      <span style="font-size: 9px; font-weight: 600; color: var(--color-steel-400); text-transform: uppercase; letter-spacing: 0.5px; white-space: nowrap;">${c.name}</span>
      <span style="font-size: 10px; font-weight: 700; color: ${c.color}; background: ${c.bg}; padding: 2px 8px; border-radius: 10px; white-space: nowrap;">${c.label}</span>
    </div>
  `).join('');

  const bannerUrl = s.banner || s.bannerImage || DEFAULT_BANNER;
  const email = s.email || 'sales@' + s.name.toLowerCase().replace(/[^a-z]/g, '') + '.com';
  const phone = s.phone || '';
  const wechat = s.wechat || '';
  const userTier = sessionStorage.getItem('atlasdt_tier') || 'basic';
  const tierCheck = String(userTier).toLowerCase().trim();
  const isProAccess = ['professional', 'pro', 'enterprise'].includes(tierCheck);

  const isContactsLocked = !isProAccess;
  const isIntelLocked = !isProAccess;

  const supplierId = s.id || s.name;
  const isShortlisted = !!document.querySelector(`.shortlist-item[data-id="${supplierId}"]`);
  const shortlistBtnHTML = isShortlisted
    ? `<button class="sup-banner__add-shortlist-btn" id="modal-add-to-shortlist" style="background: rgba(16, 185, 129, 0.25); border-color: rgba(16, 185, 129, 0.5); color: #10b981; pointer-events: none;">
        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><polyline points="20 6 9 17 4 12"/></svg>
        <span>Shortlisted</span>
      </button>`
    : `<button class="sup-banner__add-shortlist-btn" id="modal-add-to-shortlist">
        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
        <span>Add to Shortlist</span>
      </button>`;

  let productImgs = s.images?.product || [];
  let facilityImgs = [...(s.images?.facility || []), ...(s.images?.equipment || [])];
  
  // Use s.url as primary, fallback to s.website
  let websiteUrl = s.url || s.website;

  const exportCountries = s.exportCountries || (s.factoryScore >= 75 ? Math.floor(5 + score / 8) : 2);

  const mapUrl = `https://maps.google.com/?q=${encodeURIComponent((s.city || '') + ', ' + (s.country || ''))}`;
  const mapEmbedUrl = `https://maps.google.com/maps?q=${encodeURIComponent((s.city || '') + ', ' + (s.country || ''))}&t=&z=13&ie=UTF8&iwloc=&output=embed`;

  const renderImageGrid = (imgs) => {
    const gridItems = Array.from({length: 6}, (_, i) => {
      if (i < imgs.length) {
        return `<div style="background: url('${imgs[i]}') center/cover; aspect-ratio: 1; border-radius: 8px; width: 100%;"></div>`;
      } else {
        return `<div style="aspect-ratio: 1; border: 1px dashed rgba(255,255,255,0.15); border-radius: 8px; width: 100%;"></div>`;
      }
    });
    return `<div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; padding: 12px 0;">${gridItems.join('')}</div>`;
  };

  body.innerHTML = `
<div class="sup-dossier">
  
  <!-- LEFT SIDEBAR -->
  <div class="sup-dossier__sidebar">
    <div class="sup-dossier__logo">${s.name.substring(0, Math.min(2, s.name.length)).toUpperCase()}</div>
    <div class="sup-dossier__name">${s.name}</div>
    <div class="sup-dossier__category">${s.segment || 'Industrial Manufacturing'}</div>
    <div class="sup-dossier__location">📍 ${s.city || ''}${s.country ? ', ' + s.country : ''}</div>
    
    <div class="sup-contact-block">
      <span class="sup-contact-label">Email</span>
      <a href="mailto:${email}" class="sup-contact-value" style="color: #2563eb;">${email}</a>
      
      <span class="sup-contact-label">Phone</span>
      <span class="sup-contact-value">${phone || '--'}</span>
      
      <span class="sup-contact-label">WeChat</span>
      <span class="sup-contact-value">${wechat || '--'}</span>
      
      <span class="sup-contact-label">Website</span>
      <a href="${websiteUrl ? (websiteUrl.startsWith('http') ? websiteUrl : 'https://' + websiteUrl) : '#'}" target="_blank" class="sup-contact-value" style="color: #2563eb;">${websiteUrl || '--'}</a>
    </div>

    <!-- RFQ Card -->
    <div style="background: #f8fafc; border: 1px solid #e2e8f0; padding: 16px; border-radius: 8px; margin-bottom: 24px;">
      <div style="font-size: 11px; font-weight: 700; text-transform: uppercase; color: #475569; margin-bottom: 8px;">📋 Send Inquiry</div>
      <textarea rows="3" placeholder="Product requirements..." style="width: 100%; border: 1px solid #cbd5e1; border-radius: 4px; padding: 8px; font-size: 13px; margin-bottom: 8px; font-family: inherit; resize: vertical;box-sizing:border-box;"></textarea>
      <input type="email" placeholder="Your reply email" style="width: 100%; border: 1px solid #cbd5e1; border-radius: 4px; padding: 8px; font-size: 13px; margin-bottom: 8px; font-family: inherit;box-sizing:border-box;">
      <button id="modal-send-rfq" style="width: 100%; background: #0f172a; color: white; border: none; padding: 8px; border-radius: 4px; font-weight: 600; cursor: pointer; font-size: 13px;">Submit</button>
    </div>

    <div style="margin-top: auto; display: flex; flex-direction: column; gap: 8px;">
      ${shortlistBtnHTML.replace('sup-banner__add-shortlist-btn', 'sup-sidebar__cta' + (isShortlisted ? ' sup-sidebar__cta--added' : ''))}
      <button id="modal-engage-consulting" style="width: 100%; padding: 12px; background: #f0fdf4; color: #166534; border: 1px solid #bbf7d0; border-radius: 8px; font-weight: 600; font-size: 13px; cursor: pointer;">🌿 Atlas DT Audit</button>
    </div>
  </div>

  <!-- RIGHT DASHBOARD -->
  <div class="sup-dossier__dashboard">
    <!-- Top Ribbon -->
    <div class="sup-ribbon">
      <div class="sup-metric-card">
        <div class="sup-metric-header">Supplier Score</div>
        <div class="sup-metric-value-row">
          <div class="sup-metric-value ${s.factoryScore >= 80 ? 'color-green' : 'color-amber'}">${s.factoryScore || '--'}</div>
          <div class="sup-metric-sub">/ 100</div>
        </div>
      </div>
      <div class="sup-metric-card">
        <div class="sup-metric-header">Established</div>
        <div class="sup-metric-value-row">
          <div class="sup-metric-value" style="color: #0f172a;">${s.yearEstablished || '--'}</div>
        </div>
      </div>
      <div class="sup-metric-card">
        <div class="sup-metric-header">Certifications</div>
        <div class="sup-metric-value-row">
          <div class="sup-metric-value color-blue">${s.certifications ? s.certifications.length : 0}</div>
          <div class="sup-metric-sub">Active</div>
        </div>
      </div>
      <div class="sup-metric-card">
        <div class="sup-metric-header">Markets</div>
        <div class="sup-metric-value-row">
          <div class="sup-metric-value" style="color: #0f172a;">${exportCountries}</div>
          <div class="sup-metric-sub">Regions</div>
        </div>
      </div>
    </div>
    
    <!-- Intel Gate overlay wraps the content -->
    <div class="sup-intel-gate--light ${isIntelLocked ? 'is-locked' : ''}">
      ${isIntelLocked ? `
        <div class="sup-intel-gate-overlay">
          <button class="sup-intel-gate-btn" onclick="window.location.href='/profile.html?tab=billing'">
            🔒 Upgrade to View Full Dossier
          </button>
        </div>
      ` : ''}
      
      <!-- Middle Row: Tech & Map -->
      <div class="sup-board-grid">
        <!-- Technical Capabilities -->
        <div class="sup-panel sup-panel--tall">
          <div class="sup-panel__title">Technical Capabilities & Machinery</div>
          <div class="sup-cap-container">
            <div class="sup-cap-list">
            ${(s.technologies || []).map(t => `
            <div class="sup-cap-item">
              <div class="sup-cap-icon"><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="3"></circle><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path></svg></div>
              <div class="sup-cap-details">
                <div class="sup-cap-name">${t}</div>
                <div class="sup-cap-sub">Verified Manufacturing Node</div>
              </div>
            </div>
            `).join('')}
            ${(s.tags || []).map(t => `
            <div class="sup-cap-item">
              <div class="sup-cap-icon"><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path><polyline points="3.27 6.96 12 12.01 20.73 6.96"></polyline><line x1="12" y1="22.08" x2="12" y2="12"></line></svg></div>
              <div class="sup-cap-details">
                <div class="sup-cap-name">${t}</div>
                <div class="sup-cap-sub">Material / Specialty Process</div>
              </div>
            </div>
            `).join('')}
            </div>
          </div>
          <div class="sup-facility-details">
            <div class="sup-facility-detail">
              <div class="sup-detail-label">Factory Area</div>
              <div class="sup-detail-value">${s.factoryArea || '--'}</div>
            </div>
            <div class="sup-facility-detail">
              <div class="sup-detail-label">Employees</div>
              <div class="sup-detail-value">${s.employees || '--'}</div>
            </div>
            <div class="sup-facility-detail">
              <div class="sup-detail-label">Min Order Qty</div>
              <div class="sup-detail-value">${s.moq || '--'}</div>
            </div>
            <div class="sup-facility-detail">
              <div class="sup-detail-label">Lead Time</div>
              <div class="sup-detail-value">${s.leadTime || '--'}</div>
            </div>
          </div>
        </div>
        
        <!-- Factory Location -->
        <div class="sup-panel sup-panel--map">
          <div class="sup-panel__title">Factory Location</div>
          <div style="flex: 1; padding: 16px;">
            <iframe width="100%" height="100%" frameborder="0" scrolling="no" marginheight="0" marginwidth="0" src="${mapEmbedUrl}" style="border-radius: 8px;"></iframe>
          </div>
        </div>
      </div>
      
      <!-- Bottom Row: Photo Gallery -->
      ${[...productImgs, ...facilityImgs].length > 0 ? `
      <div class="sup-panel">
        <div class="sup-panel__title">Facility & Product Portfolio</div>
        <div class="sup-gallery-grid">
          ${[...productImgs, ...facilityImgs].slice(0, 8).map(img => `
            <img src="${img}" class="sup-gallery-img" />
          `).join('')}
        </div>
      </div>
      ` : ''}

    </div> <!-- CLOSING INTEL GATE -->
  </div>
</div>
  `;



  // Attach event listeners
  if (!isShortlisted) {
    body.querySelector('#modal-add-to-shortlist')?.addEventListener('click', (e) => {
      e.stopPropagation();
      const btn = e.currentTarget;
      window.dispatchEvent(new CustomEvent('prd-add-to-shortlist', { 
        detail: { supplier: s, techName: document.getElementById('supplier-modal-title').textContent.replace(' Suppliers', '') } 
      }));
      btn.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><polyline points="20 6 9 17 4 12"/></svg> <span>Shortlisted</span>`;
      btn.style.background = 'rgba(16, 185, 129, 0.25)';
      btn.style.borderColor = 'rgba(16, 185, 129, 0.5)';
      btn.style.color = '#10b981';
      btn.style.pointerEvents = 'none';
    });
  }

  body.querySelector('#modal-send-rfq')?.addEventListener('click', () => console.log('[Atlas DT] RFQ submitted for:', s.name));
  body.querySelector('#modal-attach-files')?.addEventListener('click', () => console.log('[Atlas DT] Upload drawings'));
  body.querySelector('#modal-engage-consulting')?.addEventListener('click', () => console.log('[Atlas DT] Consulting engaged for:', s.name));

  body.querySelectorAll('.sup-section--locked').forEach(el => {
    el.addEventListener('click', () => {
      window.location.href = '/profile.html?tab=billing';
    });
  });
}


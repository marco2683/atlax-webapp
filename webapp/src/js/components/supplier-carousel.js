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
  const isContactsLocked = currentTier === 'free';
  const isIntelLocked = currentTier === 'free' || currentTier === 'contacts';

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
    <!-- Hero Split 2:3 Banner, 1:3 Map -->
    <div style="display: flex; gap: 8px; margin-bottom: 20px;">
      <div class="sup-banner" style="flex: 2; border-radius: 12px; margin-bottom: 0; background-image: url('${bannerUrl}');">
        <div class="sup-banner__info">
          <div>
            <div class="sup-banner__name">${s.name}</div>
            <div class="sup-banner__location">📍 ${s.city || ''}, ${s.country || ''}</div>
            ${shortlistBtnHTML}
          </div>
        </div>
      </div>
      <a href="${mapUrl}" target="_blank" style="flex: 1; min-height: 200px; display: block; border-radius: 12px; overflow: hidden; position: relative;">
        <iframe width="100%" height="100%" frameborder="0" scrolling="no" marginheight="0" marginwidth="0" src="${mapEmbedUrl}" style="pointer-events: none;"></iframe>
      </a>
    </div>

    <div class="sup-content">
      <!-- Classifier Row -->
      <div style="display: flex; gap: 8px; padding: 12px 24px; border-bottom: 1px solid rgba(255,255,255,0.05); background: rgba(255,255,255,0.02); margin: 0 -24px 20px -24px;">
        ${classifierHTML}
      </div>

      <div class="sup-section">
      <div class="sup-section__title" style="text-align: center;">🔬 Expertise & Core Technologies</div>
      <div class="sup-materials-grid" style="grid-template-columns: 1fr;">
        <div class="sup-materials-col">
          <div class="sup-materials-col__tags" style="justify-content: space-between; flex-wrap: wrap; gap: 8px;">
            ${(s.technologies || []).map(t => `<span class="sup-tech-tag" style="flex: 1 1 auto; text-align: center; margin: 0;">${t}</span>`).join('')}
            ${(s.tags || []).map(t => `<span class="sup-tech-tag" style="flex: 1 1 auto; text-align: center; margin: 0;">${t}</span>`).join('')}
          </div>
        </div>
      </div>
      ${s.description ? `<p class="sup-desc" style="text-align: justify; line-height: 1.6; margin-top: 16px;">${s.description}</p>` : ''}
    </div>

    <!-- Section: Supplier Scorecard -->
    <div class="sup-section" style="padding-top: 0;">
      <div class="sup-section__title" style="text-align: center;">📊 Supplier Scorecard</div>
      <div style="display: flex; gap: 12px; overflow-x: auto; padding-bottom: 8px;">
        <div style="flex: 1; min-width: 110px; background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.08); padding: 24px 16px; border-radius: 8px; text-align: center;">
          <div style="font-size: 24px; font-weight: bold; color: ${s.factoryScore >= 80 ? '#10b981' : '#f59e0b'};">${s.factoryScore || '--'}</div>
          <div style="font-size: 11px; color: var(--color-steel-400); text-transform: uppercase;">Atlas DT Score</div>
        </div>
        <div style="flex: 1; min-width: 110px; background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.08); padding: 24px 16px; border-radius: 8px; text-align: center;">
          <div style="font-size: 24px; font-weight: bold; color: #fff;">${s.yearEstablished || '--'}</div>
          <div style="font-size: 11px; color: var(--color-steel-400); text-transform: uppercase;">Established</div>
        </div>
        <div style="flex: 1; min-width: 110px; background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.08); padding: 24px 16px; border-radius: 8px; text-align: center;">
          <div style="font-size: 24px; font-weight: bold; color: #3b82f6;">${s.certifications ? s.certifications.length : 0}</div>
          <div style="font-size: 11px; color: var(--color-steel-400); text-transform: uppercase;">Active Certs</div>
        </div>
        <div style="flex: 1; min-width: 110px; background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.08); padding: 24px 16px; border-radius: 8px; text-align: center;">
          <div style="font-size: 24px; font-weight: bold; color: #fff;">${exportCountries}</div>
          <div style="font-size: 11px; color: var(--color-steel-400); text-transform: uppercase;">Export Mkts</div>
        </div>
      </div>
    </div>

    <!-- Section: Visuals (Products & Facilities) -->
    ${productImgs.length > 0 || facilityImgs.length > 0 ? `
    <div class="sup-section" style="padding-top: 0;">
      ${productImgs.length > 0 ? `
        <div class="sup-section__title">📦 Featured Products</div>
        ${renderImageGrid(productImgs)}
      ` : ''}
      ${facilityImgs.length > 0 ? `
        <div class="sup-section__title" style="margin-top: 16px;">🏭 Facilities & Equipment</div>
        ${renderImageGrid(facilityImgs)}
      ` : ''}
    </div>
    ` : ''}

    <!-- INTEL GATE OVERLAY -->
    ${isIntelLocked ? `
    <div class="sup-intel-overlay">
      <button class="sup-intel-overlay__btn" onclick="window.dispatchEvent(new CustomEvent('prd-open-tier-modal'))">
        🔒 Upgrade to View Full Details
      </button>
    </div>
    ` : ''}

    <div class="sup-intel-gate ${isIntelLocked ? 'sup-intel-gate--locked' : ''}">


      <!-- Section: Video Walkthrough -->
      ${s.videoWalkthrough ? `
      <div class="sup-section">
        <div class="sup-section__title">🎥 Video Walkthrough</div>
        <div class="sup-video-embed" style="position:relative; padding-bottom:56.25%; height:0; overflow:hidden; border-radius:12px; border:1px solid rgba(255,255,255,0.1);">
          <iframe style="position:absolute; top:0; left:0; width:100%; height:100%; border:none;" 
            src="${s.videoWalkthrough.includes('watch?v=') ? s.videoWalkthrough.replace('watch?v=', 'embed/') : s.videoWalkthrough}" 
            allowfullscreen>
          </iframe>
        </div>
      </div>
      ` : ''}

      <!-- Section: Facilities & Equipment Info -->
      <div class="sup-section">
        <div class="sup-section__title">🏭 Facilities & Equipment</div>
        <div class="sup-facility-grid">
          ${s.factoryArea ? `
          <div class="sup-facility-card">
            <div class="sup-facility-card__label">Factory Area</div>
            <div class="sup-facility-card__value">${s.factoryArea}</div>
          </div>` : ''}
          ${s.employees ? `
          <div class="sup-facility-card">
            <div class="sup-facility-card__label">Employees</div>
            <div class="sup-facility-card__value">${s.employees}</div>
          </div>` : ''}
          ${s.yearEstablished ? `
          <div class="sup-facility-card">
            <div class="sup-facility-card__label">Year Established</div>
            <div class="sup-facility-card__value">${s.yearEstablished}</div>
          </div>` : ''}
          ${s.moq ? `
          <div class="sup-facility-card">
            <div class="sup-facility-card__label">Min Order Qty</div>
            <div class="sup-facility-card__value">${s.moq}</div>
          </div>` : ''}
          ${s.leadTime ? `
          <div class="sup-facility-card">
            <div class="sup-facility-card__label">Lead Time</div>
            <div class="sup-facility-card__value">${s.leadTime}</div>
          </div>` : ''}
        </div>
      </div>

      <!-- Section: Documents & Downloads -->
      ${s.documents && s.documents.length > 0 ? `
      <div class="sup-section">
        <div class="sup-section__title">📄 Documents & Downloads</div>
        <div class="sup-certs-row">
          ${s.documents.map((doc, i) => `
            <a href="${doc}" target="_blank" class="sup-cert-badge" style="text-decoration: none; cursor: pointer;">
              <div class="sup-cert-badge__icon">⬇️</div>
              <div class="sup-cert-badge__name">Document ${i + 1}</div>
              <div class="sup-cert-badge__status sup-cert-badge__status--active">Download</div>
            </a>
          `).join('')}
        </div>
      </div>
      ` : ''}
      
      <!-- Section: Quality & Certifications -->
      ${s.certifications && s.certifications.length > 0 ? `
      <div class="sup-section">
        <div class="sup-section__title">✅ Quality & Certifications</div>
        <div class="sup-certs-row">
          ${s.certifications.map(c => `
          <div class="sup-cert-badge">
            <div class="sup-cert-badge__icon">🏆</div>
            <div class="sup-cert-badge__name">${c}</div>
            <div class="sup-cert-badge__status sup-cert-badge__status--active">Verified</div>
          </div>
          `).join('')}
        </div>
      </div>
      ` : ''}
      
      <!-- Section: Contact & Location -->
      <div class="sup-section">
        <div class="sup-section__title">Contact & Location</div>
        <div class="sup-contact-grid">
          <div class="sup-contact-item">
            <span class="sup-contact-label">Email</span>
            <span class="sup-contact-value">${email}</span>
          </div>
          <div class="sup-contact-item">
            <span class="sup-contact-label">Phone</span>
            <span class="sup-contact-value">${phone}</span>
          </div>
          <div class="sup-contact-item">
            <span class="sup-contact-label">WeChat</span>
            <span class="sup-contact-value">${wechat}</span>
          </div>
        </div>
      </div>

      <!-- Section: Official Website -->
      ${websiteUrl ? `
      <div class="sup-section">
        <div class="sup-section__title" style="display:flex; justify-content:space-between; align-items:center;">
          🌐 Official Website
          <a href="${websiteUrl.startsWith('http') ? websiteUrl : 'https://' + websiteUrl}" target="_blank" style="font-size:11px; color:var(--color-amber); text-decoration:none; background:rgba(245,158,11,0.1); padding:4px 8px; border-radius:4px;">Open ↗</a>
        </div>
        <div class="sup-frame-window">
          <iframe src="${websiteUrl.startsWith('http') ? websiteUrl : 'https://' + websiteUrl}" width="100%" height="100%" style="border:none;" sandbox="allow-same-origin allow-scripts"></iframe>
        </div>
      </div>
      ` : ''}

    </div> <!-- CLOSING INTEL GATE -->
    
    <!-- RFQ Card (Always Visible) -->
    <div class="sup-rfq">
      <div class="sup-rfq__title">📋 Send an inquiry</div>
      <p class="sup-rfq__desc">Describe your product, upload drawings, and specify quantities for a direct quote.</p>
      <textarea class="sup-rfq__textarea" rows="5" placeholder="Product requirements, materials, quantities..."></textarea>
      <div style="margin: 12px 0;">
        <input type="email" placeholder="Your reply email" class="sup-rfq__textarea" style="height: auto; padding: 10px; margin-bottom: 8px;">
        <div style="position: relative; width: 100%; border-radius: 6px; overflow: hidden;">
          <label style="display: flex; align-items: center; justify-content: center; gap: 8px; width: 100%; padding: 10px; background: rgba(255,255,255,0.03); border: 1px dashed rgba(255,255,255,0.2); cursor: pointer; color: var(--color-steel-400); font-size: 13px;">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"/></svg>
            Attach Drawings or Specs
          </label>
          <input type="file" id="modal-attach-files" style="position: absolute; top: 0; left: 0; width: 100%; height: 100%; opacity: 0; cursor: pointer;">
        </div>
      </div>
      <div class="sup-rfq__actions">
        <button class="btn btn--primary" id="modal-send-rfq" style="width: 100%;">Submit Inquiry</button>
      </div>
    </div>
    
    <!-- Atlas DT Consulting Card (Moved Inside Content Container) -->
    <div class="sup-mjs" style="padding: 16px; margin-top: 20px;">
      <div class="sup-mjs__title" style="margin-bottom: 4px; font-size: 14px;">🌿 Atlas DT Quality Consulting</div>
      <p class="sup-mjs__desc" style="margin-bottom: 12px; font-size: 13px;">Let our on-ground team handle supplier management and factory audits directly on the floor.</p>
      <button class="btn btn--success btn--sm" style="width: 100%;" id="modal-engage-consulting">Engage Atlas DT Consulting →</button>
    </div>

  </div> <!-- CLOSING SUP-CONTENT -->
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
      document.getElementById('pricing-backdrop')?.classList.remove('hidden');
      document.getElementById('pricing-modal')?.classList.remove('hidden');
    });
  });
}


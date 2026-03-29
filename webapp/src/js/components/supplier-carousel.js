/* ============================================================
   PRD — Supplier Carousel v3 (large modal, tiered sections)
   ============================================================ */

// Factory banner images (placeholder URLs for different industries)
const BANNER_IMAGES = [
  'https://images.unsplash.com/photo-1565043589221-1a6fd9ae45c7?w=800&q=80',  // factory floor
  'https://images.unsplash.com/photo-1581091226825-a6a2a5aee158?w=800&q=80',  // manufacturing
  'https://images.unsplash.com/photo-1504328345606-18bbc8c9d7d1?w=800&q=80',  // industrial
  'https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?w=800&q=80',  // warehouse
  'https://images.unsplash.com/photo-1563906267088-b029e7101114?w=800&q=80',  // electronics
  'https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=800&q=80',     // tech
];

let currentIndex = 0;
let currentSuppliers = [];
let currentTier = 'free'; // free | contacts | intel | consult

/**
 * Set the user's active tier and re-render.
 */
export function setCurrentTier(tierId) {
  currentTier = tierId;
  if (!document.getElementById('supplier-modal')?.classList.contains('hidden')) {
    renderCurrentCard();
  }
}

/**
 * Generate classifier scores from the factoryScore to populate the row.
 * Returns an object with descriptive labels for each dimension.
 */
function generateClassifiers(factoryScore) {
  // Derive individual dimension scores from the factory score with some variance
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

/**
 * Open the supplier carousel modal.
 */
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

/**
 * Close the carousel modal.
 */
export function closeSupplierCarousel() {
  document.getElementById('supplier-backdrop')?.classList.add('hidden');
  document.getElementById('supplier-modal')?.classList.add('hidden');
}

/**
 * Initialize carousel controls.
 */
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

function renderCurrentCard() {
  const body = document.getElementById('supplier-modal-body');
  if (!body || !currentSuppliers[currentIndex]) return;

  const s = currentSuppliers[currentIndex];

  // Classifier row
  const classifiers = generateClassifiers(s.factoryScore);
  const classifierHTML = classifiers.map(c => `
    <div style="display: flex; flex-direction: column; align-items: center; gap: 3px; flex: 1; min-width: 0;">
      <span style="font-size: 9px; font-weight: 600; color: var(--color-steel-400); text-transform: uppercase; letter-spacing: 0.5px; white-space: nowrap;">${c.name}</span>
      <span style="font-size: 10px; font-weight: 700; color: ${c.color}; background: ${c.bg}; padding: 2px 8px; border-radius: 10px; white-space: nowrap;">${c.label}</span>
    </div>
  `).join('');

  // Random banner image
  const bannerUrl = s.bannerImage || BANNER_IMAGES[currentIndex % BANNER_IMAGES.length];

  // Contact info (generated if not present)
  const email = s.email || 'sales@' + s.name.toLowerCase().replace(/[^a-z]/g, '') + '.com';
  const phone = s.phone || '+86 755 ' + Math.floor(10000000 + Math.random() * 90000000);
  const wechat = s.wechat || s.name.replace(/\s/g, '_').toLowerCase();

  // Tier gating
  const isContactsLocked = currentTier === 'free';
  const isIntelLocked = currentTier === 'free' || currentTier === 'contacts';

  // Check if this supplier is already shortlisted
  const supplierId = s.id || s.name;
  const isShortlisted = !!document.querySelector(`.shortlist-item[data-id="${supplierId}"]`);

  // Shortlist button HTML based on state
  const shortlistBtnHTML = isShortlisted
    ? `<button class="sup-banner__add-shortlist-btn" id="modal-add-to-shortlist" style="background: rgba(16, 185, 129, 0.25); border-color: rgba(16, 185, 129, 0.5); color: #10b981; pointer-events: none;">
        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><polyline points="20 6 9 17 4 12"/></svg>
        <span>Shortlisted</span>
      </button>`
    : `<button class="sup-banner__add-shortlist-btn" id="modal-add-to-shortlist">
        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
        <span>Add to Shortlist</span>
      </button>`;

  // Build the ENTIRE card HTML in one go (no innerHTML +=)
  body.innerHTML = `
    <!-- Banner Image -->
    <div class="sup-banner" style="background-image: url('${bannerUrl}');">
      <div class="sup-banner__info">
        <div>
          <div class="sup-banner__name">${s.name}</div>
          <div class="sup-banner__location">📍 ${s.city}, ${s.country}</div>
          ${shortlistBtnHTML}
        </div>
      </div>
    </div>

    <!-- Classifier Row -->
    <div style="display: flex; gap: 8px; padding: 12px 24px; border-bottom: 1px solid rgba(255,255,255,0.05); background: rgba(255,255,255,0.02);">
      ${classifierHTML}
    </div>

    <div class="sup-content">
      <!-- Section: Technologies (always visible) -->
      <div class="sup-section">
        <div class="sup-section__title">Technologies & Capabilities</div>
        <div class="sup-tech-list">
          ${(s.technologies || []).map(t => `<span class="sup-tech-tag">${t}</span>`).join('')}
        </div>
        <p class="sup-desc">${s.description}</p>
      </div>

      <!-- Section: Contact & Location Information (locked for free tier) -->
      <div class="sup-section ${isContactsLocked ? 'sup-section--locked' : ''}">
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
          <div class="sup-contact-item">
            <span class="sup-contact-label">Response Time</span>
            <span class="sup-contact-value">${s.responseTime || '< 24 hours'}</span>
          </div>
        </div>
        <div style="margin-top: var(--space-4); border-radius: var(--radius-base); overflow: hidden; height: 160px; border: 1px solid rgba(255,255,255,0.1);">
          <iframe 
            width="100%" 
            height="160" 
            frameborder="0" 
            scrolling="no" 
            marginheight="0" 
            marginwidth="0" 
            style="filter: invert(90%) hue-rotate(180deg) opacity(80%);"
            src="https://maps.google.com/maps?q=${encodeURIComponent(s.city + ', ' + s.country)}&t=&z=11&ie=UTF8&iwloc=&output=embed">
          </iframe>
        </div>
      </div>

      <!-- Section: Intelligence Report (locked for free + contacts tier) -->
      <div class="sup-section ${isIntelLocked ? 'sup-section--locked' : ''}">
        <div class="sup-section__title">🔍 Intelligence Report</div>
        <ul class="sup-intel-list">
          <li class="sup-intel-item"><span class="sup-intel-icon">▸</span> <strong>Factory vs. Trader:</strong> Verified manufacturer — owns production lines, not a trading intermediary</li>
          <li class="sup-intel-item"><span class="sup-intel-icon">▸</span> <strong>Satellite Imagery:</strong> Factory footprint confirmed — ${Math.floor(3000 + Math.random() * 12000)}sqm facility visible from 2024 imagery</li>
          <li class="sup-intel-item"><span class="sup-intel-icon">▸</span> <strong>Corporate Registry:</strong> Registered capital ¥${Math.floor(500 + Math.random() * 5000)}M — ${Math.floor(3 + Math.random() * 15)} years in operation</li>
          <li class="sup-intel-item"><span class="sup-intel-icon">▸</span> <strong>Export History:</strong> ${Math.floor(100 + Math.random() * 2000)} shipments to ${Math.floor(5 + Math.random() * 30)} countries in last 12 months</li>
          <li class="sup-intel-item"><span class="sup-intel-icon">▸</span> <strong>Quality Certifications:</strong> ISO 9001, ISO 14001${Math.random() > 0.5 ? ', IATF 16949' : ''}${Math.random() > 0.6 ? ', ISO 13485 (Medical)' : ''}</li>
          <li class="sup-intel-item"><span class="sup-intel-icon">▸</span> <strong>Litigation Check:</strong> ${Math.random() > 0.3 ? 'No active disputes found' : '1 minor trade dispute (resolved 2023)'}</li>
          <li class="sup-intel-item"><span class="sup-intel-icon">▸</span> <strong>Key Customers:</strong> Supplies to ${Math.floor(2 + Math.random() * 5)} Fortune 500 companies (names redacted)</li>
          <li class="sup-intel-item"><span class="sup-intel-icon">▸</span> <strong>Financial Health:</strong> Revenue trend ${Math.random() > 0.4 ? '↑ growing' : '→ stable'} over 3 years — ${Math.random() > 0.3 ? 'low' : 'moderate'} risk</li>
        </ul>
        
        <div style="margin-top: var(--space-4);">
          <div style="font-size: 10px; font-weight: var(--weight-semibold); color: var(--color-steel-400); text-transform: uppercase; letter-spacing: var(--tracking-wider); margin-bottom: var(--space-2);">📷 Facility Media</div>
          <div style="display: flex; gap: var(--space-2); overflow-x: auto; padding-bottom: var(--space-2);" class="sup-intel-carousel">
            <img src="https://images.unsplash.com/photo-1581091226825-a6a2a5aee158?w=300&h=200&fit=crop" style="height: 120px; border-radius: 4px; border: 1px solid rgba(255,255,255,0.1); flex-shrink: 0;" />
            <img src="https://images.unsplash.com/photo-1563906267088-b029e7101114?w=300&h=200&fit=crop" style="height: 120px; border-radius: 4px; border: 1px solid rgba(255,255,255,0.1); flex-shrink: 0;" />
            <img src="https://images.unsplash.com/photo-1504328345606-18bbc8c9d7d1?w=300&h=200&fit=crop" style="height: 120px; border-radius: 4px; border: 1px solid rgba(255,255,255,0.1); flex-shrink: 0;" />
            <img src="https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?w=300&h=200&fit=crop" style="height: 120px; border-radius: 4px; border: 1px solid rgba(255,255,255,0.1); flex-shrink: 0;" />
          </div>
        </div>
      </div>

      <!-- RFQ Card -->
      <div class="sup-rfq">
        <div class="sup-rfq__title">📋 Send Request for Quotation</div>
        <p class="sup-rfq__desc">Describe your product, upload drawings (CAD, 2D, 3D), and specify quantities. The supplier will respond within their estimated response time.</p>
        <textarea class="sup-rfq__textarea" placeholder="Describe your product requirements, materials, quantities, target price..."></textarea>
        <div class="sup-rfq__actions">
          <button class="btn btn--primary btn--sm" id="modal-send-rfq">
            Send RFQ
          </button>
          <button class="btn btn--secondary btn--sm" id="modal-attach-files">
            📎 Attach Files
          </button>
        </div>
      </div>

      <!-- ATLAX Consulting Card -->
      <div class="sup-mjs">
        <div class="sup-mjs__title">🌿 ATLAX Quality Consulting</div>
        <p class="sup-mjs__desc">Let our on-ground team handle supplier management, factory audits, and quality control for this supplier directly on the factory floor.</p>
        <ul class="sup-mjs__features">
          <li class="sup-mjs__feature">On-site factory audit & video walkthrough</li>
          <li class="sup-mjs__feature">First-article inspection (FAI) management</li>
          <li class="sup-mjs__feature">RFQ negotiation & payment escrow</li>
          <li class="sup-mjs__feature">Ongoing quality monitoring & defect tracking</li>
          <li class="sup-mjs__feature">Logistics coordination & consolidation shipping</li>
        </ul>
        <button class="btn btn--success btn--sm" id="modal-engage-consulting">
          Engage ATLAX Consulting →
        </button>
      </div>
    </div>
  `;

  // Now attach ALL event listeners AFTER the DOM is complete
  if (!isShortlisted) {
    body.querySelector('#modal-add-to-shortlist')?.addEventListener('click', (e) => {
      e.stopPropagation();
      const btn = e.currentTarget;
      window.dispatchEvent(new CustomEvent('prd-add-to-shortlist', { 
        detail: { supplier: s, techName: document.getElementById('supplier-modal-title').textContent.replace(' Suppliers', '') } 
      }));
      // Switch to permanent green "Shortlisted" state
      btn.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><polyline points="20 6 9 17 4 12"/></svg> <span>Shortlisted</span>`;
      btn.style.background = 'rgba(16, 185, 129, 0.25)';
      btn.style.borderColor = 'rgba(16, 185, 129, 0.5)';
      btn.style.color = '#10b981';
      btn.style.pointerEvents = 'none';
    });
  }

  body.querySelector('#modal-send-rfq')?.addEventListener('click', () => {
    console.log('[ATLAX] RFQ submitted for:', s.name);
  });

  body.querySelector('#modal-attach-files')?.addEventListener('click', () => {
    console.log('[ATLAX] Upload drawings');
  });

  body.querySelector('#modal-engage-consulting')?.addEventListener('click', () => {
    console.log('[ATLAX] Consulting engaged for:', s.name);
  });

  // Attach listeners to locked sections to open the pricing modal
  body.querySelectorAll('.sup-section--locked').forEach(el => {
    el.addEventListener('click', () => {
      document.getElementById('pricing-backdrop')?.classList.remove('hidden');
      document.getElementById('pricing-modal')?.classList.remove('hidden');
    });
  });
}

/* ============================================================
   PRD — Supplier Detail Modal (Comprehensive Dossier)
   Updated: 2026-04-01 – Added photo gallery, video, materials,
   production capacity, trade, sustainability, sample sections
   ============================================================ */

const BANNER_IMAGES = [
  'https://images.unsplash.com/photo-1565043589221-1a6fd9ae45c7?w=800&q=80',
  'https://images.unsplash.com/photo-1581091226825-a6a2a5aee158?w=800&q=80',
  'https://images.unsplash.com/photo-1504328345606-18bbc8c9d7d1?w=800&q=80',
  'https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?w=800&q=80',
  'https://images.unsplash.com/photo-1563906267088-b029e7101114?w=800&q=80',
  'https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=800&q=80',
];

const GALLERY_IMAGES = [
  'https://images.unsplash.com/photo-1581091226825-a6a2a5aee158?w=300&h=200&fit=crop',
  'https://images.unsplash.com/photo-1563906267088-b029e7101114?w=300&h=200&fit=crop',
  'https://images.unsplash.com/photo-1504328345606-18bbc8c9d7d1?w=300&h=200&fit=crop',
  'https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?w=300&h=200&fit=crop',
  'https://images.unsplash.com/photo-1565043589221-1a6fd9ae45c7?w=300&h=200&fit=crop',
  'https://images.unsplash.com/photo-1581092160562-40aa08e78837?w=300&h=200&fit=crop',
  'https://images.unsplash.com/photo-1537462715879-360eeb61a0ad?w=300&h=200&fit=crop',
  'https://images.unsplash.com/photo-1558618666-fcd25c85f82e?w=300&h=200&fit=crop',
];

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

/* ── Helper: generate mock data from factoryScore ── */
function mockMaterials(score) {
  const base = ['Aluminum 6061', 'Stainless Steel 304', 'ABS', 'Polycarbonate'];
  if (score >= 80) base.push('Titanium Grade 5', 'PEEK', 'Nylon PA66-GF');
  if (score >= 90) base.push('Inconel 718', 'Carbon Fiber Composite', 'Medical-grade Silicone');
  return base;
}

function mockFinishes(score) {
  const base = ['Anodizing', 'Powder Coating', 'Sandblasting'];
  if (score >= 75) base.push('Chrome Plating', 'Vapor Polishing', 'Painting (RAL)');
  if (score >= 85) base.push('PVD Coating', 'Electroless Nickel', 'Passivation');
  return base;
}

function mockPaymentTerms(score) {
  if (score >= 90) return 'Net 60, T/T, L/C at Sight';
  if (score >= 80) return 'Net 30, T/T 30/70';
  return 'T/T 50/50, Escrow via ATLAX';
}

function mockIncoterms(score) {
  const base = ['FOB', 'EXW'];
  if (score >= 75) base.push('CIF', 'DAP');
  if (score >= 85) base.push('DDP');
  return base;
}

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

  const bannerUrl = s.bannerImage || BANNER_IMAGES[currentIndex % BANNER_IMAGES.length];
  const email = s.email || 'sales@' + s.name.toLowerCase().replace(/[^a-z]/g, '') + '.com';
  const phone = s.phone || '+86 755 ' + Math.floor(10000000 + Math.random() * 90000000);
  const wechat = s.wechat || s.name.replace(/\s/g, '_').toLowerCase();
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

  // Gallery images (shift per supplier)
  const galleryShift = (currentIndex * 3) % GALLERY_IMAGES.length;
  const galleryImgs = Array.from({ length: 6 }, (_, i) =>
    GALLERY_IMAGES[(galleryShift + i) % GALLERY_IMAGES.length]
  );

  // Materials & finishes
  const materials = mockMaterials(score);
  const finishes = mockFinishes(score);

  // Trade data
  const payTerms = mockPaymentTerms(score);
  const incoterms = mockIncoterms(score);
  const exportCountries = Math.floor(5 + score / 8);

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
      <!-- Section: Technologies & Capabilities -->
      <div class="sup-section">
        <div class="sup-section__title">Technologies & Capabilities</div>
        <div class="sup-tech-list">
          ${(s.technologies || []).map(t => `<span class="sup-tech-tag">${t}</span>`).join('')}
        </div>
        <p class="sup-desc">${s.description}</p>
      </div>

      <!-- Section: Photo Gallery -->
      <div class="sup-section">
        <div class="sup-section__title">📸 Photo Gallery</div>
        <div class="sup-gallery">
          ${galleryImgs.map(url => `<div class="sup-gallery__item" style="background-image: url('${url}')"></div>`).join('')}
        </div>
      </div>

      <!-- Section: Video Walkthrough -->
      <div class="sup-section">
        <div class="sup-section__title">🎥 Video Walkthrough</div>
        <div class="sup-video-embed">
          <div class="sup-video-embed__overlay">
            <div class="sup-video-embed__play">
              <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="white" stroke="none"><polygon points="5 3 19 12 5 21 5 3"/></svg>
            </div>
            <div class="sup-video-embed__label">Factory Tour — ${s.name}</div>
          </div>
          <img src="${bannerUrl}" alt="Video thumbnail" style="width: 100%; height: 100%; object-fit: cover; opacity: 0.5;" />
        </div>
      </div>

      <!-- Section: Facilities & Equipment -->
      <div class="sup-section">
        <div class="sup-section__title">🏭 Facilities & Equipment</div>
        <div class="sup-facility-grid">
          <div class="sup-facility-card">
            <div class="sup-facility-card__label">Factory Area</div>
            <div class="sup-facility-card__value">${Math.floor(2000 + score * 120)} sqm</div>
          </div>
          <div class="sup-facility-card">
            <div class="sup-facility-card__label">Production Lines</div>
            <div class="sup-facility-card__value">${Math.floor(3 + score / 15)} lines</div>
          </div>
          <div class="sup-facility-card">
            <div class="sup-facility-card__label">Employees</div>
            <div class="sup-facility-card__value">${Math.floor(50 + score * 5)}</div>
          </div>
          <div class="sup-facility-card">
            <div class="sup-facility-card__label">QC Inspectors</div>
            <div class="sup-facility-card__value">${Math.floor(3 + score / 20)}</div>
          </div>
          <div class="sup-facility-card">
            <div class="sup-facility-card__label">R&D Engineers</div>
            <div class="sup-facility-card__value">${Math.floor(2 + score / 12)}</div>
          </div>
          <div class="sup-facility-card">
            <div class="sup-facility-card__label">Lead Time</div>
            <div class="sup-facility-card__value">${Math.max(7, 45 - Math.floor(score / 3))} days</div>
          </div>
        </div>
        <div class="sup-equipment-row">
          <span class="sup-equipment-tag">CNC centers: ${Math.floor(5 + score / 8)}</span>
          <span class="sup-equipment-tag">CMM inspection</span>
          <span class="sup-equipment-tag">Tooling in-house</span>
          ${score >= 85 ? '<span class="sup-equipment-tag sup-equipment-tag--highlight">Cleanroom available</span>' : ''}
          ${score >= 80 ? '<span class="sup-equipment-tag sup-equipment-tag--highlight">Automated assembly</span>' : ''}
        </div>
      </div>

      <!-- Section: Material & Process Capabilities -->
      <div class="sup-section">
        <div class="sup-section__title">🔬 Material & Process Capabilities</div>
        <div class="sup-materials-grid">
          <div class="sup-materials-col">
            <div class="sup-materials-col__heading">Materials</div>
            <div class="sup-materials-col__tags">
              ${materials.map(m => `<span class="sup-material-tag">${m}</span>`).join('')}
            </div>
          </div>
          <div class="sup-materials-col">
            <div class="sup-materials-col__heading">Surface Finishes</div>
            <div class="sup-materials-col__tags">
              ${finishes.map(f => `<span class="sup-material-tag">${f}</span>`).join('')}
            </div>
          </div>
        </div>
        <div class="sup-tolerance-row">
          <div class="sup-tolerance-item">
            <span class="sup-tolerance-item__label">Tolerance (CNC)</span>
            <span class="sup-tolerance-item__value">±${score >= 85 ? '0.005' : score >= 70 ? '0.01' : '0.05'} mm</span>
          </div>
          <div class="sup-tolerance-item">
            <span class="sup-tolerance-item__label">Min Wall Thickness</span>
            <span class="sup-tolerance-item__value">${score >= 85 ? '0.3' : score >= 70 ? '0.5' : '0.8'} mm</span>
          </div>
          <div class="sup-tolerance-item">
            <span class="sup-tolerance-item__label">Max Part Size</span>
            <span class="sup-tolerance-item__value">${score >= 85 ? '1500×800×600' : '800×500×400'} mm</span>
          </div>
          <div class="sup-tolerance-item">
            <span class="sup-tolerance-item__label">Surface Roughness</span>
            <span class="sup-tolerance-item__value">Ra ${score >= 85 ? '0.4' : score >= 70 ? '0.8' : '1.6'} μm</span>
          </div>
        </div>
      </div>

      <!-- Section: Production Capacity -->
      <div class="sup-section">
        <div class="sup-section__title">📊 Production Capacity</div>
        <div class="sup-capacity-grid">
          <div class="sup-facility-card">
            <div class="sup-facility-card__label">Monthly Output</div>
            <div class="sup-facility-card__value">${Math.floor(1000 + score * 50)} pcs</div>
          </div>
          <div class="sup-facility-card">
            <div class="sup-facility-card__label">Min Order Qty</div>
            <div class="sup-facility-card__value">${score >= 85 ? '1 pc' : score >= 70 ? '10 pcs' : '50 pcs'}</div>
          </div>
          <div class="sup-facility-card">
            <div class="sup-facility-card__label">Sample Lead</div>
            <div class="sup-facility-card__value">${Math.max(3, 15 - Math.floor(score / 10))} days</div>
          </div>
          <div class="sup-facility-card">
            <div class="sup-facility-card__label">Production Lead</div>
            <div class="sup-facility-card__value">${Math.max(7, 45 - Math.floor(score / 3))} days</div>
          </div>
          <div class="sup-facility-card">
            <div class="sup-facility-card__label">Operating Hours</div>
            <div class="sup-facility-card__value">${score >= 80 ? '24/7 (3 shifts)' : '16h (2 shifts)'}</div>
          </div>
          <div class="sup-facility-card">
            <div class="sup-facility-card__label">Capacity Utilization</div>
            <div class="sup-facility-card__value">${Math.min(95, Math.floor(55 + score / 3))}%</div>
          </div>
        </div>
      </div>

      <!-- Section: Quality & Certifications -->
      <div class="sup-section">
        <div class="sup-section__title">✅ Quality & Certifications</div>
        <div class="sup-certs-row">
          <div class="sup-cert-badge">
            <div class="sup-cert-badge__icon">📋</div>
            <div class="sup-cert-badge__name">ISO 9001</div>
            <div class="sup-cert-badge__status sup-cert-badge__status--active">Verified</div>
          </div>
          <div class="sup-cert-badge">
            <div class="sup-cert-badge__icon">🌍</div>
            <div class="sup-cert-badge__name">ISO 14001</div>
            <div class="sup-cert-badge__status sup-cert-badge__status--active">Verified</div>
          </div>
          ${score >= 85 ? `<div class="sup-cert-badge">
            <div class="sup-cert-badge__icon">🚗</div>
            <div class="sup-cert-badge__name">IATF 16949</div>
            <div class="sup-cert-badge__status sup-cert-badge__status--active">Verified</div>
          </div>` : ''}
          ${score >= 88 ? `<div class="sup-cert-badge">
            <div class="sup-cert-badge__icon">🏥</div>
            <div class="sup-cert-badge__name">ISO 13485</div>
            <div class="sup-cert-badge__status sup-cert-badge__status--active">Verified</div>
          </div>` : ''}
          ${score >= 82 ? `<div class="sup-cert-badge">
            <div class="sup-cert-badge__icon">⚡</div>
            <div class="sup-cert-badge__name">UL Listed</div>
            <div class="sup-cert-badge__status sup-cert-badge__status--pending">Pending</div>
          </div>` : ''}
        </div>
        <div class="sup-quality-metrics">
          <div class="sup-quality-metric">
            <span class="sup-quality-metric__label">Defect Rate (PPM)</span>
            <div class="sup-quality-metric__bar"><div class="sup-quality-metric__fill" style="width: ${Math.min(95, score)}%; background: ${score >= 85 ? '#10b981' : score >= 70 ? '#3b82f6' : '#f59e0b'};"></div></div>
            <span class="sup-quality-metric__value">${Math.max(50, 1200 - score * 12)} PPM</span>
          </div>
          <div class="sup-quality-metric">
            <span class="sup-quality-metric__label">On-Time Delivery</span>
            <div class="sup-quality-metric__bar"><div class="sup-quality-metric__fill" style="width: ${Math.min(98, 60 + score / 3)}%; background: #10b981;"></div></div>
            <span class="sup-quality-metric__value">${Math.min(98, Math.floor(60 + score / 3))}%</span>
          </div>
          <div class="sup-quality-metric">
            <span class="sup-quality-metric__label">First Pass Yield</span>
            <div class="sup-quality-metric__bar"><div class="sup-quality-metric__fill" style="width: ${Math.min(99, 70 + score / 4)}%; background: #3b82f6;"></div></div>
            <span class="sup-quality-metric__value">${Math.min(99, Math.floor(70 + score / 4))}%</span>
          </div>
        </div>
      </div>

      <!-- Section: Trade & Compliance -->
      <div class="sup-section">
        <div class="sup-section__title">🌍 Trade & Compliance</div>
        <div class="sup-facility-grid">
          <div class="sup-facility-card">
            <div class="sup-facility-card__label">Export Markets</div>
            <div class="sup-facility-card__value">${exportCountries} countries</div>
          </div>
          <div class="sup-facility-card">
            <div class="sup-facility-card__label">Payment Terms</div>
            <div class="sup-facility-card__value" style="font-size: 11px;">${payTerms}</div>
          </div>
          <div class="sup-facility-card">
            <div class="sup-facility-card__label">Incoterms</div>
            <div class="sup-facility-card__value">${incoterms.join(', ')}</div>
          </div>
          <div class="sup-facility-card">
            <div class="sup-facility-card__label">Currency</div>
            <div class="sup-facility-card__value">USD, EUR, CNY</div>
          </div>
          <div class="sup-facility-card">
            <div class="sup-facility-card__label">NDA Available</div>
            <div class="sup-facility-card__value" style="color: #10b981;">Yes — standard</div>
          </div>
          <div class="sup-facility-card">
            <div class="sup-facility-card__label">IP Protection</div>
            <div class="sup-facility-card__value">${score >= 80 ? 'Strong — tooling NDA + NCA' : 'Standard NDA'}</div>
          </div>
        </div>
      </div>

      <!-- Section: Sustainability & Social -->
      <div class="sup-section">
        <div class="sup-section__title">♻️ Sustainability & Social Responsibility</div>
        <div class="sup-sustainability-grid">
          <div class="sup-sustainability-item">
            <span class="sup-sustainability-item__icon">${score >= 80 ? '✅' : '⬜'}</span>
            <div>
              <span class="sup-sustainability-item__label">ISO 14001 Environmental Management</span>
              <span class="sup-sustainability-item__status">${score >= 80 ? 'Certified' : 'Not certified'}</span>
            </div>
          </div>
          <div class="sup-sustainability-item">
            <span class="sup-sustainability-item__icon">${score >= 85 ? '✅' : '⬜'}</span>
            <div>
              <span class="sup-sustainability-item__label">REACH / RoHS Compliance</span>
              <span class="sup-sustainability-item__status">${score >= 85 ? 'Compliant' : 'Partial'}</span>
            </div>
          </div>
          <div class="sup-sustainability-item">
            <span class="sup-sustainability-item__icon">${score >= 75 ? '✅' : '⬜'}</span>
            <div>
              <span class="sup-sustainability-item__label">Social Audit (SA8000 / SEDEX)</span>
              <span class="sup-sustainability-item__status">${score >= 75 ? 'Passed — last audit 2024' : 'Not audited'}</span>
            </div>
          </div>
          <div class="sup-sustainability-item">
            <span class="sup-sustainability-item__icon">${score >= 90 ? '✅' : '⬜'}</span>
            <div>
              <span class="sup-sustainability-item__label">Carbon Neutrality Program</span>
              <span class="sup-sustainability-item__status">${score >= 90 ? 'Active program' : 'Not started'}</span>
            </div>
          </div>
        </div>
      </div>

      <!-- Section: Sample & Prototyping -->
      <div class="sup-section">
        <div class="sup-section__title">🧪 Sample & Prototyping</div>
        <div class="sup-facility-grid">
          <div class="sup-facility-card">
            <div class="sup-facility-card__label">Sample Policy</div>
            <div class="sup-facility-card__value">${score >= 85 ? 'Free samples (≤3)' : 'Paid samples'}</div>
          </div>
          <div class="sup-facility-card">
            <div class="sup-facility-card__label">Sample Lead Time</div>
            <div class="sup-facility-card__value">${Math.max(3, 15 - Math.floor(score / 10))} days</div>
          </div>
          <div class="sup-facility-card">
            <div class="sup-facility-card__label">Tooling Cost Range</div>
            <div class="sup-facility-card__value">$${Math.floor(500 + (100 - score) * 30)}–$${Math.floor(3000 + (100 - score) * 80)}</div>
          </div>
          <div class="sup-facility-card">
            <div class="sup-facility-card__label">T1 Sample Timeline</div>
            <div class="sup-facility-card__value">${Math.max(10, 35 - Math.floor(score / 4))} days</div>
          </div>
          <div class="sup-facility-card">
            <div class="sup-facility-card__label">Design Support</div>
            <div class="sup-facility-card__value">${score >= 80 ? 'DFM + mold flow analysis' : 'Basic DFM review'}</div>
          </div>
          <div class="sup-facility-card">
            <div class="sup-facility-card__label">Iteration Rounds</div>
            <div class="sup-facility-card__value">${score >= 85 ? '3 included' : '1 included'}</div>
          </div>
        </div>
      </div>

      <!-- Section: Supplier Qualification Summary -->
      <div class="sup-section">
        <div class="sup-section__title">📊 Supplier Qualification Summary</div>
        <div class="sup-qualification-grid">
          <div class="sup-qual-item">
            <div class="sup-qual-item__header">
              <span class="sup-qual-item__dot" style="background: ${score >= 80 ? '#10b981' : '#f59e0b'};"></span>
              <span class="sup-qual-item__label">Factory Verified</span>
            </div>
            <span class="sup-qual-item__detail">${score >= 80 ? 'Confirmed manufacturer — owns production' : 'Verification in progress'}</span>
          </div>
          <div class="sup-qual-item">
            <div class="sup-qual-item__header">
              <span class="sup-qual-item__dot" style="background: #10b981;"></span>
              <span class="sup-qual-item__label">Business License</span>
            </div>
            <span class="sup-qual-item__detail">Active — registration on file</span>
          </div>
          <div class="sup-qual-item">
            <div class="sup-qual-item__header">
              <span class="sup-qual-item__dot" style="background: ${score >= 75 ? '#10b981' : '#6b7280'};"></span>
              <span class="sup-qual-item__label">Export Experience</span>
            </div>
            <span class="sup-qual-item__detail">${exportCountries} countries in last 12 months</span>
          </div>
          <div class="sup-qual-item">
            <div class="sup-qual-item__header">
              <span class="sup-qual-item__dot" style="background: ${score >= 70 ? '#10b981' : '#f59e0b'};"></span>
              <span class="sup-qual-item__label">Financial Health</span>
            </div>
            <span class="sup-qual-item__detail">Revenue trend ${score >= 80 ? '↑ growing' : '→ stable'} — ${score >= 75 ? 'low' : 'moderate'} risk</span>
          </div>
        </div>
      </div>

      <!-- Section: Contact & Location (locked for free tier) -->
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
            width="100%" height="160" frameborder="0" scrolling="no" marginheight="0" marginwidth="0" 
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
          <li class="sup-intel-item"><span class="sup-intel-icon">▸</span> <strong>Export History:</strong> ${Math.floor(100 + Math.random() * 2000)} shipments to ${exportCountries} countries in last 12 months</li>
          <li class="sup-intel-item"><span class="sup-intel-icon">▸</span> <strong>Quality Certifications:</strong> ISO 9001, ISO 14001${Math.random() > 0.5 ? ', IATF 16949' : ''}${Math.random() > 0.6 ? ', ISO 13485 (Medical)' : ''}</li>
          <li class="sup-intel-item"><span class="sup-intel-icon">▸</span> <strong>Litigation Check:</strong> ${Math.random() > 0.3 ? 'No active disputes found' : '1 minor trade dispute (resolved 2023)'}</li>
          <li class="sup-intel-item"><span class="sup-intel-icon">▸</span> <strong>Key Customers:</strong> Supplies to ${Math.floor(2 + Math.random() * 5)} Fortune 500 companies (names redacted)</li>
          <li class="sup-intel-item"><span class="sup-intel-icon">▸</span> <strong>Financial Health:</strong> Revenue trend ${Math.random() > 0.4 ? '↑ growing' : '→ stable'} over 3 years — ${Math.random() > 0.3 ? 'low' : 'moderate'} risk</li>
        </ul>
        <div style="margin-top: var(--space-4);">
          <div style="font-size: 10px; font-weight: var(--weight-semibold); color: var(--color-steel-400); text-transform: uppercase; letter-spacing: var(--tracking-wider); margin-bottom: var(--space-2);">📷 Facility Media</div>
          <div style="display: flex; gap: var(--space-2); overflow-x: auto; padding-bottom: var(--space-2);" class="sup-intel-carousel">
            ${galleryImgs.slice(0, 4).map(url => `<img src="${url}" style="height: 120px; border-radius: 4px; border: 1px solid rgba(255,255,255,0.1); flex-shrink: 0;" />`).join('')}
          </div>
        </div>
      </div>

      <!-- RFQ Card -->
      <div class="sup-rfq">
        <div class="sup-rfq__title">📋 Send Request for Quotation</div>
        <p class="sup-rfq__desc">Describe your product, upload drawings (CAD, 2D, 3D), and specify quantities. The supplier will respond within their estimated response time.</p>
        <textarea class="sup-rfq__textarea" placeholder="Describe your product requirements, materials, quantities, target price..."></textarea>
        <div class="sup-rfq__actions">
          <button class="btn btn--primary btn--sm" id="modal-send-rfq">Send RFQ</button>
          <button class="btn btn--secondary btn--sm" id="modal-attach-files">📎 Attach Files</button>
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
        <button class="btn btn--success btn--sm" id="modal-engage-consulting">Engage ATLAX Consulting →</button>
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

  body.querySelector('#modal-send-rfq')?.addEventListener('click', () => console.log('[ATLAX] RFQ submitted for:', s.name));
  body.querySelector('#modal-attach-files')?.addEventListener('click', () => console.log('[ATLAX] Upload drawings'));
  body.querySelector('#modal-engage-consulting')?.addEventListener('click', () => console.log('[ATLAX] Consulting engaged for:', s.name));

  body.querySelectorAll('.sup-section--locked').forEach(el => {
    el.addEventListener('click', () => {
      document.getElementById('pricing-backdrop')?.classList.remove('hidden');
      document.getElementById('pricing-modal')?.classList.remove('hidden');
    });
  });
}

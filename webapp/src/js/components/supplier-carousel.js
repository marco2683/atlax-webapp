/* ============================================================
   PRD — Supplier Detail Modal (Comprehensive Dossier)
   Updated: 2026-04-01 – Added photo gallery, video, materials,
   production capacity, trade, sustainability, sample sections
   ============================================================ */

const DEFAULT_BANNER = 'https://images.unsplash.com/photo-1565043589221-1a6fd9ae45c7?w=1200&q=80';

/**
 * Proxy insecure (http://) image URLs through images.weserv.nl
 * so they load on our HTTPS site without mixed-content blocking.
 */
function safeImgUrl(url) {
  if (!url) return '';
  // Already secure or relative — pass through
  if (url.startsWith('https://') || url.startsWith('/') || url.startsWith('data:')) return url;
  // HTTP URL — proxy through weserv
  if (url.startsWith('http://')) {
    return `https://images.weserv.nl/?url=${encodeURIComponent(url)}`;
  }
  return url;
}

let currentIndex = 0;
let currentSuppliers = [];
let currentTechName = '';
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
  currentTechName = techName;
  currentSuppliers = suppliers;
  currentIndex = 0;
  const backdrop = document.getElementById('supplier-backdrop');
  const modal = document.getElementById('supplier-modal');
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
  const title = document.getElementById('supplier-modal-title');
  if (!body || !currentSuppliers[currentIndex]) return;
  const s = currentSuppliers[currentIndex];

  if (title) {
    title.style.display = 'flex';
    title.style.flex = '1';
    title.style.alignItems = 'center';
    title.style.justifyContent = 'flex-start';
    title.style.marginRight = '20px';
    title.style.gap = '24px';
    
    // Process tech and tag pills precisely from capabilities and tags
    const techPills = (s.technologies || []).slice(0, 6).map(t => `<span style="background: rgba(99, 102, 241, 0.08); color: #4f46e5; border: 1px solid rgba(99, 102, 241, 0.25); padding: 3px 8px; border-radius: 4px; font-size: 10px; font-weight: 700; text-transform: uppercase;">${t}</span>`).join('');
    const tagPills = (s.tags || []).slice(0, 4).map(t => `<span style="background: rgba(245, 158, 11, 0.08); color: #d97706; border: 1px solid rgba(245, 158, 11, 0.25); padding: 3px 8px; border-radius: 4px; font-size: 10px; font-weight: 700; text-transform: uppercase;">${t}</span>`).join('');
    
    title.innerHTML = `
      <div style="display: flex; flex-direction: column; gap: 6px; flex: 1; min-width: 0;">
        <span style="font-size: 9px; font-weight: 700; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.05em;">Specializations</span>
        <div style="display: flex; flex-direction: column; gap: 4px;">
          <div style="display: flex; flex-wrap: wrap; gap: 4px; align-items: center;">
            ${(s.techGroups || [s.techGroup || currentTechName]).filter(Boolean).map(tg => `<span style="background: rgba(16, 185, 129, 0.1); color: #059669; border: 1px solid rgba(16, 185, 129, 0.4); padding: 5px 10px; border-radius: 6px; font-size: 12px; font-weight: 800; text-transform: uppercase;">${tg}</span>`).join('')}
          </div>
          ${techPills ? `<div style="display: flex; flex-wrap: wrap; gap: 4px; align-items: center;">${techPills}</div>` : ''}
          ${tagPills ? `<div style="display: flex; flex-wrap: wrap; gap: 4px; align-items: center;">${tagPills}</div>` : ''}
        </div>
      </div>
      
      <div style="display: flex; gap: 48px; border-left: 1px solid #e2e8f0; padding-left: 32px; flex: 1.5; justify-content: center; align-items: center;">
        <!-- Quality Score -->
        <div style="display: flex; flex-direction: column; gap: 6px;">
          <span style="font-size: 10px; font-weight: 800; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.05em;">Quality Score</span>
          <div style="font-size: 24px; font-weight: 800; color: #0f172a; line-height: 1; display: flex; align-items: baseline;">
            ${s.factoryScore || '92'}<span style="font-size: 14px; color: #64748b; font-weight: 600; margin-left: 2px;">/100</span>
            <span class="sup-pill sup-pill--green" style="margin-left: 8px; font-size: 11px; vertical-align: middle;">Excellent</span>
          </div>
        </div>

        <!-- Foundation -->
        <div style="display: flex; flex-direction: column; gap: 6px;">
          <span style="font-size: 10px; font-weight: 800; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.05em;">Company Foundation</span>
          <div style="font-size: 16px; font-weight: 700; color: #0f172a; line-height: 1; padding-top: 3px;">
            Est. ${s.yearEstablished || '2008'} <span style="font-size: 13px; color: #64748b; font-weight: 500;">(${new Date().getFullYear() - parseInt(s.yearEstablished || 2008)} yrs)</span>
          </div>
        </div>

        <!-- Certifications -->
        <div style="display: flex; flex-direction: column; gap: 6px;">
          <span style="font-size: 10px; font-weight: 800; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.05em;">Certifications & Compliance</span>
          <div style="display: flex; align-items: center; gap: 12px; padding-top: 3px;">
            <div style="font-size: 15px; font-weight: 700; color: #166534; line-height: 1;">
              ${(s.certifications || []).slice(0, 3).join(', ') || 'ISO 9001:2015, ISO 14001'}
            </div>
            <button onclick="alert('Downloading Certificates...')" style="background: #f0fdf4; color: #15803d; border: 1px solid #bbf7d0; border-radius: 6px; padding: 4px 10px; font-size: 11px; font-weight: 700; cursor: pointer; display: inline-flex; align-items: center; gap: 6px; text-transform: uppercase; letter-spacing: 0.05em; transition: all 0.2s; box-shadow: 0 1px 2px rgba(21, 128, 61, 0.05);">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>
              Download
            </button>
          </div>
        </div>
      </div>
    `;
  }

  const score = s.factoryScore || 70;

  const bannerUrl = safeImgUrl(s.banner || s.bannerImage || DEFAULT_BANNER);
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
  let facilityImgs = [...(s.images?.facility || []), ...(s.images?.equipment || []), ...(s.images?.factory || [])];
  
  // Use s.url as primary, fallback to s.website
  let websiteUrl = s.url || s.website;

  const exportCountries = s.exportCountries || (s.factoryScore >= 75 ? Math.floor(5 + score / 8) : 2);

  const mapUrl = `https://maps.google.com/?q=${encodeURIComponent((s.city || '') + ', ' + (s.country || ''))}`;
  const mapEmbedUrl = `https://maps.google.com/maps?q=${encodeURIComponent((s.city || '') + ', ' + (s.country || ''))}&t=&z=13&ie=UTF8&iwloc=&output=embed`;

  const renderImageGrid = (imgs) => {
    const gridItems = Array.from({length: 6}, (_, i) => {
      if (i < imgs.length) {
        return `<div style="background: url('${safeImgUrl(imgs[i])}') center/cover; aspect-ratio: 1; border-radius: 8px; width: 100%;"></div>`;
      } else {
        return `<div style="aspect-ratio: 1; border: 1px dashed rgba(255,255,255,0.15); border-radius: 8px; width: 100%;"></div>`;
      }
    });
    return `<div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; padding: 12px 0;">${gridItems.join('')}</div>`;
  };

  const getTcBullets = (score) => score == 2 ? '<li>High-precision 5-axis CNC machining</li><li>In-house tooling and die design team</li><li>Advanced CMM and metrology lab</li>' : '<li>Standard robust manufacturing capability</li><li>Basic tooling modifications in-house</li><li>Proven equipment reliability</li>';
  const getOeBullets = (score) => score == 2 ? '<li>Proactive DFM feedback within 24 hours</li><li>Direct line communication to management</li><li>Transparent delay and issue reporting</li>' : '<li>Responsive to standard RFQ requests</li><li>Good communication during production</li><li>Standard response times</li>';
  const getQsBullets = (score) => score == 2 ? '<li>Statistical Process Control (SPC) active</li><li>Comprehensive IQC material quarantine</li><li>Traceability through specialized ERP</li>' : '<li>Basic visual and dimensional IQC</li><li>Standard end-of-line checking</li><li>Manual batch tracking implemented</li>';
  const getCostBullets = (score) => (parseInt(score) > 8) ? '<li>Aggressive amortized tooling setups</li><li>Low overhead costs translating to unit price</li><li>Fast operational setups maximizing speed</li>' : '<li>Market-standard pricing for their tier</li><li>Average setup and NRE costs</li><li>Reliable delivery standard times</li>';

  const advColors = {
    technical: { border: '#c7d2fe', bg: '#eef2ff', text: '#3730a3', icon: '#4f46e5' },
    ethos: { border: '#fde68a', bg: '#fffbeb', text: '#92400e', icon: '#d97706' },
    quality: { border: '#a7f3d0', bg: '#ecfdf5', text: '#065f46', icon: '#059669' },
    cost: { border: '#bae6fd', bg: '#f0f9ff', text: '#075985', icon: '#0ea5e9' },
    none: { border: '#e2e8f0', bg: '#f8fafc', text: '#475569', icon: '#94a3b8' }
  };
  const pAdv = s.primaryAdvantageType || 'none';
  const advStyle = advColors[pAdv] || advColors['none'];
  const getBoxStyle = (type) => pAdv === type ? `box-shadow: 0 0 0 2px ${advColors[type].icon}; border-color: transparent;` : 'border: 1px solid #e2e8f0;';
  const getStar = (type) => pAdv === type ? `<div style="position: absolute; top: -12px; right: -12px; background: ${advColors[type].icon}; color: white; width: 28px; height: 28px; border-radius: 50%; display: flex; align-items: center; justify-content: center; box-shadow: 0 4px 6px rgba(0,0,0,0.15); z-index: 2;"><svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" stroke="none"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg></div>` : '';

  body.innerHTML = `
<div class="sup-dossier-simple" style="padding: 32px; background: #fff; height:100%; overflow-y: auto;">
  
  <!-- Header: Name & Contact -->
  <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 32px; padding-bottom: 24px; border-bottom: 1px solid #e2e8f0;">
    <div style="display: flex; align-items: center; gap: 20px;">
      <div style="width: 64px; height: 64px; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; display: flex; align-items: center; justify-content: center; font-size: 24px; font-weight: 800; color: #475569;">
        ${s.name.substring(0, 2).toUpperCase()}
      </div>
      <div>
        <h2 style="margin: 0 0 8px 0; font-size: 28px; color: #0f172a; font-weight: 800;">${s.name}</h2>
        <div style="color: #64748b; font-size: 15px; display: flex; align-items: center; gap: 8px; font-weight: 500;">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
          ${s.address || (s.city + ', ' + s.country)}
        </div>
      </div>
    </div>
    
    <!-- Primary Contact -->
    <div style="display: flex; gap: 16px; align-items: center;">
      <a href="mailto:${email}" style="display: flex; align-items: center; gap: 8px; background: #f8fafc; border: 1px solid #cbd5e1; color: #0f172a; padding: 10px 16px; border-radius: 8px; font-size: 14px; font-weight: 600; text-decoration: none; transition: background 0.2s;">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>
        ${email}
      </a>
      ${websiteUrl ? `<a href="${websiteUrl.startsWith('http') ? websiteUrl : 'https://' + websiteUrl}" target="_blank" style="display: flex; align-items: center; gap: 8px; background: #fff; border: 1px solid #cbd5e1; color: #2563eb; padding: 10px 16px; border-radius: 8px; font-size: 14px; font-weight: 600; text-decoration: none; transition: background 0.2s;">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>
        Website
      </a>` : ''}
    </div>
  </div>

  <div style="display: grid; grid-template-columns: 2fr 1fr; gap: 40px; margin-bottom: 40px;">
    
    <!-- Left Column: Description & Best For -->
    <div style="display: flex; flex-direction: column; gap: 32px;">
      <!-- Description -->
      <div>
        <h3 style="font-size: 13px; font-weight: 800; color: #94a3b8; text-transform: uppercase; margin-bottom: 12px; letter-spacing: 0.05em;">Company Overview</h3>
        <p style="font-size: 15px; color: #334155; line-height: 1.8; margin: 0; font-weight: 400;">
          ${s.description || 'This supplier is a leading manufacturer in the Pearl River Delta region, specializing in high-quality production and engineering services. They have a proven track record of delivering consistent results for international clients, adhering strictly to global quality standards.'}
        </p>
      </div>

      <!-- Specifics / What they do -->
      <div>
        <h3 style="font-size: 13px; font-weight: 800; color: #94a3b8; text-transform: uppercase; margin-bottom: 12px; letter-spacing: 0.05em;">Capabilities</h3>
        <div style="display: flex; flex-wrap: wrap; gap: 8px;">
          ${(s.technologies || []).concat(s.tags || []).slice(0, 12).map(t => 
            `<span style="background: #f1f5f9; color: #334155; padding: 6px 14px; border-radius: 20px; font-size: 13px; font-weight: 600;">${t}</span>`
          ).join('')}
        </div>
      </div>
    </div>

    <!-- Right Column: Best For & Details -->
    <div style="display: flex; flex-direction: column; gap: 24px;">
      <!-- Best For -->
      <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 20px;">
        <h3 style="font-size: 13px; font-weight: 800; color: #0f172a; text-transform: uppercase; margin-bottom: 16px; display: flex; align-items: center; gap: 8px; letter-spacing: 0.05em;">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#2563eb" stroke-width="3"><polyline points="20 6 9 17 4 12"></polyline></svg>
          Best For
        </h3>
        <ul style="margin: 0; padding-left: 20px; color: #475569; font-size: 14px; line-height: 1.8; font-weight: 500;">
          ${(s.technologies || []).concat(s.tags || []).slice(0, 4).map(t => 
            `<li style="margin-bottom: 6px;">${t}</li>`
          ).join('') || '<li>Standard manufacturing processes</li><li>Cost-effective production runs</li>'}
        </ul>
      </div>

      <!-- Contact Info -->
      <div style="background: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px; padding: 20px;">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
           <span style="font-size: 13px; color: #64748b; font-weight: 500;">Phone</span>
           <span style="font-size: 14px; color: #0f172a; font-weight: 600;">${phone || '--'}</span>
        </div>
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
           <span style="font-size: 13px; color: #64748b; font-weight: 500;">Est.</span>
           <span style="font-size: 14px; color: #0f172a; font-weight: 600;">${s.yearEstablished || '--'}</span>
        </div>
        <div style="display: flex; justify-content: space-between; align-items: center;">
           <span style="font-size: 13px; color: #64748b; font-weight: 500;">Employees</span>
           <span style="font-size: 14px; color: #0f172a; font-weight: 600;">${s.employees || '--'}</span>
        </div>
      </div>
      
      <!-- Actions -->
      <div style="display: flex; flex-direction: column; gap: 8px;">
        ${shortlistBtnHTML.replace('sup-banner__add-shortlist-btn', 'CTA-BTN' + (isShortlisted ? ' CTA-BTN--added' : '')).replace('CTA-BTN', 'style="width: 100%; padding: 14px; border-radius: 8px; font-weight: 600; border: none; cursor: pointer; display:flex; align-items:center; justify-content:center; gap:8px; ' + (isShortlisted ? 'background:#ecfdf5; color:#10b981; border:1px solid #a7f3d0;"' : 'background:#0f172a; color:white;"'))}
      </div>
    </div>
  </div>

  <!-- Image Gallery (Scrollable) -->
  ${[...productImgs, ...facilityImgs].length > 0 ? `
  <div style="margin-top: 24px;">
    <h3 style="font-size: 13px; font-weight: 800; color: #94a3b8; text-transform: uppercase; margin-bottom: 16px; letter-spacing: 0.05em;">Facility & Product Images</h3>
    <div style="display: flex; gap: 16px; overflow-x: auto; padding-bottom: 16px; -webkit-overflow-scrolling: touch;">
      ${[...productImgs, ...facilityImgs].map(img => `
        <div style="flex: 0 0 auto; width: 240px; height: 180px; background: url('${safeImgUrl(img)}') center/cover no-repeat; border-radius: 12px; border: 1px solid #e2e8f0; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05);"></div>
      `).join('')}
    </div>
  </div>
  ` : ''}

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


/* ============================================================
   PRD — Supplier Detail Modal (Comprehensive Dossier)
   Updated: 2026-04-01 – Added photo gallery, video, materials,
   production capacity, trade, sustainability, sample sections
   ============================================================ */

const DEFAULT_BANNER = 'https://images.unsplash.com/photo-1565043589221-1a6fd9ae45c7?w=1200&q=80';

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
            <span style="background: rgba(16, 185, 129, 0.1); color: #059669; border: 1px solid rgba(16, 185, 129, 0.4); padding: 5px 10px; border-radius: 6px; font-size: 12px; font-weight: 800; text-transform: uppercase;">${s.techGroup || currentTechName}</span>
          </div>
          ${techPills ? `<div style="display: flex; flex-wrap: wrap; gap: 4px; align-items: center;">${techPills}</div>` : ''}
          ${tagPills ? `<div style="display: flex; flex-wrap: wrap; gap: 4px; align-items: center;">${tagPills}</div>` : ''}
        </div>
      </div>
      
      <div style="display: flex; gap: 32px; border-left: 1px solid #e2e8f0; padding-left: 24px; flex-shrink: 0; justify-content: flex-end;">
        <!-- Quality Score -->
        <div style="display: flex; flex-direction: column; gap: 4px;">
          <span style="font-size: 9px; font-weight: 700; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.05em;">Quality Score</span>
          <div style="font-size: 18px; font-weight: 800; color: #0f172a; line-height: 1;">${s.factoryScore || '92'}<span style="font-size: 12px; color: #64748b; font-weight: 600;">/100</span>
             <span class="sup-pill sup-pill--green" style="margin-left: 6px; font-size: 9px;">Excellent</span>
          </div>
        </div>

        <!-- Foundation -->
        <div style="display: flex; flex-direction: column; gap: 4px;">
          <span style="font-size: 9px; font-weight: 700; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.05em;">Company Foundation</span>
          <div style="font-size: 14px; font-weight: 700; color: #0f172a; line-height: 1; padding-top: 3px;">Est. ${s.yearEstablished || '2008'} <span style="font-size: 12px; color: #64748b; font-weight: 500;">(${new Date().getFullYear() - parseInt(s.yearEstablished || 2008)} yrs)</span></div>
        </div>

        <!-- Certifications -->
        <div style="display: flex; flex-direction: column; gap: 4px;">
          <span style="font-size: 9px; font-weight: 700; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.05em;">Certifications & Compliance</span>
          <div style="font-size: 13px; font-weight: 600; color: #166534; line-height: 1; padding-top: 3px;">
            ${(s.certifications || []).slice(0, 3).join(', ') || 'ISO 9001:2015, ISO 14001'}
          </div>
        </div>
      </div>
    `;
  }

  const score = s.factoryScore || 70;

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
<div class="sup-dossier" style="height:100%; display:flex;">
  
  <!-- LEFT SIDEBAR -->
  <div class="sup-dossier__sidebar" style="display:flex; flex-direction:column; height: 100%;">
    <div style="margin-bottom: 24px;">
      ${shortlistBtnHTML.replace('sup-banner__add-shortlist-btn', 'sup-sidebar__cta' + (isShortlisted ? ' sup-sidebar__cta--added' : ''))}
    </div>
    
    <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 16px;">
      <div class="sup-dossier__logo" style="margin-bottom: 0px;">${s.name.substring(0, Math.min(2, s.name.length)).toUpperCase()}</div>
      <div>
         <div class="sup-dossier__name" style="margin-bottom: 2px; font-size: 18px;">${s.name}</div>
         <div class="sup-dossier__category">${s.segment || 'Industrial Manufacturing'}</div>
      </div>
    </div>
    
    <div class="sup-contact-block" style="margin-bottom: 24px; margin-top: 12px;">
      <div style="display: grid; grid-template-columns: 80px 1fr; gap: 8px; margin-bottom: 12px;">
         <span class="sup-contact-label" style="margin-bottom: 0;">Email</span>
         <a href="mailto:${email}" class="sup-contact-value" style="color: #2563eb; margin-bottom: 0; font-size: 13px;">${email}</a>
      </div>
      <div style="display: grid; grid-template-columns: 80px 1fr; gap: 8px; margin-bottom: 12px;">
         <span class="sup-contact-label" style="margin-bottom: 0;">Phone</span>
         <span class="sup-contact-value" style="margin-bottom: 0; font-size: 13px;">${phone || '--'}</span>
      </div>
      <div style="display: grid; grid-template-columns: 80px 1fr; gap: 8px; margin-bottom: 12px;">
         <span class="sup-contact-label" style="margin-bottom: 0;">WeChat</span>
         <span class="sup-contact-value" style="margin-bottom: 0; font-size: 13px;">${wechat || '--'}</span>
      </div>
      <div style="display: grid; grid-template-columns: 80px 1fr; gap: 8px; margin-bottom: 12px;">
         <span class="sup-contact-label" style="margin-bottom: 0;">Website</span>
         <a href="${websiteUrl ? (websiteUrl.startsWith('http') ? websiteUrl : 'https://' + websiteUrl) : '#'}" target="_blank" class="sup-contact-value" style="color: #2563eb; margin-bottom: 0; font-size: 13px;">${websiteUrl ? 'Visit Website ↗' : '--'}</a>
      </div>
      <div style="display: grid; grid-template-columns: 80px 1fr; gap: 8px; margin-bottom: 12px;">
         <span class="sup-contact-label" style="margin-bottom: 0;">Address</span>
         <span class="sup-contact-value" style="margin-bottom: 0; font-size: 13px; line-height: 1.4;">${s.address || s.city + ', ' + s.country}</span>
      </div>
    </div>

    <!-- Factory Map placed in sidebar bottom -->
    <div style="flex: 1; border-radius: 8px; overflow: hidden; border: 1px solid #e2e8f0; margin-bottom: 24px; display:flex; flex-direction:column; min-height:160px; position:relative; z-index:1;">
       <iframe width="100%" height="100%" frameborder="0" scrolling="no" marginheight="0" marginwidth="0" src="${mapEmbedUrl}" style="border: none; flex:1;"></iframe>
    </div>

    <div style="display: flex; flex-direction: column; gap: 8px;">
      <button id="modal-send-rfq" style="width: 100%; padding: 14px; background: #0f172a; color: white; border: none; border-radius: 8px; font-weight: 600; font-size: 14px; cursor: pointer;">Submit Inquiry</button>
      <button id="modal-engage-consulting" style="width: 100%; padding: 14px; background: #f0fdf4; color: #166534; border: 1px solid #bbf7d0; border-radius: 8px; font-weight: 600; font-size: 14px; cursor: pointer;">🌿 Engage Atlas Auditing Team</button>
    </div>
  </div>

  <!-- RIGHT DASHBOARD -->
  <div class="sup-dossier__dashboard" style="height: 100%; overflow-y: auto;">
    
    <div class="sup-intel-gate--light ${isIntelLocked ? 'is-locked' : ''}">
      ${isIntelLocked ? `
        <div class="sup-intel-gate-overlay">
          <button class="sup-intel-gate-btn" onclick="window.location.href='/profile.html?tab=billing'">
            🔒 Upgrade to View Full Dossier
          </button>
        </div>
      ` : ''}

      <!-- CORE EVALUATION FRAMEWORK - BRAND NEW VISUALIZATION -->
      <div class="sup-panel" style="margin-bottom: 24px; padding: 24px 32px;">
         <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; border-bottom: 1px solid #f1f5f9; padding-bottom: 16px;">
            <div class="sup-panel__title" style="margin-bottom: 0; padding-bottom: 0; border: none; font-size: 14px; color: #0f172a;">Atlas Factory Qualification Matrix</div>
         </div>
         
         <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px;">
            <!-- 1. Technical Capability -->
            <div style="background: #ffffff; ${getBoxStyle('technical')} border-radius: 12px; padding: 20px; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.02), 0 2px 4px -1px rgba(0,0,0,0.02); display: flex; flex-direction: column; position: relative;">
               ${getStar('technical')}
               <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 12px;">
                 <div style="font-weight: 700; color: #0f172a; font-size: 15px; display: flex; align-items: center; gap: 8px;">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#4f46e5" stroke-width="2"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>
                    Technical Capability
                 </div>
                 <div style="background: rgba(79, 70, 229, 0.1); color: #4f46e5; border: 1px solid rgba(79,70,229,0.2); font-size: 12px; font-weight: 700; padding: 4px 10px; border-radius: 12px; letter-spacing: 0.02em;">${(!s.scoreTc || s.scoreTc == 0) ? 'Limited' : (s.scoreTc == 1 ? 'Moderate' : 'Advanced')}</div>
               </div>
               <p style="font-size: 13.5px; color: #64748b; margin: 0 0 16px 0; line-height: 1.6;">Scope and depth of manufacturing technologies, precision capacity, equipment modernism, and engineering talent to execute on complex DFM requirements.</p>
               <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 12px 16px; flex: 1;">
                 <div style="font-size: 11px; font-weight: 700; color: #475569; text-transform: uppercase; margin-bottom: 8px;">Key Strengths</div>
                 <ul style="margin: 0; padding-left: 20px; font-size: 13px; color: #0f172a; line-height: 1.6;">${getTcBullets(s.scoreTc)}</ul>
               </div>
            </div>
            
            <!-- 2. Ownership Ethos -->
            <div style="background: #ffffff; ${getBoxStyle('ethos')} border-radius: 12px; padding: 20px; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.02), 0 2px 4px -1px rgba(0,0,0,0.02); display: flex; flex-direction: column; position: relative;">
               ${getStar('ethos')}
               <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 12px;">
                 <div style="font-weight: 700; color: #0f172a; font-size: 15px; display: flex; align-items: center; gap: 8px;">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#d97706" stroke-width="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
                    Ownership Ethos
                 </div>
                 <div style="background: rgba(217, 119, 6, 0.1); color: #d97706; border: 1px solid rgba(217, 119, 6, 0.2); font-size: 12px; font-weight: 700; padding: 4px 10px; border-radius: 12px; letter-spacing: 0.02em;">${(!s.scoreOe || s.scoreOe == 0) ? 'Passive' : (s.scoreOe == 1 ? 'Moderate' : 'Proactive')}</div>
               </div>
               <p style="font-size: 13.5px; color: #64748b; margin: 0 0 16px 0; line-height: 1.6;">Management's attitude and accountability. The critical indicator for responsiveness, how proactively they solve deviations, and long-term partnership reliability.</p>
               <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 12px 16px; flex: 1;">
                 <div style="font-size: 11px; font-weight: 700; color: #475569; text-transform: uppercase; margin-bottom: 8px;">Key Strengths</div>
                 <ul style="margin: 0; padding-left: 20px; font-size: 13px; color: #0f172a; line-height: 1.6;">${getOeBullets(s.scoreOe)}</ul>
               </div>
            </div>

            <!-- 3. Quality Assurance -->
            <div style="background: #ffffff; ${getBoxStyle('quality')} border-radius: 12px; padding: 20px; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.02), 0 2px 4px -1px rgba(0,0,0,0.02); display: flex; flex-direction: column; position: relative;">
               ${getStar('quality')}
               <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 12px;">
                 <div style="font-weight: 700; color: #0f172a; font-size: 15px; display: flex; align-items: center; gap: 8px;">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#059669" stroke-width="2"><polyline points="9 11 12 14 22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg>
                    Quality Aspect
                 </div>
                 <div style="background: rgba(5, 150, 105, 0.1); color: #059669; border: 1px solid rgba(5, 150, 105, 0.2); font-size: 12px; font-weight: 700; padding: 4px 10px; border-radius: 12px; letter-spacing: 0.02em;">${(!s.scoreQs || s.scoreQs == 0) ? 'Basic' : (s.scoreQs == 1 ? 'Capable' : 'Exceptional')}</div>
               </div>
               <p style="font-size: 13.5px; color: #64748b; margin: 0 0 16px 0; line-height: 1.6;">Robustness of the deployed QMS, traceability workflows, statistical process control, and reliability of IQC (Incoming QC) and final inspections.</p>
               <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 12px 16px; flex: 1;">
                 <div style="font-size: 11px; font-weight: 700; color: #475569; text-transform: uppercase; margin-bottom: 8px;">Key Strengths</div>
                 <ul style="margin: 0; padding-left: 20px; font-size: 13px; color: #0f172a; line-height: 1.6;">${getQsBullets(s.scoreQs)}</ul>
               </div>
            </div>

            <!-- 4. Cost Competitiveness -->
            <div style="background: #ffffff; ${getBoxStyle('cost')} border-radius: 12px; padding: 20px; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.02), 0 2px 4px -1px rgba(0,0,0,0.02); display: flex; flex-direction: column; position: relative;">
               ${getStar('cost')}
               <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 12px;">
                 <div style="font-weight: 700; color: #0f172a; font-size: 15px; display: flex; align-items: center; gap: 8px;">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#0ea5e9" stroke-width="2"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
                    Cost & Speed Profile
                 </div>
                 <div style="background: rgba(14, 165, 233, 0.1); color: #0ea5e9; border: 1px solid rgba(14, 165, 233, 0.2); font-size: 12px; font-weight: 700; padding: 4px 10px; border-radius: 12px; letter-spacing: 0.02em;">${s.scoreCost ? s.scoreCost + '/10' : '8/10'} Index</div>
               </div>
               <p style="font-size: 13.5px; color: #64748b; margin: 0 0 16px 0; line-height: 1.6;">Overall commercial advantage rating. Evaluates unit COGS fairness, NRE/Tooling amortization strategies, and pure speed to market agility.</p>
               <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 12px 16px; flex: 1;">
                 <div style="font-size: 11px; font-weight: 700; color: #475569; text-transform: uppercase; margin-bottom: 8px;">Key Strengths</div>
                 <ul style="margin: 0; padding-left: 20px; font-size: 13px; color: #0f172a; line-height: 1.6;">${getCostBullets(s.scoreCost || 8)}</ul>
               </div>
            </div>

            <!-- OVERALL ADVANTAGE -->
            <div style="grid-column: span 2; background: ${advStyle.bg}; border: 1px solid ${advStyle.border}; border-radius: 12px; padding: 20px; margin-top: 4px;">
               <div style="font-weight: 700; color: ${advStyle.text}; font-size: 14px; display: flex; align-items: center; gap: 8px; margin-bottom: 8px;">
                 <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="${advStyle.icon}" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><path d="M12 16v-4"></path><path d="M12 8h.01"></path></svg>
                 Atlas Primary Advantage
               </div>
               <p style="font-size: 15px; color: ${advStyle.text}; margin: 0; line-height: 1.6; font-weight: 500;">
                 ${s.mainAdvantage ? s.mainAdvantage : `We selected ${s.name} for their excellent balance of rapid tooling deployment and highly responsive communication. They offer a strong commercial advantage for mid-volume production runs without sacrificing ISO-grade quality standards.`}
               </p>
            </div>

            <!-- BEST FOR -->
            ${s.bestFor ? `
            <div style="grid-column: span 2; background: #fdfdfd; border: 1px dashed #cbd5e1; border-radius: 12px; padding: 16px 20px; margin-top: -4px; display: flex; align-items: flex-start; gap: 16px;">
               <div style="background: #f1f5f9; padding: 8px 10px; border-radius: 8px; color: #475569; display: flex; align-items: center; justify-content: center;">
                 <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12.55a11 11 0 0 1 14.08 0"></path><path d="M1.42 9a16 16 0 0 1 21.16 0"></path><path d="M8.53 16.11a6 6 0 0 1 6.95 0"></path><line x1="12" y1="20" x2="12.01" y2="20"></line></svg>
               </div>
               <div>
                 <div style="font-size: 11px; font-weight: 700; color: #64748b; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 4px;">Ideal Product Match & Best For</div>
                 <div style="font-size: 15px; color: #0f172a; font-weight: 600; line-height: 1.4;">${s.bestFor}</div>
               </div>
            </div>
            ` : ''}
         </div>
      </div>
      
      <!-- Middle Row: Tech & Capabilities -->
      <div class="sup-board-grid" style="grid-template-columns: 1fr; margin-bottom: 24px;">
        <div class="sup-panel" style="display: flex; flex-direction: column;">
          <div class="sup-panel__title" style="margin-bottom: 16px; padding-bottom: 16px; font-size: 14px; color: #0f172a;">Specific Technical Node Mapping</div>
          <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 16px; margin-bottom: 24px;">
              ${(s.technologies || []).map(t => `
              <div class="sup-cap-item" style="border-bottom:none; padding-bottom:0; align-items:center;">
                <div class="sup-cap-icon" style="width:32px; height:32px;"><svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="3"></circle><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path></svg></div>
                <div class="sup-cap-details">
                  <div class="sup-cap-name" style="font-size: 14px; font-weight: 600;">${t}</div>
                </div>
              </div>
              `).join('')}
              ${(s.tags || []).map(t => `
              <div class="sup-cap-item" style="border-bottom:none; padding-bottom:0; align-items:center;">
                <div class="sup-cap-icon" style="width:32px; height:32px; background:#fff7ed; color:#ea580c;"><svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path><polyline points="3.27 6.96 12 12.01 20.73 6.96"></polyline><line x1="12" y1="22.08" x2="12" y2="12"></line></svg></div>
                <div class="sup-cap-details">
                  <div class="sup-cap-name" style="font-size: 14px; font-weight: 600;">${t}</div>
                </div>
              </div>
              `).join('')}
          </div>
          
          <!-- Facility Details Bottom Row -->
          <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; margin-top: 8px; border-top: 1px solid #e2e8f0; padding-top: 24px; background: #f8fafc; margin: 0 -28px -28px -28px; padding: 24px 28px; border-radius: 0 0 12px 12px;">
              <div style="display:flex; flex-direction:column; align-items:flex-start;">
                <div class="sup-detail-label" style="color: #64748b; font-size: 10px; margin-bottom: 4px;">FACTORY AREA</div>
                <div class="sup-detail-value" style="font-size: 16px; color:#0f172a;">${s.factoryArea || '--'}</div>
              </div>
              <div style="display:flex; flex-direction:column; align-items:flex-start;">
                <div class="sup-detail-label" style="color: #64748b; font-size: 10px; margin-bottom: 4px;">EMPLOYEES</div>
                <div class="sup-detail-value" style="font-size: 16px; color:#0f172a;">${s.employees || '--'}</div>
              </div>
              <div style="display:flex; flex-direction:column; align-items:flex-start;">
                <div class="sup-detail-label" style="color: #64748b; font-size: 10px; margin-bottom: 4px;">MIN ORDER QTY</div>
                <div class="sup-detail-value" style="font-size: 16px; color:#0f172a;">${s.moq || '--'}</div>
              </div>
              <div style="display:flex; flex-direction:column; align-items:flex-start;">
                <div class="sup-detail-label" style="color: #64748b; font-size: 10px; margin-bottom: 4px;">LEAD TIME</div>
                <div class="sup-detail-value" style="font-size: 16px; color:#0f172a;">${s.leadTime || '--'}</div>
              </div>
          </div>
        </div>
      </div>
      
      <!-- Bottom Row: Photo Gallery -->
      ${[...productImgs, ...facilityImgs].length > 0 ? `
      <div class="sup-panel">
        <div class="sup-panel__title" style="margin-bottom: 20px; font-size: 14px; color: #0f172a;">Facility & Product Portfolio</div>
        <div class="sup-gallery-grid">
          ${[...productImgs, ...facilityImgs].slice(0, 8).map(img => `
            <img src="${img}" class="sup-gallery-img" style="border-radius: 8px; box-shadow: 0 1px 3px rgba(0,0,0,0.1);" />
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


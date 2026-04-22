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
  let facilityImgs = [...(s.images?.facility || []), ...(s.images?.equipment || []), ...(s.images?.factory || [])];
  
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
<div class="sup-dossier-simple" style="padding: 24px; background: #fff; height:100%; overflow-y: auto;">
  <!-- Header -->
  <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 24px;">
    <div style="display: flex; align-items: center; gap: 16px;">
      <div style="width: 56px; height: 56px; background: #f1f5f9; border-radius: 8px; display: flex; align-items: center; justify-content: center; font-size: 20px; font-weight: 800; color: #475569;">
        ${s.name.substring(0, 2).toUpperCase()}
      </div>
      <div>
        <h2 style="margin: 0 0 4px 0; font-size: 24px; color: #0f172a; font-weight: 800;">${s.name}</h2>
        <div style="color: #64748b; font-size: 14px; display: flex; align-items: center; gap: 8px;">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
          ${s.address || (s.city + ', ' + s.country)}
        </div>
      </div>
    </div>
    <div style="text-align: right;">
      <div style="font-size: 11px; font-weight: 700; color: #94a3b8; text-transform: uppercase; margin-bottom: 4px;">Factory Score</div>
      <div style="font-size: 28px; font-weight: 800; color: #10b981; line-height: 1;">${s.factoryScore || '92'}<span style="font-size: 14px; color: #94a3b8;">/100</span></div>
    </div>
  </div>

  <div style="display: grid; grid-template-columns: 1fr 300px; gap: 32px;">
    
    <!-- Left Column -->
    <div>
      <!-- Specialties -->
      <div style="margin-bottom: 32px;">
        <h3 style="font-size: 13px; font-weight: 700; color: #475569; text-transform: uppercase; margin-bottom: 12px; border-bottom: 1px solid #e2e8f0; padding-bottom: 8px;">Specialties</h3>
        <div style="display: flex; flex-wrap: wrap; gap: 8px;">
          ${(s.technologies || []).concat(s.tags || []).slice(0, 8).map(t => 
            `<span style="background: #f8fafc; border: 1px solid #e2e8f0; color: #334155; padding: 6px 12px; border-radius: 6px; font-size: 13px; font-weight: 600;">${t}</span>`
          ).join('')}
        </div>
      </div>

      <!-- Capability Scores -->
      <div style="margin-bottom: 32px;">
         <h3 style="font-size: 13px; font-weight: 700; color: #475569; text-transform: uppercase; margin-bottom: 12px; border-bottom: 1px solid #e2e8f0; padding-bottom: 8px;">Capability Scores</h3>
         <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px;">
            <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 16px;">
               <div style="font-size: 12px; font-weight: 600; color: #64748b; margin-bottom: 4px;">Technical Capacity</div>
               <div style="font-size: 16px; font-weight: 700; color: #4f46e5;">${(!s.scoreTc || s.scoreTc == 0) ? 'Limited' : (s.scoreTc == 1 ? 'Moderate' : 'Advanced')}</div>
            </div>
            <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 16px;">
               <div style="font-size: 12px; font-weight: 600; color: #64748b; margin-bottom: 4px;">Cost Index</div>
               <div style="font-size: 16px; font-weight: 700; color: #0ea5e9;">${s.scoreCost ? s.scoreCost + '/10' : '8/10'}</div>
            </div>
            <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 16px;">
               <div style="font-size: 12px; font-weight: 600; color: #64748b; margin-bottom: 4px;">Quality Assurance</div>
               <div style="font-size: 16px; font-weight: 700; color: #059669;">${(!s.scoreQs || s.scoreQs == 0) ? 'Basic' : (s.scoreQs == 1 ? 'Capable' : 'Exceptional')}</div>
            </div>
            <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 16px;">
               <div style="font-size: 12px; font-weight: 600; color: #64748b; margin-bottom: 4px;">Ownership Ethos</div>
               <div style="font-size: 16px; font-weight: 700; color: #d97706;">${(!s.scoreOe || s.scoreOe == 0) ? 'Passive' : (s.scoreOe == 1 ? 'Moderate' : 'Proactive')}</div>
            </div>
         </div>
      </div>

      <!-- Photo Gallery -->
      ${[...productImgs, ...facilityImgs].length > 0 ? `
      <div>
        <h3 style="font-size: 13px; font-weight: 700; color: #475569; text-transform: uppercase; margin-bottom: 12px; border-bottom: 1px solid #e2e8f0; padding-bottom: 8px;">Facility & Work</h3>
        <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px;">
          ${[...productImgs, ...facilityImgs].slice(0, 8).map(img => `
            <div style="background: url('${img}') center/cover; aspect-ratio: 1; border-radius: 8px; border: 1px solid #e2e8f0;"></div>
          `).join('')}
        </div>
      </div>
      ` : ''}

    </div>

    <!-- Right Sidebar (Contact) -->
    <div>
      <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 24px;">
        <h3 style="font-size: 13px; font-weight: 700; color: #475569; text-transform: uppercase; margin-bottom: 16px;">Contact Details</h3>
        
        <div style="display: flex; flex-direction: column; gap: 16px; margin-bottom: 24px;">
          <div>
             <div style="font-size: 11px; font-weight: 600; color: #94a3b8; margin-bottom: 2px;">Email</div>
             <a href="mailto:${email}" style="font-size: 14px; color: #2563eb; font-weight: 500; text-decoration: none;">${email}</a>
          </div>
          <div>
             <div style="font-size: 11px; font-weight: 600; color: #94a3b8; margin-bottom: 2px;">Phone</div>
             <div style="font-size: 14px; color: #0f172a; font-weight: 500;">${phone || '--'}</div>
          </div>
          <div>
             <div style="font-size: 11px; font-weight: 600; color: #94a3b8; margin-bottom: 2px;">Website</div>
             ${websiteUrl ? `<a href="${websiteUrl.startsWith('http') ? websiteUrl : 'https://' + websiteUrl}" target="_blank" style="font-size: 14px; color: #2563eb; font-weight: 500; text-decoration: none;">Visit Website ↗</a>` : '<div style="font-size: 14px; color: #0f172a; font-weight: 500;">--</div>'}
          </div>
        </div>

        <div style="display: flex; flex-direction: column; gap: 8px; border-top: 1px solid #e2e8f0; padding-top: 24px;">
          ${shortlistBtnHTML.replace('sup-banner__add-shortlist-btn', 'CTA-BTN' + (isShortlisted ? ' CTA-BTN--added' : '')).replace('CTA-BTN', 'style="width: 100%; padding: 12px; border-radius: 8px; font-weight: 600; border: none; cursor: pointer; display:flex; align-items:center; justify-content:center; gap:8px; ' + (isShortlisted ? 'background:#ecfdf5; color:#10b981; border:1px solid #a7f3d0;"' : 'background:#2563eb; color:white;"'))}
          <button id="modal-send-rfq" style="width: 100%; padding: 12px; background: #fff; color: #0f172a; border: 1px solid #cbd5e1; border-radius: 8px; font-weight: 600; font-size: 13px; cursor: pointer;">Direct Message</button>
        </div>
      </div>
    </div>
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


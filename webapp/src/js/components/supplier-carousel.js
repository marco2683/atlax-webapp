/* ============================================================
   PRD — Supplier Detail Modal (Comprehensive Dossier)
   Updated: 2026-04-29 – Document download icons, address/map,
   categorized image gallery, modern typography
   ============================================================ */

const DEFAULT_BANNER = 'https://images.unsplash.com/photo-1565043589221-1a6fd9ae45c7?w=1200&q=80';

/**
 * Proxy insecure (http://) image URLs through images.weserv.nl
 * so they load on our HTTPS site without mixed-content blocking.
 * Also rewrites any Supabase storage URLs that reference a stale/old
 * project hostname to the current one from env.
 */
function safeImgUrl(url) {
  if (!url) return '';
  
  // Rewrite any Supabase storage URLs that point to the wrong project host
  const correctHost = (import.meta.env.VITE_SUPABASE_URL || '').replace(/\/$/, '');
  if (correctHost && url.includes('.supabase.co/storage/')) {
    const storagePathMatch = url.match(/https?:\/\/[^/]+\.supabase\.co(\/storage\/.*)/);
    if (storagePathMatch && !url.startsWith(correctHost)) {
      url = correctHost + storagePathMatch[1];
    }
  }

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
    title.style.gap = '16px';
    
    const _addressEN = s.address || s.addressEN || (s.city && s.country ? `${s.city}, ${s.country}` : 'China');
    
    title.innerHTML = `
      <div style="width: 48px; height: 48px; background: #f1f5f9; border: 1px solid #e2e8f0; border-radius: 10px; display: flex; align-items: center; justify-content: center; font-size: 17px; font-weight: 800; color: #475569; flex-shrink:0; font-family:'Inter',sans-serif;">
        ${s.name.substring(0, 2).toUpperCase()}
      </div>
      <div style="font-family: 'Inter', sans-serif; min-width:0;">
        <h2 style="margin:0; font-size:20px; font-weight:800; color:#0f172a; line-height:1.2; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${s.name}</h2>
        <div style="color:#64748b; font-size:12px; display:flex; align-items:center; gap:5px; font-weight:500; margin-top:3px;">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
          <span style="white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${_addressEN}</span>
        </div>
      </div>
    `;
  }

  const email = s.email || 'sales@' + s.name.toLowerCase().replace(/[^a-z]/g, '') + '.com';
  const phone = s.phone || '';

  const supplierId = s.id || s.name;
  const isShortlisted = !!document.querySelector(`.shortlist-item[data-id="${supplierId}"]`);
  
  let productImgs = s.images?.product || [];
  let facilityImgs = s.images?.facility || [];
  let equipmentImgs = s.images?.equipment || [];
  let certImgs = s.certificates || [];
  let factoryImgs = s.images?.factory || [];
  
  let websiteUrl = s.url || s.website;

  // Document availability
  const hasRFI = !!(s.docRFI);
  const hasPPT = !!(s.docPresentation);
  const hasCerts = !!(s.docCertifications);

  // Address
  const addressEN = s.address || s.addressEN || (s.city && s.country ? `${s.city}, ${s.country}` : '');
  const addressCN = s.addressZh || s.addressCN || s.address_cn || '';

  // Map URLs
  const googleMapUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(addressEN || s.city || '')}`;
  const baiduMapUrl = addressCN ? `https://map.baidu.com/search?querytype=s&wd=${encodeURIComponent(addressCN)}` : '';

  // Doc download card builder — larger, with descriptive icons + labels
  const docDownloadCard = (available, url, label, iconSvg, accentColor) => {
    if (available && url) {
      return `<a href="${url}" target="_blank" download title="Download ${label}" style="flex:1; display:flex; flex-direction:column; align-items:center; gap:8px; padding:14px 10px; border-radius:10px; border:1px solid ${accentColor}30; background:${accentColor}08; text-decoration:none; cursor:pointer; transition:all 0.2s;" onmouseover="this.style.background='${accentColor}18'; this.style.borderColor='${accentColor}60'; this.style.transform='translateY(-2px)'; this.style.boxShadow='0 4px 12px ${accentColor}15'" onmouseout="this.style.background='${accentColor}08'; this.style.borderColor='${accentColor}30'; this.style.transform=''; this.style.boxShadow=''">
        <div style="width:36px; height:36px; border-radius:10px; background:${accentColor}15; display:flex; align-items:center; justify-content:center; color:${accentColor};">${iconSvg}</div>
        <span style="font-size:10px; font-weight:700; color:${accentColor}; text-transform:uppercase; letter-spacing:0.04em; text-align:center; line-height:1.3;">${label}</span>
      </a>`;
    }
    return `<div title="${label} — Not available" style="flex:1; display:flex; flex-direction:column; align-items:center; gap:8px; padding:14px 10px; border-radius:10px; border:1px dashed #e2e8f0; background:#fafafa; cursor:not-allowed; opacity:0.4;">
      <div style="width:36px; height:36px; border-radius:10px; background:#f1f5f9; display:flex; align-items:center; justify-content:center; color:#94a3b8;">${iconSvg}</div>
      <span style="font-size:10px; font-weight:700; color:#94a3b8; text-transform:uppercase; letter-spacing:0.04em; text-align:center; line-height:1.3;">${label}</span>
    </div>`;
  };

  // More representative SVG icons
  const rfiIcon = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="3" y="3" width="18" height="18" rx="2"/><line x1="3" y1="9" x2="21" y2="9"/><line x1="3" y1="15" x2="21" y2="15"/><line x1="9" y1="3" x2="9" y2="21"/><line x1="15" y1="3" x2="15" y2="21"/></svg>`;
  const pptIcon = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="2" y="3" width="20" height="14" rx="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/><polygon points="10,7 10,13 15,10" fill="currentColor" stroke="none"/></svg>`;
  const certsIcon = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><polyline points="9 12 11 14 15 10"/></svg>`;

  // Certifications list
  const certsList = (s.certifications || []).concat(s.otherCertifications || []).filter(Boolean);

  // Image gallery renderer
  const renderImageCategory = (catTitle, imgs) => {
    if (!imgs || imgs.length === 0) return '';
    return `
    <div style="margin-bottom:24px;">
      <h4 style="font-size:11px; font-weight:700; color:#94a3b8; text-transform:uppercase; letter-spacing:0.06em; margin:0 0 12px 0; font-family:'Inter',sans-serif;">${catTitle}</h4>
      <div style="display:grid; grid-template-columns:repeat(3, 1fr); gap:10px;">
        ${imgs.map(img => `
          <div style="aspect-ratio:1; border-radius:10px; overflow:hidden; border:1px solid #e2e8f0; cursor:pointer; transition:transform 0.2s, box-shadow 0.2s;" onmouseover="this.style.transform='scale(1.03)'; this.style.boxShadow='0 8px 25px rgba(0,0,0,0.1)'" onmouseout="this.style.transform=''; this.style.boxShadow=''">
            <img src="${safeImgUrl(img)}" alt="${catTitle}" referrerpolicy="no-referrer" style="width:100%; height:100%; object-fit:cover;" loading="lazy">
          </div>
        `).join('')}
      </div>
    </div>`;
  };

  body.innerHTML = `
<div class="sup-dossier-simple" style="padding: 32px; background: #fff; height:100%; overflow-y: auto; font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;">
  
  <!-- Top Bar: Download Cards + Contact Buttons -->
  <div style="display: flex; justify-content: space-between; align-items: stretch; margin-bottom: 28px; padding-bottom: 24px; border-bottom: 1px solid #e2e8f0; gap: 20px;">
    
    <!-- Document Download Cards -->
    <div style="display: flex; gap: 12px; flex: 1;">
      ${docDownloadCard(hasRFI, s.docRFI, 'RFI Form', rfiIcon, '#2563eb')}
      ${docDownloadCard(hasPPT, s.docPresentation, 'Presentation', pptIcon, '#7c3aed')}
      ${docDownloadCard(hasCerts, s.docCertifications, 'Certifications', certsIcon, '#059669')}
    </div>

    <!-- Certifications Badges (top-right) -->
    ${certsList.length > 0 ? `<div style="display: flex; flex-direction: column; gap: 6px; justify-content: center;">
      <div style="display: flex; align-items: center; gap: 6px; margin-bottom: 4px;">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#0d9488" stroke-width="2.5"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><polyline points="9 12 11 14 15 10"/></svg>
        <span style="font-size: 10px; font-weight: 800; color: #0f766e; text-transform: uppercase; letter-spacing: 0.05em;">Certifications</span>
      </div>
      <div style="display: flex; flex-wrap: wrap; gap: 6px;">
        ${certsList.map(c => `<span style="display:inline-flex; align-items:center; gap:4px; padding:4px 10px; background:rgba(13,148,136,0.08); border:1px solid rgba(13,148,136,0.25); border-radius:6px; font-size:11px; font-weight:700; color:#0f766e;">
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#0d9488" stroke-width="2.5"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
          ${c}
        </span>`).join('')}
      </div>
    </div>` : ''}
  </div>

  <div style="display: grid; grid-template-columns: 1fr 300px; gap: 32px;">
    
    <!-- ═══ Left Column ═══ -->
    <div style="display: flex; flex-direction: column; gap: 24px;">

      <!-- Description -->
      <div>
        <h3 style="font-size: 11px; font-weight: 700; color: #94a3b8; text-transform: uppercase; margin: 0 0 10px 0; letter-spacing: 0.06em;">Company Overview</h3>
        <p style="font-size: 14px; color: #334155; line-height: 1.8; margin: 0; font-weight: 400;">
          ${s.description || 'This supplier is a leading manufacturer in the Pearl River Delta region, specializing in high-quality production and engineering services.'}
        </p>
      </div>



      <!-- Best For + Internal Capabilities (50/50) -->
      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px;">
        <!-- Best For -->
        <div style="background: linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%); border: 1px solid #bfdbfe; border-radius: 10px; padding: 18px 20px;">
          <h3 style="font-size: 12px; font-weight: 800; color: #1e3a8a; text-transform: uppercase; margin: 0 0 10px 0; display: flex; align-items: center; gap: 8px; letter-spacing: 0.05em;">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#2563eb" stroke-width="2.5"><polyline points="20 6 9 17 4 12"></polyline></svg>
            Best For
          </h3>
          <ul style="margin: 0; padding-left: 20px; color: #1e40af; font-size: 13px; line-height: 1.7; font-weight: 600;">
            ${(s.bestFor || s.technologies || []).slice(0, 6).map(t => 
              `<li style="margin-bottom: 3px;">${t}</li>`
            ).join('') || '<li>Standard manufacturing processes</li>'}
          </ul>
        </div>

        <!-- Internal Capabilities -->
        <div style="background: linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%); border: 1px solid #bbf7d0; border-radius: 10px; padding: 18px 20px;">
          <h3 style="font-size: 12px; font-weight: 800; color: #14532d; text-transform: uppercase; margin: 0 0 10px 0; display: flex; align-items: center; gap: 8px; letter-spacing: 0.05em;">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#16a34a" stroke-width="2.5"><path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/></svg>
            Internal Capabilities
          </h3>
          <ul style="margin: 0; padding-left: 20px; color: #166534; font-size: 13px; line-height: 1.7; font-weight: 600;">
            ${(s.internalCapabilities || s.technologies || []).slice(0, 6).map(t => 
              `<li style="margin-bottom: 3px;">${t}</li>`
            ).join('') || '<li>In-house tooling &amp; assembly</li>'}
          </ul>
        </div>
      </div>

      <!-- Image Gallery (categorized, vertical scroll, left-aligned) -->
      ${renderImageCategory('Product Images', productImgs)}
      ${renderImageCategory('Facility', facilityImgs.length > 0 ? facilityImgs : factoryImgs)}
      ${renderImageCategory('Equipment', equipmentImgs)}
      ${renderImageCategory('Certifications', certImgs)}

    </div>

    <!-- ═══ Right Column ═══ -->
    <div style="display: flex; flex-direction: column; gap: 14px;">

      <!-- Contacts -->
      <h4 style="font-size: 11px; font-weight: 700; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.06em; margin: 0; font-family: 'Inter', sans-serif;">Contacts</h4>
      <div style="background: #fff; border: 1px solid #e2e8f0; border-radius: 10px; padding: 16px 18px;">
        ${s.contactName ? `<div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
           <span style="font-size: 12px; color: #64748b; font-weight: 500;">Primary Contact</span>
           <span style="font-size: 13px; color: #0f172a; font-weight: 600;">${s.contactName}</span>
        </div>` : ''}
        ${email ? `<div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
           <span style="font-size: 12px; color: #64748b; font-weight: 500;">Email</span>
           <a href="mailto:${email}" style="font-size: 13px; color: #2563eb; font-weight: 600; text-decoration: none;">${email}</a>
        </div>` : ''}
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
           <span style="font-size: 12px; color: #64748b; font-weight: 500;">Phone</span>
           <span style="font-size: 13px; color: #0f172a; font-weight: 600;">${phone || '—'}</span>
        </div>
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
           <span style="font-size: 12px; color: #64748b; font-weight: 500;">Established</span>
           <span style="font-size: 13px; color: #0f172a; font-weight: 600;">${s.yearEstablished || '—'}</span>
        </div>
        <div style="display: flex; justify-content: space-between; align-items: center;">
           <span style="font-size: 12px; color: #64748b; font-weight: 500;">Employees</span>
           <span style="font-size: 13px; color: #0f172a; font-weight: 600;">${s.employees || '—'}</span>
        </div>
        ${websiteUrl ? `<div style="display: flex; justify-content: space-between; align-items: center; margin-top: 8px; padding-top: 8px; border-top: 1px solid #f1f5f9;">
           <span style="font-size: 12px; color: #64748b; font-weight: 500;">Website</span>
           <a href="${websiteUrl.startsWith('http') ? websiteUrl : 'https://' + websiteUrl}" target="_blank" style="font-size: 13px; color: #2563eb; font-weight: 600; text-decoration: none; display: flex; align-items: center; gap: 4px;">
             <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>
             Visit
           </a>
        </div>` : ''}
      </div>
      
      <!-- Add to Shortlist -->
      <button id="modal-add-to-shortlist" style="width:100%; padding:12px 16px; border-radius:10px; font-weight:700; font-size:13px; border:none; cursor:pointer; display:flex; align-items:center; justify-content:center; gap:8px; transition:all 0.2s; ${isShortlisted ? 'background:#ecfdf5; color:#059669; border:1px solid #a7f3d0; pointer-events:none;' : 'background:#0f172a; color:#fff;'}">
        ${isShortlisted 
          ? '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><polyline points="20 6 9 17 4 12"/></svg><span>Shortlisted</span>' 
          : '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg><span>Add to Shortlist</span>'}
      </button>

      <!-- Address Section -->
      <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 10px; padding: 16px 18px;">
        <h4 style="font-size: 11px; font-weight: 700; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.06em; margin: 0 0 10px 0;">Address</h4>
        ${addressEN ? `
        <a href="${googleMapUrl}" target="_blank" style="display: flex; align-items: flex-start; gap: 8px; text-decoration: none; color: #334155; font-size: 13px; line-height: 1.5; font-weight: 500; margin-bottom: 6px;" onmouseover="this.style.color='#2563eb'" onmouseout="this.style.color='#334155'">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" stroke-width="2" style="flex-shrink:0; margin-top:2px;"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
          <span>${addressEN}</span>
        </a>` : ''}
        ${addressCN ? `
        <a href="${baiduMapUrl}" target="_blank" style="display: flex; align-items: flex-start; gap: 8px; text-decoration: none; color: #64748b; font-size: 13px; line-height: 1.5; font-weight: 500;" onmouseover="this.style.color='#dc2626'" onmouseout="this.style.color='#64748b'">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#ef4444" stroke-width="2" style="flex-shrink:0; margin-top:2px;"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
          <span>${addressCN}</span>
        </a>` : ''}
        ${!addressEN && !addressCN ? '<div style="font-size:12px; color:#94a3b8; font-style:italic;">No address on file</div>' : ''}
      </div>

      <!-- Map Embed -->
      ${addressEN ? `
      <div style="border-radius: 10px; overflow: hidden; border: 1px solid #e2e8f0; height: 180px;">
        <iframe src="https://maps.google.com/maps?q=${encodeURIComponent(addressEN)}&t=&z=13&ie=UTF8&iwloc=&output=embed" style="width: 100%; height: 100%; border: none;" loading="lazy" allowfullscreen></iframe>
      </div>` : ''}
      ${addressCN ? `
      <a href="${baiduMapUrl}" target="_blank" style="display:block; border-radius:10px; overflow:hidden; border:1px solid #bfdbfe; text-decoration:none; transition:all 0.2s;" onmouseover="this.style.borderColor='#60a5fa'; this.style.boxShadow='0 4px 12px rgba(59,130,246,0.12)'" onmouseout="this.style.borderColor='#bfdbfe'; this.style.boxShadow=''">
        <div style="height:120px; position:relative;">
          <iframe src="https://maps.google.com/maps?q=${encodeURIComponent(addressCN)}&t=&z=14&ie=UTF8&iwloc=&output=embed" style="width:100%; height:100%; border:none; pointer-events:none;" loading="lazy"></iframe>
          <div style="position:absolute; inset:0; background:linear-gradient(180deg, transparent 60%, rgba(239,246,255,0.9) 100%);"></div>
        </div>
        <div style="display:flex; align-items:center; gap:10px; padding:10px 14px; background:#eff6ff;">
          <div style="width:30px; height:30px; background:#3b82f6; border-radius:8px; display:flex; align-items:center; justify-content:center; flex-shrink:0;">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
          </div>
          <div style="min-width:0;">
            <div style="font-size:11px; font-weight:700; color:#1e40af;">Open in Baidu Maps →</div>
            <div style="font-size:10px; color:#64748b; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${addressCN}</div>
          </div>
        </div>
      </a>` : ''}

    </div>
  </div>

</div>
  `;

  // Attach shortlist event listener
  if (!isShortlisted) {
    body.querySelector('#modal-add-to-shortlist')?.addEventListener('click', (e) => {
      e.stopPropagation();
      const btn = e.currentTarget;
      window.dispatchEvent(new CustomEvent('prd-add-to-shortlist', { 
        detail: { supplier: s, techName: document.getElementById('supplier-modal-title').textContent.replace(' Suppliers', '') } 
      }));
      btn.innerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><polyline points="20 6 9 17 4 12"/></svg> <span>Shortlisted</span>`;
      btn.style.background = '#ecfdf5';
      btn.style.border = '1px solid #a7f3d0';
      btn.style.color = '#059669';
      btn.style.pointerEvents = 'none';
    });
  }

  body.querySelectorAll('.sup-section--locked').forEach(el => {
    el.addEventListener('click', () => {
      window.location.href = '/profile.html?tab=billing';
    });
  });
}

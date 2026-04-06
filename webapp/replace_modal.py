import re

with open('src/js/components/supplier-carousel.js', 'r', encoding='utf-8') as f:
    text = f.read()

new_html = r"""  body.innerHTML = `
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
        <div class="sup-panel">
          <div class="sup-panel__title">Technical Capabilities & Machinery</div>
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
        <div class="sup-panel" style="padding: 0; overflow: hidden; display: flex; flex-direction: column;">
          <div class="sup-panel__title" style="margin: 24px 24px 0 24px;">Factory Location</div>
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
  `;"""

start_idx = text.find('  body.innerHTML = `')
end_idx = text.find('  // Attach event listeners')

if start_idx != -1 and end_idx != -1:
    end_idx = text.rfind('  `;', start_idx, end_idx) + 4
    new_text = text[:start_idx] + new_html + "\n\n" + text[end_idx:]
    with open('src/js/components/supplier-carousel.js', 'w', encoding='utf-8') as f:
        f.write(new_text)
    print("Successfully replaced body.innerHTML block!")
else:
    print("Could not find blocks. Start:", start_idx, "End:", end_idx)

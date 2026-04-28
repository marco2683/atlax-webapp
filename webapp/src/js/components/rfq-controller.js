/**
 * rfq-controller.js  v5
 * ────────────────────────────────────────────────────────
 * Orchestrates the RFQ workflow:
 *   - Detailed Part-by-Part mode with multi-part tabs
 *   - Bulk Upload mode for entire project folders
 *   - STEP/STP parsing via occt-import-js
 *   - ISO thumbnail rendering in geometry results
 *   - Multi-part quote accumulation in right panel
 *   - Dynamic material/finish dropdowns driven by technology
 * ────────────────────────────────────────────────────────
 */

import { analyzeFile, renderThumbnail } from './geometry-analyzer.js';
import { calculateQuote, getMaterialsForTech, getFinishesForTech, techHasTooling } from './quote-engine.js';
import { supabase } from '../utils/supabaseClient.js';
import { getCurrentUser } from '../services/auth.js';
import JSZip from 'jszip';

// ── State ───────────────────────────────────────────────
let partCount = 1;
let currentMode = 'detailed'; // Default to 'detailed' (bulk is now in Project Quote)
const partState = new Map();
let hasQuotedOnce = false;

// Accumulated quotes for the right panel
const quotedParts = new Map(); // partIdx → { partName, quote, config }

// Bulk upload file tracking
let bulkFiles = []; // Array of actual File objects for upload

function getPartState(idx) {
  if (!partState.has(idx)) partState.set(idx, { analysis: null, thumbnailCleanup: null, files: [] });
  return partState.get(idx);
}



// ── Dynamic Dropdown Population ─────────────────────────
function populateMaterialDropdown(partIdx, techKey) {
  const panel = document.querySelector(`.rfq-part-card[data-part="${partIdx}"]`);
  if (!panel) return;
  const select = panel.querySelector('.rfq-material');
  if (!select) return;

  const materials = getMaterialsForTech(techKey);
  select.innerHTML = materials.map(m =>
    `<option value="${m.key}">${m.label}</option>`
  ).join('');
}

function populateFinishDropdown(partIdx, techKey) {
  const panel = document.querySelector(`.rfq-part-card[data-part="${partIdx}"]`);
  if (!panel) return;
  const select = panel.querySelector('.rfq-finish');
  if (!select) return;

  const finishes = getFinishesForTech(techKey);
  select.innerHTML = finishes.map(f =>
    `<option value="${f.key}">${f.label}</option>`
  ).join('');
}

// ── Panel HTML Template ─────────────────────────────────
function createPartPanelHTML(partIdx) {
  return `
    <div class="rfq-part-card needs-tech-selection" data-part="${partIdx}" style="display: flex; flex-direction: column; background: rgba(0,0,0,0.15); border: 1px solid var(--color-steel-600); border-radius: var(--radius-lg); padding: 20px; position: relative; transition: all 0.3s ease;">
      <!-- Remove Button -->
      <button class="rfq-part-remove" data-part="${partIdx}" style="position: absolute; top: 12px; right: 12px; background: none; border: none; color: var(--color-steel-400); cursor: pointer; font-size: 18px; padding: 4px; line-height: 1;">&times;</button>
      
      <!-- Top Section: File Info, Name & 2D Upload -->
      <div class="rfq-part-header" style="display: flex; gap: 16px; margin-bottom: 20px; align-items: flex-start;">
        <!-- Placeholder for Geometry Analysis / Thumbnail -->
        <div class="rfq-part-thumb-wrapper" style="width: 120px; height: 120px; border-radius: 8px; background: rgba(0,0,0,0.3); border: 1px dashed rgba(255,255,255,0.1); display: flex; align-items: center; justify-content: center; position: relative; flex-shrink: 0;">
          <div class="rfq-results-placeholder" data-part="${partIdx}" style="text-align: center; color: var(--color-steel-500); display: flex; flex-direction: column; align-items: center; gap: 4px;">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path><polyline points="3.27 6.96 12 12.01 20.73 6.96"></polyline><line x1="12" y1="22.08" x2="12" y2="12"></line></svg>
          </div>
          <div class="rfq-results hidden" data-part="${partIdx}" style="width:100%; height:100%;">
            <div class="rfq-results__thumbnail" data-part="${partIdx}" style="width:100%; height:100%;"></div>
          </div>
        </div>

        <div style="flex: 1; display: flex; flex-direction: column; gap: 12px;">
          <div style="display: flex; gap: 16px; align-items: flex-start;">
            <div class="rfq-field" style="flex: 1; margin-bottom: 0;">
              <label style="font-size:11px; margin-bottom:4px; display:block;">Part Name</label>
              <input type="text" class="rfq-part-name" data-part="${partIdx}" placeholder="e.g. Housing Top..." style="font-size: 16px; font-weight: 600; padding: 8px 12px; border-radius:8px; border:1px solid rgba(255,255,255,0.1); background:rgba(0,0,0,0.2);" />
            </div>
            
            <!-- 2D / Supporting Docs Dropzone Moved Here -->
            <div class="rfq-engine__upload-zone" id="rfq-upload-zone-2d-${partIdx}" style="flex: 1; margin-top: 0; min-height: unset; padding: 8px 12px; background: rgba(0,0,0,0.2); border-color: rgba(255,255,255,0.08); display: flex; align-items: center; gap: 12px;">
              <input type="file" class="rfq-file-input-2d" data-part="${partIdx}" multiple accept=".pdf,.dwg,.dxf,.png,.jpg,.jpeg,.doc,.docx" hidden />
              <div class="upload-icon" style="color: var(--color-steel-400); margin-bottom: 0;">
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>
              </div>
              <div class="upload-text" style="text-align: left;">
                <h3 style="font-size: 11px; color: var(--color-steel-300); margin: 0;">Upload 2D Drawing</h3>
                <p style="font-size: 9px; margin-top: 2px;">Drag & Drop or <span class="upload-link">Choose Files</span></p>
              </div>
              <div class="upload-file-list hidden" id="upload-file-list-2d-${partIdx}" style="width: 100%;"></div>
            </div>
          </div>
          
          <div class="rfq-results hidden" data-part="${partIdx}">
            <div class="rfq-results__grid rfq-results__grid--compact" data-part="${partIdx}" style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; font-size: 11px;">
              <div class="rfq-stat" style="display:none;"><span class="rfq-stat__label">BBox</span><span class="rfq-stat__value" data-stat="bbox">—</span></div>
              <div class="rfq-stat"><span class="rfq-stat__label">Vol</span><span class="rfq-stat__value" data-stat="volume">—</span></div>
              <div class="rfq-stat"><span class="rfq-stat__label">Area</span><span class="rfq-stat__value" data-stat="surface-area">—</span></div>
              <div class="rfq-stat" style="display:none;"><span class="rfq-stat__label">Mass</span><span class="rfq-stat__value" data-stat="mass">—</span></div>
              <div class="rfq-stat" style="display:none;"><span class="rfq-stat__label">Triangles</span><span class="rfq-stat__value" data-stat="triangles">—</span></div>
              <div class="rfq-stat"><span class="rfq-stat__label">Dims</span><span class="rfq-stat__value" data-stat="dimensions">—</span></div>
            </div>
          </div>
          <!-- Real-time Status -->
          <div class="rfq-results__status" data-part="${partIdx}" style="font-size: 12px; color: var(--color-teal-400); margin-top: 0px;">Waiting for file...</div>
        </div>
      </div>

      <!-- Middle Section: Configurations -->
      <div class="rfq-fields-col" style="display: flex; flex-direction: column; gap: 12px;">
        <!-- Row 1: Technology, Quantity & Lead Time -->
        <div class="rfq-fields-grid" style="grid-template-columns: 2fr 1fr 1fr; margin-bottom: 0; padding: 12px; background: rgba(59, 130, 246, 0.05); border: 1px solid rgba(59, 130, 246, 0.2); border-radius: var(--radius-lg);">
          <div class="rfq-field rfq-field--accent">
            <label style="color: var(--color-electric); font-size: 11px;">Primary Technology</label>
            <select class="rfq-process" data-part="${partIdx}" style="font-size: 14px; font-weight: 600; padding: 10px 12px; border-color: rgba(59, 130, 246, 0.4); background: rgba(59, 130, 246, 0.05);">
              <option value="" disabled selected>Select Technology...</option>
              <option value="cnc">CNC Machining</option>
              <option value="vac_casting">Silicone Vacuum Casting</option>
              <option value="injection">Injection moulding</option>
              <option value="compression">Compression Moulding</option>
              <option value="sheet">Sheet metal</option>
              <option value="casting">Die-Casting</option>
              <option value="other">Other</option>
            </select>
            <input type="text" class="rfq-other-tech hidden" data-part="${partIdx}" placeholder="Please specify technology..." style="font-size: 13px; font-weight: 500; padding: 10px 14px; margin-top: 8px;" />
          </div>
          <div class="rfq-field">
            <label>Quantity</label>
            <input type="number" class="rfq-quantity" data-part="${partIdx}" value="1" min="1" style="font-size: 14px; font-weight: 600; padding: 10px 12px;" />
          </div>
          <div class="rfq-field">
            <label>Lead Time</label>
            <select class="rfq-lead-time" data-part="${partIdx}" style="padding: 10px 12px; font-size: 14px;">
              <option value="economy">Economy</option>
              <option value="standard" selected>Standard</option>
              <option value="express">Express</option>
              <option value="rush">Rush</option>
            </select>
          </div>
        </div>

        <!-- Row 2: Material, Color, Surface Finish -->
        <div class="rfq-fields-grid" style="grid-template-columns: repeat(3, 1fr); margin-bottom: 0;">
          <div class="rfq-field">
            <label>Material</label>
            <select class="rfq-material" data-part="${partIdx}">
              <option value="" disabled selected>Select Technology First</option>
            </select>
            <input type="text" class="rfq-other-material hidden" data-part="${partIdx}" placeholder="Please specify material..." style="font-size: 13px; font-weight: 500; padding: 10px 14px; margin-top: 8px;" />
          </div>
          <div class="rfq-field">
            <label>Color</label>
            <input type="text" class="rfq-color" data-part="${partIdx}" placeholder="White, RAL 7016..." />
          </div>
          <div class="rfq-field">
            <label>Surface Finish</label>
            <select class="rfq-finish" data-part="${partIdx}">
              <option value="as-machined">As Machined</option>
              <option value="bead-blast">Bead Blasted</option>
              <option value="anodized">Anodized</option>
              <option value="powder-coat">Powder Coated</option>
              <option value="polished">Polished</option>
              <option value="sandblast">Sandblasted</option>
              <option value="custom">Custom</option>
            </select>
          </div>
        </div>

        <!-- Tooling Details (Dynamically shown based on Process) -->
        <div class="rfq-tooling-details hidden" data-part="${partIdx}" style="margin-top: 0px; padding: 12px; background: rgba(239, 68, 68, 0.05); border: 1px dashed rgba(239, 68, 68, 0.4); border-radius: var(--radius-md); transition: all 0.3s ease;">
          <div class="rfq-tooling-status-header" style="display: flex; align-items: center; gap: 8px; margin-bottom: 12px; color: #ef4444; transition: color 0.3s ease;">
            <svg class="rfq-tooling-icon" viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
            <h4 class="rfq-tooling-title" style="margin: 0; font-size: 13px; font-weight: 600;">Tooling Details Required</h4>
          </div>
          <div class="rfq-fields-grid rfq-fields-grid--1x2" style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px;">
            <div class="rfq-field" style="margin-bottom: 0;">
              <label style="color: var(--color-steel-200);">Tooling Tier</label>
              <select class="rfq-tooling-type" data-part="${partIdx}">
                <option value="" disabled selected>Select Tier...</option>
                <option value="prototype">Prototype (Soft Tooling, < 1k parts)</option>
                <option value="low_volume">Low Volume (P20 Steel, < 10k parts)</option>
                <option value="high_volume">High Volume (Hardened H13, 100k+ parts)</option>
              </select>
            </div>
            <div class="rfq-field" style="margin-bottom: 0;">
              <label style="color: var(--color-steel-200);">Cavitation</label>
              <select class="rfq-tooling-cavities" data-part="${partIdx}">
                <option value="auto" selected>Auto-calculate</option>
                <option value="1">1-Cavity</option>
                <option value="2">2-Cavity</option>
                <option value="4">4-Cavity</option>
                <option value="8">8-Cavity</option>
              </select>
              <div class="rfq-throughput-estimate" style="font-size: 10px; color: var(--color-steel-400); margin-top: 6px; display: none;">Est. Throughput: --</div>
            </div>
          </div>
        </div>

        <!-- Custom Details / Post-Processing Notes -->
        <div class="rfq-custom-details"><label>Additional Notes & Requirements</label>
          <textarea class="rfq-custom-notes" data-part="${partIdx}" rows="2" placeholder="Surface finish details, coating specs, heat treatments, certifications, special requirements..."></textarea>
        </div>
      </div> <!-- Closes rfq-fields-col -->
      
      <!-- Missing file input block (used programmatically by handleFiles but doesn't need to be clickable by user in card) -->
      <div class="upload-file-list hidden" data-part="${partIdx}" style="display:none;"></div>
      <input type="file" class="rfq-file-input" data-part="${partIdx}" hidden />
    </div>`;
}

/**
 * Initialize the RFQ controller.
 */
export function initRFQController() {
  console.log('--- [DEBUG TRACE] ENTERING initRFQController (v6) ---');
  const panels       = document.getElementById('rfq-dynamic-parts-container');
  const submitBtn    = document.getElementById('rfq-submit-btn');

  if (!panels) {
    console.warn('[RFQ] Controller elements not found.');
    return;
  }

  // Handle Main Drag & Drop Zone
  const mainDropZone = document.getElementById('rfq-main-upload-zone');
  const mainFileInput = document.getElementById('rfq-main-file-input');
  const mainSelectBtn = document.getElementById('rfq-main-select-btn');
  
  if (mainDropZone && mainFileInput) {
    mainSelectBtn?.addEventListener('click', (e) => {
      e.stopPropagation();
      mainFileInput.click();
    });
    mainDropZone.addEventListener('click', (e) => {
      if (e.target.closest('.upload-icon') || e.target.closest('.upload-text')) {
        mainFileInput.click();
      }
    });
    mainDropZone.addEventListener('dragover', (e) => { e.preventDefault(); mainDropZone.classList.add('drag-over'); });
    mainDropZone.addEventListener('dragleave', () => mainDropZone.classList.remove('drag-over'));
    mainDropZone.addEventListener('drop', (e) => {
      e.preventDefault(); mainDropZone.classList.remove('drag-over');
      if (e.dataTransfer.files.length > 0) processMainUpload(e.dataTransfer.files);
    });
    mainFileInput.addEventListener('change', () => {
      if (mainFileInput.files.length > 0) processMainUpload(mainFileInput.files);
      mainFileInput.value = ''; // allow re-upload
    });
  }

  // Handle Shipping calculation toggle
  const calcShippingCb = document.getElementById('calc-shipping-cb');
  const shippingSection = document.getElementById('shipping-details-section');
  const shippingModal = document.getElementById('shipping-address-modal');
  const editShippingBtn = document.getElementById('edit-shipping-btn');
  const closeShippingModal = document.getElementById('close-shipping-modal');
  const cancelShippingModal = document.getElementById('cancel-shipping-modal');
  const saveShippingModal = document.getElementById('save-shipping-modal');
  const shippingSummaryText = document.getElementById('shipping-summary-text');

  let shippingData = {};

  if (calcShippingCb && shippingSection) {
    calcShippingCb.addEventListener('change', (e) => {
      if (e.target.checked) {
        shippingSection.classList.remove('hidden');
        if (Object.keys(shippingData).length === 0) {
          if (shippingModal) shippingModal.classList.remove('hidden');
        }
      } else {
        shippingSection.classList.add('hidden');
      }
      calculateAndDisplayQuote();
    });
  }

  if (editShippingBtn && shippingModal) {
    editShippingBtn.addEventListener('click', (e) => {
      e.preventDefault();
      shippingModal.classList.remove('hidden');
    });
  }

  const closeModal = (e) => {
    if (e) e.preventDefault();
    if (shippingModal) shippingModal.classList.add('hidden');
  };

  if (closeShippingModal) closeShippingModal.addEventListener('click', closeModal);
  if (cancelShippingModal) cancelShippingModal.addEventListener('click', closeModal);

  if (saveShippingModal) {
    saveShippingModal.addEventListener('click', (e) => {
      e.preventDefault();
      
      const company = document.getElementById('ship-modal-company')?.value.trim() || '';
      const attention = document.getElementById('ship-modal-attention')?.value.trim() || '';
      const phone = document.getElementById('ship-modal-phone')?.value.trim() || '';
      const address1 = document.getElementById('ship-modal-address1')?.value.trim() || '';
      const address2 = document.getElementById('ship-modal-address2')?.value.trim() || '';
      const city = document.getElementById('ship-modal-city')?.value.trim() || '';
      const prov = document.getElementById('ship-modal-province')?.value.trim() || '';
      const zip = document.getElementById('ship-modal-postcode')?.value.trim() || '';
      const country = document.getElementById('ship-modal-country')?.value.trim() || '';

      if (!address1 || !city || !country) {
        alert('Please fill out at least Address Line 1, City, and Country.');
        return;
      }

      shippingData = { company, attention, phone, address1, address2, city, prov, zip, country };
      
      let summaryHtml = '';
      if (attention) summaryHtml += `<strong style="color:var(--color-white);">${attention}</strong>`;
      if (company) summaryHtml += (attention ? ' <span style="color:var(--color-steel-400);">•</span> ' : '') + `<strong style="color:var(--color-white);">${company}</strong>`;
      if (summaryHtml) summaryHtml += '<br>';
      summaryHtml += `<span style="color:var(--color-steel-300);">${address1}${address2 ? ', ' + address2 : ''}</span><br>`;
      summaryHtml += `<span style="color:var(--color-steel-300);">${city}, ${prov} ${zip} <span style="color:var(--color-steel-500);">•</span> ${country}</span>`;

      if (shippingSummaryText) {
        shippingSummaryText.innerHTML = summaryHtml;
      }
      
      if (editShippingBtn) {
        editShippingBtn.textContent = 'Edit Address';
      }

      closeModal();
      calculateAndDisplayQuote();
    });
  }

  // Real-time recalculation after first quote
  panels.addEventListener('change', (e) => {
    // If technology changed, check if we need to remove the yellow accent
    if (e.target.matches('.rfq-process')) {
      const partIdx = e.target.dataset.part;
      const card = document.querySelector(`.rfq-part-card[data-part="${partIdx}"]`);
      if (card && e.target.value) {
        card.classList.remove('needs-tech-selection');
        card.style.borderColor = 'rgba(16, 185, 129, 0.4)'; // green border
        card.style.background = 'rgba(0, 0, 0, 0.15)'; // reset bg
      }
    }
    if (hasQuotedOnce && e.target.matches('.rfq-process, .rfq-material, .rfq-finish, .rfq-lead-time, .rfq-tooling-type, .rfq-tooling-cavities, .rfq-quantity, .rfq-other-tech, .rfq-other-material, .rfq-color, .rfq-threads, .rfq-tolerance')) {
      calculateAndDisplayQuote();
    }
  });

  panels.addEventListener('input', (e) => {
    if (hasQuotedOnce && e.target.matches('.rfq-quantity, .rfq-other-tech, .rfq-other-material, .rfq-color, .rfq-threads, .rfq-tolerance')) {
      calculateAndDisplayQuote();
    }
  });

  // Handle Remove Part button
  panels.addEventListener('click', (e) => {
    const removeBtn = e.target.closest('.rfq-part-remove');
    if (removeBtn) {
      e.stopPropagation();
      const partIdx = parseInt(removeBtn.dataset.part);
      removePartCard(partIdx);
    }
  });

  // Wire the "clear all" button in the quote result panel
  document.getElementById('rfq-clear-all-parts')?.addEventListener('click', () => {
    document.getElementById('rfq-dynamic-parts-container').innerHTML = '';
    quotedParts.clear();
    partState.clear();
    partCount = 1;
    renderQuoteResult();
    updateSubmitButtonState();
  });

  // Wire checkout and request quote buttons
  document.getElementById('rfq-submit-verification-btn')?.addEventListener('click', async () => {
    if (quotedParts.size === 0) return;
    
    const { getCurrentUser } = await import('../services/auth.js');
    const user = await getCurrentUser();
    if (!user) { alert('Please log in to submit a quote request.'); return; }
    
    const btn = document.getElementById('rfq-submit-verification-btn');
    const originalText = btn.textContent;
    btn.disabled = true;
    btn.textContent = 'Submitting...';

    const rfqId = window.crypto?.randomUUID?.() || Date.now().toString();
    const partsArray = Array.from(quotedParts.values());
    const projNameInput = document.getElementById('instant-rfq-project-name')?.value?.trim();
    const projName = projNameInput || partsArray[0]?.file?.name?.split('.')[0] || 'Instant RFQ Project';
    
    let grandTotal = 0;
    partsArray.forEach(p => { grandTotal += (p.quote?.totalPrice || 0); });

    const uploadedParts = [];
    for (const p of partsArray) {
      let storagePath = null;
      let bucket = 'rfq-uploads';
      if (p.file) {
        const fileExt = p.file.name.split('.').pop();
        storagePath = `${user.id}/${rfqId}/${Date.now()}_${Math.random().toString(36).substring(2,9)}.${fileExt}`;
        const { supabase } = await import('../utils/supabaseClient.js');
        const { error } = await supabase.storage.from('rfq-uploads').upload(storagePath, p.file, {
          cacheControl: '3600', upsert: false
        });
        if (error) {
           const { error: fErr } = await supabase.storage.from('user-files').upload(storagePath, p.file, {
             cacheControl: '3600', upsert: false
           });
           if (!fErr) bucket = 'user-files';
           else storagePath = null;
        }
      }
      uploadedParts.push({ ...p, storage_path: storagePath, bucket: bucket });
    }

    const rfqData = {
      type: 'instant',
      project_name: projName,
      service: 'Instant Quote',
      estimated_quantity: partsArray.reduce((acc, p) => acc + (p.qty || 1), 0),
      total_price: grandTotal,
      target_timeline: 'Flexible',
      notes: 'Generated via Instant Quoting Engine',
      parts: uploadedParts.map(p => ({
        name: p.partName || `Part ${p.config?.process || ''}`,
        process: p.config?.process || p.quote?.techLabel || '',
        qty: p.config?.quantity || 1,
        material: p.config?.material || p.quote?.materialLabel || '',
        finish: p.config?.finish || '',
        price: p.quote?.totalPrice || 0,
        storage_path: p.storage_path,
        bucket: p.bucket
      })),
      submitted_at: new Date().toISOString()
    };

    try {
      const { supabase } = await import('../utils/supabaseClient.js');
      const { error: rfqError } = await supabase.from('rfq_history').insert({
        id: rfqId,
        user_id: user.id,
        rfq_data: rfqData,
        status: 'submitted'
      });
      if (rfqError) throw rfqError;

      const { data: profileData } = await supabase.from('profiles').select('first_name, last_name, company').eq('id', user.id).single();
      const userName = profileData ? `${profileData.first_name || ''} ${profileData.last_name || ''}`.trim() : user.email;
      
      await fetch('/.netlify/functions/send-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'project_rfq',
          email: user.email,
          userId: user.id,
          name: userName,
          company: profileData?.company || '',
          projectName: projName,
          service: 'Instant Quote',
          quantity: rfqData.estimated_quantity,
          timeline: 'Flexible',
          fileCount: partsArray.length,
          fileNames: partsArray.map(p => p.partName)
        })
      }).catch(e => console.warn('Email notify error:', e));

      await fetch('/.netlify/functions/submit-rfq-planner', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customer_name: userName,
          email: user.email,
          part_name: projName,
          material: partsArray[0]?.quote?.materialLabel || 'Various',
          estimated_cost: `$${grandTotal.toFixed(2)}`
        })
      }).catch(e => console.warn('Planner notify error:', e));

      // showRFQSuccessModal('quote'); (if implemented)
      alert("Quote submitted successfully!");
      document.getElementById('rfq-clear-all-parts')?.click();
    } catch (e) {
      console.error('[RFQ] Instant quote error:', e);
      alert('Failed to submit quote: ' + e.message);
    } finally {
      btn.disabled = false;
      btn.textContent = originalText;
    }
  });

  // Wire "Submit" button
  submitBtn?.addEventListener('click', () => calculateAndDisplayQuote());

  // Initialize result panel
  renderQuoteResult();

  console.log('[RFQ] Controller initialized (v6).');
}

  



/**
 * Enable/disable the Calculate Instant Quote button
 * based on whether any part has a valid file analysis and all required fields are filled.
 */
function updateSubmitButtonState() {
  const submitBtn = document.getElementById('rfq-submit-btn');
  if (!submitBtn) return;

  let hasAnyAnalysis = false;
  let allToolingValid = true;

  partState.forEach((ps, idx) => {
    if (ps.analysis) {
      hasAnyAnalysis = true;
      const panel = document.querySelector(`.rfq-part-card[data-part="${idx}"]`);
      if (panel) {
        const process = panel.querySelector('.rfq-process')?.value;
        if (process && techHasTooling(process)) {
          const toolingTier = panel.querySelector('.rfq-tooling-type')?.value;
          if (!toolingTier) allToolingValid = false;
        }
      }
    }
  });

  submitBtn.disabled = !(hasAnyAnalysis && allToolingValid);
}

function wirePartPanel(partIdx) {
  console.log('--- [DEBUG TRACE] ENTERING wirePartPanel ---', partIdx);
  const panel = document.querySelector(`.rfq-part-card[data-part="${partIdx}"]`);
  
  if (!panel) {
    console.warn('--- [DEBUG TRACE] wirePartPanel ABORTED: panel not found for part', partIdx);
    return;
  }

  const uploadZone = panel.querySelector('.rfq-engine__upload-zone');
  const fileInput  = panel.querySelector('.rfq-file-input');
  const selectBtn  = panel.querySelector('.rfq-select-files-btn');
  
  console.log('[DEBUG] wirePartPanel', partIdx, { uploadZone: !!uploadZone, fileInput: !!fileInput, selectBtn: !!selectBtn });

  // Wire process change → update materials + finishes dynamically
  const processSelect = panel.querySelector('.rfq-process');
  processSelect?.addEventListener('change', () => {
    const techKey = processSelect.value;
    
    // Handle "Other" technology input visibility
    const otherTechInput = panel.querySelector('.rfq-other-tech');
    const materialSelect = panel.querySelector('.rfq-material');
    const otherMaterialInput = panel.querySelector('.rfq-other-material');
    
    if (techKey === 'other') {
      otherTechInput?.classList.remove('hidden');
      materialSelect?.classList.add('hidden');
      otherMaterialInput?.classList.remove('hidden');
    } else {
      otherTechInput?.classList.add('hidden');
      materialSelect?.classList.remove('hidden');
      otherMaterialInput?.classList.add('hidden');
    }

    populateMaterialDropdown(partIdx, techKey);
    populateFinishDropdown(partIdx, techKey);
    
    // Toggle tooling details block visibility
    const toolingBlock = panel.querySelector('.rfq-tooling-details');
    if (toolingBlock) {
      if (techHasTooling(techKey)) {
        toolingBlock.classList.remove('hidden');
      } else {
        toolingBlock.classList.add('hidden');
      }
      updateSubmitButtonState();
    }
  });

  const updateToolingStatus = () => {
    const toolingBlock = panel.querySelector('.rfq-tooling-details');
    const toolingTier = panel.querySelector('.rfq-tooling-type')?.value;
    const cavities = panel.querySelector('.rfq-tooling-cavities')?.value || '1';
    
    if (toolingBlock && toolingTier) {
      // Transition to Green / Success State
      toolingBlock.style.background = 'rgba(16, 185, 129, 0.05)';
      toolingBlock.style.borderColor = 'rgba(16, 185, 129, 0.4)';
      const header = toolingBlock.querySelector('.rfq-tooling-status-header');
      if (header) header.style.color = '#10b981';
      const icon = toolingBlock.querySelector('.rfq-tooling-icon');
      if (icon) {
        icon.innerHTML = '<path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/>';
      }
      const title = toolingBlock.querySelector('.rfq-tooling-title');
      if (title) title.textContent = 'Tooling Details Configured';
      
      // Update Throughput Estimate (Assuming 60 seconds cycle time = 60 shots/hr = 1440/day)
      const tp = toolingBlock.querySelector('.rfq-throughput-estimate');
      if (tp) {
        tp.style.display = 'block';
        let cavNum = parseInt(cavities);
        // If Auto, we replicate the estimation engine logic
        if (isNaN(cavNum) || cavities === 'auto') {
          const qty = parseInt(panel.querySelector('.rfq-quantity')?.value) || 1;
          if (qty < 1000) cavNum = 1;
          else if (qty < 10000) cavNum = 2;
          else if (qty < 50000) cavNum = 4;
          else cavNum = 8;
        }

        // Apply physical boundary limits based on bounding box if analyzed
        const ps = partState[partIdx];
        let maxCavs = 8;
        if (ps && ps.analysis && ps.analysis.geometry && ps.analysis.geometry.boundingBox) {
          const bb = ps.analysis.geometry.boundingBox;
          const bboxVolCm3 = (bb.x * bb.y * bb.z) / 1000;
          if (bboxVolCm3 > 15000) maxCavs = 1;
          else if (bboxVolCm3 > 4000) maxCavs = 2;
          else if (bboxVolCm3 > 1000) maxCavs = 4;
          
          if (cavNum > maxCavs) {
            cavNum = maxCavs;
            // Provide feedback if user manually selected impossible cavities
            const cavSelect = panel.querySelector('.rfq-tooling-cavities');
            if (cavSelect && cavities !== 'auto') {
               cavSelect.value = cavNum.toString();
               tp.style.color = '#ef4444'; // Red warning momentarily
               setTimeout(() => { if (tp) tp.style.color = 'var(--color-steel-400)'; }, 1500);
               tp.textContent = `Physical limit: reduced to ${cavNum}-Cavity`;
            }
          }
        }

        const partsPerDay = 1440 * cavNum;
        tp.textContent = (tp.textContent.includes('Physical limit')) ? tp.textContent : `Est. Throughput: ${partsPerDay.toLocaleString()} parts/day (${cavNum}-Cav tool)`;
      }
    }
    updateSubmitButtonState();
  };

  const toolingTypeSelect = panel.querySelector('.rfq-tooling-type');
  const toolingCavitiesSelect = panel.querySelector('.rfq-tooling-cavities');
  const qtyInput = panel.querySelector('.rfq-quantity');
  
  toolingTypeSelect?.addEventListener('change', updateToolingStatus);
  toolingCavitiesSelect?.addEventListener('change', updateToolingStatus);
  qtyInput?.addEventListener('input', updateToolingStatus);

  selectBtn?.addEventListener('click', (e) => { 
    console.log('[DEBUG] selectBtn clicked!', e.target);
    e.stopPropagation(); 
    fileInput?.click(); 
  });
  
  uploadZone?.querySelector('.upload-link')?.addEventListener('click', (e) => { 
    console.log('[DEBUG] 2D upload-link clicked!', e.target);
    e.stopPropagation(); 
    fileInput?.click(); 
  });
  
  fileInput?.addEventListener('change', () => { 
    console.log('[DEBUG] fileInput changed! Files count:', fileInput.files.length);
    if (fileInput.files.length > 0) {
      handleFiles(fileInput.files, partIdx);
      // Removed sync value reset to prevent destroying file handles before parsing
    }
  });

  uploadZone?.addEventListener('dragover', (e) => { e.preventDefault(); uploadZone.classList.add('drag-over'); });
  uploadZone?.addEventListener('dragleave', () => uploadZone.classList.remove('drag-over'));
  uploadZone?.addEventListener('drop', (e) => {
    e.preventDefault(); uploadZone.classList.remove('drag-over');
    if (e.dataTransfer.files.length > 0) handleFiles(e.dataTransfer.files, partIdx);
  });

  // Remove the duplicate click listener on uploadZone that bypasses propagation and triggers fileInput a second time
  // This causes the double window bug. We already have the selectBtn and upload-link listeners for the clickable text.
  // We can just rely on those, or bind explicitly to the elements without a generic wrapper listener.
  uploadZone?.addEventListener('click', (e) => {
    if (e.target.closest('.upload-icon') || e.target.closest('.upload-text')) {
      e.stopPropagation();
      fileInput?.click();
    }
  });

  // ── 2D Upload Zone Wiring ─────────────────────────────
  const uploadZone2d = panel.querySelector(`#rfq-upload-zone-2d-${partIdx}`);
  const fileInput2d  = panel.querySelector('.rfq-file-input-2d');

  if (uploadZone2d && fileInput2d) {
    uploadZone2d.querySelector('.upload-link')?.addEventListener('click', (e) => { e.stopPropagation(); fileInput2d.click(); });
    fileInput2d.addEventListener('change', () => {
      if (fileInput2d.files.length > 0) handle2DFiles(fileInput2d.files, partIdx);
    });

    uploadZone2d.addEventListener('dragover', (e) => { e.preventDefault(); uploadZone2d.classList.add('drag-over'); });
    uploadZone2d.addEventListener('dragleave', () => uploadZone2d.classList.remove('drag-over'));
    uploadZone2d.addEventListener('drop', (e) => {
      e.preventDefault(); uploadZone2d.classList.remove('drag-over');
      if (e.dataTransfer.files.length > 0) handle2DFiles(e.dataTransfer.files, partIdx);
    });

    uploadZone2d.addEventListener('click', (e) => {
      if (e.target === uploadZone2d || e.target.closest('.upload-icon') || e.target.closest('.upload-text')) fileInput2d.click();
    });
  }

  // Delegate file removal
  panel.querySelector('.upload-file-list')?.addEventListener('click', (e) => {
    const removeBtn = e.target.closest('.upload-file-item__remove');
    if (removeBtn) {
      removeBtn.closest('.upload-file-item').remove();
      const list = panel.querySelector('.upload-file-list');
      if (list && list.children.length === 0) {
        list.classList.add('hidden');
        panel.querySelector('.rfq-results')?.classList.add('hidden');
        // Re-show placeholder when geometry is cleared
        panel.querySelector('.rfq-results-placeholder')?.classList.remove('hidden');
        getPartState(partIdx).analysis = null;
        updateSubmitButtonState();
      }
    }
  });
}




function processMainUpload(fileList) {
  const files = Array.from(fileList);
  const panelsContainer = document.getElementById('rfq-dynamic-parts-container');
  
  files.forEach(file => {
    const ext = file.name.split('.').pop().toLowerCase();
    const validExts = ['step', 'stp', 'stl', 'obj', 'iges', 'igs', 'dxf', 'sldprt', 'ipt', 'x_t', 'x_b', '3dxml', 'catpart', 'prt', 'sat', '3mf', 'jt'];
    
    const idx = partCount++;
    panelsContainer.insertAdjacentHTML('beforeend', createPartPanelHTML(idx));
    wirePartPanel(idx);
    
    const card = document.querySelector(`.rfq-part-card[data-part="${idx}"]`);
    
    if (!validExts.includes(ext)) {
      // Invalid file
      if (card) {
        card.style.borderColor = 'rgba(239, 68, 68, 0.6)'; // red
        card.style.background = 'rgba(239, 68, 68, 0.05)';
        const statusEl = card.querySelector('.rfq-results__status');
        if (statusEl) {
          statusEl.textContent = 'Invalid format. Engine cannot read this file.';
          statusEl.style.color = 'var(--color-red-500)';
        }
        const nameEl = card.querySelector('.rfq-part-name');
        if (nameEl) nameEl.value = file.name;
      }
    } else {
      // Accent card yellow to prompt action
      if (card) {
        card.style.borderColor = 'rgba(234, 179, 8, 0.6)'; // yellow
        card.style.background = 'rgba(234, 179, 8, 0.05)';
      }
      // Pass file as an array to handleFiles
      handleFiles([file], idx);
    }
  });
}

function removePartCard(partIdx) {
  const ps = partState.get(partIdx);
  if (ps?.thumbnailCleanup) ps.thumbnailCleanup();
  partState.delete(partIdx);
  quotedParts.delete(partIdx);
  renderQuoteResult();
  const card = document.querySelector(`.rfq-part-card[data-part="${partIdx}"]`);
  if (card) card.remove();
  updateSubmitButtonState();
}

/**
 * Handle 2D / supporting document uploads.
 * Shows file badges in the 2D upload zone file list.
 */
function handle2DFiles(fileList, partIdx) {
  const files = Array.from(fileList);
  const fileListEl = document.getElementById(`upload-file-list-2d-${partIdx}`);
  if (!fileListEl) return;

  fileListEl.classList.remove('hidden');
  files.forEach(file => {
    const item = document.createElement('div');
    item.className = 'upload-file-item';
    item.innerHTML = `
      <span class="upload-file-item__name">📄 ${file.name}</span>
      <span class="upload-file-item__size">${formatFileSize(file.size)}</span>
      <button class="upload-file-item__remove" title="Remove">&times;</button>
    `;
    fileListEl.appendChild(item);

    // Wire remove button
    item.querySelector('.upload-file-item__remove')?.addEventListener('click', () => {
      item.remove();
      if (fileListEl.children.length === 0) fileListEl.classList.add('hidden');
    });
  });

  // Track 2D files in part state
  const state = getPartState(partIdx);
  if (!state.files2d) state.files2d = [];
  state.files2d.push(...files);
}

async function handleFiles(fileList, partIdx) {
  const files = Array.from(fileList);
  const panel = document.querySelector(`.rfq-part-card[data-part="${partIdx}"]`);
  if (!panel) return;

  const fileListEl = panel.querySelector(`.upload-file-list[data-part="${partIdx}"]`);
  const resultsEl  = panel.querySelector(`.rfq-results[data-part="${partIdx}"]`);
  const statusEl   = panel.querySelector(`.rfq-results__status[data-part="${partIdx}"]`);
  const state = getPartState(partIdx);

  // Auto-rename tab
  const tab = document.querySelector(`.rfq-tab[data-part="${partIdx}"]`);
  if (tab && files[0]) {
    const name = files[0].name.replace(/\.[^.]+$/, '');
    const shortName = name.length > 14 ? name.slice(0, 14) + '…' : name;
    const closeHTML = partIdx > 0 ? `<span class="rfq-tab__close" data-part="${partIdx}" title="Remove">✕</span>` : '';
    tab.innerHTML = `${shortName}${closeHTML}`;
  }

  // Auto-fill Part Name
  const partNameInput = panel.querySelector('.rfq-part-name');
  if (partNameInput && !partNameInput.value && files[0]) {
    partNameInput.value = files[0].name.replace(/\.[^.]+$/, '');
  }

  // Show file badges
  if (fileListEl) {
    fileListEl.innerHTML = '';
    fileListEl.classList.remove('hidden');
    files.forEach(file => {
      const item = document.createElement('div');
      item.className = 'upload-file-item';
      item.innerHTML = `
        <span class="upload-file-item__name">📄 ${file.name}</span>
        <span class="upload-file-item__size">${formatFileSize(file.size)}</span>
        <button class="upload-file-item__remove" title="Remove">&times;</button>
      `;
      fileListEl.appendChild(item);
    });
  }

  // Find parseable 3D file (prioritize STEP)
  const parseable = files.find(f =>
    ['step', 'stp', 'stl', 'obj', 'iges', 'igs'].includes(f.name.split('.').pop().toLowerCase())
  );

  if (parseable) {
    // Hide the placeholder, show the analysis results
    panel.querySelector('.rfq-results-placeholder')?.classList.add('hidden');
    resultsEl?.classList.remove('hidden');
    if (statusEl) { statusEl.textContent = 'Preparing file...'; statusEl.classList.remove('done'); }
    panel.querySelectorAll('[data-stat]').forEach(el => el.textContent = '...');

    try {
      let progressBar = panel.querySelector('.rfq-progress-container');
      if (!progressBar) {
        progressBar = document.createElement('div');
        progressBar.className = 'rfq-progress-container';
        progressBar.style.cssText = 'width: 100%; height: 6px; background: rgba(0,0,0,0.3); border-radius: 4px; overflow: hidden; margin-top: 12px; position: relative; margin-bottom: 12px;';
        progressBar.innerHTML = `
          <div class="rfq-progress-fill" style="width: 0%; height: 100%; background: var(--color-teal-500); transition: width 0.8s cubic-bezier(0.2, 0.8, 0.2, 1);"></div>
          <div class="rfq-progress-shimmer" style="position: absolute; top:0; left:0; width: 100%; height: 100%; background: linear-gradient(90deg, transparent, rgba(255,255,255,0.4), transparent); transform: translateX(-100%); opacity: 0; pointer-events: none; will-change: transform;"></div>
          <style>
             @keyframes file-processing-sweep { 0% { transform: translate3d(-100%, 0, 0); } 100% { transform: translate3d(100%, 0, 0); } }
             .is-processing .rfq-progress-shimmer { animation: file-processing-sweep 1s infinite linear; opacity: 1 !important; }
             .is-processing .rfq-progress-fill { background: var(--color-blue-500); }
          </style>
        `;
        statusEl.parentElement.appendChild(progressBar);
      }
      
      progressBar.classList.remove('hidden', 'is-processing');
      const fillEl = progressBar.querySelector('.rfq-progress-fill');
      if (fillEl) {
        fillEl.style.transition = 'none';
        fillEl.style.width = '0%';
        void fillEl.offsetWidth; // force layout recalculation
        fillEl.style.transition = 'width 0.8s cubic-bezier(0.2, 0.8, 0.2, 1)';
      }

      // Ensure the UI animation plays for at least 1.5s so it doesn't just flash glitchily for tiny files
      const [analysis] = await Promise.all([
        analyzeFile(parseable, (percent, loadedBytes, totalBytes) => {
          if (statusEl) {
            const loadedMb = (loadedBytes / 1048576).toFixed(1);
            const totalMb = (totalBytes / 1048576).toFixed(1);
            statusEl.textContent = `Reading: ${percent}% (${loadedMb} / ${totalMb} MB)`;
            if (fillEl) fillEl.style.width = `${percent}%`;
            
            if (percent === 100) {
              statusEl.textContent = 'Processing geometry (this may take a moment)...';
              progressBar.classList.add('is-processing');
            }
          }
        }),
        new Promise(r => setTimeout(r, 1500))
      ]);
      
      state.analysis = analysis;
      state.file = parseable;

      const bb = analysis.boundingBox;
      setStat(panel, 'bbox', `${bb.x}×${bb.y}×${bb.z}`);
      setStat(panel, 'volume', `${analysis.volume} cm³`);
      setStat(panel, 'surface-area', `${analysis.surfaceArea} cm²`);
      setStat(panel, 'mass', `${analysis.mass} g`);
      setStat(panel, 'triangles', analysis.triangleCount.toLocaleString());
      setStat(panel, 'dimensions', `${bb.x}×${bb.y}×${bb.z} mm`);
      if (statusEl) { statusEl.textContent = '✓ Complete'; statusEl.classList.add('done'); }
      if (progressBar) progressBar.classList.add('hidden');

      // Enable the Calculate button now that we have valid geometry
      updateSubmitButtonState();

      // Render ISO thumbnail
      const thumbContainer = panel.querySelector(`.rfq-results__thumbnail[data-part="${partIdx}"]`);
      if (thumbContainer && analysis.geometry) {
        if (state.thumbnailCleanup) state.thumbnailCleanup();
        state.thumbnailCleanup = renderThumbnail(analysis.geometry, thumbContainer, 120);
      }
    } catch (err) {
      console.error('[RFQ] Analysis error:', err);
      if (statusEl) { statusEl.textContent = `Error: ${err.message}`; statusEl.classList.add('done'); }
      let pb = panel.querySelector('.rfq-progress-container');
      if (pb) pb.classList.add('hidden');
    }
  }
}

function calculateAndDisplayQuote() {
  hasQuotedOnce = true;
  const panels = document.querySelectorAll('.rfq-part-card');
  if (panels.length === 0) return;

  let hasAnalyzedPart = false;

  panels.forEach(panel => {
    const partIdx = parseInt(panel.dataset.part);
    const state = getPartState(partIdx);

    if (!state.analysis) {
      return; // Skip parts without analysis
    }
    
    hasAnalyzedPart = true;

    const rawProcess = getField(panel, '.rfq-process');
    const customProcess = panel.querySelector('.rfq-other-tech')?.value || '';
    
    const rawMaterial = getField(panel, '.rfq-material');
    const customMaterial = panel.querySelector('.rfq-other-material')?.value || '';
    
    const config = {
      process:   rawProcess === 'other' && customProcess ? customProcess : rawProcess,
      material:  rawProcess === 'other' && customMaterial ? customMaterial : rawMaterial,
      finish:    getField(panel, '.rfq-finish'),
      tolerance: getField(panel, '.rfq-tolerance'),
      leadTime:  getField(panel, '.rfq-lead-time'),
      quantity:  parseInt(getField(panel, '.rfq-quantity')) || 1,
      dfm:       panel.querySelector('.rfq-dfm-check')?.checked || false,
      color:     getField(panel, '.rfq-color'),
      threads:   getField(panel, '.rfq-threads'),
      customDetails: getField(panel, '.rfq-custom-notes'),
      contactMe: document.getElementById('rfq-contact-me')?.checked || false,
      toolingType: getField(panel, '.rfq-tooling-type'),
      toolingCavities: getField(panel, '.rfq-tooling-cavities'),
    };

    const quote = calculateQuote(state.analysis, config);
    const partName = getField(panel, '.rfq-part-name') || `Part ${partIdx + 1}`;

    // Store/update in accumulated quotes
    quotedParts.set(partIdx, { partName, quote, config, file: state.file, analysis: state.analysis });
  });

  if (!hasAnalyzedPart && panels.length === 1) {
    alert('Please upload a parseable 3D file (STEP, STL, OBJ) first.');
    return;
  }

  // Re-render the result panel
  renderQuoteResult();
}

/**
 * Render the multi-part quote result panel on the right.
 */
function renderQuoteResult() {
  const cardEl = document.getElementById('rfq-quote-result');
  const headerEl = document.getElementById('rfq-quote-header');
  const hintEl = document.getElementById('rfq-quote-empty-hint');
  const breakdownEl = document.getElementById('rfq-quote-breakdown');
  const actionsEl = document.getElementById('rfq-quote-actions');
  if (!cardEl || !breakdownEl) return;

  if (quotedParts.size === 0) {
    // ── Empty state: dashed outline + hint ─────────────
    cardEl.classList.add('rfq-quote-result--empty');
    cardEl.classList.remove('rfq-quote-result--populated');
    headerEl?.classList.add('hidden');
    hintEl?.classList.remove('hidden');
    breakdownEl.classList.add('hidden');
    breakdownEl.innerHTML = '';
    actionsEl?.classList.add('hidden');
    return;
  }

  // ── Populated state: full card ─────────────────────
  cardEl.classList.remove('rfq-quote-result--empty');
  cardEl.classList.add('rfq-quote-result--populated');
  headerEl?.classList.remove('hidden');
  hintEl?.classList.add('hidden');
  breakdownEl.classList.remove('hidden');

  let grandTotal = 0;
  let grandToolingTotal = 0;
  let html = '';

  quotedParts.forEach((entry, partIdx) => {
    const { partName, quote } = entry;
    grandTotal += quote.totalPrice;
    grandToolingTotal += quote.toolingCost;

    // Safety net: unit price + tooling > $3000
    const unitPlusTooling = quote.unitPriceWithSetup + quote.toolingCost;
    const isHighValue = unitPlusTooling > 3000;
    const warningClass = isHighValue ? ' rfq-quote-part-card--warning' : '';

    html += `
      <div class="rfq-quote-part-card${warningClass}" data-quoted-part="${partIdx}">
        <div class="rfq-quote-part-card__header">
          <span class="rfq-quote-part-card__name" title="${partName}">${partName}</span>
          <button class="rfq-quote-part-card__remove" data-remove-part="${partIdx}" title="Remove part">
            <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
        </div>
        <div class="rfq-quote-part-card__details">
          <div class="rfq-quote-detail-row">
            <span class="rfq-quote-detail-label">Technology</span>
            <span class="rfq-quote-detail-value">${quote.techLabel}</span>
          </div>
          <div class="rfq-quote-detail-row">
            <span class="rfq-quote-detail-label">Material</span>
            <span class="rfq-quote-detail-value">${quote.materialLabel}</span>
          </div>
          <div class="rfq-quote-detail-row">
            <span class="rfq-quote-detail-label">Volume</span>
            <span class="rfq-quote-detail-value">${quote.volume} cm³</span>
          </div>
          <div class="rfq-quote-detail-row">
            <span class="rfq-quote-detail-label">Est. Weight</span>
            <span class="rfq-quote-detail-value">${quote.formatted.estimatedWeight}</span>
          </div>
          ${quote.hasTooling ? `
          <div class="rfq-quote-detail-row rfq-quote-detail-row--tooling">
            <span class="rfq-quote-detail-label">Tooling <span class="rfq-badge rfq-badge--oneoff">ONE-OFF</span></span>
            <span class="rfq-quote-detail-value rfq-quote-detail-value--accent">${quote.formatted.toolingCost}</span>
          </div>` : ''}
          <div class="rfq-quote-detail-row">
            <span class="rfq-quote-detail-label">Setup Fee <span class="rfq-badge rfq-badge--setup">PER RUN</span></span>
            <span class="rfq-quote-detail-value">$${quote.setupFee.toFixed(2)}</span>
          </div>
          <div class="rfq-quote-detail-row">
            <span class="rfq-quote-detail-label">Unit Price</span>
            <span class="rfq-quote-detail-value rfq-quote-detail-value--highlight">${quote.formatted.perUnit}</span>
          </div>
          ${quote.qtyDiscount > 0 ? `
          <div class="rfq-quote-detail-row">
            <span class="rfq-quote-detail-label">Volume Discount</span>
            <span class="rfq-quote-detail-value rfq-quote-detail-value--discount">-${quote.qtyDiscount}%</span>
          </div>` : ''}
        </div>
        <div class="rfq-quote-part-card__total">
          <span>Subtotal (${quote.quantity} unit${quote.quantity > 1 ? 's' : ''})</span>
          <span class="rfq-quote-part-card__price">${quote.formatted.totalPrice}</span>
        </div>
        ${isHighValue ? `
        <div class="rfq-quote-part-card__warning-note">
          <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
          <span>This estimate will need to be validated by one of our engineers</span>
        </div>` : ''}
      </div>
    `;
  });

  // Grand total
  html += `
    <div class="rfq-quote-grand-total">
      <div class="rfq-quote-grand-total__row">
        <span>Grand Total</span>
        <span class="rfq-quote-grand-total__price">$${grandTotal.toFixed(2)}</span>
      </div>
      ${grandToolingTotal > 0 ? `
      <div class="rfq-quote-grand-total__note">
        Includes $${grandToolingTotal.toFixed(2)} one-off tooling cost
      </div>` : ''}
    </div>
  `;

  breakdownEl.innerHTML = html;
  actionsEl?.classList.remove('hidden');

  // Wire up remove buttons for each part
  breakdownEl.querySelectorAll('.rfq-quote-part-card__remove').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const idx = parseInt(btn.dataset.removePart);
      quotedParts.delete(idx);
      renderQuoteResult();
    });
  });
}

/**
 * Handle Bulk Project Quote Request
 * Uploads all files to Supabase Storage and creates an RFQ record.
 */
async function handleBulkSubmit() {
  // Determine which panel is active: Project Quote (pq-*) or RFQ Bulk (rfq-bulk-*)
  const pqPanel = document.getElementById('project-quote-engine');
  const isPQ = pqPanel && !pqPanel.classList.contains('hidden');
  const prefix = isPQ ? 'pq-bulk' : 'rfq-bulk';

  const projNameEl = document.getElementById(`${prefix}-project-name`);
  const projName = projNameEl?.value?.trim() || '';
  const service = document.getElementById(`${prefix}-service`)?.value;
  const qty = document.getElementById(`${prefix}-qty`)?.value || '';
  const timeline = document.getElementById(`${prefix}-timeline`)?.value || 'flexible';
  const notes = document.getElementById(`${prefix}-notes`)?.innerHTML || '';
  const contactMe = document.getElementById(`${prefix}-contact`)?.checked || false;

  // Validate mandatory project name
  if (!projName) {
    if (projNameEl) {
      projNameEl.style.borderColor = '#ef4444';
      projNameEl.focus();
      projNameEl.setAttribute('placeholder', '⚠ Project name is required');
      setTimeout(() => { projNameEl.style.borderColor = ''; projNameEl.setAttribute('placeholder', 'e.g. Drone Housing Assembly...'); }, 3000);
    }
    alert('Please enter a Project Name before submitting.');
    return;
  }

  if (bulkFiles.length === 0) {
    alert('Please select at least one file to upload before submitting.');
    return;
  }

  const submitBtn = document.getElementById(`${prefix}-submit-btn`);
  const targetPanel = isPQ ? document.querySelector('#project-quote-engine .rfq-engine__card') : document.getElementById('rfq-bulk-panel');

  // Show progress UI
  const progressHTML = `
    <div class="rfq-bulk-submit-progress" id="rfq-bulk-progress">
      <div class="rfq-bulk-submit-progress__bar-wrap">
        <div class="rfq-bulk-submit-progress__bar" id="rfq-bulk-progress-bar"></div>
      </div>
      <div class="rfq-bulk-submit-progress__text" id="rfq-bulk-progress-text">Preparing upload...</div>
    </div>
  `;
  const progressContainer = document.createElement('div');
  progressContainer.innerHTML = progressHTML;
  targetPanel?.appendChild(progressContainer);

  if (submitBtn) { submitBtn.disabled = true; submitBtn.textContent = 'Uploading...'; }

  try {
    // 1. Get current user
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      throw new Error('You must be logged in to submit a quote request.');
    }

    const rfqId = crypto.randomUUID();
    const uploadedFiles = [];
    const totalFiles = bulkFiles.length;
    const progressBar = document.getElementById('rfq-bulk-progress-bar');
    const progressText = document.getElementById('rfq-bulk-progress-text');

    // 2. Upload each file to storage
    for (let i = 0; i < totalFiles; i++) {
      const file = bulkFiles[i];
      const displayName = file.webkitRelativePath || file.name;
      const storagePath = `rfq/${user.id}/${rfqId}/${displayName}`;

      if (progressText) progressText.textContent = `Uploading ${i + 1}/${totalFiles}: ${displayName}`;
      if (progressBar) progressBar.style.width = `${((i + 1) / totalFiles) * 90}%`;

      const { data, error } = await supabase.storage
        .from('rfq-uploads')
        .upload(storagePath, file, {
          cacheControl: '3600',
          upsert: false
        });

      if (error) {
        console.error(`[RFQ] Upload error for ${displayName}:`, error);
        // Try user-files bucket as fallback
        const { data: fallbackData, error: fallbackError } = await supabase.storage
          .from('user-files')
          .upload(storagePath, file, {
            cacheControl: '3600',
            upsert: false
          });

        if (fallbackError) {
          console.error(`[RFQ] Fallback upload also failed for ${displayName}:`, fallbackError);
          uploadedFiles.push({
            name: displayName,
            size: file.size,
            type: file.type,
            storage_path: null,
            upload_error: error.message
          });
          continue;
        }

        uploadedFiles.push({
          name: displayName,
          size: file.size,
          type: file.type,
          storage_path: storagePath,
          bucket: 'user-files'
        });
      } else {
        uploadedFiles.push({
          name: displayName,
          size: file.size,
          type: file.type,
          storage_path: storagePath,
          bucket: 'rfq-uploads'
        });

        // --- MICROSOFT SHAREPOINT SYNC ---
        try {
          const { data: urlData } = supabase.storage.from('rfq-uploads').getPublicUrl(storagePath);
          if (urlData && urlData.publicUrl) {
            fetch('/.netlify/functions/webhook-sharepoint', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                file_name: displayName,
                file_url: urlData.publicUrl,
                folder_path: `RFQs/${projName}`,
                metadata: { rfqId, user: user.email }
              })
            }).catch(e => console.warn('SharePoint sync failed (non-blocking):', e));
          }
        } catch (spErr) {
          console.warn('Could not dispatch SharePoint sync:', spErr);
        }
      }
    }

    if (progressText) progressText.textContent = 'Creating quote request...';
    if (progressBar) progressBar.style.width = '95%';

    // 3. Create rfq_history record
    const rfqData = {
      type: 'bulk',
      project_name: projName,
      service: service,
      estimated_quantity: qty,
      target_timeline: timeline,
      notes: notes,
      contact_requested: contactMe,
      files: uploadedFiles,
      file_count: uploadedFiles.length,
      submitted_at: new Date().toISOString()
    };

    const { error: rfqError } = await supabase
      .from('rfq_history')
      .insert({
        id: rfqId,
        user_id: user.id,
        rfq_data: rfqData,
        status: 'submitted'
      });

    if (rfqError) {
      console.error('[RFQ] Failed to create RFQ record:', rfqError);
      throw new Error('Failed to save quote request: ' + rfqError.message);
    }

    if (progressBar) progressBar.style.width = '100%';

    // 4. Send email notification
    try {
      const { data: profileData } = await supabase.from('profiles').select('first_name, last_name, company').eq('id', user.id).single();
      const userName = profileData ? `${profileData.first_name || ''} ${profileData.last_name || ''}`.trim() : user.email;
      const userCompany = profileData?.company || '';

      await fetch('/.netlify/functions/send-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'project_rfq',
          email: user.email,
          userId: user.id,
          name: userName,
          company: userCompany,
          projectName: projName,
          service: service,
          quantity: qty,
          timeline: timeline,
          fileCount: uploadedFiles.length,
          fileNames: uploadedFiles.map(f => f.name)
        })
      });
      console.log('[RFQ] Email notification dispatched.');

      // 4.b Send to Microsoft Planner
      await fetch('/.netlify/functions/submit-rfq-planner', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customer_name: userName,
          email: user.email,
          part_name: projName,
          material: service || 'Various',
          estimated_cost: 'TBD'
        })
      });
      console.log('[RFQ] Planner notification dispatched.');
    } catch (emailErr) {
      console.warn('[RFQ] Email notification failed (non-blocking):', emailErr);
    }

    // 5. Show success modal
    if (progressContainer) progressContainer.remove();
    showRFQSuccessModal('rfq');

    if (submitBtn) { submitBtn.disabled = false; submitBtn.textContent = 'Request Project Quote'; }

    // Reset bulk files tracking
    bulkFiles = [];

    console.log('[RFQ] Bulk submission complete:', rfqId);

  } catch (err) {
    console.error('[RFQ] Bulk submit error:', err);
    if (progressContainer) progressContainer.remove();
    if (submitBtn) { submitBtn.disabled = false; submitBtn.textContent = 'Request Project Quote'; }
    alert(`Error submitting quote: ${err.message}`);
  }
}

// ── Helpers ─────────────────────────────────────────────
function setStat(panel, key, value) {
  const el = panel.querySelector(`[data-stat="${key}"]`);
  if (el) el.textContent = value;
}
function getField(panel, selector) {
  const el = panel.querySelector(selector);
  return el ? el.value : '';
}
function formatFileSize(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1048576).toFixed(1)} MB`;
}

export function showRFQSuccessModal(type) {
  const title = type === 'order' ? 'Order Placed Successfully!' : 'Quote Request Submitted!';
  const msg = type === 'order' 
    ? 'Your instant order has been placed. You can track your production status and manage your files directly in your workspace.' 
    : 'Our engineers will review your project and get back to you within 24 hours. You can access and manage your RFQ through your workspace.';
    
  const modalHTML = `
    <div id="rfq-success-modal-overlay" style="position:fixed; inset:0; background:rgba(0,0,0,0.6); backdrop-filter:blur(8px); z-index:9999; display:flex; align-items:center; justify-content:center;">
      <div style="background:#0f172a; border:1px solid rgba(255,255,255,0.1); border-radius:24px; padding:40px; max-width:440px; width:90%; text-align:center; box-shadow:0 30px 60px rgba(0,0,0,0.6); animation: rfqFadeIn 0.3s cubic-bezier(0.16, 1, 0.3, 1);">
        <div style="width:64px; height:64px; background:rgba(34,197,94,0.1); border:1px solid rgba(34,197,94,0.3); border-radius:50%; display:flex; align-items:center; justify-content:center; color:#22c55e; margin:0 auto 24px;">
          <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <polyline points="20 6 9 17 4 12" />
          </svg>
        </div>
        <h2 style="color:white; font-size:22px; font-weight:800; margin-bottom:14px;">${title}</h2>
        <p style="color:#94a3b8; font-size:15px; line-height:1.6; margin-bottom:32px;">${msg}</p>
        <div style="display:flex; flex-direction:column; gap:12px;">
          <a href="/workspace.html?tab=rfqs" style="background:var(--color-electric); color:white; padding:14px; border-radius:12px; text-decoration:none; font-weight:700; font-size:15px; box-shadow:0 8px 24px rgba(59,130,246,0.3); transition:all 0.2s;">Go to Workspace</a>
          <button id="rfq-success-modal-close" style="background:transparent; color:#94a3b8; border:1px solid rgba(255,255,255,0.1); padding:12px; border-radius:12px; cursor:pointer; font-weight:600; font-size:14px; transition:all 0.2s;">Close</button>
        </div>
      </div>
    </div>
  `;

  const wrapper = document.createElement('div');
  wrapper.innerHTML = modalHTML;
  document.body.appendChild(wrapper.firstElementChild);

  document.getElementById('rfq-success-modal-close').addEventListener('click', (e) => {
    e.target.closest('#rfq-success-modal-overlay').remove();
  });
}

/**
 * Initialize the Project Quote controller (bulk upload only view).
 * Wires the pq-bulk-* elements inside project-quote-engine.
 */
export function initProjectQuoteController() {
  const pqBulkSelectBtn = document.getElementById('pq-bulk-select-btn');
  const pqBulkFileInput = document.getElementById('pq-bulk-file-input');
  const pqBulkFileList  = document.getElementById('pq-bulk-file-list');
  const pqBulkUploadZone = document.getElementById('pq-bulk-upload-zone');
  const pqBulkSubmitBtn = document.getElementById('pq-bulk-submit-btn');
  const pqBulkFolderBtn = document.getElementById('pq-bulk-folder-btn');
  const pqBulkFolderInput = document.getElementById('pq-bulk-folder-input');

  if (!pqBulkUploadZone) {
    console.warn('[PQ] Project Quote elements not found.');
    return;
  }

  let pqFiles = [];

  function appendPQFiles(fileList) {
    if (!pqBulkFileList) return;
    const files = Array.from(fileList);
    pqBulkFileList.classList.remove('hidden');
    files.forEach(file => {
      pqFiles.push(file);
      const item = document.createElement('div');
      item.className = 'upload-file-item';
      const displayName = file.webkitRelativePath || file.name;
      item.innerHTML = `
        <span class="upload-file-item__name">📄 ${displayName}</span>
        <span class="upload-file-item__size">${formatFileSize(file.size)}</span>
        <button class="upload-file-item__remove" title="Remove">&times;</button>
      `;
      pqBulkFileList.appendChild(item);
    });
  }

  pqBulkSelectBtn?.addEventListener('click', (e) => { e.stopPropagation(); pqBulkFileInput?.click(); });
  pqBulkFolderBtn?.addEventListener('click', (e) => { e.stopPropagation(); pqBulkFolderInput?.click(); });

  pqBulkUploadZone?.addEventListener('click', (e) => {
    if (e.target === pqBulkUploadZone || e.target.closest('.upload-icon') || e.target.closest('.upload-text')) {
      pqBulkFileInput?.click();
    }
  });

  pqBulkUploadZone?.addEventListener('dragover', (e) => { e.preventDefault(); pqBulkUploadZone.classList.add('drag-over'); });
  pqBulkUploadZone?.addEventListener('dragleave', () => pqBulkUploadZone.classList.remove('drag-over'));
  pqBulkUploadZone?.addEventListener('drop', (e) => {
    e.preventDefault(); pqBulkUploadZone.classList.remove('drag-over');
    if (e.dataTransfer.files.length > 0) appendPQFiles(e.dataTransfer.files);
  });

  pqBulkFileInput?.addEventListener('change', () => {
    if (pqBulkFileInput.files.length > 0) appendPQFiles(pqBulkFileInput.files);
  });
  pqBulkFolderInput?.addEventListener('change', async () => {
    if (pqBulkFolderInput.files.length > 0) {
      const files = Array.from(pqBulkFolderInput.files);
      if (files.length === 0) return;
      
      // Determine folder name from the first file's relative path
      const firstPath = files[0].webkitRelativePath || '';
      const folderName = firstPath.split('/')[0] || 'Project_Folder';
      const zipFileName = `${folderName}.zip`;

      if (pqBulkSubmitBtn) {
        pqBulkSubmitBtn.disabled = true;
        pqBulkSubmitBtn.textContent = 'Zipping files...';
      }

      try {
        const zip = new JSZip();
        files.forEach(f => {
          // Use webkitRelativePath to maintain folder structure inside the zip
          zip.file(f.webkitRelativePath || f.name, f);
        });

        const zipBlob = await zip.generateAsync({type: "blob"}, function updateCallback(metadata) {
          if (pqBulkSubmitBtn) {
            pqBulkSubmitBtn.textContent = `Zipping: ${metadata.percent.toFixed(0)}%`;
          }
        });

        const zipFile = new File([zipBlob], zipFileName, { type: 'application/zip', lastModified: new Date().getTime() });
        appendPQFiles([zipFile]);
      } catch (err) {
        console.error('[PQ] Zipping failed:', err);
        alert('Failed to zip folder. Please try selecting files instead.');
      } finally {
        if (pqBulkSubmitBtn) {
          pqBulkSubmitBtn.disabled = false;
          pqBulkSubmitBtn.textContent = 'Request Project Quote';
        }
        pqBulkFolderInput.value = '';
      }
    }
  });

  pqBulkFileList?.addEventListener('click', (e) => {
    const removeBtn = e.target.closest('.upload-file-item__remove');
    if (removeBtn) {
      const fileName = removeBtn.closest('.upload-file-item')?.querySelector('.upload-file-item__name')?.textContent?.replace('📄 ', '').trim();
      removeBtn.closest('.upload-file-item').remove();
      pqFiles = pqFiles.filter(f => (f.webkitRelativePath || f.name) !== fileName);
      if (pqBulkFileList.children.length === 0) pqBulkFileList.classList.add('hidden');
    }
  });

  // Rich text editor for project quote notes
  const pqEditorTools = document.querySelectorAll('#project-quote-engine .rfq-editor__tool');
  pqEditorTools.forEach(tool => {
    tool.addEventListener('click', (e) => {
      if (tool.classList.contains('rfq-editor__tool--color')) return;
      e.preventDefault();
      const command = tool.dataset.command;
      document.execCommand(command, false, null);
      document.getElementById('pq-bulk-notes')?.focus();
    });
  });

  pqBulkSubmitBtn?.addEventListener('click', () => {
    if (pqFiles.length === 0) {
      alert('Please upload at least one file before submitting.');
      return;
    }
    bulkFiles = pqFiles;
    handleBulkSubmit();
  });

  console.log('[PQ] Project Quote controller initialized.');
}

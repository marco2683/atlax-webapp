import os
import re

filepath = 'c:/Users/sebas/OneDrive/Desktop/DUMP/Antigravity Projects/002_Pearl River Delta PRD/webapp/src/js/components/rfq-controller.js'
with open(filepath, 'r', encoding='utf-8') as f:
    text = f.read()

# Replace createPartPanelHTML function
new_createPartPanelHTML = """function createPartPanelHTML(partIdx) {
  return `
    <div class="rfq-part-card needs-tech-selection" data-part="${partIdx}" style="display: flex; flex-direction: column; background: rgba(0,0,0,0.15); border: 1px solid var(--color-steel-600); border-radius: var(--radius-lg); padding: 20px; position: relative; transition: all 0.3s ease;">
      <!-- Remove Button -->
      <button class="rfq-part-remove" data-part="${partIdx}" style="position: absolute; top: 12px; right: 12px; background: none; border: none; color: var(--color-steel-400); cursor: pointer; font-size: 18px; padding: 4px; line-height: 1;">&times;</button>
      
      <!-- Top Section: File Info & Name -->
      <div class="rfq-part-header" style="display: flex; gap: 16px; margin-bottom: 20px; align-items: flex-start;">
        <!-- Placeholder for Geometry Analysis / Thumbnail -->
        <div class="rfq-part-thumb-wrapper" style="width: 120px; height: 120px; border-radius: 8px; background: rgba(0,0,0,0.3); border: 1px dashed rgba(255,255,255,0.1); display: flex; align-items: center; justify-content: center; position: relative;">
          <div class="rfq-results-placeholder" data-part="${partIdx}" style="text-align: center; color: var(--color-steel-500); display: flex; flex-direction: column; align-items: center; gap: 4px;">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path><polyline points="3.27 6.96 12 12.01 20.73 6.96"></polyline><line x1="12" y1="22.08" x2="12" y2="12"></line></svg>
          </div>
          <div class="rfq-results hidden" data-part="${partIdx}" style="width:100%; height:100%;">
            <div class="rfq-results__thumbnail" data-part="${partIdx}" style="width:100%; height:100%;"></div>
          </div>
        </div>

        <div style="flex: 1;">
          <div class="rfq-field" style="margin-bottom: 12px;">
            <label style="font-size:11px; margin-bottom:4px; display:block;">Part Name</label>
            <input type="text" class="rfq-part-name" data-part="${partIdx}" placeholder="e.g. Housing Top..." style="font-size: 16px; font-weight: 600; padding: 8px 12px; border-radius:8px; border:1px solid rgba(255,255,255,0.1); background:rgba(0,0,0,0.2);" />
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
          <div class="rfq-results__status" data-part="${partIdx}" style="font-size: 12px; color: var(--color-teal-400); margin-top: 4px;">Waiting for file...</div>
        </div>
      </div>

      <!-- Middle Section: Configurations -->
      <div class="rfq-fields-col" style="display: flex; flex-direction: column; gap: 12px;">
        <!-- Row 1: Technology & Quantity -->
        <div class="rfq-fields-grid" style="grid-template-columns: 2fr 1fr; margin-bottom: 0; padding: 12px; background: rgba(59, 130, 246, 0.05); border: 1px solid rgba(59, 130, 246, 0.2); border-radius: var(--radius-lg);">
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

        <!-- Row 3: Lead Time -->
        <div class="rfq-fields-grid" style="grid-template-columns: 1fr; margin-bottom: 0;">
          <div class="rfq-field">
            <label>Lead Time</label>
            <select class="rfq-lead-time" data-part="${partIdx}">
              <option value="economy">Economy (30+ days)</option>
              <option value="standard" selected>Standard (15–20 days)</option>
              <option value="express">Express (7–10 days)</option>
              <option value="rush">Rush (3–5 days)</option>
            </select>
          </div>
        </div>

        <!-- Tooling Details (Dynamically shown based on Process) -->
        <div class="rfq-tooling-details hidden" data-part="${partIdx}" style="margin-top: 16px; padding: 12px; background: rgba(239, 68, 68, 0.05); border: 1px dashed rgba(239, 68, 68, 0.4); border-radius: var(--radius-md); transition: all 0.3s ease;">
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

        <!-- 2D / Supporting Docs Dropzone -->
        <div class="rfq-engine__upload-zone" id="rfq-upload-zone-2d-${partIdx}" style="min-height: 100px; margin-top: 12px; background: rgba(0,0,0,0.2); border-color: rgba(255,255,255,0.08); padding: 16px;">
          <input type="file" class="rfq-file-input-2d" data-part="${partIdx}" multiple accept=".pdf,.dwg,.dxf,.png,.jpg,.jpeg,.doc,.docx" hidden />
          <div class="upload-icon" style="color: var(--color-steel-400); margin-bottom: 4px;">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>
          </div>
          <div class="upload-text">
            <h3 style="font-size: 12px; color: var(--color-steel-300);">2D Drawings & Supporting Docs</h3>
            <p style="font-size: 10px; margin-top: 2px;">Drag & Drop or <span class="upload-link">Choose Files</span></p>
          </div>
          <div class="upload-file-list hidden" id="upload-file-list-2d-${partIdx}"></div>
        </div>

        <!-- Custom Details / Post-Processing Notes -->
        <div class="rfq-custom-details"><label>Additional Notes & Requirements</label>
          <textarea class="rfq-custom-notes" data-part="${partIdx}" rows="3" placeholder="Surface finish details, coating specs, heat treatments, certifications, special requirements..."></textarea>
        </div>
      </div> <!-- Closes rfq-fields-col -->
      
      <!-- Missing file input block (used programmatically by handleFiles but doesn't need to be clickable by user in card) -->
      <div class="upload-file-list hidden" data-part="${partIdx}" style="display:none;"></div>
      <input type="file" class="rfq-file-input" data-part="${partIdx}" hidden />
    </div>`;
}"""

new_initRFQController = """export function initRFQController() {
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
      // clear value so re-selecting same file triggers again if needed
      mainFileInput.value = '';
    });
  }

  // Handle Shipping calculation toggle
  const calcShippingCb = document.getElementById('calc-shipping-cb');
  const shippingSection = document.getElementById('shipping-details-section');
  if (calcShippingCb && shippingSection) {
    calcShippingCb.addEventListener('change', (e) => {
      if (e.target.checked) {
        shippingSection.classList.remove('hidden');
      } else {
        shippingSection.classList.add('hidden');
      }
      calculateAndDisplayQuote();
    });
  }

  // Real-time recalculation and events inside cards
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
  });

  // Wire checkout and request quote buttons
  document.getElementById('rfq-submit-verification-btn')?.addEventListener('click', async () => {
    if (quotedParts.size === 0) return;
    
    // ... [Original submit logic preserved using replace later]
"""

# Let's use regex to replace `function createPartPanelHTML(partIdx) { ... }`
# We'll use re.DOTALL to match across newlines
pattern_create = re.compile(r'function createPartPanelHTML\(partIdx\) \{.*?\n\}', re.DOTALL)
text = pattern_create.sub(new_createPartPanelHTML, text, count=1)

# For initRFQController, it is huge. Let's find exactly the range.
# We'll replace the old initRFQController up to the submit logic.
# Wait, the easiest way is to just inject our new event listeners and then use python string manipulations.

# Actually, we can just replace switchTab and removeTab entirely with processMainUpload and removePartCard
new_utils = """
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
"""

text = re.sub(r'function switchTab\(partIdx\) \{.*?\n\}', '', text, flags=re.DOTALL)
text = re.sub(r'function removeTab\(partIdx\) \{.*?\n\}', new_utils, text, flags=re.DOTALL)

with open(filepath, 'w', encoding='utf-8') as f:
    f.write(text)

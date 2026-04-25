import os
import re

APP_HTML = r"c:\Users\sebas\OneDrive\Desktop\DUMP\Antigravity Projects\002_Pearl River Delta PRD\webapp\app.html"
CONTROLLER = r"c:\Users\sebas\OneDrive\Desktop\DUMP\Antigravity Projects\002_Pearl River Delta PRD\webapp\src\js\components\rfq-controller.js"

with open(APP_HTML, 'r', encoding='utf-8') as f:
    html = f.read()

# 1. Update the HTML layout for the instant quote engine in app.html
# Find the `<div class="rfq-part-panel active" data-part="0">` block and replace the top row and fields.

new_panel_html = """                  <div class="rfq-top-row">
                    <!-- LEFT: Part Name & Upload Zone -->
                    <div class="rfq-upload-col">
                      <div class="rfq-field" style="margin-bottom: 16px;">
                        <label>Part Name</label>
                        <input type="text" class="rfq-part-name" data-part="0" placeholder="e.g. Housing Top..." style="font-size: 14px;" />
                      </div>
                      
                      <!-- 3D Files Dropzone -->
                      <div class="rfq-engine__upload-zone" id="rfq-upload-zone-0" style="min-height: 220px;">
                        <input type="file" class="rfq-file-input" data-part="0" multiple
                          accept=".step,.stp,.stl,.obj,.3mf,.iges,.igs,.dxf,.sldprt,.ipt,.x_t,.x_b,.3dxml,.catpart,.prt,.sat,.jt"
                          hidden />
                        <div class="upload-icon">
                          <svg xmlns="http://www.w3.org/2000/svg" width="36" height="36" viewBox="0 0 24 24" fill="none"
                            stroke="currentColor" stroke-width="1.5">
                            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                            <polyline points="17 8 12 3 7 8" />
                            <line x1="12" y1="3" x2="12" y2="15" />
                          </svg>
                        </div>
                        <div class="upload-text">
                          <h3>Drag & Drop 3D CAD Files</h3>
                          <p style="margin-top: 4px;">Upload at least 1 3D CAD file to get started.</p>
                        </div>
                        <button class="upload-btn rfq-select-files-btn" data-part="0">Select 3D Files</button>
                        <div class="upload-file-list hidden" data-part="0"></div>
                        <div class="upload-formats">
                          <p style="font-size: 9.5px;">STEP · STP · SLDPRT · STL · DXF · IGES · IGS · IPT · X_T · X_B ·
                            3DXML · CATPART · PRT · SAT · 3MF · JT</p>
                        </div>
                      </div>

                      <!-- 2D / Supporting Docs Dropzone -->
                      <div class="rfq-engine__upload-zone" id="rfq-upload-zone-2d-0"
                        style="min-height: 140px; margin-top: 12px; background: rgba(0,0,0,0.2); border-color: rgba(255,255,255,0.08);">
                        <input type="file" class="rfq-file-input-2d" data-part="0" multiple
                          accept=".pdf,.dwg,.dxf,.png,.jpg,.jpeg,.doc,.docx" hidden />
                        <div class="upload-icon" style="color: var(--color-steel-400); margin-bottom: -6px;">
                          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none"
                            stroke="currentColor" stroke-width="1.5">
                            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                            <polyline points="14 2 14 8 20 8"></polyline>
                            <line x1="16" y1="13" x2="8" y2="13"></line>
                            <line x1="16" y1="17" x2="8" y2="17"></line>
                            <polyline points="10 9 9 9 8 9"></polyline>
                          </svg>
                        </div>
                        <div class="upload-text">
                          <h3 style="font-size: 12px; color: var(--color-steel-300);">2D Drawings & Supporting Docs</h3>
                          <p style="font-size: 10px; margin-top: 2px;">Drag & Drop or <span class="upload-link">Choose
                              Files</span></p>
                        </div>
                        <div class="upload-file-list hidden" id="upload-file-list-2d-0"></div>
                        <div class="upload-formats" style="margin-top: 4px;">
                          <p>PDF · DWG · DXF · PNG · JPG</p>
                        </div>
                      </div>
                    </div>

                    <!-- RIGHT: Filter Fields -->
                    <div class="rfq-fields-col">
                      <!-- Row 1: Technology & Quantity -->
                      <div class="rfq-fields-grid" style="grid-template-columns: 2fr 1fr; margin-bottom: 12px; padding: 12px; background: rgba(59, 130, 246, 0.05); border: 1px solid rgba(59, 130, 246, 0.2); border-radius: var(--radius-lg);">
                        <div class="rfq-field rfq-field--accent">
                          <label style="color: var(--color-electric); font-size: 11px;">Primary Technology</label>
                          <select class="rfq-process" data-part="0" style="font-size: 15px; font-weight: 600; padding: 12px 14px; border-color: rgba(59, 130, 246, 0.4); background: rgba(59, 130, 246, 0.05);">
                            <option value="cnc">CNC Machining</option>
                            <option value="vac_casting">Silicone Vacuum Casting</option>
                            <option value="injection">Injection moulding</option>
                            <option value="sheet">Sheet metal</option>
                            <option value="casting">Die-Casting</option>
                            <option value="other">Other</option>
                          </select>
                        </div>
                        <div class="rfq-field">
                          <label>Quantity</label>
                          <input type="number" class="rfq-quantity" data-part="0" value="1" min="1" style="font-size: 15px; font-weight: 600; padding: 12px 14px;" />
                        </div>
                      </div>

                      <!-- Row 2: Material, Color, Surface Finish -->
                      <div class="rfq-fields-grid" style="grid-template-columns: repeat(3, 1fr); margin-bottom: 12px;">
                        <div class="rfq-field">
                          <label>Material</label>
                          <select class="rfq-material" data-part="0"></select>
                        </div>
                        <div class="rfq-field">
                          <label>Color</label>
                          <input type="text" class="rfq-color" data-part="0" placeholder="White, RAL 7016..." />
                        </div>
                        <div class="rfq-field">
                          <label>Surface Finish</label>
                          <select class="rfq-finish" data-part="0">
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
                      <div class="rfq-fields-grid" style="grid-template-columns: 1fr;">
                        <div class="rfq-field">
                          <label>Lead Time</label>
                          <select class="rfq-lead-time" data-part="0">
                            <option value="economy">Economy (30+ days)</option>
                            <option value="standard" selected>Standard (15–20 days)</option>
                            <option value="express">Express (7–10 days)</option>
                            <option value="rush">Rush (3–5 days)</option>
                          </select>
                        </div>
                      </div>

                      <!-- Tooling Details (Dynamically shown based on Process) -->
"""

# Extract the <div class="rfq-top-row"> ... until <!-- Tooling Details 
# We'll use regex to replace it
html = re.sub(r'<div class="rfq-top-row">.*?<!-- Tooling Details \(Dynamically shown based on Process\) -->', new_panel_html, html, flags=re.DOTALL)

# Replace the CTA buttons in app.html
old_cta_buttons = """<div class="rfq-quote-result__actions hidden" id="rfq-quote-actions">
              <button class="rfq-action-btn rfq-action-btn--primary" id="rfq-checkout-btn">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none"
                  stroke="currentColor" stroke-width="2">
                  <circle cx="9" cy="21" r="1" />
                  <circle cx="20" cy="21" r="1" />
                  <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6" />
                </svg>
                Checkout
              </button>
              <button class="rfq-action-btn rfq-action-btn--secondary" id="rfq-request-formal-quote">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none"
                  stroke="currentColor" stroke-width="2">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                  <polyline points="14 2 14 8 20 8" />
                  <line x1="16" y1="13" x2="8" y2="13" />
                  <line x1="16" y1="17" x2="8" y2="17" />
                </svg>
                Request Formal Quote
              </button>
            </div>"""

new_cta_buttons = """<div class="rfq-quote-result__actions hidden" id="rfq-quote-actions">
              <button class="rfq-action-btn rfq-action-btn--primary" id="rfq-submit-verification-btn" style="width: 100%;">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none"
                  stroke="currentColor" stroke-width="2">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                  <polyline points="14 2 14 8 20 8" />
                  <line x1="16" y1="13" x2="8" y2="13" />
                  <line x1="16" y1="17" x2="8" y2="17" />
                </svg>
                Submit for Verification
              </button>
            </div>"""

if "id=\"rfq-checkout-btn\"" in html:
    html = re.sub(r'<div class="rfq-quote-result__actions hidden" id="rfq-quote-actions">.*?</div>\s*</div><!-- /rfq-engine__right -->', new_cta_buttons + '\n          </div><!-- /rfq-engine__right -->', html, flags=re.DOTALL)

with open(APP_HTML, 'w', encoding='utf-8') as f:
    f.write(html)

# 2. Update rfq-controller.js
with open(CONTROLLER, 'r', encoding='utf-8') as f:
    js = f.read()

new_js_template = """      <div class="rfq-cols">
        <!-- LEFT: Upload/Viewer -->
        <div class="rfq-upload-col">
          <div class="rfq-field" style="margin-bottom: 16px;"><label>Part Name</label>
            <input type="text" class="rfq-part-name" data-part="${partIdx}" placeholder="e.g. Housing Top..." style="font-size: 14px;" />
          </div>
          <!-- 3D Files Dropzone -->
          <div class="rfq-engine__upload-zone" id="rfq-upload-zone-${partIdx}" style="min-height: 220px;">
            <input type="file" class="rfq-file-input" data-part="${partIdx}" multiple accept=".step,.stp,.stl,.obj,.3mf,.iges,.igs,.dxf,.sldprt,.ipt,.x_t,.x_b,.3dxml,.catpart,.prt,.sat,.jt" hidden />
            <div class="upload-icon">
              <svg xmlns="http://www.w3.org/2000/svg" width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
            </div>
            <div class="upload-text">
              <h3>Drag & Drop 3D CAD Files</h3>
              <p style="margin-top: 4px;">Upload at least 1 3D CAD file to get started.</p>
            </div>
            <button class="upload-btn rfq-select-files-btn" data-part="${partIdx}">Select 3D Files</button>
            <div class="upload-file-list hidden" data-part="${partIdx}"></div>
          </div>
          <!-- 2D / Supporting Docs Dropzone -->
          <div class="rfq-engine__upload-zone" id="rfq-upload-zone-2d-${partIdx}" style="min-height: 140px; margin-top: 12px; background: rgba(0,0,0,0.2); border-color: rgba(255,255,255,0.08);">
            <input type="file" class="rfq-file-input-2d" data-part="${partIdx}" multiple accept=".pdf,.dwg,.dxf,.png,.jpg,.jpeg,.doc,.docx" hidden />
            <div class="upload-icon" style="color: var(--color-steel-400); margin-bottom: -6px;">
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>
            </div>
            <div class="upload-text">
              <h3 style="font-size: 12px; color: var(--color-steel-300);">2D Drawings & Supporting Docs</h3>
              <p style="font-size: 10px; margin-top: 2px;">Drag & Drop or <span class="upload-link">Choose Files</span></p>
            </div>
            <div class="upload-file-list hidden" id="upload-file-list-2d-${partIdx}"></div>
          </div>
        </div>
        
        <div class="rfq-fields-col">
          <!-- Row 1: Technology & Quantity -->
          <div class="rfq-fields-grid" style="grid-template-columns: 2fr 1fr; margin-bottom: 12px; padding: 12px; background: rgba(59, 130, 246, 0.05); border: 1px solid rgba(59, 130, 246, 0.2); border-radius: var(--radius-lg);">
            <div class="rfq-field rfq-field--accent">
              <label style="color: var(--color-electric); font-size: 11px;">Primary Technology</label>
              <select class="rfq-process" data-part="${partIdx}" style="font-size: 15px; font-weight: 600; padding: 12px 14px; border-color: rgba(59, 130, 246, 0.4); background: rgba(59, 130, 246, 0.05);">
                <option value="cnc">CNC Machining</option>
                <option value="vac_casting">Silicone Vacuum Casting</option>
                <option value="injection">Injection moulding</option>
                <option value="sheet">Sheet metal</option>
                <option value="casting">Die-Casting</option>
                <option value="other">Other</option>
              </select>
            </div>
            <div class="rfq-field"><label>Quantity</label>
              <input type="number" class="rfq-quantity" data-part="${partIdx}" value="1" min="1" style="font-size: 15px; font-weight: 600; padding: 12px 14px;" />
            </div>
          </div>

          <!-- Row 2: Material, Color, Surface Finish -->
          <div class="rfq-fields-grid" style="grid-template-columns: repeat(3, 1fr); margin-bottom: 12px;">
            <div class="rfq-field"><label>Material</label>
              <select class="rfq-material" data-part="${partIdx}"></select>
            </div>
            <div class="rfq-field"><label>Color</label>
              <input type="text" class="rfq-color" data-part="${partIdx}" placeholder="White, RAL 7016..." />
            </div>
            <div class="rfq-field"><label>Surface Finish</label>
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
          <div class="rfq-fields-grid" style="grid-template-columns: 1fr;">
            <div class="rfq-field"><label>Lead Time</label>
              <select class="rfq-lead-time" data-part="${partIdx}">
                <option value="economy">Economy (30+ days)</option><option value="standard" selected>Standard (15–20 days)</option>
                <option value="express">Express (7–10 days)</option><option value="rush">Rush (3–5 days)</option>
              </select>
            </div>
          </div>

          <!-- Tooling Details (Dynamically shown based on Process) -->
"""

js = re.sub(r'<div class="rfq-cols">.*?<!-- Tooling Details \(Dynamically shown based on Process\) -->', new_js_template.strip(), js, flags=re.DOTALL)

# Replace the event listeners for checkout and formal quote
old_btn_listeners = r"""  // Wire checkout and request quote buttons
  document.getElementById\('rfq-checkout-btn'\)\?.addEventListener\('click', \(\) => \{
.*?  document.getElementById\('rfq-request-formal-quote'\)\?.addEventListener\('click', async \(\) => \{
    if \(quotedParts.size === 0\) return;
    
    const user = await getCurrentUser\(\);
    if \(!user\) \{ alert\('Please log in to submit a quote request.'\); return; \}
    
    const btn = document.getElementById\('rfq-request-formal-quote'\);
    const originalText = btn.textContent;
    btn.disabled = true;
    btn.textContent = 'Submitting...';

    const rfqId = window.crypto\?.randomUUID\?\.\(\) \|\| Date.now\(\).toString\(\);
    const partsArray = Array.from\(quotedParts.values\(\)\);
    const totalVolume = partsArray.reduce\(\(acc, p\) => acc \+ \(p.volume \|\| 0\), 0\);
    const projName = partsArray\[0\]\?.file\?.name\?.split\('\.'\)\[0\] \|\| 'Instant RFQ Project';

    const rfqData = \{
      type: 'instant',
      project_name: projName,
      status: 'reviewing',
      total_parts: partsArray.length,
      overall_volume: totalVolume,
      submitted_at: new Date\(\).toISOString\(\),
      user_id: user.id
    \};

    try \{
      // Save primary RFQ record
      await saveRFQData\(rfqId, rfqData\);

      // Save each part to storage & db
      for \(let i = 0; i < partsArray.length; i\+\+\) \{
        const part = partsArray\[i\];
        const partData = \{
          rfq_id: rfqId,
          part_name: part.partName \|\| `Part_$\{i \+ 1\}`,
          process: part.process,
          material: part.material,
          quantity: part.quantity,
          lead_time: part.leadTime,
          finish: part.finish,
          tolerance: part.tolerance,
          color: part.color,
          threads: part.threads,
          notes: part.notes,
          file_name: part.file\?.name,
          file_size: part.file\?.size
        \};

        if \(part.file\) \{
          const publicUrl = await uploadRFQFile\(part.file, rfqId\);
          partData.file_url = publicUrl;
        \}
        await saveRFQPart\(partData\);
      \}

      btn.textContent = originalText;
      btn.disabled = false;
      showRFQSuccessModal\('quote'\);
    \} catch \(error\) \{
      console.error\('RFQ Submit Error:', error\);
      alert\('Failed to submit quote request. Please try again later.'\);
      btn.textContent = originalText;
      btn.disabled = false;
    \}
  \}\);"""

new_btn_listeners = """  // Wire Submit for Verification button
  document.getElementById('rfq-submit-verification-btn')?.addEventListener('click', async () => {
    if (quotedParts.size === 0) return;
    
    const user = await getCurrentUser();
    if (!user) { alert('Please log in to submit a quote request.'); return; }
    
    const btn = document.getElementById('rfq-submit-verification-btn');
    const originalText = btn.textContent;
    btn.disabled = true;
    btn.textContent = 'Submitting...';

    const rfqId = window.crypto?.randomUUID?.() || Date.now().toString();
    const partsArray = Array.from(quotedParts.values());
    const totalVolume = partsArray.reduce((acc, p) => acc + (p.volume || 0), 0);
    
    // Calculate total price for instant quote (if quoted properties exist)
    const totalPrice = partsArray.reduce((acc, p) => acc + (p.price || 0), 0);

    const projName = partsArray[0]?.file?.name?.split('.')[0] || 'Instant RFQ Project';

    const rfqData = {
      type: 'instant',
      project_name: projName,
      status: 'reviewing',
      total_parts: partsArray.length,
      overall_volume: totalVolume,
      total_price: totalPrice,
      submitted_at: new Date().toISOString(),
      user_id: user.id
    };

    try {
      // Save primary RFQ record
      await saveRFQData(rfqId, rfqData);

      // Save each part to storage & db
      for (let i = 0; i < partsArray.length; i++) {
        const part = partsArray[i];
        const partData = {
          rfq_id: rfqId,
          part_name: part.partName || `Part_${i + 1}`,
          process: part.process,
          material: part.material,
          quantity: part.quantity,
          lead_time: part.leadTime,
          finish: part.finish,
          color: part.color,
          notes: part.notes,
          file_name: part.file?.name,
          file_size: part.file?.size,
          unit_price: part.unitPrice || null,
          total_price: part.price || null
        };

        if (part.file) {
          const publicUrl = await uploadRFQFile(part.file, rfqId);
          partData.file_url = publicUrl;
        }
        await saveRFQPart(partData);
      }

      btn.textContent = originalText;
      btn.disabled = false;
      showRFQSuccessModal('quote');
    } catch (error) {
      console.error('RFQ Submit Error:', error);
      alert('Failed to submit quote request. Please try again later.');
      btn.textContent = originalText;
      btn.disabled = false;
    }
  });"""

js = re.sub(old_btn_listeners, new_btn_listeners, js, flags=re.DOTALL)

with open(CONTROLLER, 'w', encoding='utf-8') as f:
    f.write(js)

print("HTML and JS updated successfully!")

import re

with open('src/js/components/rfq-controller.js', 'r', encoding='utf-8') as f:
    text = f.read()

# Locate the function bounds
func_start_idx = text.find('function createPartPanelHTML(partIdx) {')
func_end_idx = text.find('}\n\n/**', func_start_idx)

if func_start_idx == -1 or func_end_idx == -1:
    print("Could not find createPartPanelHTML")
    exit(1)

new_func = """function createPartPanelHTML(partIdx) {
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
}"""

text = text[:func_start_idx] + new_func + text[func_end_idx:]

with open('src/js/components/rfq-controller.js', 'w', encoding='utf-8') as f:
    f.write(text)

print("Updated rfq-controller.js successfully!")

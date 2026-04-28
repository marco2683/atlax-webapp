import os

filepath = 'c:/Users/sebas/OneDrive/Desktop/DUMP/Antigravity Projects/002_Pearl River Delta PRD/webapp/app.html'

with open(filepath, 'r', encoding='utf-8') as f:
    content = f.read()

start_marker = "<!-- ═══════════════════════════════════════════════════\n           INSTANT RFQ ENGINE"
end_marker = "<!-- ═══════════════════════════════════════════════════\n         FIND DESIGNERS ENGINE"

start_idx = content.find(start_marker)
end_idx = content.find(end_marker)

if start_idx == -1 or end_idx == -1:
    print("Markers not found!")
    exit(1)

new_html = """<!-- ═══════════════════════════════════════════════════
           INSTANT RFQ ENGINE
           ═══════════════════════════════════════════════════ -->
      <div class="rfq-engine hidden" id="rfq-engine">

        <!-- LEFT COLUMN: Form card -->
        <div class="rfq-engine__left">

          <!-- ══ PRIMARY CARD ══════════════════════════════ -->
          <div class="rfq-engine__card">

            <!-- ── Header ───────── -->
            <div class="rfq-engine__header">
              <h2>Quote Instantly</h2>
              <p
                style="margin: 4px 0 0; font-size: 13px; color: rgba(255,255,255,0.45); font-weight: 400; letter-spacing: 0.01em;">
                Get instant pricing for individual parts and components — upload your CAD file, configure specs, and receive a quote in seconds.
              </p>
            </div>
            
            <div class="rfq-detailed-panel" id="rfq-detailed-panel" style="margin-top: 16px;">
              <!-- Top Project Info & Shipping Fields -->
              <div class="rfq-project-info" style="margin-bottom: 24px; display: grid; gap: 16px;">
                <div class="rfq-field">
                  <label style="display:block; font-size:12px; font-weight:700; color:#64748b; text-transform:uppercase; letter-spacing:0.5px; margin-bottom:8px;">Project Name</label>
                  <input type="text" id="instant-rfq-project-name" placeholder="e.g. Drone Chassis Prototype V2" style="width:100%; padding:12px 16px; border-radius:10px; border:1px solid #cbd5e1; font-size:15px; font-weight:600; color:#0f172a; outline:none; box-shadow:inset 0 2px 4px rgba(0,0,0,0.02); transition:all 0.2s;">
                </div>
                
                <div class="rfq-field">
                  <label style="display:flex; align-items:center; gap:8px; font-size:13px; font-weight:600; color:var(--color-steel-200); cursor:pointer;">
                    <input type="checkbox" id="calc-shipping-cb" style="width:16px; height:16px; cursor:pointer;">
                    Include Shipping Calculation
                  </label>
                </div>
                
                <div id="shipping-details-section" class="hidden" style="padding:16px; background:rgba(0,0,0,0.2); border-radius:10px; border:1px solid rgba(255,255,255,0.1); margin-top:8px;">
                  <h4 style="margin-bottom:12px; font-size:14px; color:var(--color-white);">Shipping Details</h4>
                  <div class="rfq-fields-grid" style="grid-template-columns: 1fr 1fr; margin-bottom: 12px;">
                    <div class="rfq-field" style="margin-bottom:0;">
                      <label>Company Name</label>
                      <input type="text" id="ship-company" placeholder="Company Ltd.">
                    </div>
                    <div class="rfq-field" style="margin-bottom:0;">
                      <label>Attention To</label>
                      <input type="text" id="ship-attention" placeholder="Contact Name">
                    </div>
                  </div>
                  <div class="rfq-field" style="margin-bottom:0;">
                    <label>Shipping Address (including Country/ZIP)</label>
                    <textarea id="ship-address" rows="3" placeholder="123 Example St, City, Country, ZIP"></textarea>
                  </div>
                </div>
              </div>

              <!-- Main Drop Zone -->
              <div class="rfq-engine__upload-zone" id="rfq-main-upload-zone" style="margin-bottom: 32px; min-height: 220px; display: flex; flex-direction: column; justify-content: center; align-items: center;">
                <input type="file" id="rfq-main-file-input" multiple
                  accept=".step,.stp,.stl,.obj,.3mf,.iges,.igs,.dxf,.sldprt,.ipt,.x_t,.x_b,.3dxml,.catpart,.prt,.sat,.jt"
                  hidden />
                <div class="upload-icon">
                  <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none"
                    stroke="currentColor" stroke-width="1.5">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                    <polyline points="17 8 12 3 7 8" />
                    <line x1="12" y1="3" x2="12" y2="15" />
                  </svg>
                </div>
                <div class="upload-text" style="text-align: center;">
                  <h3>Drag & Drop 3D CAD Files</h3>
                  <p style="margin-top: 4px;">Upload multiple files. We'll generate a part card for each.</p>
                </div>
                <button class="upload-btn" id="rfq-main-select-btn" style="margin: 16px auto 0;">Select 3D Files</button>
                <div class="upload-formats" style="margin-top: 16px; text-align: center;">
                  <p style="font-size: 10.5px; color: var(--color-steel-400);">Supported: STEP, STP, SLDPRT, STL, IGES, X_T. <br>Other formats will be flagged and may not be readable by the 3D engine.</p>
                </div>
              </div>
              
              <!-- Container for dynamically generated vertical cards -->
              <div id="rfq-dynamic-parts-container" style="display:flex; flex-direction:column; gap:24px;">
                <!-- JS will inject part cards here -->
              </div>

            </div><!-- /rfq-detailed-panel -->

          </div><!-- /primary card -->

        </div><!-- /rfq-engine__left -->

        <!-- Quote Estimate Side Panel -->
        <div class="rfq-engine__right hidden" id="rfq-engine-right">
          
          <!-- CALCULATE BUTTON MOVED TO TOP -->
          <div style="margin-bottom: 24px; width: 100%;">
            <button class="rfq-engine__submit-btn rfq-engine__submit-btn--green" id="rfq-submit-btn" disabled style="width: 100%; box-shadow: 0 4px 12px rgba(16, 185, 129, 0.3);">
              <span>Calculate Instant Quote</span>
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none"
                stroke="currentColor" stroke-width="2">
                <line x1="5" y1="12" x2="19" y2="12" />
                <polyline points="12 5 19 12 12 19" />
              </svg>
            </button>
          </div>

          <div class="rfq-quote-result rfq-quote-result--empty" id="rfq-quote-result">
            <div class="rfq-quote-result__header hidden" id="rfq-quote-header">
              <div class="rfq-quote-result__header-left">
                <h3>Quote Estimate</h3>
                <span class="rfq-quote-result__badge">Instant</span>
              </div>
              <button class="rfq-quote-result__clear-all" id="rfq-clear-all-parts" title="Clear all parts">
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none"
                  stroke="currentColor" stroke-width="2">
                  <polyline points="3 6 5 6 21 6" />
                  <path d="M19 6l-2 14H7L5 6" />
                  <path d="M10 11v6" />
                  <path d="M14 11v6" />
                  <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
                </svg>
                <span>Clear All</span>
              </button>
            </div>
            
            <div class="rfq-quote-result__empty-hint" id="rfq-quote-empty-hint">
              <span class="rfq-quote-result__empty-hint-title">Instant Quote Estimate</span>
              <span class="rfq-quote-result__empty-hint-sub">Your quoted parts will appear here</span>
            </div>
            <div class="rfq-quote-result__breakdown hidden" id="rfq-quote-breakdown">
            </div>
            <div class="rfq-quote-result__actions hidden" id="rfq-quote-actions">
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
            </div>
          </div><!-- /rfq-quote-result -->
        </div><!-- /rfq-engine__right -->
      </div><!-- /rfq-engine -->

    """

final_html = content[:start_idx] + new_html + content[end_idx:]

with open(filepath, 'w', encoding='utf-8') as f:
    f.write(final_html)

print("Updated app.html successfully")

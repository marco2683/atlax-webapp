import re

with open('c:/Users/sebas/OneDrive/Desktop/DUMP/Antigravity Projects/002_Pearl River Delta PRD/webapp/src/js/admin.js', 'r', encoding='utf-8') as f:
    text = f.read()

# Replace STAGES
text = re.sub(
    r"const STAGES\s*=\s*.*?;",
    "const STAGES = ['Prototyping', 'Mass Production', 'Design', 'Contract Manufacturing', 'Box Build', 'Tooling Fabrication', 'Assembly & Pack-out'];",
    text
)

func_match = re.search(r'function renderSupplierForm\(existing = null\) \{.*?(?=  // ═══════════════════════════════════════════════════════════\n  //  D E S I G N E R S   T A B L E)', text, re.DOTALL)
if func_match:
    original_func = func_match.group(0)
    
    new_func = r'''function renderSupplierForm(existing = null) {
    pageTitle.textContent = existing ? `Edit Supplier — ${existing.name}` : 'Add New Supplier';
    const s = existing || {};

    contentRouting.innerHTML = `
    <div class="admin-form-page">
      <button class="admin-back-btn" id="admin-sup-back">← Back to Suppliers</button>

      <form id="admin-supplier-form" class="admin-form">

        <!-- ─── SECTION 1: Core Identity ─── -->
        <div class="admin-form-section">
          <div class="admin-form-section-title">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M8 14s1.5 2 4 2 4-2 4-2"/><line x1="9" y1="9" x2="9.01" y2="9"/><line x1="15" y1="9" x2="15.01" y2="9"/></svg>
            Core Identity
          </div>
          <div class="admin-form-grid cols-2">
            <div class="admin-field">
              <label>Manufacturer / Company Name <span class="req">*</span></label>
              <input type="text" name="name" value="${s.name || ''}" required placeholder="e.g. Shenzhen Precision Mold Co.">
            </div>
            <div class="admin-field">
              <label>Supplier ID</label>
              <input type="text" name="id" value="${s.id || ''}" placeholder="Auto-generated if blank">
            </div>
          </div>
          <div class="admin-form-grid cols-2">
            <div class="admin-field">
              <label>Company Name (Chinese) <span class="hint">Optional</span></label>
              <input type="text" name="nameZh" value="${s.nameZh || ''}" placeholder="e.g. 深圳市精密模具有限公司">
            </div>
            <div class="admin-field">
              <label>Supplier Tier <span class="req">*</span></label>
              <select name="segment" id="admin-form-segment" required>
                <option value="TIER 1" ${s.segment === 'TIER 1' ? 'selected' : ''}>Tier 1</option>
                <option value="TIER 2" ${s.segment === 'TIER 2' ? 'selected' : ''}>Tier 2</option>
                <option value="OEM" ${s.segment === 'OEM' ? 'selected' : ''}>OEM</option>
                <option value="CM" ${s.segment === 'CM' ? 'selected' : ''}>Contract Man. (CM)</option>
                <option value="DISTRIBUTOR" ${s.segment === 'DISTRIBUTOR' ? 'selected' : ''}>Distributor</option>
              </select>
            </div>
          </div>
          <div class="admin-form-grid cols-2">
            <div class="admin-field">
              <label>Primary Tech Group <span class="req">*</span></label>
              <select name="techGroup" id="admin-form-techgroup" required>
                <option value="">Select…</option>
                ${TECH_GROUPS.map(tg => `<option value="${tg}" ${s.techGroup === tg ? 'selected' : ''}>${tg}</option>`).join('')}
              </select>
              <input type="text" id="admin-form-new-techgroup" name="newTechGroup" style="display:none; margin-top:8px; width:100%; box-sizing:border-box;" class="admin-input-filter" placeholder="e.g. Advanced Assembly">
            </div>
            <div class="admin-field">
              <label>General Tags <span class="hint">(comma-separated)</span></label>
              <input type="text" name="tags" value="${(s.tags || []).join(', ')}" placeholder="Consumer Electronics, Medical, ISO 9001…">
            </div>
          </div>
          <div class="admin-field" style="margin-top: 10px;">
            <label>Description / Overview <span class="req">*</span></label>
            <textarea name="description" rows="3" required placeholder="Tier-1 injection molding facility with 8,000sqm workshop...">${s.description || ''}</textarea>
          </div>
        </div>

        <!-- ─── SECTION 2: Location, Geography & Contacts ─── -->
        <div class="admin-form-section">
          <div class="admin-form-section-title">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
            Location, Geography & Contacts
          </div>
          <div class="admin-form-grid cols-3">
            <div class="admin-field">
              <label>City</label>
              <input type="text" name="city" value="${s.city || ''}" placeholder="Shenzhen">
            </div>
            <div class="admin-field">
              <label>Region / Province</label>
              <input type="text" name="region" value="${s.region || ''}" placeholder="Guangdong">
            </div>
            <div class="admin-field">
              <label>Country</label>
              <input type="text" name="country" value="${s.country || ''}" placeholder="China">
            </div>
          </div>
          <div style="display: grid; grid-template-columns: 1fr 1fr 2fr 2fr; gap: 10px; margin-bottom: 10px;">
            <div class="admin-field">
              <label>Latitude</label>
              <input type="number" step="any" name="lat" value="${s.lat || ''}" placeholder="22.5431">
            </div>
            <div class="admin-field">
              <label>Longitude</label>
              <input type="number" step="any" name="lng" value="${s.lng || ''}" placeholder="114.0579">
            </div>
            <div class="admin-field">
              <label>Full Address (English)</label>
              <input type="text" name="address" value="${s.address || ''}" placeholder="Building 12, Industrial Park, Bao'an District...">
            </div>
            <div class="admin-field">
              <label>Full Address (Chinese)</label>
              <input type="text" name="addressZh" value="${s.addressZh || ''}" placeholder="深圳市宝安区工业园12栋...">
            </div>
          </div>
          
          <div style="margin: 24px 0 12px 0; font-size: 11px; font-weight: bold; color: var(--color-electric); text-transform: uppercase; border-bottom: 1px solid rgba(255,255,255,0.05); padding-bottom:4px;">Primary Contacts</div>
          
          <div class="admin-form-grid cols-4">
            <div class="admin-field">
              <label>Account Mgr Name</label>
              <input type="text" name="contactName" value="${s.contactName || ''}" placeholder="John Li">
            </div>
            <div class="admin-field">
              <label>Account Mgr Title</label>
              <input type="text" name="contactTitle" value="${s.contactTitle || ''}" placeholder="Account Manager">
            </div>
            <div class="admin-field">
              <label>Account Mgr Email</label>
              <input type="email" name="email" value="${s.email || ''}" placeholder="john@example.com">
            </div>
            <div class="admin-field">
              <label>Account Mgr Phone</label>
              <input type="text" name="phone" value="${s.phone || ''}" placeholder="+86 1380000000">
            </div>
          </div>

          <div class="admin-form-grid cols-4" style="margin-top: 8px;">
            <div class="admin-field">
              <label>GM / Legal Person</label>
              <input type="text" name="gmName" value="${s.gmName || ''}" placeholder="Wang Wei">
            </div>
            <div class="admin-field">
              <label>GM Title</label>
              <input type="text" name="gmTitle" value="${s.gmTitle || ''}" placeholder="General Manager">
            </div>
            <div class="admin-field">
              <label>GM Email</label>
              <input type="email" name="gmEmail" value="${s.gmEmail || ''}" placeholder="wang@example.com">
            </div>
            <div class="admin-field">
              <label>GM Phone</label>
              <input type="text" name="gmPhone" value="${s.gmPhone || ''}" placeholder="+86 1390000000">
            </div>
          </div>
        </div>

        <!-- ─── SECTION 3: Technical Capabilities & Certifications ─── -->
        <div class="admin-form-section">
          <div class="admin-form-section-title">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>
            Technical Capabilities & Certifications
          </div>
          
          <div style="margin: 8px 0 8px 0; font-size: 11px; font-weight: bold; color: var(--color-electric); text-transform: uppercase;">Manufacturing Stages</div>
          <div class="admin-checkbox-grid">
            ${STAGES.map(st => `
              <label class="admin-checkbox">
                <input type="checkbox" name="stages" value="${st}" ${(s.stages || []).includes(st) ? 'checked' : ''}>
                <span>${st}</span>
              </label>`).join('')}
          </div>

          <div style="margin: 20px 0 8px 0; font-size: 11px; font-weight: bold; color: var(--color-electric); text-transform: uppercase;">Specific Technologies</div>
          <div class="admin-field">
            <label>Specific Technologies <span class="hint">(comma-separated)</span></label>
            <input type="text" name="technologies" value="${(s.technologies || []).join(', ')}" placeholder="Injection Molding, PVD plating, CNC Machining, Anodizing…">
          </div>

          <div style="margin: 20px 0 8px 0; font-size: 11px; font-weight: bold; color: var(--color-electric); text-transform: uppercase;">Certifications & Metrics</div>
          <div class="admin-checkbox-grid">
            ${CERTIFICATIONS.map(c => `
              <label class="admin-checkbox">
                <input type="checkbox" name="certifications" value="${c}" ${(s.certifications || []).includes(c) ? 'checked' : ''}>
                <span>${c}</span>
              </label>`).join('')}
          </div>
          <div class="admin-form-grid cols-2" style="margin-top:16px;">
            <div class="admin-field">
              <label>Other Certifications <span class="hint">(comma-separated)</span></label>
              <input type="text" name="otherCertifications" value="${(s.otherCertifications || []).join(', ')}" placeholder="Specific Industry Standards...">
            </div>
            <div class="admin-field">
              <label>Factory Score <span class="hint">(0–100)</span></label>
              <div class="admin-range-row">
                <input type="range" name="factoryScore" min="0" max="100" value="${s.factoryScore || 50}" id="admin-sup-score-range">
                <span class="admin-range-val" id="admin-sup-score-val">${s.factoryScore || 50}</span>
              </div>
            </div>
          </div>
          
          <div class="admin-form-grid cols-3" style="margin-top:16px; padding-top:16px; border-top:1px solid rgba(255,255,255,0.05);">
            <div class="admin-field">
              <label title="Technical Capabilities (0=No, 1=Moderate, 2=Excellent)">Tech Capab. (0-2)</label>
              <input type="number" name="scoreTc" min="0" max="2" value="${s.scoreTc || 0}">
            </div>
            <div class="admin-field">
              <label title="Ownership Ethos (0=No, 1=Moderate, 2=Excellent)">Owner Ethos (0-2)</label>
              <input type="number" name="scoreOe" min="0" max="2" value="${s.scoreOe || 0}">
            </div>
            <div class="admin-field">
              <label title="Quality System (0=No, 1=Moderate, 2=Excellent)">Quality Sys. (0-2)</label>
              <input type="number" name="scoreQs" min="0" max="2" value="${s.scoreQs || 0}">
            </div>
            <div class="admin-field">
              <label title="Verified Status (0=No, 1=Partial, 2=Yes)">Verified (0-2)</label>
              <input type="number" name="scoreV" min="0" max="2" value="${s.scoreV || 0}">
            </div>
            <div class="admin-field">
              <label>Speed Score (0-10)</label>
              <input type="number" name="scoreSpeed" min="0" max="10" value="${s.scoreSpeed || 0}">
            </div>
            <div class="admin-field">
              <label>Cost Score (0-10)</label>
              <input type="number" name="scoreCost" min="0" max="10" value="${s.scoreCost || 0}">
            </div>
            <div class="admin-field">
              <label>Complexity Score (0-10)</label>
              <input type="number" name="scoreComplexity" min="0" max="10" value="${s.scoreComplexity || 0}">
            </div>
            <div class="admin-field">
              <label>Low Volume (0-10)</label>
              <input type="number" name="scoreLowVol" min="0" max="10" value="${s.scoreLowVol || 0}">
            </div>
            <div class="admin-field">
              <label>High Precision (0-10)</label>
              <input type="number" name="scorePrecision" min="0" max="10" value="${s.scorePrecision || 0}">
            </div>
          </div>
        </div>

        <!-- ─── SECTION 4: Company Legal & Operational Information ─── -->
        <div class="admin-form-section">
          <div class="admin-form-section-title">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>
            Company Legal & Operational Information
          </div>
          <div class="admin-form-grid cols-3">
            <div class="admin-field">
              <label>Business License ID</label>
              <input type="text" name="businessLicense" value="${s.businessLicense || ''}" placeholder="914440300...">
            </div>
            <div class="admin-field">
              <label>Incorporated Date / Year</label>
              <input type="text" name="yearEstablished" value="${s.yearEstablished || ''}" placeholder="2005 / 2005-08-12">
            </div>
            <div class="admin-field">
              <label>Export License ID</label>
              <input type="text" name="exportLicense" value="${s.exportLicense || ''}" placeholder="Num or 'Auto if omitted'">
            </div>
          </div>
          <div class="admin-form-grid cols-3">
            <div class="admin-field">
              <label>Total Employees</label>
              <input type="text" name="employees" value="${s.employees || ''}" placeholder="200+">
            </div>
            <div class="admin-field">
              <label>Annual Revenue</label>
              <input type="text" name="revenue" value="${s.revenue || ''}" placeholder="$10M - $50M">
            </div>
            <div class="admin-field">
              <label>Factory Area (sqm)</label>
              <input type="text" name="factoryArea" value="${s.factoryArea || ''}" placeholder="8,000 sqm">
            </div>
          </div>

          <div style="margin: 16px 0 8px 0; font-size: 11px; font-weight: bold; color: var(--color-electric); text-transform: uppercase; border-bottom: 1px solid rgba(255,255,255,0.05); padding-bottom:4px;">Employee Split by Department</div>
          <div class="admin-form-grid cols-5">
            <div class="admin-field">
              <label>Engineering / R&D</label>
              <input type="number" name="empEngineering" value="${s.empEngineering || ''}" placeholder="15">
            </div>
            <div class="admin-field">
              <label>Design</label>
              <input type="number" name="empDesign" value="${s.empDesign || ''}" placeholder="5">
            </div>
            <div class="admin-field">
              <label>Manufacturing / Assy</label>
              <input type="number" name="empManufacturing" value="${s.empManufacturing || ''}" placeholder="120">
            </div>
            <div class="admin-field">
              <label>Quality Sys (QA/QC)</label>
              <input type="number" name="empQuality" value="${s.empQuality || ''}" placeholder="15">
            </div>
            <div class="admin-field">
              <label>Sales / Admin</label>
              <input type="number" name="empOthers" value="${s.empOthers || ''}" placeholder="20">
            </div>
          </div>
        </div>

        <!-- ─── SECTION 5: Images & Media ─── -->
        <div class="admin-form-section">
          <div class="admin-form-section-title">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>
            Image Gallery & Media
          </div>
          <p class="admin-form-hint">Supply URLs directly or click Upload to send files to the Supabase asset bucket.</p>

          <div class="admin-image-category">
            <h5>Product Samples</h5>
            <div class="admin-image-url-list" id="admin-sup-img-products">
              ${(s.images?.product?.length ? s.images.product : ['']).map(url => `
                <div class="admin-img-url-row">
                  <input type="text" name="img_product" value="${url}" placeholder="https://example.com/product-1.jpg">
                  <label class="admin-action-btn" style="cursor:pointer; display:flex; align-items:center;">
                    📤 <input type="file" style="display:none;" class="admin-s3-upload" accept="image/*">
                  </label>
                  <button type="button" class="admin-remove-row-btn">✕</button>
                </div>
              `).join('')}
            </div>
            <button type="button" class="admin-add-row-btn" data-target="admin-sup-img-products" data-name="img_product">+ Add Product Image</button>
          </div>

          <div class="admin-image-category">
            <h5>Facility / Factory Floor</h5>
            <div class="admin-image-url-list" id="admin-sup-img-facility">
              ${(s.images?.facility?.length ? s.images.facility : ['']).map(url => `
                <div class="admin-img-url-row">
                  <input type="text" name="img_facility" value="${url}" placeholder="https://example.com/factory-1.jpg">
                  <label class="admin-action-btn" style="cursor:pointer; display:flex; align-items:center;">
                    📤 <input type="file" style="display:none;" class="admin-s3-upload" accept="image/*">
                  </label>
                  <button type="button" class="admin-remove-row-btn">✕</button>
                </div>
              `).join('')}
            </div>
            <button type="button" class="admin-add-row-btn" data-target="admin-sup-img-facility" data-name="img_facility">+ Add Facility Image</button>
          </div>

          <div class="admin-image-category">
            <h5>Equipment / Machinery</h5>
            <div class="admin-image-url-list" id="admin-sup-img-equipment">
              ${(s.images?.equipment?.length ? s.images.equipment : ['']).map(url => `
                <div class="admin-img-url-row">
                  <input type="text" name="img_equipment" value="${url}" placeholder="https://example.com/cnc.jpg">
                  <label class="admin-action-btn" style="cursor:pointer; display:flex; align-items:center;">
                    📤 <input type="file" style="display:none;" class="admin-s3-upload" accept="image/*">
                  </label>
                  <button type="button" class="admin-remove-row-btn">✕</button>
                </div>
              `).join('')}
            </div>
            <button type="button" class="admin-add-row-btn" data-target="admin-sup-img-equipment" data-name="img_equipment">+ Add Equipment Image</button>
          </div>
          
          <div class="admin-field" style="margin-top:24px;">
            <label>Video Walkthrough URL <span class="hint">(YouTube, Vimeo, or MP4)</span></label>
            <input type="url" name="videoWalkthrough" value="${s.videoWalkthrough || ''}" placeholder="https://www.youtube.com/watch?v=...">
          </div>

          <div class="admin-form-grid cols-2" style="margin-top:16px;">
            <div class="admin-field">
              <label>Company Logo URL</label>
              <div class="admin-img-url-row" style="margin-bottom:0;">
                <input type="url" name="logo" value="${s.logo || ''}" placeholder="https://example.com/logo.png">
                <label class="admin-action-btn" style="cursor:pointer; display:flex; align-items:center;">
                  📤 <input type="file" style="display:none;" class="admin-s3-upload" accept="image/*">
                </label>
              </div>
            </div>
            <div class="admin-field">
              <label>Banner / Cover Image URL</label>
               <div class="admin-img-url-row" style="margin-bottom:0;">
                <input type="url" name="banner" value="${s.banner || ''}" placeholder="https://example.com/factory-aerial.jpg">
                <label class="admin-action-btn" style="cursor:pointer; display:flex; align-items:center;">
                  📤 <input type="file" style="display:none;" class="admin-s3-upload" accept="image/*">
                </label>
              </div>
            </div>
          </div>
        </div>

        <!-- ─── SECTION 6: Documents & Catalogues ─── -->
        <div class="admin-form-section">
          <div class="admin-form-section-title">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>
            Documents & Catalogues
          </div>
          <p class="admin-form-hint">Links to PDF brochures, RFI documents, or portfolio zip files.</p>

          <div class="admin-image-category">
            <h5>Downloadable Documents</h5>
            <div class="admin-image-url-list" id="admin-sup-img-docs">
              ${(s.documents?.length ? s.documents : ['']).map(url => `
                <div class="admin-img-url-row">
                  <input type="text" name="doc_url" value="${url}" placeholder="https://example.com/brochure.pdf">
                  <label class="admin-action-btn" style="cursor:pointer; display:flex; align-items:center;">
                    📤 <input type="file" style="display:none;" class="admin-s3-upload" accept=".pdf,.doc,.docx,.xls,.xlsx,.zip">
                  </label>
                  <button type="button" class="admin-remove-row-btn">✕</button>
                </div>
              `).join('')}
            </div>
            <button type="button" class="admin-add-row-btn" data-target="admin-sup-img-docs" data-name="doc_url">+ Add Document URL</button>
          </div>
        </div>

        <!-- ─── SECTION 7: Internal Notes ─── -->
        <div class="admin-form-section">
          <div class="admin-form-section-title">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
            Internal Staff Notes
          </div>
          <div class="admin-field">
            <label>Private Notes <span class="hint">(not visible to users)</span></label>
            <textarea name="internalNotes" rows="3" placeholder="Payment terms: NET 30. Contact prefers WeChat.">${s.internalNotes || ''}</textarea>
          </div>
          <div class="admin-field">
            <label>Website</label>
            <input type="url" name="website" value="${s.website || s.url || ''}" placeholder="https://www.precision-mold.cn">
          </div>
        </div>

        <!-- ─── Submit ─── -->
        <div class="admin-form-actions" style="margin-top:24px;">
          <button type="button" class="btn btn-secondary" id="admin-sup-cancel">Cancel</button>
          <button type="submit" class="btn btn-primary">${existing ? 'Save Changes' : 'Create Supplier'}</button>
        </div>
      </form>
    </div>`;

    // Wire interactive bits
    wireFormDynamics();
    wireS3Uploaders();

    // Tech Group Dynamics
    const segmentSelect = document.getElementById('admin-form-segment');
    const techGroupSelect = document.getElementById('admin-form-techgroup');
    const newTechGroupInput = document.getElementById('admin-form-new-techgroup');
    
    function updateTechGroupOptions() {
      if (!segmentSelect || !techGroupSelect) return;
      const selectedTier = segmentSelect.value;
      let validGroups = [...TECH_GROUPS];
      
      if (selectedTier) {
        validGroups = [...new Set(loadedSuppliers
          .filter(sup => (sup.segment || '').toUpperCase() === selectedTier)
          .map(sup => sup.techGroup)
          .filter(Boolean)
        )].sort();
      }

      const currentSupTech = s.techGroup;
      if (currentSupTech && !validGroups.includes(currentSupTech)) {
        validGroups.push(currentSupTech);
      }
      
      const isNewMode = techGroupSelect.value === '__NEW__';
      const previouslySelected = isNewMode ? '__NEW__' : (techGroupSelect.value || currentSupTech);

      techGroupSelect.innerHTML = '<option value="">Select...</option>';
      validGroups.forEach(tg => {
        const opt = document.createElement('option');
        opt.value = tg;
        opt.textContent = tg;
        if (tg === previouslySelected) opt.selected = true;
        techGroupSelect.appendChild(opt);
      });

      const newOpt = document.createElement('option');
      newOpt.value = '__NEW__';
      newOpt.textContent = '+ Add New Tech Group...';
      newOpt.style.fontWeight = 'bold';
      if (previouslySelected === '__NEW__') newOpt.selected = true;
      techGroupSelect.appendChild(newOpt);

      handleToggleNewTech();
    }

    function handleToggleNewTech() {
      if (techGroupSelect.value === '__NEW__') {
        newTechGroupInput.style.display = 'block';
        newTechGroupInput.required = true;
        techGroupSelect.required = false;
      } else {
        newTechGroupInput.style.display = 'none';
        newTechGroupInput.required = false;
        newTechGroupInput.value = '';
        techGroupSelect.required = true;
      }
    }

    segmentSelect?.addEventListener('change', updateTechGroupOptions);
    techGroupSelect?.addEventListener('change', handleToggleNewTech);
    updateTechGroupOptions();

    document.getElementById('admin-sup-back')?.addEventListener('click', () => { pageTitle.textContent = 'Suppliers CRM Directory'; renderSuppliersTable(); });
    document.getElementById('admin-sup-cancel')?.addEventListener('click', () => { pageTitle.textContent = 'Suppliers CRM Directory'; renderSuppliersTable(); });
    document.getElementById('admin-sup-score-range')?.addEventListener('input', e => {
      document.getElementById('admin-sup-score-val').textContent = e.target.value;
    });
    
    document.getElementById('admin-supplier-form')?.addEventListener('submit', async e => {
      e.preventDefault();
      const form = e.target;
      const btn = form.querySelector('button[type="submit"]');
      const ogText = btn.textContent;
      btn.textContent = 'Saving...';
      btn.style.pointerEvents = 'none';

      const fd = new FormData(form);
      const payload = {
        id: fd.get('id') || `sup-${Date.now()}`,
        isActive: s.isActive !== undefined ? s.isActive : true,
        name: fd.get('name'),
        nameZh: fd.get('nameZh'),
        description: fd.get('description'),
        city: fd.get('city'),
        country: fd.get('country'),
        region: fd.get('region'),
        lat: parseFloat(fd.get('lat') || 0),
        lng: parseFloat(fd.get('lng') || 0),
        address: fd.get('address'),
        addressZh: fd.get('addressZh'),
        segment: fd.get('segment'),
        stages: fd.getAll('stages'),
        techGroup: fd.get('techGroup') === '__NEW__' ? fd.get('newTechGroup').trim() : fd.get('techGroup'),
        tags: fd.get('tags') ? fd.get('tags').split(',').map(ss => ss.trim()).filter(Boolean) : [],
        technologies: fd.get('technologies') ? fd.get('technologies').split(',').map(ss => ss.trim()).filter(Boolean) : [],
        certifications: fd.getAll('certifications'),
        otherCertifications: fd.get('otherCertifications') ? fd.get('otherCertifications').split(',').map(ss => ss.trim()).filter(Boolean) : [],
        factoryScore: parseInt(fd.get('factoryScore') || 0),
        scoreTc: parseInt(fd.get('scoreTc') || 0),
        scoreOe: parseInt(fd.get('scoreOe') || 0),
        scoreQs: parseInt(fd.get('scoreQs') || 0),
        scoreV: parseInt(fd.get('scoreV') || 0),
        scoreSpeed: parseInt(fd.get('scoreSpeed') || 0),
        scoreCost: parseInt(fd.get('scoreCost') || 0),
        scoreLowVol: parseInt(fd.get('scoreLowVol') || 0),
        scoreComplexity: parseInt(fd.get('scoreComplexity') || 0),
        scorePrecision: parseInt(fd.get('scorePrecision') || 0),
        contactName: fd.get('contactName'),
        contactTitle: fd.get('contactTitle'),
        email: fd.get('email'),
        phone: fd.get('phone'),
        gmName: fd.get('gmName'),
        gmTitle: fd.get('gmTitle'),
        gmEmail: fd.get('gmEmail'),
        gmPhone: fd.get('gmPhone'),
        businessLicense: fd.get('businessLicense'),
        exportLicense: fd.get('exportLicense'),
        employees: fd.get('employees'),
        empEngineering: parseInt(fd.get('empEngineering') || 0),
        empDesign: parseInt(fd.get('empDesign') || 0),
        empManufacturing: parseInt(fd.get('empManufacturing') || 0),
        empQuality: parseInt(fd.get('empQuality') || 0),
        empOthers: parseInt(fd.get('empOthers') || 0),
        revenue: fd.get('revenue'),
        yearEstablished: fd.get('yearEstablished'),
        factoryArea: fd.get('factoryArea'),
        website: fd.get('website'),
        url: fd.get('website'),
        logo: fd.get('logo'),
        banner: fd.get('banner'),
        internalNotes: fd.get('internalNotes'),
        videoWalkthrough: fd.get('videoWalkthrough'),
        documents: fd.getAll('doc_url').filter(Boolean),
        images: {
          product: fd.getAll('img_product').filter(Boolean),
          facility: fd.getAll('img_facility').filter(Boolean),
          equipment: fd.getAll('img_equipment').filter(Boolean)
        }
      };

      try {
        const dbPayload = {
          id: payload.id,
          name: payload.name,
          segment: payload.segment,
          tech_group: payload.techGroup || '',
          data: (() => {
             const clone = { ...payload };
             delete clone.id; delete clone.name; delete clone.segment; delete clone.techGroup;
             return clone;
          })()
        };
        const { error } = await supabase.from('suppliers').upsert(dbPayload);
        if (error) throw error;
        
        btn.textContent = '✓ Saved!';
        btn.style.background = '#10b981';
        
        // Reload data and redirect after a short delay
        await loadCRMData();
        setTimeout(() => {
          pageTitle.textContent = 'Suppliers CRM Directory';
          renderSuppliersTable();
        }, 1000);
      } catch(err) {
        console.error(err);
        btn.textContent = '❌ Error';
        btn.style.background = '#ef4444';
        setTimeout(() => {
          btn.textContent = ogText;
          btn.style.background = '';
          btn.style.pointerEvents = '';
        }, 2000);
      }
    });
  }
}'''
    text = text.replace(original_func, new_func)

func_utilities_match = re.search(r'function wireRemoveButtons\(container\) \{.*?(?=  // ═══════════════════════════════════════════════════════════\n  //  W E B S I T E   C O N T E N T   M A N A G E R)', text, re.DOTALL)
if func_utilities_match:
    old_utils = func_utilities_match.group(0)
    new_utils = old_utils + '''
  function wireS3Uploaders() {
    document.querySelectorAll('.admin-s3-upload').forEach(input => {
      // Avoid duplicate bindings
      const _new = input.cloneNode(true);
      input.parentNode.replaceChild(_new, input);
      _new.addEventListener('change', async (e) => {
        const file = e.target.files[0];
        if (!file) return;
        
        // Find adjacent text input
        const row = _new.closest('.admin-img-url-row');
        const textInput = row.querySelector('input[type="text"], input[type="url"]');
        if (!textInput) return;
        
        const ogLabel = _new.parentElement.innerHTML;
        _new.parentElement.innerHTML = '⏳...';
        
        try {
          const ext = file.name.split('.').pop();
          const fileName = `admin_${Date.now()}_${Math.random().toString(36).substring(2, 8)}.${ext}`;
          
          const { data, error } = await supabase.storage.from('supplier-assets').upload(fileName, file);
          if (error) throw error;
          
          const { data: publicData } = supabase.storage.from('supplier-assets').getPublicUrl(fileName);
          textInput.value = publicData.publicUrl;
          
          _new.parentElement.innerHTML = '✅ Add';
        } catch(err) {
          console.error('Upload Error:', err);
          alert('Upload failed: ' + err.message);
          _new.parentElement.innerHTML = '❌ Failed';
        }
        
        setTimeout(() => {
            _new.parentElement.innerHTML = `📤 <input type="file" style="display:none;" class="admin-s3-upload" accept="${_new.accept}">`;
            wireS3Uploaders();
        }, 2000);
      });
    });
  }
'''
    text = text.replace(old_utils, new_utils)

add_row_repl = '''row.innerHTML = `<input type="text" name="${btn.dataset.name}" placeholder="https://example.com/image.jpg">
          <label class="admin-action-btn" style="cursor:pointer; display:flex; align-items:center;">
            📤 <input type="file" style="display:none;" class="admin-s3-upload" accept="image/*,.pdf,.zip">
          </label>
          <button type="button" class="admin-remove-row-btn">✕</button>`;'''
text = re.sub(r'row\.innerHTML = `<input type="text" name="\$\{btn\.dataset\.name\}" placeholder="https://example\.com/image\.jpg"><button type="button" class="admin-remove-row-btn">✕</button>`;', add_row_repl.replace('$', '\$'), text)

with open('c:/Users/sebas/OneDrive/Desktop/DUMP/Antigravity Projects/002_Pearl River Delta PRD/webapp/src/js/admin.js', 'w', encoding='utf-8') as f:
    f.write(text)

import { loadPricingConfig, getActivePricingConfig } from './utils/pricing-loader.js';
import { calculateQuote } from './components/quote-engine.js';
import { supabase } from './utils/supabaseClient.js';

let PRICING_CONFIG = null;

let chartInstance = null;
let currentTechKey = 'cnc';
let currentMaterialKey = 'al_6061_t6';
let currentQty = 100;
let simXVariable = 'volume';

// ═══════════════════════════════════════════════════════════
// SECTION BUILDER — collapsible accordion
// ═══════════════════════════════════════════════════════════
function section(id, title, icon, color, innerHtml, open = false) {
  return `
    <div class="pe-section" id="pe-section-${id}" style="border: 1px solid ${color}22; border-radius: 10px; overflow: hidden;">
      <button class="pe-section__toggle" data-section="${id}"
        style="width:100%; display:flex; justify-content:space-between; align-items:center;
               padding: 13px 16px; background: ${color}0a; border: none; cursor: pointer; color: ${color};">
        <span style="font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; display:flex; align-items:center; gap:8px;">
          <span style="font-size:14px;">${icon}</span> ${title}
        </span>
        <span class="pe-chevron" style="transition: transform 0.2s; font-size: 13px;">${open ? '▾' : '▸'}</span>
      </button>
      <div class="pe-section__body" style="padding: 16px; display: ${open ? 'flex' : 'none'}; flex-direction: column; gap: 14px;">
        ${innerHtml}
      </div>
    </div>
  `;
}

// Sub-group header inside a section
function subHeader(label, color = '#94a3b8') {
  return `<div style="font-size:10px; font-weight:700; text-transform:uppercase; letter-spacing:0.8px; color:${color}; padding:6px 0 2px; border-bottom:1px solid ${color}22;">${label}</div>`;
}

// ═══════════════════════════════════════════════════════════
// MAIN RENDER
// ═══════════════════════════════════════════════════════════
export function renderPricingConfigurator(container) {
  PRICING_CONFIG = getActivePricingConfig();
  const G = PRICING_CONFIG.globalSettings;

  container.innerHTML = `
    <div class="pricing-admin-wrap" style="display: flex; gap: 24px; padding: 24px;">

      <!-- ═══ SIDEBAR ═══ -->
      <div class="pricing-sidebar glass-panel"
           style="width: 400px; padding: 0; display: flex; flex-direction: column; gap: 0;
                  overflow-y: auto; max-height: calc(100vh - 120px); border-radius: 12px;">

        <div style="padding: 20px 18px 14px; border-bottom: 1px solid var(--color-slate-700);">
          <h3 style="margin: 0; font-size: 15px; color: var(--color-white);">Pricing Engine</h3>
          <p style="margin: 4px 0 0; font-size: 11px; color: var(--color-steel-400);">Adjust variables → chart updates live → export JSON</p>
        </div>

        <div style="padding: 14px; display: flex; flex-direction: column; gap: 10px;">

        <!-- ═══ 1. SIMULATION SETUP ═══ -->
        ${section('sim-setup', 'Simulation Setup', '⚙', '#8b5cf6', `
          <div class="input-group" style="margin-bottom:2px;">
            <label style="font-size:11px; color:#94a3b8;">Technology</label>
            <select id="sim-tech-select" class="form-select">
              ${Object.keys(PRICING_CONFIG.technologies).map(t =>
                `<option value="${t}">${PRICING_CONFIG.technologies[t].label}</option>`
              ).join('')}
            </select>
          </div>
          <div class="input-group" style="margin-bottom:6px;">
            <label style="font-size:11px; color:#94a3b8;">Material</label>
            <select id="sim-mat-select" class="form-select"></select>
          </div>

          ${subHeader('Chart X-Axis', '#a78bfa')}
          <div style="display: flex; gap: 6px;">
            <button class="btn btn-secondary sim-x-btn active" data-x="volume" style="flex:1; font-size:11px; padding:6px;">Volume (cm³)</button>
            <button class="btn btn-secondary sim-x-btn" data-x="quantity" style="flex:1; font-size:11px; padding:6px;">Quantity (pcs)</button>
          </div>
          <div id="sim-qty-group" style="display:none;">
            <label style="font-size:10px; color:#94a3b8;">Fixed Quantity</label>
            <input type="range" id="sim-qty-range" min="1" max="50000" step="10" value="100">
            <div style="display:flex; justify-content:space-between; font-size:10px; color:var(--color-steel-300);">
              <span>1</span>
              <span id="sim-qty-val" style="font-weight:600; color:var(--color-brand-light);">100 pcs</span>
              <span>50k</span>
            </div>
          </div>
          <div id="sim-vol-group">
            <label style="font-size:10px; color:#94a3b8;">Fixed Volume</label>
            <input type="range" id="sim-vol-range" min="5" max="5000" step="5" value="100">
            <div style="display:flex; justify-content:space-between; font-size:10px; color:var(--color-steel-300);">
              <span>5 cm³</span>
              <span id="sim-vol-val" style="font-weight:600; color:var(--color-brand-light);">100 cm³</span>
              <span>5000</span>
            </div>
          </div>
        `, true)}

        <!-- ═══ 2. MARGINS & PRICING RULES ═══ -->
        ${section('pricing-rules', 'Margins & Pricing Rules', '💲', '#f59e0b', `
          <div id="pr-global-sliders"></div>
          <div id="pr-volume-discounts"></div>
          <div id="pr-multipliers"></div>
        `, true)}

        <!-- ═══ 3. MANUFACTURING COSTS ═══ -->
        ${section('mfg-costs', 'Manufacturing Costs', '🏭', '#22c55e', `
          <div id="mc-sliders"></div>
        `, true)}

        <button id="sim-publish-btn" class="btn btn-primary" style="margin-top:12px; width:100%; background: var(--dk-accent); border-color: var(--dk-accent);">
          🚀 Publish to Production
        </button>

        <button id="sim-export-btn" class="btn btn-secondary" style="margin-top:8px; width:100%; font-size: 11px;">
          ↓ Download Backup (JSON)
        </button>

        </div>
      </div>

      <!-- ═══ MAIN GRAPH AREA ═══ -->
      <div class="pricing-main" style="flex: 1; display: flex; flex-direction: column; gap: 24px;">
        <div class="glass-panel" style="padding: 24px; position: relative;">
          <h3 style="margin-top: 0; font-size: 16px; color: var(--color-white); margin-bottom: 24px;">
            Unit Price / Capital Expense Curve
          </h3>
          <div style="height: 500px; width: 100%;">
            <canvas id="pricingChart"></canvas>
          </div>
        </div>

        <div class="pricing-stats glass-panel" style="padding: 24px; display: grid; grid-template-columns: repeat(5, 1fr); gap: 16px;">
          <div class="stat-box">
            <div style="font-size:11px; color:var(--color-steel-300); text-transform:uppercase;">Material Cost</div>
            <div id="stat-mat" style="font-size:20px; font-weight:600; color:var(--color-white);">--</div>
          </div>
          <div class="stat-box">
            <div style="font-size:11px; color:var(--color-steel-300); text-transform:uppercase;">Processing Cost</div>
            <div id="stat-proc" style="font-size:20px; font-weight:600; color:var(--color-white);">--</div>
          </div>
          <div class="stat-box">
            <div style="font-size:11px; color:var(--color-steel-300); text-transform:uppercase;">Amortized Setup</div>
            <div id="stat-setup" style="font-size:20px; font-weight:600; color:var(--color-white);">--</div>
          </div>
          <div class="stat-box">
            <div style="font-size:11px; color:var(--color-steel-300); text-transform:uppercase;">Tooling CAPEX</div>
            <div id="stat-tool" style="font-size:20px; font-weight:600; color:#10b981;">--</div>
          </div>
          <div class="stat-box">
            <div style="font-size:11px; color:var(--color-steel-300); text-transform:uppercase;">Final Unit Price</div>
            <div id="stat-unit" style="font-size:20px; font-weight:600; color:#3b82f6;">--</div>
          </div>
        </div>
      </div>
    </div>
  `;

  // ═══════════════════════════════════════════════════════
  // ACCORDION TOGGLE
  // ═══════════════════════════════════════════════════════
  container.querySelectorAll('.pe-section__toggle').forEach(btn => {
    btn.addEventListener('click', () => {
      const body = btn.nextElementSibling;
      const chevron = btn.querySelector('.pe-chevron');
      const isOpen = body.style.display !== 'none';
      body.style.display = isOpen ? 'none' : 'flex';
      chevron.textContent = isOpen ? '▸' : '▾';
    });
  });

  // ═══════════════════════════════════════════════════════
  // DOM REFS
  // ═══════════════════════════════════════════════════════
  const techSelect = document.getElementById('sim-tech-select');
  const matSelect = document.getElementById('sim-mat-select');
  const exportBtn = document.getElementById('sim-export-btn');
  const publishBtn = document.getElementById('sim-publish-btn');
  const qtyRange = document.getElementById('sim-qty-range');
  const qtyVal = document.getElementById('sim-qty-val');
  const volRange = document.getElementById('sim-vol-range');
  const volVal = document.getElementById('sim-vol-val');
  const xBtns = container.querySelectorAll('.sim-x-btn');

  // ═══════════════════════════════════════════════════════
  // SLIDER FACTORY
  // ═══════════════════════════════════════════════════════
  function makeSlider(parent, label, obj, key, min, max, step, opts = {}) {
    const val = obj[key] ?? min;
    const color = opts.color || '#cbd5e1';
    const bg = opts.bg || 'rgba(255,255,255,0.02)';
    const border = opts.border || 'var(--color-slate-700)';
    const unit = opts.unit || '';
    const row = document.createElement('div');
    row.style.cssText = `background:${bg}; padding:8px 12px; border-radius:6px; border:1px solid ${border};`;
    row.innerHTML = `
      <div style="display:flex; justify-content:space-between; margin-bottom:4px;">
        <label style="font-size:10px; color:${color}; font-family:monospace;">${label}</label>
        <span class="pe-slider-val" style="font-size:11px; color:${color}; font-weight:bold;">${typeof val === 'number' ? (step < 1 ? val.toFixed(2) : val) : val}${unit}</span>
      </div>
      <input type="range" class="form-range" min="${min}" max="${max}" step="${step}" value="${val}">
    `;
    parent.appendChild(row);

    const input = row.querySelector('input');
    const display = row.querySelector('.pe-slider-val');
    input.addEventListener('input', () => {
      const v = parseFloat(input.value);
      display.textContent = (step < 1 ? v.toFixed(2) : v) + unit;
      obj[key] = v;
      updateChart();
    });
    return { row, input, display };
  }

  // ═══════════════════════════════════════════════════════
  // SECTION 1 — SIMULATION SETUP (Tech + Material + Axis)
  // ═══════════════════════════════════════════════════════
  function loadMaterials() {
    matSelect.innerHTML = '';
    const tech = PRICING_CONFIG.technologies[currentTechKey];
    if (tech?.materials) {
      Object.entries(tech.materials).forEach(([key, mat]) => {
        matSelect.innerHTML += `<option value="${key}">${mat.label}</option>`;
      });
      currentMaterialKey = Object.keys(tech.materials)[0];
    }
  }

  techSelect.addEventListener('change', (e) => {
    currentTechKey = e.target.value;
    loadMaterials();
    renderMfgCosts();
    updateChart();
  });

  matSelect.addEventListener('change', (e) => {
    currentMaterialKey = e.target.value;
    renderMfgCosts();
    updateChart();
  });

  xBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      xBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      simXVariable = btn.dataset.x;
      document.getElementById('sim-qty-group').style.display = (simXVariable === 'volume') ? 'block' : 'none';
      document.getElementById('sim-vol-group').style.display = (simXVariable === 'quantity') ? 'block' : 'none';
      updateChart();
    });
  });

  qtyRange.addEventListener('input', (e) => {
    qtyVal.textContent = `${parseInt(e.target.value).toLocaleString()} pcs`;
    currentQty = parseInt(e.target.value);
    updateChart();
  });

  volRange.addEventListener('input', (e) => {
    volVal.textContent = `${parseInt(e.target.value).toLocaleString()} cm³`;
    updateChart();
  });

  // ═══════════════════════════════════════════════════════
  // SECTION 2 — MARGINS & PRICING RULES
  //   Sub-groups: Global, Volume Discounts, Multipliers
  // ═══════════════════════════════════════════════════════
  function renderPricingRules() {
    const sty = { color: '#fbbf24', bg: 'rgba(251,191,36,0.04)', border: 'rgba(251,191,36,0.15)' };

    // ── 2A: Global ──
    const gContainer = document.getElementById('pr-global-sliders');
    gContainer.innerHTML = '';
    gContainer.insertAdjacentHTML('beforeend', subHeader('Margin & Add-on Fees', '#fbbf24'));

    makeSlider(gContainer, 'Global Margin', PRICING_CONFIG, 'globalMarginMultiplier',
      1.0, 2.5, 0.01, { ...sty, unit: '×' });

    // Compact inline row for add-on fees instead of 4 separate sliders
    const feesRow = document.createElement('div');
    feesRow.style.cssText = `display:grid; grid-template-columns:1fr 1fr; gap:6px;`;
    feesRow.innerHTML = `
      <div style="background:${sty.bg}; padding:8px 10px; border-radius:6px; border:1px solid ${sty.border};">
        <label style="font-size:9px; color:${sty.color}; display:block; margin-bottom:4px;">DFM Fee</label>
        <div style="display:flex; align-items:center; gap:4px;">
          <span style="font-size:10px; color:#94a3b8;">$</span>
          <input type="number" id="fee-dfm" value="${G.dfmFee}" min="0" max="500" step="5"
            style="width:100%; padding:4px 6px; font-size:12px; background:rgba(0,0,0,0.25); border:1px solid ${sty.border};
                   color:${sty.color}; border-radius:4px; font-family:monospace;">
        </div>
      </div>
      <div style="background:${sty.bg}; padding:8px 10px; border-radius:6px; border:1px solid ${sty.border};">
        <label style="font-size:9px; color:${sty.color}; display:block; margin-bottom:4px;">Color Match</label>
        <div style="display:flex; align-items:center; gap:4px;">
          <span style="font-size:10px; color:#94a3b8;">$</span>
          <input type="number" id="fee-color" value="${G.colorMatchingFee}" min="0" max="200" step="5"
            style="width:100%; padding:4px 6px; font-size:12px; background:rgba(0,0,0,0.25); border:1px solid ${sty.border};
                   color:${sty.color}; border-radius:4px; font-family:monospace;">
        </div>
      </div>
      <div style="background:${sty.bg}; padding:8px 10px; border-radius:6px; border:1px solid ${sty.border};">
        <label style="font-size:9px; color:${sty.color}; display:block; margin-bottom:4px;">Threads Fee</label>
        <div style="display:flex; align-items:center; gap:4px;">
          <span style="font-size:10px; color:#94a3b8;">$</span>
          <input type="number" id="fee-threads" value="${G.threadsFee}" min="0" max="200" step="5"
            style="width:100%; padding:4px 6px; font-size:12px; background:rgba(0,0,0,0.25); border:1px solid ${sty.border};
                   color:${sty.color}; border-radius:4px; font-family:monospace;">
        </div>
      </div>
      <div style="background:${sty.bg}; padding:8px 10px; border-radius:6px; border:1px solid ${sty.border};">
        <label style="font-size:9px; color:${sty.color}; display:block; margin-bottom:4px;">Custom Add</label>
        <div style="display:flex; align-items:center; gap:4px;">
          <input type="number" id="fee-custom" value="${G.customComplexityAdder}" min="1" max="2" step="0.01"
            style="width:100%; padding:4px 6px; font-size:12px; background:rgba(0,0,0,0.25); border:1px solid ${sty.border};
                   color:${sty.color}; border-radius:4px; font-family:monospace;">
          <span style="font-size:10px; color:#94a3b8;">×</span>
        </div>
      </div>
    `;
    gContainer.appendChild(feesRow);

    // Attach fee listeners
    document.getElementById('fee-dfm').addEventListener('change', e => { G.dfmFee = parseFloat(e.target.value); updateChart(); });
    document.getElementById('fee-color').addEventListener('change', e => { G.colorMatchingFee = parseFloat(e.target.value); updateChart(); });
    document.getElementById('fee-threads').addEventListener('change', e => { G.threadsFee = parseFloat(e.target.value); updateChart(); });
    document.getElementById('fee-custom').addEventListener('change', e => { G.customComplexityAdder = parseFloat(e.target.value); updateChart(); });

    // ── 2B: Volume Discount Curve ──
    const vdContainer = document.getElementById('pr-volume-discounts');
    vdContainer.innerHTML = '';
    vdContainer.insertAdjacentHTML('beforeend', subHeader('Volume Discount Curve', '#f87171'));
    vdContainer.insertAdjacentHTML('beforeend', `<p style="font-size:10px; color:#94a3b8; margin:0;">Multiplier at each qty breakpoint. Lower = bigger discount.</p>`);

    const vdTable = document.createElement('div');
    vdTable.id = 'vd-table';
    vdTable.style.cssText = 'display:flex; flex-direction:column; gap:5px;';
    vdContainer.appendChild(vdTable);

    const addBtn = document.createElement('button');
    addBtn.className = 'btn btn-secondary';
    addBtn.style.cssText = 'font-size:10px; padding:5px 10px; margin-top:4px; align-self:flex-start;';
    addBtn.textContent = '+ Add Breakpoint';
    addBtn.addEventListener('click', () => {
      const last = G.quantityDiscountBreaks[G.quantityDiscountBreaks.length - 1];
      G.quantityDiscountBreaks.push({
        minQty: (last?.minQty || 1000) * 2,
        multiplier: parseFloat(Math.max(0.2, (last?.multiplier || 0.7) - 0.08).toFixed(2))
      });
      renderVolumeDiscountRows();
      updateChart();
    });
    vdContainer.appendChild(addBtn);

    renderVolumeDiscountRows();

    // ── 2C: Multiplier Overrides ──
    const mContainer = document.getElementById('pr-multipliers');
    mContainer.innerHTML = '';
    const mSty = { color: '#67e8f9', bg: 'rgba(6,182,212,0.04)', border: 'rgba(6,182,212,0.12)' };

    // Lead time — compact inline grid
    mContainer.insertAdjacentHTML('beforeend', subHeader('Lead Time Premiums', '#22d3ee'));
    const ltGrid = document.createElement('div');
    ltGrid.style.cssText = 'display:grid; grid-template-columns:1fr 1fr; gap:5px;';
    ['economy', 'standard', 'express', 'rush'].forEach(k => {
      makeSlider(ltGrid, k.charAt(0).toUpperCase() + k.slice(1), G.leadTimeMultiplier, k,
        0.5, 3.0, 0.05, { ...mSty, unit: '×' });
    });
    mContainer.appendChild(ltGrid);

    // Tolerance — compact inline grid
    mContainer.insertAdjacentHTML('beforeend', subHeader('Tolerance Premiums', '#22d3ee'));
    const tolGrid = document.createElement('div');
    tolGrid.style.cssText = 'display:grid; grid-template-columns:1fr 1fr 1fr; gap:5px;';
    ['standard', 'precision', 'tight'].forEach(k => {
      makeSlider(tolGrid, k.charAt(0).toUpperCase() + k.slice(1), G.toleranceMultiplier, k,
        1.0, 3.0, 0.05, { ...mSty, unit: '×' });
    });
    mContainer.appendChild(tolGrid);

    // Complexity — compact inline grid
    mContainer.insertAdjacentHTML('beforeend', subHeader('Geometry Complexity', '#22d3ee'));
    const cxGrid = document.createElement('div');
    cxGrid.style.cssText = 'display:grid; grid-template-columns:1fr 1fr; gap:5px;';
    G.complexityMultiplier.forEach(tier => {
      const box = document.createElement('div');
      box.style.cssText = `background:${mSty.bg}; padding:8px 10px; border-radius:6px; border:1px solid ${mSty.border};`;
      box.innerHTML = `
        <div style="display:flex; justify-content:space-between; margin-bottom:4px;">
          <span style="font-size:9px; color:#94a3b8;">≤ ${tier.maxTriangles.toLocaleString()} tri</span>
          <span class="cx-val" style="font-size:11px; color:${mSty.color}; font-weight:bold;">${tier.multiplier.toFixed(2)}×</span>
        </div>
        <input type="range" class="form-range" min="1.0" max="2.0" step="0.01" value="${tier.multiplier}">
      `;
      cxGrid.appendChild(box);
      const slider = box.querySelector('input');
      const valSpan = box.querySelector('.cx-val');
      slider.addEventListener('input', () => {
        tier.multiplier = parseFloat(slider.value);
        valSpan.textContent = tier.multiplier.toFixed(2) + '×';
        updateChart();
      });
    });
    mContainer.appendChild(cxGrid);
  }

  // Volume discount rows renderer
  function renderVolumeDiscountRows() {
    const vdTable = document.getElementById('vd-table');
    vdTable.innerHTML = '';
    const breaks = G.quantityDiscountBreaks;

    breaks.forEach((brk, idx) => {
      const row = document.createElement('div');
      row.style.cssText = 'background:rgba(239,68,68,0.03); padding:6px 10px; border-radius:6px; border:1px solid rgba(239,68,68,0.12); display:flex; align-items:center; gap:6px;';
      const pct = Math.round((1 - brk.multiplier) * 100);
      row.innerHTML = `
        <span style="font-size:10px; color:#fca5a5; font-family:monospace; min-width:16px;">≥</span>
        <input type="number" class="vd-qty" value="${brk.minQty}" min="1" max="100000"
          style="width:60px; padding:3px 5px; font-size:11px; background:rgba(0,0,0,0.25); border:1px solid rgba(239,68,68,0.15);
                 color:#fca5a5; border-radius:4px; font-family:monospace;">
        <input type="range" class="form-range vd-mult" min="0.20" max="1.0" step="0.01" value="${brk.multiplier}" style="flex:1;">
        <span class="vd-pct" style="font-size:10px; color:#f87171; font-weight:600; min-width:42px; text-align:right;">${pct}% off</span>
        ${idx > 0 ? `<button class="vd-rm" style="background:none; border:none; color:#f8717180; cursor:pointer; font-size:13px; padding:0 2px;" title="Remove">×</button>` : '<span style="width:16px;"></span>'}
      `;
      vdTable.appendChild(row);

      const qtyInput = row.querySelector('.vd-qty');
      const multSlider = row.querySelector('.vd-mult');
      const pctLabel = row.querySelector('.vd-pct');
      const rmBtn = row.querySelector('.vd-rm');

      qtyInput.addEventListener('change', () => {
        brk.minQty = parseInt(qtyInput.value) || 1;
        G.quantityDiscountBreaks.sort((a, b) => a.minQty - b.minQty);
        renderVolumeDiscountRows();
        updateChart();
      });

      multSlider.addEventListener('input', () => {
        brk.multiplier = parseFloat(multSlider.value);
        pctLabel.textContent = `${Math.round((1 - brk.multiplier) * 100)}% off`;
        updateChart();
      });

      if (rmBtn) {
        rmBtn.addEventListener('click', () => {
          G.quantityDiscountBreaks.splice(idx, 1);
          renderVolumeDiscountRows();
          updateChart();
        });
      }
    });
  }

  // ═══════════════════════════════════════════════════════
  // SECTION 3 — MANUFACTURING COSTS
  //   Sub-groups: Process Rates, Setup, Material, Tooling
  // ═══════════════════════════════════════════════════════
  function renderMfgCosts() {
    const mc = document.getElementById('mc-sliders');
    mc.innerHTML = '';
    const tech = PRICING_CONFIG.technologies[currentTechKey];
    if (!tech) return;

    const gSty = { color: '#86efac', bg: 'rgba(34,197,94,0.04)', border: 'rgba(34,197,94,0.15)' };

    // ── 3A: Process Rates ──
    mc.insertAdjacentHTML('beforeend', subHeader('Process Rates', '#4ade80'));
    const rateGrid = document.createElement('div');
    rateGrid.style.cssText = 'display:grid; grid-template-columns:1fr 1fr; gap:5px;';

    makeSlider(rateGrid, 'Machine Rate ($/hr)', tech, 'machineRateUsdPerHour',
      5, 250, 1, { ...gSty, unit: '' });
    makeSlider(rateGrid, 'Material Price ($/kg)', tech, 'baselineMaterialPriceKg',
      0.5, 100, 0.5, { ...gSty, unit: '' });
    makeSlider(rateGrid, 'Scrap Multiplier', tech, 'scrapWasteMultiplier',
      1.0, 5.0, 0.05, { ...gSty, unit: '×' });

    // Technology-specific rate (only one applicable per type)
    const mfgType = tech.manufacturingType;
    if (mfgType === 'subtractive' && tech.baselineRemovalRateCm3PerMin !== undefined) {
      makeSlider(rateGrid, 'Removal Rate (cm³/min)', tech, 'baselineRemovalRateCm3PerMin',
        1, 100, 1, { ...gSty, unit: '' });
    }
    if (mfgType === 'formative') {
      if (tech.baseCycleTimeSecs !== undefined)
        makeSlider(rateGrid, 'Cycle Time (sec)', tech, 'baseCycleTimeSecs', 1, 600, 1, { ...gSty, unit: 's' });
      if (tech.volumetricCoolingSecsPerCm3 !== undefined)
        makeSlider(rateGrid, 'Cooling (sec/cm³)', tech, 'volumetricCoolingSecsPerCm3', 0.05, 5.0, 0.05, { ...gSty, unit: '' });
    }
    if (mfgType === 'additive' && tech.baseExtrusionRateCm3PerHour !== undefined) {
      makeSlider(rateGrid, 'Build Rate (cm³/hr)', tech, 'baseExtrusionRateCm3PerHour', 1, 100, 1, { ...gSty, unit: '' });
    }
    if (mfgType === 'sheet' && tech.baseCutRateCm2PerMin !== undefined) {
      makeSlider(rateGrid, 'Cut Rate (cm²/min)', tech, 'baseCutRateCm2PerMin', 5, 200, 5, { ...gSty, unit: '' });
    }
    mc.appendChild(rateGrid);

    // ── 3B: Setup Fees ──
    if (tech.setupConfig) {
      mc.insertAdjacentHTML('beforeend', subHeader('Setup Fees', '#4ade80'));
      makeSlider(mc, 'Setup Base Fee ($)', tech.setupConfig, 'baseFee',
        0, 500, 5, { ...gSty, unit: '' });

      if (tech.setupConfig.sizeTiers) {
        const tierGrid = document.createElement('div');
        tierGrid.style.cssText = 'display:grid; grid-template-columns: 1fr 1fr; gap:5px;';
        tech.setupConfig.sizeTiers.forEach(tier => {
          const box = document.createElement('div');
          box.style.cssText = `background:${gSty.bg}; padding:7px 10px; border-radius:6px; border:1px solid ${gSty.border}; display:flex; align-items:center; gap:4px;`;
          box.innerHTML = `
            <span style="font-size:9px; color:#94a3b8;">≤</span>
            <input type="number" value="${tier.maxVolumeCm3}" min="1" max="999999"
              style="width:55px; padding:2px 4px; font-size:10px; background:rgba(0,0,0,0.25); border:1px solid ${gSty.border};
                     color:${gSty.color}; border-radius:3px; font-family:monospace;">
            <span style="font-size:9px; color:#94a3b8;">cm³ +$</span>
            <input type="number" value="${tier.adder}" min="0" max="1000" step="5"
              style="width:45px; padding:2px 4px; font-size:10px; background:rgba(0,0,0,0.25); border:1px solid ${gSty.border};
                     color:${gSty.color}; border-radius:3px; font-family:monospace; text-align:right;">
          `;
          tierGrid.appendChild(box);
          const [volIn, adderIn] = box.querySelectorAll('input');
          volIn.addEventListener('change', () => { tier.maxVolumeCm3 = parseInt(volIn.value) || 100; updateChart(); });
          adderIn.addEventListener('change', () => { tier.adder = parseInt(adderIn.value) || 0; updateChart(); });
        });
        mc.appendChild(tierGrid);
      }
    }

    // ── 3C: Selected Material ──
    const mat = tech.materials?.[currentMaterialKey];
    if (mat) {
      mc.insertAdjacentHTML('beforeend', subHeader(`Material: ${mat.label}`, '#60a5fa'));
      const matSty = { color: '#93c5fd', bg: 'rgba(59,130,246,0.04)', border: 'rgba(59,130,246,0.15)' };
      const matGrid = document.createElement('div');
      matGrid.style.cssText = 'display:grid; grid-template-columns:1fr 1fr; gap:5px;';
      makeSlider(matGrid, 'Cost Multiplier', mat, 'rawCostMultiplier', 0.1, 15.0, 0.05, { ...matSty, unit: '×' });
      makeSlider(matGrid, 'Difficulty Mult.', mat, 'processingDifficultyMultiplier', 0.1, 15.0, 0.05, { ...matSty, unit: '×' });
      if (mat.density !== undefined) {
        makeSlider(matGrid, 'Density (g/cm³)', mat, 'density', 0.5, 20.0, 0.01, { ...matSty, unit: '' });
      }
      mc.appendChild(matGrid);
    }

    // ── 3D: Tooling ──
    if (tech.hasTooling && tech.tooling) {
      mc.insertAdjacentHTML('beforeend', subHeader('Tooling', '#34d399'));
      const tSty = { color: '#6ee7b7', bg: 'rgba(16,185,129,0.04)', border: 'rgba(16,185,129,0.15)' };
      const toolGrid = document.createElement('div');
      toolGrid.style.cssText = 'display:grid; grid-template-columns:1fr 1fr; gap:5px;';

      makeSlider(toolGrid, 'Base Cost ($)', tech.tooling, 'baseCost', 100, 30000, 100, { ...tSty, unit: '' });
      makeSlider(toolGrid, 'SA Cost ($/cm²)', tech.tooling, 'costPerCm2SurfaceArea', 0.1, 5.0, 0.05, { ...tSty, unit: '' });

      if (tech.tooling.tierMultipliers) {
        Object.keys(tech.tooling.tierMultipliers).forEach(tier => {
          makeSlider(toolGrid, `${tier.replace(/_/g, ' ')}`, tech.tooling.tierMultipliers, tier,
            0.1, 5.0, 0.05, { ...tSty, unit: '×' });
        });
      }
      if (tech.tooling.cavityMultiplier) {
        Object.keys(tech.tooling.cavityMultiplier).forEach(cavKey => {
          const cavProxy = { val: tech.tooling.cavityMultiplier[cavKey] };
          const s = makeSlider(toolGrid, `${cavKey}-cav mult`, cavProxy, 'val',
            0.5, 5.0, 0.1, { ...tSty, unit: '×' });
          s.input.addEventListener('input', () => {
            tech.tooling.cavityMultiplier[cavKey] = parseFloat(s.input.value);
          });
        });
      }
      mc.appendChild(toolGrid);
    }
  }

  // ═══════════════════════════════════════════════════════
  // CHART INIT
  // ═══════════════════════════════════════════════════════
  const ctx = document.getElementById('pricingChart').getContext('2d');
  chartInstance = new Chart(ctx, {
    type: 'line',
    data: { labels: [], datasets: [] },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      interaction: { mode: 'index', intersect: false },
      plugins: {
        legend: { labels: { color: '#94a3b8', font: { size: 11 } } },
        tooltip: {
          mode: 'index', intersect: false,
          callbacks: { label: c => c.dataset.label + ': $' + c.parsed.y.toFixed(2) }
        }
      },
      scales: {
        x: { grid: { color: '#1e293b' }, ticks: { color: '#94a3b8', maxTicksLimit: 15 }, title: { display: true, text: 'X-Axis', color: '#cbd5e1' } },
        y: { grid: { color: '#1e293b' }, ticks: { color: '#94a3b8' }, title: { display: true, text: 'Price (USD)', color: '#cbd5e1' } }
      }
    }
  });

  // ═══════════════════════════════════════════════════════
  // CHART UPDATE
  // ═══════════════════════════════════════════════════════
  function updateChart() {
    const labels = [], unitPrices = [], toolingCosts = [], processingCosts = [], materialCosts = [], setupCosts = [];

    const generateAnalysis = (volCm3) => {
      const s = Math.cbrt(volCm3) * 10;
      return { volume: volCm3, surfaceArea: (volCm3 ** (2/3)) * 6, boundingBox: { x: s, y: s, z: s }, triangleCount: Math.round(volCm3 * 12) };
    };

    let staticAnalysis = generateAnalysis(simXVariable === 'quantity' ? parseInt(volRange.value) : 100);
    let staticQty = simXVariable === 'volume' ? parseInt(qtyRange.value) : 100;
    const points = 60;

    for (let i = 1; i <= points; i++) {
      let analysis = staticAnalysis, q = staticQty;
      if (simXVariable === 'volume') {
        const x = Math.round(1 + 9999 * (i / points));
        labels.push(x + ' cm³');
        analysis = generateAnalysis(x);
      } else {
        const x = Math.round(Math.pow(10, Math.log10(20000) * (i / points)));
        labels.push(x.toLocaleString() + ' pcs');
        q = x;
      }

      const quote = calculateQuote(analysis, {
        process: currentTechKey, material: currentMaterialKey,
        finish: 'standard', tolerance: 'standard', leadTime: 'standard',
        quantity: q, toolingType: 'low_volume', toolingCavities: 'auto'
      });

      unitPrices.push(quote.unitPrice);
      toolingCosts.push(quote.toolingCost);
      processingCosts.push(quote.processingCost);
      materialCosts.push(quote.materialCost);
      setupCosts.push(quote.setupPerUnit);

      if (i === Math.floor(points / 2)) {
        document.getElementById('stat-mat').textContent = '$' + quote.materialCost.toFixed(2);
        document.getElementById('stat-proc').textContent = '$' + quote.processingCost.toFixed(2);
        document.getElementById('stat-setup').textContent = '$' + quote.setupPerUnit.toFixed(2);
        document.getElementById('stat-tool').textContent = quote.hasTooling ? '$' + quote.toolingCost.toFixed(2) : 'N/A';
        document.getElementById('stat-unit').textContent = '$' + quote.unitPrice.toFixed(2);
      }
    }

    chartInstance.data.labels = labels;
    chartInstance.options.scales.x.title.text = simXVariable === 'volume' ? 'Part Volume (cm³)' : 'Order Quantity (pcs)';
    chartInstance.data.datasets = [
      { label: 'Final Unit Price ($)', data: unitPrices, borderColor: '#3b82f6', backgroundColor: 'rgba(59,130,246,0.08)', fill: true, tension: 0.3, borderWidth: 2 },
      { label: 'Processing ($)', data: processingCosts, borderColor: '#eab308', borderDash: [5,5], tension: 0.3, borderWidth: 1.5 },
      { label: 'Material ($)', data: materialCosts, borderColor: '#6366f1', borderDash: [5,5], tension: 0.3, borderWidth: 1.5 },
      { label: 'Setup/Unit ($)', data: setupCosts, borderColor: '#f97316', borderDash: [3,3], tension: 0.3, borderWidth: 1 }
    ];
    if (PRICING_CONFIG.technologies[currentTechKey]?.hasTooling) {
      chartInstance.data.datasets.push({ label: 'Tooling CAPEX ($)', data: toolingCosts, borderColor: '#10b981', borderWidth: 2, tension: 0.3 });
    }
    chartInstance.update();
  }

  // ═══════════════════════════════════════════════════════
  // PUBLISH & EXPORT
  // ═══════════════════════════════════════════════════════
  publishBtn.addEventListener('click', async () => {
    const originalText = publishBtn.textContent;
    publishBtn.disabled = true;
    publishBtn.textContent = '⌛ Publishing...';

    try {
      // 1. Deactivate all existing configs first
      await supabase.from('pricing_configs').update({ is_active: false }).eq('is_active', true);

      // 2. Insert the new one
      const { error } = await supabase.from('pricing_configs').insert({
        config: PRICING_CONFIG,
        is_active: true,
        label: `Config ${new Date().toLocaleString()}`,
        updated_at: new Date().toISOString()
      });

      if (error) throw error;
      
      alert('✅ Successfully published! All instant quotes are now using the new pricing logic.');
    } catch (err) {
      console.error('Publish error:', err);
      alert('❌ Failed to publish: ' + err.message);
    } finally {
      publishBtn.disabled = false;
      publishBtn.textContent = originalText;
    }
  });

  exportBtn.addEventListener('click', () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(PRICING_CONFIG, null, 2));
    const a = document.createElement('a');
    a.setAttribute("href", dataStr);
    a.setAttribute("download", "pricing-config.json");
    a.click();
  });

  // ═══════════════════════════════════════════════════════
  // INIT
  // ═══════════════════════════════════════════════════════
  loadMaterials();
  renderPricingRules();
  renderMfgCosts();
  updateChart();
}

import PRICING_CONFIG from './data/pricing-config.json';
import { calculateQuote } from './components/quote-engine.js';

let chartInstance = null;
let currentTechKey = 'cnc';
let currentMaterialKey = 'al_6061_t6';
let currentQty = 100;
let simXVariable = 'volume'; // 'volume' or 'quantity'

// ═══════════════════════════════════════════════════════════
// SECTION BUILDER — collapsible accordion
// ═══════════════════════════════════════════════════════════
function section(id, title, color, innerHtml, open = false) {
  return `
    <div class="pe-section" id="pe-section-${id}" style="border: 1px solid ${color}22; border-radius: 8px; overflow: hidden;">
      <button class="pe-section__toggle" data-section="${id}"
        style="width:100%; display:flex; justify-content:space-between; align-items:center;
               padding: 12px 14px; background: ${color}08; border: none; cursor: pointer; color: ${color};">
        <span style="font-size: 12px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px;">${title}</span>
        <span class="pe-chevron" style="transition: transform 0.2s; font-size: 14px;">${open ? '▾' : '▸'}</span>
      </button>
      <div class="pe-section__body" style="padding: 14px; display: ${open ? 'flex' : 'none'}; flex-direction: column; gap: 12px;">
        ${innerHtml}
      </div>
    </div>
  `;
}

// ═══════════════════════════════════════════════════════════
// MAIN RENDER
// ═══════════════════════════════════════════════════════════
export function renderPricingConfigurator(container) {
  const G = PRICING_CONFIG.globalSettings;

  container.innerHTML = `
    <div class="pricing-admin-wrap" style="display: flex; gap: 24px; padding: 24px;">

      <!-- ═══ SIDEBAR ═══ -->
      <div class="pricing-sidebar glass-panel"
           style="width: 400px; padding: 0; display: flex; flex-direction: column; gap: 0;
                  overflow-y: auto; max-height: calc(100vh - 120px); border-radius: 12px;">

        <!-- Header -->
        <div style="padding: 20px 18px 14px; border-bottom: 1px solid var(--color-slate-700);">
          <h3 style="margin: 0; font-size: 15px; color: var(--color-white);">Pricing Engine Configurator</h3>
          <p style="margin: 4px 0 0; font-size: 11px; color: var(--color-steel-400);">Adjust any variable → chart updates in real-time → export JSON</p>
        </div>

        <div style="padding: 14px; display: flex; flex-direction: column; gap: 10px;">

        <!-- ═══ 1. TECH & MATERIAL SELECTION ═══ -->
        ${section('tech-select', 'Technology & Material', '#3b82f6', `
          <div class="input-group">
            <label style="font-size:11px; color:#94a3b8;">Technology</label>
            <select id="sim-tech-select" class="form-select">
              ${Object.keys(PRICING_CONFIG.technologies).map(t =>
                `<option value="${t}">${PRICING_CONFIG.technologies[t].label}</option>`
              ).join('')}
            </select>
          </div>
          <div class="input-group">
            <label style="font-size:11px; color:#94a3b8;">Material</label>
            <select id="sim-mat-select" class="form-select"></select>
          </div>
        `, true)}

        <!-- ═══ 2. SIMULATION AXIS ═══ -->
        ${section('sim-axis', 'Simulation Axis', '#8b5cf6', `
          <div style="display: flex; gap: 8px;">
            <button class="btn btn-secondary sim-x-btn active" data-x="volume" style="flex:1; font-size:11px;">Volume (cm³)</button>
            <button class="btn btn-secondary sim-x-btn" data-x="quantity" style="flex:1; font-size:11px;">Order Quantity</button>
          </div>
          <div id="sim-qty-group" style="display:none;">
            <label style="font-size:11px; color:#94a3b8;">Fixed Quantity (when X = Volume)</label>
            <input type="range" id="sim-qty-range" min="1" max="50000" step="10" value="100">
            <div style="display:flex; justify-content:space-between; font-size:10px; color:var(--color-steel-300);">
              <span>1</span>
              <span id="sim-qty-val" style="font-weight:600; color:var(--color-brand-light);">100 pcs</span>
              <span>50,000</span>
            </div>
          </div>
          <div id="sim-vol-group">
            <label style="font-size:11px; color:#94a3b8;">Fixed Volume (when X = Quantity)</label>
            <input type="range" id="sim-vol-range" min="5" max="5000" step="5" value="100">
            <div style="display:flex; justify-content:space-between; font-size:10px; color:var(--color-steel-300);">
              <span>5 cm³</span>
              <span id="sim-vol-val" style="font-weight:600; color:var(--color-brand-light);">100 cm³</span>
              <span>5000 cm³</span>
            </div>
          </div>
        `, true)}

        <!-- ═══ 3. GLOBAL ECONOMICS ═══ -->
        ${section('global-econ', 'Global Economics', '#f59e0b', `
          <div id="ge-sliders"></div>
        `, true)}

        <!-- ═══ 4. VOLUME DISCOUNT CURVE ═══ -->
        ${section('vol-discount', 'Volume / Quantity Discounts', '#ef4444', `
          <p style="font-size:10px; color:#94a3b8; margin:0;">Define price multipliers at each quantity breakpoint. Lower = bigger discount.</p>
          <div id="vd-table" style="display:flex; flex-direction:column; gap:6px;"></div>
          <button id="vd-add-btn" class="btn btn-secondary" style="font-size:11px; padding:6px 12px; margin-top:4px;">+ Add Breakpoint</button>
        `)}

        <!-- ═══ 5. LEAD TIME / TOLERANCE / COMPLEXITY ═══ -->
        ${section('lt-tol-cx', 'Lead Time, Tolerance & Complexity', '#06b6d4', `
          <div id="ltc-sliders" style="display:flex; flex-direction:column; gap:10px;"></div>
        `)}

        <!-- ═══ 6. TECHNOLOGY-SPECIFIC VARIABLES ═══ -->
        ${section('tech-vars', 'Technology Variables', '#22c55e', `
          <div id="tech-sliders-container" style="display:flex; flex-direction:column; gap:10px;"></div>
        `, true)}

        <!-- ═══ EXPORT ═══ -->
        <button id="sim-export-btn" class="btn btn-primary" style="margin-top:12px; width:100%;">
          ↓ Export pricing-config.json
        </button>

        </div><!-- /padding wrapper -->
      </div><!-- /sidebar -->

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
  const slidersContainer = document.getElementById('tech-sliders-container');
  const exportBtn = document.getElementById('sim-export-btn');
  const qtyRange = document.getElementById('sim-qty-range');
  const qtyVal = document.getElementById('sim-qty-val');
  const volRange = document.getElementById('sim-vol-range');
  const volVal = document.getElementById('sim-vol-val');
  const xBtns = container.querySelectorAll('.sim-x-btn');

  // ═══════════════════════════════════════════════════════
  // UTILITY: Create a slider row
  // ═══════════════════════════════════════════════════════
  function makeSlider(parent, label, obj, key, min, max, step, opts = {}) {
    const val = obj[key] ?? min;
    const color = opts.color || '#cbd5e1';
    const bgColor = opts.bg || 'rgba(255,255,255,0.02)';
    const borderColor = opts.border || 'var(--color-slate-700)';
    const unit = opts.unit || '';
    const row = document.createElement('div');
    row.style.cssText = `background:${bgColor}; padding:10px 12px; border-radius:6px; border:1px solid ${borderColor};`;
    row.innerHTML = `
      <div style="display:flex; justify-content:space-between; margin-bottom:6px;">
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
  // 1. TECH & MATERIAL SELECTION
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
    renderTechSliders();
    updateChart();
  });

  matSelect.addEventListener('change', (e) => {
    currentMaterialKey = e.target.value;
    renderTechSliders();
    updateChart();
  });

  // ═══════════════════════════════════════════════════════
  // 2. SIMULATION AXIS
  // ═══════════════════════════════════════════════════════
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
  // 3. GLOBAL ECONOMICS
  // ═══════════════════════════════════════════════════════
  function renderGlobalEcon() {
    const geContainer = document.getElementById('ge-sliders');
    geContainer.innerHTML = '';

    makeSlider(geContainer, 'Global Margin Multiplier', PRICING_CONFIG, 'globalMarginMultiplier',
      1.0, 2.5, 0.01, { color: '#fbbf24', bg: 'rgba(251,191,36,0.05)', border: 'rgba(251,191,36,0.2)', unit: '×' });

    makeSlider(geContainer, 'DFM Fee ($)', G, 'dfmFee',
      0, 200, 5, { color: '#fbbf24', bg: 'rgba(251,191,36,0.05)', border: 'rgba(251,191,36,0.2)', unit: '' });

    makeSlider(geContainer, 'Color Matching Fee ($)', G, 'colorMatchingFee',
      0, 100, 5, { color: '#fbbf24', bg: 'rgba(251,191,36,0.05)', border: 'rgba(251,191,36,0.2)', unit: '' });

    makeSlider(geContainer, 'Threads & Inserts Fee ($)', G, 'threadsFee',
      0, 100, 5, { color: '#fbbf24', bg: 'rgba(251,191,36,0.05)', border: 'rgba(251,191,36,0.2)', unit: '' });

    makeSlider(geContainer, 'Custom Complexity Adder', G, 'customComplexityAdder',
      1.0, 1.5, 0.01, { color: '#fbbf24', bg: 'rgba(251,191,36,0.05)', border: 'rgba(251,191,36,0.2)', unit: '×' });
  }

  // ═══════════════════════════════════════════════════════
  // 4. VOLUME DISCOUNT CURVE
  // ═══════════════════════════════════════════════════════
  function renderVolumeDiscounts() {
    const vdTable = document.getElementById('vd-table');
    vdTable.innerHTML = '';
    const breaks = G.quantityDiscountBreaks;

    breaks.forEach((brk, idx) => {
      const row = document.createElement('div');
      row.style.cssText = 'background:rgba(239,68,68,0.04); padding:10px 12px; border-radius:6px; border:1px solid rgba(239,68,68,0.15);';
      const effectiveDiscount = Math.round((1 - brk.multiplier) * 100);
      row.innerHTML = `
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:6px;">
          <div style="display:flex; gap:6px; align-items:center;">
            <label style="font-size:10px; color:#fca5a5; font-family:monospace;">≥</label>
            <input type="number" class="vd-qty-input" value="${brk.minQty}" min="1" max="100000"
              style="width:70px; padding:3px 6px; font-size:11px; background:rgba(0,0,0,0.3); border:1px solid rgba(239,68,68,0.2);
                     color:#fca5a5; border-radius:4px; font-family:monospace;">
            <span style="font-size:10px; color:#94a3b8;">pcs</span>
          </div>
          <div style="display:flex; gap:8px; align-items:center;">
            <span class="vd-discount-pct" style="font-size:11px; color:#f87171; font-weight:600;">${effectiveDiscount}% off</span>
            ${idx > 0 ? `<button class="vd-remove-btn" style="background:none; border:none; color:#f87171; cursor:pointer; font-size:14px; padding:0 4px;" title="Remove">×</button>` : ''}
          </div>
        </div>
        <div style="display:flex; align-items:center; gap:8px;">
          <input type="range" class="form-range vd-mult-slider" min="0.20" max="1.0" step="0.01" value="${brk.multiplier}" style="flex:1;">
          <span class="vd-mult-val" style="font-size:11px; color:#fca5a5; font-weight:bold; min-width:35px; text-align:right;">${brk.multiplier.toFixed(2)}</span>
        </div>
      `;
      vdTable.appendChild(row);

      const qtyInput = row.querySelector('.vd-qty-input');
      const multSlider = row.querySelector('.vd-mult-slider');
      const multVal = row.querySelector('.vd-mult-val');
      const discountPct = row.querySelector('.vd-discount-pct');
      const removeBtn = row.querySelector('.vd-remove-btn');

      qtyInput.addEventListener('change', () => {
        brk.minQty = parseInt(qtyInput.value) || 1;
        // Re-sort breaks
        G.quantityDiscountBreaks.sort((a, b) => a.minQty - b.minQty);
        renderVolumeDiscounts();
        updateChart();
      });

      multSlider.addEventListener('input', () => {
        const v = parseFloat(multSlider.value);
        brk.multiplier = v;
        multVal.textContent = v.toFixed(2);
        discountPct.textContent = `${Math.round((1 - v) * 100)}% off`;
        updateChart();
      });

      if (removeBtn) {
        removeBtn.addEventListener('click', () => {
          G.quantityDiscountBreaks.splice(idx, 1);
          renderVolumeDiscounts();
          updateChart();
        });
      }
    });
  }

  document.getElementById('vd-add-btn').addEventListener('click', () => {
    const lastBreak = G.quantityDiscountBreaks[G.quantityDiscountBreaks.length - 1];
    const newQty = (lastBreak?.minQty || 1000) * 2;
    const newMult = Math.max(0.2, (lastBreak?.multiplier || 0.7) - 0.08);
    G.quantityDiscountBreaks.push({ minQty: newQty, multiplier: parseFloat(newMult.toFixed(2)) });
    renderVolumeDiscounts();
    updateChart();
  });

  // ═══════════════════════════════════════════════════════
  // 5. LEAD TIME / TOLERANCE / COMPLEXITY
  // ═══════════════════════════════════════════════════════
  function renderLTCSliders() {
    const ltcContainer = document.getElementById('ltc-sliders');
    ltcContainer.innerHTML = '';

    // Lead time header
    const ltHeader = document.createElement('div');
    ltHeader.innerHTML = '<div style="font-size:11px; color:#22d3ee; font-weight:600; margin-bottom:2px;">Lead Time Multipliers</div>';
    ltcContainer.appendChild(ltHeader);

    const ltKeys = ['economy', 'standard', 'express', 'rush'];
    ltKeys.forEach(k => {
      makeSlider(ltcContainer, `${k.charAt(0).toUpperCase() + k.slice(1)}`, G.leadTimeMultiplier, k,
        0.5, 3.0, 0.05, { color: '#22d3ee', bg: 'rgba(6,182,212,0.05)', border: 'rgba(6,182,212,0.15)', unit: '×' });
    });

    // Tolerance header
    const tolHeader = document.createElement('div');
    tolHeader.innerHTML = '<div style="font-size:11px; color:#22d3ee; font-weight:600; margin-top:8px; margin-bottom:2px;">Tolerance Multipliers</div>';
    ltcContainer.appendChild(tolHeader);

    const tolKeys = ['standard', 'precision', 'tight'];
    tolKeys.forEach(k => {
      makeSlider(ltcContainer, `${k.charAt(0).toUpperCase() + k.slice(1)}`, G.toleranceMultiplier, k,
        1.0, 3.0, 0.05, { color: '#67e8f9', bg: 'rgba(6,182,212,0.05)', border: 'rgba(6,182,212,0.15)', unit: '×' });
    });

    // Complexity header
    const cxHeader = document.createElement('div');
    cxHeader.innerHTML = '<div style="font-size:11px; color:#22d3ee; font-weight:600; margin-top:8px; margin-bottom:2px;">Complexity Multipliers (by triangle count)</div>';
    ltcContainer.appendChild(cxHeader);

    G.complexityMultiplier.forEach((tier, idx) => {
      const row = document.createElement('div');
      row.style.cssText = 'background:rgba(6,182,212,0.04); padding:10px 12px; border-radius:6px; border:1px solid rgba(6,182,212,0.12);';
      row.innerHTML = `
        <div style="display:flex; justify-content:space-between; margin-bottom:6px;">
          <div style="display:flex; gap:6px; align-items:center;">
            <label style="font-size:10px; color:#67e8f9; font-family:monospace;">≤</label>
            <input type="number" class="cx-tri-input" value="${tier.maxTriangles}" min="100" max="9999999"
              style="width:80px; padding:3px 6px; font-size:11px; background:rgba(0,0,0,0.3); border:1px solid rgba(6,182,212,0.2);
                     color:#67e8f9; border-radius:4px; font-family:monospace;">
            <span style="font-size:10px; color:#94a3b8;">triangles</span>
          </div>
          <span class="cx-mult-val" style="font-size:11px; color:#22d3ee; font-weight:bold;">${tier.multiplier.toFixed(2)}×</span>
        </div>
        <input type="range" class="form-range cx-mult-slider" min="1.0" max="2.0" step="0.01" value="${tier.multiplier}">
      `;
      ltcContainer.appendChild(row);

      const triInput = row.querySelector('.cx-tri-input');
      const multSlider = row.querySelector('.cx-mult-slider');
      const multVal = row.querySelector('.cx-mult-val');

      triInput.addEventListener('change', () => { tier.maxTriangles = parseInt(triInput.value) || 5000; updateChart(); });
      multSlider.addEventListener('input', () => {
        tier.multiplier = parseFloat(multSlider.value);
        multVal.textContent = tier.multiplier.toFixed(2) + '×';
        updateChart();
      });
    });
  }

  // ═══════════════════════════════════════════════════════
  // 6. TECHNOLOGY-SPECIFIC VARIABLES
  // ═══════════════════════════════════════════════════════
  function renderTechSliders() {
    slidersContainer.innerHTML = '';
    const tech = PRICING_CONFIG.technologies[currentTechKey];
    if (!tech) return;

    // --- Core rates ---
    makeSlider(slidersContainer, 'Machine Rate ($/hr)', tech, 'machineRateUsdPerHour',
      5, 250, 1, { color: '#86efac', bg: 'rgba(34,197,94,0.05)', border: 'rgba(34,197,94,0.2)', unit: '' });

    makeSlider(slidersContainer, 'Baseline Material Price ($/kg)', tech, 'baselineMaterialPriceKg',
      0.5, 100, 0.5, { color: '#86efac', bg: 'rgba(34,197,94,0.05)', border: 'rgba(34,197,94,0.2)', unit: '' });

    makeSlider(slidersContainer, 'Scrap / Waste Multiplier', tech, 'scrapWasteMultiplier',
      1.0, 5.0, 0.05, { color: '#86efac', bg: 'rgba(34,197,94,0.05)', border: 'rgba(34,197,94,0.2)', unit: '×' });

    // --- Technology-specific rate parameters ---
    const mfgType = tech.manufacturingType;

    if (mfgType === 'subtractive' && tech.baselineRemovalRateCm3PerMin !== undefined) {
      makeSlider(slidersContainer, 'Material Removal Rate (cm³/min)', tech, 'baselineRemovalRateCm3PerMin',
        1, 100, 1, { color: '#a3e635', bg: 'rgba(163,230,53,0.05)', border: 'rgba(163,230,53,0.2)', unit: '' });
    }

    if (mfgType === 'formative') {
      if (tech.baseCycleTimeSecs !== undefined) {
        makeSlider(slidersContainer, 'Base Cycle Time (seconds)', tech, 'baseCycleTimeSecs',
          1, 600, 1, { color: '#a3e635', bg: 'rgba(163,230,53,0.05)', border: 'rgba(163,230,53,0.2)', unit: 's' });
      }
      if (tech.volumetricCoolingSecsPerCm3 !== undefined) {
        makeSlider(slidersContainer, 'Cooling Rate (sec/cm³)', tech, 'volumetricCoolingSecsPerCm3',
          0.05, 5.0, 0.05, { color: '#a3e635', bg: 'rgba(163,230,53,0.05)', border: 'rgba(163,230,53,0.2)', unit: '' });
      }
    }

    if (mfgType === 'additive' && tech.baseExtrusionRateCm3PerHour !== undefined) {
      makeSlider(slidersContainer, 'Extrusion / Build Rate (cm³/hr)', tech, 'baseExtrusionRateCm3PerHour',
        1, 100, 1, { color: '#a3e635', bg: 'rgba(163,230,53,0.05)', border: 'rgba(163,230,53,0.2)', unit: '' });
    }

    if (mfgType === 'sheet' && tech.baseCutRateCm2PerMin !== undefined) {
      makeSlider(slidersContainer, 'Cut Rate (cm²/min)', tech, 'baseCutRateCm2PerMin',
        5, 200, 5, { color: '#a3e635', bg: 'rgba(163,230,53,0.05)', border: 'rgba(163,230,53,0.2)', unit: '' });
    }

    // --- SETUP CONFIG ---
    if (tech.setupConfig) {
      const setupHeader = document.createElement('div');
      setupHeader.innerHTML = '<div style="font-size:11px; color:#4ade80; font-weight:600; margin-top:6px;">Setup Configuration</div>';
      slidersContainer.appendChild(setupHeader);

      makeSlider(slidersContainer, 'Setup Base Fee ($)', tech.setupConfig, 'baseFee',
        0, 500, 5, { color: '#4ade80', bg: 'rgba(74,222,128,0.05)', border: 'rgba(74,222,128,0.15)', unit: '' });

      // Size tier adders
      if (tech.setupConfig.sizeTiers) {
        tech.setupConfig.sizeTiers.forEach((tier, idx) => {
          const tierRow = document.createElement('div');
          tierRow.style.cssText = 'background:rgba(74,222,128,0.04); padding:10px 12px; border-radius:6px; border:1px solid rgba(74,222,128,0.12);';
          tierRow.innerHTML = `
            <div style="display:flex; justify-content:space-between; margin-bottom:6px;">
              <div style="display:flex; gap:4px; align-items:center;">
                <label style="font-size:10px; color:#86efac; font-family:monospace;">≤</label>
                <input type="number" class="st-vol-input" value="${tier.maxVolumeCm3}" min="1" max="999999"
                  style="width:70px; padding:3px 6px; font-size:11px; background:rgba(0,0,0,0.3); border:1px solid rgba(74,222,128,0.2);
                         color:#86efac; border-radius:4px; font-family:monospace;">
                <span style="font-size:10px; color:#94a3b8;">cm³ →</span>
              </div>
              <div style="display:flex; gap:4px; align-items:center;">
                <span style="font-size:10px; color:#94a3b8;">+$</span>
                <input type="number" class="st-adder-input" value="${tier.adder}" min="0" max="1000" step="5"
                  style="width:55px; padding:3px 6px; font-size:11px; background:rgba(0,0,0,0.3); border:1px solid rgba(74,222,128,0.2);
                         color:#86efac; border-radius:4px; font-family:monospace; text-align:right;">
              </div>
            </div>
          `;
          slidersContainer.appendChild(tierRow);

          const volInput = tierRow.querySelector('.st-vol-input');
          const adderInput = tierRow.querySelector('.st-adder-input');
          volInput.addEventListener('change', () => { tier.maxVolumeCm3 = parseInt(volInput.value) || 100; updateChart(); });
          adderInput.addEventListener('change', () => { tier.adder = parseInt(adderInput.value) || 0; updateChart(); });
        });
      }
    }

    // --- MATERIAL SETTINGS ---
    const mat = tech.materials?.[currentMaterialKey];
    if (mat) {
      const matHeader = document.createElement('div');
      matHeader.innerHTML = `<div style="font-size:11px; color:#60a5fa; font-weight:600; margin-top:8px;">Material: ${mat.label}</div>`;
      slidersContainer.appendChild(matHeader);

      makeSlider(slidersContainer, 'Raw Cost Multiplier', mat, 'rawCostMultiplier',
        0.1, 15.0, 0.05, { color: '#93c5fd', bg: 'rgba(59,130,246,0.05)', border: 'rgba(59,130,246,0.2)', unit: '×' });

      makeSlider(slidersContainer, 'Processing Difficulty Multiplier', mat, 'processingDifficultyMultiplier',
        0.1, 15.0, 0.05, { color: '#93c5fd', bg: 'rgba(59,130,246,0.05)', border: 'rgba(59,130,246,0.2)', unit: '×' });

      if (mat.density !== undefined) {
        makeSlider(slidersContainer, 'Density (g/cm³)', mat, 'density',
          0.5, 20.0, 0.01, { color: '#93c5fd', bg: 'rgba(59,130,246,0.05)', border: 'rgba(59,130,246,0.2)', unit: '' });
      }
    }

    // --- TOOLING SETTINGS ---
    if (tech.hasTooling && tech.tooling) {
      const toolHeader = document.createElement('div');
      toolHeader.innerHTML = '<div style="font-size:11px; color:#34d399; font-weight:600; margin-top:8px;">Tooling Parameters</div>';
      slidersContainer.appendChild(toolHeader);

      makeSlider(slidersContainer, 'Tooling Base Cost ($)', tech.tooling, 'baseCost',
        100, 30000, 100, { color: '#6ee7b7', bg: 'rgba(16,185,129,0.05)', border: 'rgba(16,185,129,0.2)', unit: '' });

      makeSlider(slidersContainer, 'Tooling SA Cost ($/cm²)', tech.tooling, 'costPerCm2SurfaceArea',
        0.1, 5.0, 0.05, { color: '#6ee7b7', bg: 'rgba(16,185,129,0.05)', border: 'rgba(16,185,129,0.2)', unit: '' });

      if (tech.tooling.tierMultipliers) {
        Object.keys(tech.tooling.tierMultipliers).forEach(tier => {
          makeSlider(slidersContainer, `Tooling Tier: ${tier.replace('_', ' ')}`, tech.tooling.tierMultipliers, tier,
            0.1, 5.0, 0.05, { color: '#6ee7b7', bg: 'rgba(16,185,129,0.05)', border: 'rgba(16,185,129,0.2)', unit: '×' });
        });
      }

      // Cavity multipliers (injection moulding)
      if (tech.tooling.cavityMultiplier) {
        Object.keys(tech.tooling.cavityMultiplier).forEach(cavKey => {
          const cavObj = { val: tech.tooling.cavityMultiplier[cavKey] };
          const s = makeSlider(slidersContainer, `Cavity ${cavKey}x Cost Mult`, cavObj, 'val',
            0.5, 5.0, 0.1, { color: '#a7f3d0', bg: 'rgba(16,185,129,0.03)', border: 'rgba(16,185,129,0.12)', unit: '×' });
          s.input.addEventListener('input', () => {
            tech.tooling.cavityMultiplier[cavKey] = parseFloat(s.input.value);
          });
        });
      }
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
          mode: 'index',
          intersect: false,
          callbacks: {
            label: ctx => ctx.dataset.label + ': $' + ctx.parsed.y.toFixed(2)
          }
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
    const labels = [];
    const unitPrices = [];
    const toolingCosts = [];
    const processingCosts = [];
    const materialCosts = [];
    const setupCosts = [];

    const generateAnalysis = (volCm3) => {
      const sideLengthMm = Math.cbrt(volCm3) * 10;
      return {
        volume: volCm3,
        surfaceArea: (volCm3 ** (2/3)) * 6,
        boundingBox: { x: sideLengthMm, y: sideLengthMm, z: sideLengthMm },
        triangleCount: Math.round(volCm3 * 12) // rough estimate
      };
    };

    let staticAnalysis = generateAnalysis(simXVariable === 'quantity' ? parseInt(volRange.value) : 100);
    let staticQty = simXVariable === 'volume' ? parseInt(qtyRange.value) : 100;
    const points = 60;

    for (let i = 1; i <= points; i++) {
      let analysis = staticAnalysis;
      let q = staticQty;

      if (simXVariable === 'volume') {
        const xVal = Math.round(1 + 9999 * (i / points));
        labels.push(xVal + ' cm³');
        analysis = generateAnalysis(xVal);
      } else {
        const xVal = Math.round(Math.pow(10, (Math.log10(20000)) * (i / points)));
        labels.push(xVal.toLocaleString() + ' pcs');
        q = xVal;
      }

      const config = {
        process: currentTechKey,
        material: currentMaterialKey,
        finish: 'standard',
        tolerance: 'standard',
        leadTime: 'standard',
        quantity: q,
        toolingType: 'low_volume',
        toolingCavities: 'auto'
      };

      const quote = calculateQuote(analysis, config);
      unitPrices.push(quote.unitPrice);
      toolingCosts.push(quote.toolingCost);
      processingCosts.push(quote.processingCost);
      materialCosts.push(quote.materialCost);
      setupCosts.push(quote.setupPerUnit);

      // Update HUD at midpoint
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
      {
        label: 'Final Unit Price ($)',
        data: unitPrices,
        borderColor: '#3b82f6',
        backgroundColor: 'rgba(59, 130, 246, 0.08)',
        fill: true,
        tension: 0.3,
        borderWidth: 2
      },
      {
        label: 'Processing Cost ($)',
        data: processingCosts,
        borderColor: '#eab308',
        borderDash: [5, 5],
        tension: 0.3,
        borderWidth: 1.5
      },
      {
        label: 'Material Cost ($)',
        data: materialCosts,
        borderColor: '#6366f1',
        borderDash: [5, 5],
        tension: 0.3,
        borderWidth: 1.5
      },
      {
        label: 'Setup / Unit ($)',
        data: setupCosts,
        borderColor: '#f97316',
        borderDash: [3, 3],
        tension: 0.3,
        borderWidth: 1
      }
    ];

    if (PRICING_CONFIG.technologies[currentTechKey]?.hasTooling) {
      chartInstance.data.datasets.push({
        label: 'Tooling CAPEX ($)',
        data: toolingCosts,
        borderColor: '#10b981',
        borderWidth: 2,
        tension: 0.3,
        yAxisID: 'y'
      });
    }

    chartInstance.update();
  }

  // ═══════════════════════════════════════════════════════
  // EXPORT
  // ═══════════════════════════════════════════════════════
  exportBtn.addEventListener('click', () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(PRICING_CONFIG, null, 2));
    const dlAnchorElem = document.createElement('a');
    dlAnchorElem.setAttribute("href", dataStr);
    dlAnchorElem.setAttribute("download", "pricing-config.json");
    dlAnchorElem.click();
  });

  // ═══════════════════════════════════════════════════════
  // INITIALIZE ALL
  // ═══════════════════════════════════════════════════════
  loadMaterials();
  renderGlobalEcon();
  renderVolumeDiscounts();
  renderLTCSliders();
  renderTechSliders();
  updateChart();
}

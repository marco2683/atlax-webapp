import { generateProductHierarchy } from '../services/manufacturing-ai.js';

/* ── COTS lookup (off-the-shelf hardware parts per technology) ─ */
const TECH_COTS = {
  pcba:      ['STM32 / Nordic MCU', 'Bosch BMI088 IMU', 'JST-GH Connectors', 'MLCC Capacitors', 'MOSFET Arrays'],
  motor:     ['N52 Neodymium Magnets', 'Deep Groove Bearings', 'Silicon Steel Laminations', 'Copper Windings', 'Motor Shafts'],
  battery:   ['21700 Li-Ion Cells', 'TI BQ298xx BMS IC', 'NTC Thermistors', 'XT60 Connectors', 'Cell Holders'],
  carbon:    ['Toray T700 CFRP Fabric', 'Epoxy Resin', 'PU Foam Core', 'Al Joining Inserts', 'Peel Ply Film'],
  im:        ['ABS / PA66-GF30 Pellets', 'Pigment Masterbatch', 'Brass Heat-Set Inserts', 'Release Agent', 'Metal Cores'],
  printing:  ['Pantone UV Inks', 'FSC Coated Stock', 'Laminate Film', 'UV Varnish', 'CMYK Pigments'],
  wiring:    ['UL Wire Gauge', 'JST / XT60 Connectors', 'Heat-Shrink Tubing', 'PTFE Sleeve', 'Ferrule Ends'],
  display:   ['OLED / LCD Panel', 'Synaptics Touch IC', 'FPC Ribbon Cable', 'Polariser Film', 'Backlight LED'],
  battery2:  ['Pouch Li-Ion Cells', 'Grepow Custom Cells', 'PCM Breaker', 'Kapton Tape', 'Spot Weld Tabs'],
  band:      ['TPU Pellets', 'Silicone Compound', 'Nylon Webbing', 'SS Spring Bar', 'Buckle Hardware'],
  upper:     ['Mesh / Knit Fabric', 'Leather Panels', 'TPU Films', 'Eyelet Hardware', 'Lace / Aglet'],
  sole:      ['EVA Foam Pellets', 'Rubber Compound', 'TPU Outsole Granules', 'Pigments', 'Release Liner'],
  lasting:   ['Cement Adhesive', 'Lasting Nails', 'Steel Last', 'Toe Puff', 'Counter Board'],
  insole:    ['Poron XRD Foam', 'Recycled Terylene', 'PE Film Laminate', 'Die-Cut Blanks'],
  servo:     ['Harmonic Drive Cup', 'Brushless DC Motor', 'Magnetic Encoder IC', 'Torque Sensor', 'Gearbox Bearings'],
  structure: ['6061 Al Extrusion', 'S275 Steel Plate', 'M5 Hex Bolts', 'T-Slot Profile', 'Dowel Pins'],
  sensors:   ['ATI Force Sensor', 'Cognex Vision Cam', '2D Lidar Module', 'Encoder Strip', 'Prox Switches'],
  frame:     ['7075 Al Tubeset', 'CrMo Dropouts', 'BB Shell', 'Head Tube', 'Dropouts'],
  electronics:['Delta SMPS Module', 'CAN Bus Transceiver', 'Wi-Fi MCU (ESP32)', 'Hall Sensor', 'Shunt Resistor'],
  speaker:   ['Neodymium Driver', 'Passive Radiator', 'DSP Chip (TI)', 'Li-Po Cell', 'Port Tube'],
  housing:   ['ABS UL94 V-0 Pellets', 'SUS316L Screws', 'IP Gasket Silicone', 'EMI Shield Foil', 'Tactile Switches'],
  metal:     ['1018 Steel Sheet', '6061 Al Billet', 'SS304 Strip', 'WC End Mills', 'EDM Wire'],
  moulding:  ['EN71-compliant ABS', 'PP Copolymer', 'HIPS', 'Pigment Concentrate', 'Steel Inserts'],
  cert:      ['UL Test Coupons', 'EN-71 Sample Set', 'SAL Indicators', 'Calibration Standards'],
  firmware:  ['Arm Cortex-M33 Dev Kit', 'J-Link Debugger', 'Flash IC', 'JTAG Adaptor'],
  flexible:  ['BOPP Film', 'PET Laminate', 'Zipper Slider', 'Adhesive Layer', 'Ink Concentrate'],
  paint:     ['2K Polyurethane', 'Primer Filler', 'Thinner', 'Abrasive Media', 'Masking Film'],
  packaging: ['E-Flute Corrugated', 'Kraft Liner', 'PE Foam Insert', 'Shrink Wrap', 'Hot-Melt Adhesive'],
  insulator: ['Nomex Paper', 'FR4 Glass Sheet', 'Silicone Rubber', 'Mica Tape', 'Kapton Film'],
  default:   ['Standard Fasteners (M3–M8)', 'PCB Sub-assembly', 'Wire & Cable Sets', 'Labels & Stickers', 'Protective Foam'],
};

const TECH_SUPPLIER_MAP = {
  pcba:    [{ name:'Foxconn Industrial',  region:'cn', city:'Shenzhen',   tier:'Tier 1', certifications:['IPC-A-610','ISO 9001'], lead:'4–6 wks' }, { name:'Kinpo Group', region:'tw', city:'Taipei', tier:'Tier 1', certifications:['ISO 9001','IPC Class 3'], lead:'3–5 wks' }],
  im:      [{ name:'Jabil Plastics',      region:'cn', city:'Guangzhou',  tier:'Tier 1', certifications:['ISO 9001','IATF'],      lead:'6–8 wks' }, { name:'Bright Sun Mould', region:'cn', city:'Dongguan', tier:'Tier 2', certifications:['ISO 9001'], lead:'5–7 wks' }],
  carbon:  [{ name:'Toray Composites',    region:'cn', city:'Nanjing',    tier:'Tier 1', certifications:['AS9100D','ISO 9001'],   lead:'8–12 wks'}],
  motor:   [{ name:'T-Motor (Tiger)',     region:'cn', city:'Nanchang',   tier:'Tier 1', certifications:['ISO 9001','CE'],        lead:'3–4 wks' }, { name:'SunnySky Motors', region:'cn', city:'Guangzhou', tier:'Tier 2', certifications:['ISO 9001'], lead:'2–3 wks' }],
  battery: [{ name:'CATL (Consumer)',     region:'cn', city:'Ningde',     tier:'Tier 1', certifications:['UN38.3','UL 2054'],     lead:'8–12 wks'}, { name:'Grepow Battery', region:'cn', city:'Shenzhen', tier:'Tier 2', certifications:['UN38.3','ISO 9001'], lead:'4–6 wks' }],
  wiring:  [{ name:'Amphenol Industrial', region:'cn', city:'Changzhou',  tier:'Tier 1', certifications:['ISO 9001','IATF 16949'],lead:'4–6 wks' }],
  printing:[{ name:'RR Donnelley Asia',   region:'cn', city:'Shanghai',   tier:'Tier 1', certifications:['ISO 9001','FSC'],       lead:'3–4 wks' }],
  upper:   [{ name:'Stella International',region:'vn', city:'Dong Nai',  tier:'Tier 1', certifications:['ISO 9001','OEKO-TEX'],  lead:'10–14 wks'}],
  sole:    [{ name:'Feng Tay Enterprises',region:'vn', city:'Binh Dinh', tier:'Tier 1', certifications:['ISO 9001'],             lead:'8–12 wks'}, { name:'Yue Yuen Industrial', region:'cn', city:'Dongguan', tier:'Tier 1', certifications:['ISO 9001','REACH'], lead:'8–10 wks' }],
  lasting: [{ name:'Stella International',region:'vn', city:'Dong Nai',  tier:'Tier 1', certifications:['ISO 9001'],             lead:'12–16 wks'}],
  insole:  [{ name:'Poron/Rogers Corp',   region:'cn', city:'Suzhou',    tier:'Tier 1', certifications:['ISO 9001','OEKO-TEX'],  lead:'3–4 wks' }],
  servo:   [{ name:'Harmonic Drive',      region:'tw', city:'Taoyuan',   tier:'Tier 1', certifications:['ISO 9001','CE'],        lead:'8–12 wks'}],
  display: [{ name:'BOE Technology',      region:'cn', city:'Beijing',   tier:'Tier 1', certifications:['ISO 9001'],             lead:'6–8 wks' }],
  speaker: [{ name:'GoerTek Inc.',        region:'cn', city:'Qingdao',   tier:'Tier 1', certifications:['ISO 9001','CE'],        lead:'6–8 wks' }],
  packaging:[{ name:'WestRock Asia',      region:'cn', city:'Shanghai',  tier:'Tier 1', certifications:['ISO 9001','FSC'],       lead:'3–5 wks' }],
  moulding:[{ name:'Dongguan Alpha Mould',region:'cn', city:'Dongguan',  tier:'Tier 2', certifications:['ISO 9001','EN 71'],     lead:'5–7 wks' }],
};

const REGION_FLAGS = { cn:'🇨🇳', vn:'🇻🇳', tw:'🇹🇼', th:'🇹🇭', in:'🇮🇳', us:'🇺🇸', au:'🇦🇺' };
const REGION_NAMES = { cn:'China', vn:'Vietnam', tw:'Taiwan', th:'Thailand', in:'India', us:'USA', au:'Australia' };

let currentHierarchy = null;
let selectedRegion = 'cn';
let scVisible = false;

/* ── INIT ─────────────────────────────────────────────────── */
export function initProductBuilder() {
  const el = document.getElementById('product-builder-engine');
  if (!el) return;
  el.innerHTML = `
    <div class="pb-layout">
      <div class="pb-hero">
        <h1 class="pb-title">Product Builder</h1>
        <div class="pb-search-wrap" id="pb-search-wrap">
          <div class="pb-search-icon"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg></div>
          <input id="pb-input" class="pb-search-input" type="text" autocomplete="off"
            placeholder="Type any product — hat, drone, sneakers, smartwatch…" />
          <button class="pb-search-btn" id="pb-generate-btn">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="13 2 13 9 20 9"/><polygon points="22 2 2 22 13 9 20 2 22 2"/></svg>
            Generate
          </button>
        </div>
      </div>

      <!-- Animated tagline — visible before first search -->
      <div class="pb-tagline-stage" id="pb-tagline-stage">
        <div class="pb-tagline-msg" id="pb-tagline-msg"></div>
      </div>
    </div>
    <div id="pb-output" class="pb-output pb-output--fullwidth"></div>`;

  // Cycling tagline messages
  const MESSAGES = [
    'Understand the full technology matrix for any product',
    'Identify every manufacturing process from raw material to finished good',
    'Map your supply chain across Tier 1, Tier 2, and COTS components',
    'Powered by Gemini AI — trained on real manufacturing intelligence',
    'From a hat to a surgical robot — type anything and build the tree',
    'Discover which certifications and risk vectors apply to your product',
    'Build a supplier shortlist from the technology hierarchy in one click',
  ];
  let msgIdx = 0;
  const msgEl = document.getElementById('pb-tagline-msg');
  function cycleMessage() {
    if (!msgEl || !document.getElementById('pb-tagline-stage')) return;
    msgEl.classList.remove('pb-tagline-in');
    msgEl.classList.add('pb-tagline-out');
    setTimeout(() => {
      msgIdx = (msgIdx + 1) % MESSAGES.length;
      msgEl.textContent = MESSAGES[msgIdx];
      msgEl.classList.remove('pb-tagline-out');
      msgEl.classList.add('pb-tagline-in');
    }, 900);
  }
  // Set first message immediately
  msgEl.textContent = MESSAGES[0];
  msgEl.classList.add('pb-tagline-in');
  const taglineTimer = setInterval(cycleMessage, 6000);

  el.querySelectorAll('.pb-chip').forEach(c => {
    c.addEventListener('click', () => { document.getElementById('pb-input').value = c.dataset.p; runGenerate(taglineTimer); });
  });
  document.getElementById('pb-generate-btn')?.addEventListener('click', () => runGenerate(taglineTimer));
  document.getElementById('pb-input')?.addEventListener('keydown', e => { if (e.key === 'Enter') runGenerate(taglineTimer); });

  if (!document.getElementById('pb-sc-root')) {
    const scRoot = document.createElement('div');
    scRoot.id = 'pb-sc-root';
    scRoot.className = 'pb-sc-root';
    el.insertAdjacentElement('afterend', scRoot);
  }
}

/* ── GENERATE ─────────────────────────────────────────────── */
async function runGenerate(taglineTimer) {
  const input = document.getElementById('pb-input');
  const name = input?.value?.trim();
  if (!name) { input?.classList.add('pb-shake'); setTimeout(() => input?.classList.remove('pb-shake'), 500); return; }

  // Stop tagline cycling and hide the stage
  if (taglineTimer) clearInterval(taglineTimer);
  const stage = document.getElementById('pb-tagline-stage');
  if (stage) { stage.classList.add('pb-tagline-hidden'); }

  // Disable generate button during loading
  const btn = document.getElementById('pb-generate-btn');
  if (btn) { btn.disabled = true; btn.style.opacity = '0.6'; }

  scVisible = false;
  document.getElementById('pb-sc-root').innerHTML = '';
  const out = document.getElementById('pb-output');

  // Show spinner
  out.innerHTML = `
    <div class="pb-spinner-wrap">
      <div class="pb-spinner"></div>
      <p class="pb-spinner-label">Building technology matrix for <em>${name}</em>…</p>
    </div>`;

  try {
    currentHierarchy = await generateProductHierarchy(name);
    renderHierarchy(currentHierarchy, out);
  } catch (err) {
    out.innerHTML = `<div class="pb-thinking"><p style="color:var(--color-coral)">⚠ Generation failed. Check your API key and try again.</p></div>`;
  } finally {
    if (btn) { btn.disabled = false; btn.style.opacity = '1'; }
  }
}

/* ── 4-TIER ORG CHART RENDER ─────────────────────────────── */
function renderHierarchy(h, container) {
  const svgW = `<svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="#6b7280" stroke-width="2.5"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>`;

  // ── Root card (T0) ───────────────────────────────────────
  const rootHTML = `
    <div class="pb-org-root">
      <div class="pb-card pb-card--root pb-appear">
        <div class="pb-card-head">
          <span class="pb-card-icon">${h.cm.icon}</span>
          <div>
            <div class="pb-card-title">${h.cm.title.split('(')[0].trim()}</div>
            <div class="pb-card-sub">${h.cm.specialty}</div>
          </div>
        </div>
        <div class="pb-card-divider"></div>
        <div class="pb-card-certs">${h.cm.certifications.slice(0,3).map(c=>`<span class="pb-oc-cert">${c}</span>`).join('')}</div>
        <div class="pb-risk-row">${h.cm.risks.slice(0,2).map(r=>`<div class="pb-risk-item">${svgW}<span>${r}</span></div>`).join('')}</div>
      </div>
    </div>`;

  // ── Fan connector ─────────────────────────────────────────
  // pb-fan-bridge handles the v-stem + h-rail
  // each column's pb-col-stem-top provides the drop from h-rail to T1 card
  const fan = `
    <div class="pb-fan" style="width:100%">
      <div class="pb-vstem pb-root-stem"></div>
      <div class="pb-fan-rail-wrap">
        <div class="pb-h-rail" style="width:calc(100% - (200px * 1 / ${h.tier1.length} * 2))"></div>
      </div>
    </div>`;

  // ── Branch columns (T1 + T2 + T3 per column) ─────────────
  const cols = h.tier1.map((t, i) => {
    const cots = (t.cots && t.cots.length > 0) ? t.cots.slice(0, 5) : (TECH_COTS[t.id] || TECH_COTS.default).slice(0, 4);

    const t2html = t.tier2.slice(0, 3).map((sub, j) => `
      ${j > 0 ? '<div class="pb-vstem pb-col-stem" style="animation-delay:' + (i*80+j*100+200) + 'ms"></div>' : ''}
      <div class="pb-card pb-card--2 pb-appear" style="animation-delay:${i*60+j*80+300}ms">
        <div class="pb-card-head">
          <span class="pb-card-icon" style="font-size:1rem">${sub.icon}</span>
          <span class="pb-card-title" style="font-size:0.75rem">${sub.title.split('(')[0].split('/')[0].trim()}</span>
        </div>
        <span class="pb-t2-type">${sub.type}</span>
      </div>`).join('');

    const cotsHTML = cots.map(c => `<span class="pb-cots-chip">${c}</span>`).join('');

    return `
      <div class="pb-org-col">
        <div class="pb-vstem pb-col-stem-top" style="animation-delay:${i*60}ms"></div>
        <div class="pb-card pb-card--1 pb-appear" style="animation-delay:${i*60+100}ms">
          <div class="pb-card-head">
            <span class="pb-card-icon">${t.icon}</span>
            <span class="pb-card-title">${t.title.split('(')[0].trim()}</span>
          </div>
          <div class="pb-card-divider"></div>
          <div class="pb-risk-row">${t.risks.slice(0,2).map(r=>`<div class="pb-risk-item">${svgW}<span>${r}</span></div>`).join('')}</div>
        </div>
        <div class="pb-vstem pb-col-stem" style="animation-delay:${i*60+180}ms"></div>
        ${t2html}
        <div class="pb-vstem pb-col-stem pb-col-stem-cots" style="animation-delay:${i*60+450}ms"></div>
        <div class="pb-cots-cloud pb-appear" style="animation-delay:${i*60+500}ms">
          ${cotsHTML}
        </div>
      </div>`;
  }).join('');

  // ── Action bar ────────────────────────────────────────────
  const total = h.tier1.reduce((s,t)=>s+t.tier2.length,0);
  const cotsTotal = h.tier1.reduce((s,t)=> s + ((t.cots && t.cots.length > 0) ? t.cots.length : (TECH_COTS[t.id]||TECH_COTS.default).length), 0);
  const actionBar = `
    <div class="pb-action-bar pb-appear" style="animation-delay:${h.tier1.length*60+600}ms">
      <div class="pb-action-stat">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
        <strong>${h.product}</strong> · ${h.tier1.length} technologies · ${total} processes · ${cotsTotal} COTS parts
      </div>
      <div class="pb-action-btns">
        <button class="pb-btn pb-btn--ghost" id="pb-designers-btn">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="8" r="4"/><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7"/></svg>
          Find Designers
        </button>
        <button class="pb-btn pb-btn--ghost" id="pb-save-btn">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/></svg>
          Save
        </button>
        <button class="pb-btn pb-btn--primary" id="pb-chain-btn">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>
          Build Supply Chain
        </button>
      </div>
    </div>`;

  container.innerHTML = `
    <div class="pb-org">
      ${rootHTML}
      ${fan}
      <div class="pb-org-grid">${cols}</div>
      ${actionBar}
    </div>`;

  document.getElementById('pb-chain-btn')?.addEventListener('click', () => buildSupplyChain(h));
  document.getElementById('pb-designers-btn')?.addEventListener('click', () =>
    window.dispatchEvent(new CustomEvent('prd-nav-switch', { detail: { view: 'designers' } })));
  document.getElementById('pb-save-btn')?.addEventListener('click', () =>
    showPbToast(`"${h.product}" hierarchy saved`));
}

/* ── SUPPLY CHAIN ─────────────────────────────────────────── */
function buildSupplyChain(h) {
  const root = document.getElementById('pb-sc-root');
  if (scVisible) {
    root.innerHTML = ''; scVisible = false;
    document.getElementById('pb-chain-btn').innerHTML = `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg> Build Supply Chain`;
    return;
  }
  scVisible = true;
  document.getElementById('pb-chain-btn').innerHTML = `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="18 15 12 9 6 15"/></svg> Collapse`;

  const regionBtns = Object.entries(REGION_FLAGS).map(([code, flag]) =>
    `<button class="pb-rgn-chip ${selectedRegion===code?'active':''}" data-r="${code}">${flag} ${REGION_NAMES[code]}</button>`).join('');

  root.innerHTML = `
    <div class="pb-sc">
      <div class="pb-sc-inner">
        <div class="pb-sc-hdr">
          <div class="pb-sc-title">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>
            Supply Chain — <strong>&nbsp;${h.product}</strong>
          </div>
          <div class="pb-sc-region-row"><span>Region:</span><div class="pb-sc-regions" id="pb-sc-regions">${regionBtns}</div></div>
        </div>
        <div class="pb-sc-track-wrap"><div class="pb-sc-track" id="pb-sc-track">${renderTrack(h)}</div></div>
        <div class="pb-sc-footer">
          <button class="pb-sc-btn" id="pb-sc-rfq">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
            Request RFQ from All
          </button>
          <button class="pb-sc-btn pb-sc-btn--ghost" id="pb-sc-export">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
            Export Map
          </button>
        </div>
      </div>
    </div>`;

  root.querySelectorAll('.pb-rgn-chip').forEach(btn => {
    btn.addEventListener('click', () => {
      selectedRegion = btn.dataset.r;
      root.querySelectorAll('.pb-rgn-chip').forEach(b => b.classList.toggle('active', b.dataset.r === selectedRegion));
      document.getElementById('pb-sc-track').innerHTML = renderTrack(h);
    });
  });
  document.getElementById('pb-sc-rfq')?.addEventListener('click', () =>
    window.dispatchEvent(new CustomEvent('prd-nav-switch', { detail: { view: 'rfq' } })));
  document.getElementById('pb-sc-export')?.addEventListener('click', () => showPbToast('Supply chain map exported'));
  setTimeout(() => root.scrollIntoView({ behavior: 'smooth', block: 'start' }), 100);
}

function renderTrack(h) {
  const nodes = [{ label: h.cm.title.split('(')[0].trim(), icon: h.cm.icon, id: 'cm' },
    ...h.tier1.map(t => ({ label: t.title.split('(')[0].trim(), icon: t.icon, id: t.id }))];
  return nodes.map(n => {
    const sups = getSuppliers(n.id).slice(0, 2);
    return `
      <div class="pb-sc-col">
        <div class="pb-sc-col-header">
          <div class="pb-sc-dot"></div>
          <div class="pb-sc-col-icon">${n.icon}</div>
          <div class="pb-sc-col-name">${n.label}</div>
        </div>
        <div class="pb-sc-cards">
          ${sups.length ? sups.map((s,i)=>`
            <div class="pb-sc-card ${i===0?'pb-sc-card--top':''}">
              ${i===0?'<div class="pb-sc-best">Best Match</div>':''}
              <div class="pb-sc-sname">${s.name}</div>
              <div class="pb-sc-smeta">${REGION_FLAGS[s.region]||'🌐'} ${s.city}</div>
              <div class="pb-sc-slead">${s.lead}</div>
              <div class="pb-sc-scerts">${s.certifications.slice(0,2).map(c=>`<span>${c}</span>`).join('')}</div>
            </div>`).join('') : `<div class="pb-sc-empty">Searching…</div>`}
        </div>
      </div>`;
  }).join('');
}

function getSuppliers(id) {
  const list = TECH_SUPPLIER_MAP[id] || [];
  const reg = list.filter(s => s.region === selectedRegion);
  return reg.length ? reg : list;
}

function showPbToast(msg) {
  const t = document.createElement('div');
  t.className = 'de-toast';
  t.innerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg> ${msg}`;
  document.body.appendChild(t);
  requestAnimationFrame(() => t.classList.add('de-toast--visible'));
  setTimeout(() => { t.classList.remove('de-toast--visible'); setTimeout(() => t.remove(), 400); }, 3000);
}

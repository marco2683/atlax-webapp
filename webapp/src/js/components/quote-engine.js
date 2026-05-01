/**
 * quote-engine.js  v2
 * ────────────────────────────────────────────────────────
 * Configurable manufacturing quote engine driven by
 * pricing-config.json — a human-editable JSON file.
 *
 * Technology is the top-level driver:
 *  → Materials, tooling, setup fees, lead times, finishes
 *    all cascade from the selected technology.
 *
 * Usage:
 *   import { calculateQuote, PRICING_CONFIG, getTechConfig,
 *            getMaterialsForTech, getFinishesForTech } from './quote-engine.js';
 * ────────────────────────────────────────────────────────
 */

import { getActivePricingConfig } from '../utils/pricing-loader.js';

// ═══════════════════════════════════════════════════════
// HELPERS — Technology-driven lookups
// ═══════════════════════════════════════════════════════

/**
 * Get full technology config object.
 * @param {string} techKey - e.g. 'cnc', 'injection', '3dp'
 */
export function getTechConfig(techKey) {
  const config = getActivePricingConfig();
  return config.technologies[techKey] || null;
}

/**
 * Get materials list for a technology (for populating dropdowns).
 * @returns {{ key: string, label: string, priceIndex: number, density: number }[]}
 */
export function getMaterialsForTech(techKey) {
  const tech = getTechConfig(techKey);
  if (!tech?.materials) return [];
  return Object.entries(tech.materials).map(([key, mat]) => ({
    key,
    label: mat.label,
    priceIndex: mat.priceIndex,
    density: mat.density,
    tech: mat.tech || null,
  }));
}

/**
 * Get surface finishes for a technology.
 * @returns {{ key: string, label: string, costPerCm2: number }[]}
 */
export function getFinishesForTech(techKey) {
  const tech = getTechConfig(techKey);
  if (!tech?.surfaceFinishes) return [];
  return Object.entries(tech.surfaceFinishes).map(([key, f]) => ({
    key,
    label: f.label,
    costPerCm2: f.costPerCm2,
  }));
}

/**
 * Check whether a technology requires tooling (one-off cost).
 */
export function techHasTooling(techKey) {
  const tech = getTechConfig(techKey);
  return tech?.hasTooling === true;
}

// ═══════════════════════════════════════════════════════
// QUOTE CALCULATION
// ═══════════════════════════════════════════════════════

/**
 * Calculate an instant manufacturing quote.
 *
 * @param {object} geometry - Output from geometry-analyzer.js
 * @param {object} config   - Form configuration
 * @param {string} config.process      - Process key (cnc, injection, 3dp, etc.)
 * @param {string} config.material     - Material key from the tech's materials
 * @param {string} config.finish       - Surface finish key
 * @param {string} config.tolerance    - Tolerance key
 * @param {string} config.leadTime     - Lead time key
 * @param {number} config.quantity     - Order quantity
 * @param {boolean} config.dfm        - Whether DFM feedback requested
 * @param {string} [config.color]      - Part color
 * @param {string} [config.threads]    - Threads & inserts spec
 * @param {string} [config.customDetails] - Custom post-processing notes
 * @returns {QuoteResult}
 */
export function calculateQuote(geometry, config) {
  const PRICING_CONFIG = getActivePricingConfig();
  const G = PRICING_CONFIG.globalSettings;
  const tech = getTechConfig(config.process);

  if (!tech) {
    console.warn('[QuoteEngine] Unknown process:', config.process);
    const eq = emptyQuote();
    eq.techLabel = config.process || 'Other';
    eq.materialLabel = config.material || 'Custom Material';
    return eq;
  }

  // ── Material specifics ─────────────────────────────────────
  const materialDef = tech.materials?.[config.material];
  const rawCostMult = materialDef?.rawCostMultiplier || 1.0;
  const processingDifficulty = materialDef?.processingDifficultyMultiplier || 1.0;
  const density = materialDef?.density || 1.0;
  const materialLabel = materialDef?.label || config.material || 'Default';
  const baselinePriceKg = tech.baselineMaterialPriceKg || 5.0;

  // ── Estimated weight ──────────────────────────────────
  const estimatedWeightG = geometry.volume * density; // cm³ × g/cm³ = grams

  // 1. Raw Material Purchasing Cost
  let purchaseVolumeCm3 = geometry.volume * (tech.scrapWasteMultiplier || 1.0);
  let rawMaterialPriceCm3 = (baselinePriceKg / 1000) * density * rawCostMult;
  let materialCost = purchaseVolumeCm3 * rawMaterialPriceCm3;

  // 2. Processing Cost (Time-Based)
  let processingCost = 0;
  const mfgType = tech.manufacturingType || 'subtractive';
  const hourlyRate = tech.machineRateUsdPerHour || 50;
  
  if (mfgType === 'subtractive') {
    const volumeRemoved = Math.max(0, purchaseVolumeCm3 - geometry.volume);
    const mrr = tech.baselineRemovalRateCm3PerMin || 25;
    const baseMachineTimeMins = 15 + (volumeRemoved / mrr); 
    const totalMachineTimeMins = baseMachineTimeMins * processingDifficulty;
    processingCost = (totalMachineTimeMins / 60) * hourlyRate;
  } 
  else if (mfgType === 'formative') {
    const baseCycleSecs = tech.baseCycleTimeSecs || 20;
    const coolingSecsPerCm3 = tech.volumetricCoolingSecsPerCm3 || 0.5;
    const cycleTimeSecs = baseCycleSecs + (geometry.volume * coolingSecsPerCm3);
    const totalCycleTimeMins = (cycleTimeSecs / 60) * processingDifficulty;
    processingCost = (totalCycleTimeMins / 60) * hourlyRate;
  }
  else if (mfgType === 'additive') {
    const extrusionRate = tech.baseExtrusionRateCm3PerHour || 15;
    const printTimeHours = (purchaseVolumeCm3 / extrusionRate) * processingDifficulty;
    processingCost = printTimeHours * hourlyRate;
  }
  else if (mfgType === 'sheet') {
    const cutRate = tech.baseCutRateCm2PerMin || 50;
    const estimatedCutLengthCm = Math.sqrt(geometry.surfaceArea) * 4; 
    const cutTimeMins = (estimatedCutLengthCm / cutRate) * processingDifficulty;
    processingCost = (cutTimeMins / 60) * hourlyRate;
  }

  // ── Finish cost ───────────────────────────────────────
  const finishDef = tech.surfaceFinishes?.[config.finish];
  const finishRate = finishDef?.costPerCm2 || 0;
  const finishCost = geometry.surfaceArea * finishRate;

  // ── Multipliers ───────────────────────────────────────
  const toleranceMult = G.toleranceMultiplier[config.tolerance] || 1.0;
  const leadTimeMult = G.leadTimeMultiplier[config.leadTime] || 1.0;

  // Complexity from triangle count
  let complexityMult = 1.0;
  for (const tier of G.complexityMultiplier) {
    if (geometry.triangleCount <= tier.maxTriangles) {
      complexityMult = tier.multiplier;
      break;
    }
  }

  // ── Setup Fee Analysis (Dynamic vs Flat) ───────────────
  const qty = Math.max(1, config.quantity);
  let setupFee = 0;
  
  if (tech.setupConfig) {
    const sConf = tech.setupConfig;
    let baseSetup = sConf.baseFee || 0;
    
    // Size tier lookup
    if (sConf.sizeTiers && sConf.sizeTiers.length > 0) {
      const sortedTiers = [...sConf.sizeTiers].sort((a, b) => a.maxVolumeCm3 - b.maxVolumeCm3);
      const matchedTier = sortedTiers.find(t => geometry.volume <= t.maxVolumeCm3) || sortedTiers[sortedTiers.length - 1];
      baseSetup += (matchedTier.adder || 0);
    }
    
    // Technologies like CNC and Sheet Metal require complex CAM programming that scales heavily with part complexity
    if (sConf.applyComplexityToBase === true) {
      setupFee = baseSetup * complexityMult;
    } else {
      setupFee = baseSetup;
    }
  } else {
    // Fallback for missing/older tech configurations
    setupFee = tech.setupFeeUsd || 0;
  }
  
  const setupPerUnit = setupFee / qty;

  // ── Tooling cost (one-off, NOT split by quantity) ─────
  let toolingCost = 0;
  let cavityCount = 1;

  if (tech.hasTooling && tech.tooling) {
    const baseCostDb = tech.tooling.baseCost || 2500;
    const saFactor = tech.tooling.costPerCm2SurfaceArea || 0.4; // Slightly reduced pure surface area dependence
    
    // Extrapolate bounding box volume (cm3) to estimate Mold Base steel size requirement
    const bboxVolCm3 = (geometry.boundingBox.x * geometry.boundingBox.y * geometry.boundingBox.z) / 1000;
    const moldBaseVolAdder = bboxVolCm3 * 0.28; 

    // Combine for a smart total base tooling value resilient to massive parts
    const baseToolVal = baseCostDb + (geometry.surfaceArea * saFactor) + moldBaseVolAdder;
    
    // Tooling Life / Tier multipliers
    const toolingTypeMults = tech.tooling.tierMultipliers || {
      prototype: 0.5,     // Aluminum/Soft steel
      low_volume: 1.0,    // Standard P20
      high_volume: 2.2    // Hardened H13, hot drops
    };
    const typeMult = toolingTypeMults[config.toolingType] || 1.0;

    // Determine Physical Limitations: Massive parts cannot just arbitrary have 8-cavities 
    // due to sheer press tonnage restraints (e.g. 2900cm3 part physically needs a 500-800T press per cavity!)
    let maxCavities = 8;
    if (bboxVolCm3 > 15000) maxCavities = 1;      // > 15 Liter -> physically restrictive (1-cav max)
    else if (bboxVolCm3 > 4000) maxCavities = 2;  // > 4 Liter -> 2-cav max
    else if (bboxVolCm3 > 1000) maxCavities = 4;  // > 1 Liter -> 4-cav max

    // Determine Target Cavitation
    if (config.toolingCavities === 'auto' || !config.toolingCavities) {
      if (qty < 1000) cavityCount = 1;
      else if (qty < 10000) cavityCount = 2;
      else if (qty < 50000) cavityCount = 4;
      else cavityCount = 8;
    } else {
      cavityCount = parseInt(config.toolingCavities) || 1;
    }

    // Intersect target cavities with physical physical cap boundaries
    cavityCount = Math.min(cavityCount, maxCavities);

    // Mold cost scales with cavities, but sub-linearly (economies of scale in mold making)
    // 1 -> 1x, 2 -> ~1.36x, 4 -> ~1.86x, 8 -> ~2.54x
    const cavityCostMult = Math.pow(cavityCount, 0.45);

    toolingCost = baseToolVal * typeMult * cavityCostMult;

    // CRITICAL DFM LOGIC: If a mold has 4 cavities, the injection cycle produces 4 parts at once.
    // Therefore, the machine processing time *per part* is divided.
    processingCost = processingCost / cavityCount;
  }

  // ── Cost Synthesis (Before Overheads) ─────────────────
  const baseCostPerUnit = (materialCost + processingCost + finishCost + setupPerUnit);
  const complexityAdjustedCost = baseCostPerUnit * toleranceMult * complexityMult;

  // ── Quantity & Discounts ──────────────────────────────
  let qtyDiscount = 1.0;
  for (const tier of G.quantityDiscountBreaks) {
    if (qty >= tier.minQty) qtyDiscount = tier.multiplier;
  }
  const scaledUnitCost = complexityAdjustedCost * leadTimeMult * qtyDiscount;

  // ── Overheads & Margin Layer ──────────────────────────
  const globalMargin = getActivePricingConfig().globalMarginMultiplier || 1.30;
  const finalUnitPrice = scaledUnitCost * globalMargin;

  // ── Add-ons ───────────────────────────────────────────
  const dfmFee = config.dfm ? G.dfmFee : 0;
  const colorFee = (config.color && config.color.length > 2) ? G.colorMatchingFee : 0;
  const threadsFee = (config.threads && config.threads.length > 2) ? G.threadsFee : 0;
  const customMult = (config.customDetails && config.customDetails.length > 10) ? G.customComplexityAdder : 1.0;

  // ── Totals ────────────────────────────────────────────
  const unitPriceFinalized = finalUnitPrice * customMult;
  const partsSubtotal = unitPriceFinalized * qty;
  const totalPrice = partsSubtotal + toolingCost + dfmFee + colorFee + threadsFee;

  return {
    // ── Breakdown ─────────────────────────────────────
    techLabel:       tech.label,
    materialLabel,
    materialCost:    round2(materialCost),
    processingCost:  round2(processingCost),
    finishCost:      round2(finishCost),
    setupFee:        round2(setupFee),
    setupPerUnit:    round2(setupPerUnit),
    toolingCost:     round2(toolingCost),
    hasTooling:      tech.hasTooling,
    colorFee:        round2(colorFee),
    threadsFee:      round2(threadsFee),
    toleranceMult,
    leadTimeMult,
    complexityMult,
    qtyDiscount:     round2((1 - qtyDiscount) * 100),
    unitPrice:       round2(unitPriceFinalized), // Aliased for compatibility
    unitPriceWithSetup: round2(unitPriceFinalized), // Aliased for compatibility
    dfmFee:          round2(dfmFee),
    quantity:        qty,
    volume:          round2(geometry.volume),
    surfaceArea:     round2(geometry.surfaceArea),
    estimatedWeight: round2(estimatedWeightG),
    partsSubtotal:   round2(partsSubtotal),
    totalPrice:      round2(totalPrice),

    // ── Display helpers ──────────────────────────────
    formatted: {
      unitPrice:       `US$${round2(unitPriceFinalized).toFixed(2)}`,
      totalPrice:      `US$${round2(totalPrice).toFixed(2)}`,
      perUnit:         `US$${round2(unitPriceFinalized).toFixed(2)} ea.`,
      toolingCost:     `US$${round2(toolingCost).toFixed(2)}`,
      estimatedWeight: `${round2(estimatedWeightG)}g`,
    },
  };
}

function emptyQuote() {
  return {
    techLabel: '—', materialLabel: '—', materialCost: 0, processingCost: 0, finishCost: 0,
    setupFee: 0, setupPerUnit: 0, toolingCost: 0, hasTooling: false,
    colorFee: 0, threadsFee: 0, toleranceMult: 1, leadTimeMult: 1,
    complexityMult: 1, qtyDiscount: 0, unitPrice: 0, unitPriceWithSetup: 0,
    dfmFee: 0, quantity: 0, volume: 0, surfaceArea: 0, estimatedWeight: 0,
    partsSubtotal: 0, totalPrice: 0,
    formatted: { unitPrice: 'US$0.00', totalPrice: 'US$0.00', perUnit: 'US$0.00 ea.', toolingCost: 'US$0.00', estimatedWeight: '0g' },
  };
}

function round2(v) { return Math.round(v * 100) / 100; }

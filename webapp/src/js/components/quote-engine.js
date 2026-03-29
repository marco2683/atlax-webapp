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

import PRICING_CONFIG from '../data/pricing-config.json';
export { PRICING_CONFIG };

// ═══════════════════════════════════════════════════════
// HELPERS — Technology-driven lookups
// ═══════════════════════════════════════════════════════

/**
 * Get full technology config object.
 * @param {string} techKey - e.g. 'cnc', 'injection', '3dp'
 */
export function getTechConfig(techKey) {
  return PRICING_CONFIG.technologies[techKey] || null;
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
  const G = PRICING_CONFIG.globalSettings;
  const tech = getTechConfig(config.process);

  if (!tech) {
    console.warn('[QuoteEngine] Unknown process:', config.process);
    return emptyQuote();
  }

  // ── Material cost ─────────────────────────────────────
  const materialDef = tech.materials?.[config.material];
  const priceIndex = materialDef?.priceIndex || 1.0;
  const density = materialDef?.density || 1.0;
  const materialLabel = materialDef?.label || config.material || 'Default';
  const baseCost = tech.baseCostPerCm3 * priceIndex;
  const materialCost = geometry.volume * baseCost;

  // ── Estimated weight ──────────────────────────────────
  const estimatedWeightG = geometry.volume * density; // cm³ × g/cm³ = grams

  // ── Finish cost ───────────────────────────────────────
  const finishDef = tech.surfaceFinishes?.[config.finish];
  const finishRate = finishDef?.costPerCm2 || 0;
  const finishCost = geometry.surfaceArea * finishRate;

  // ── Setup fee (one-off per run, amortized by quantity) ──
  const setupFee = tech.setupFee || 0;

  // ── Tooling cost (one-off, NOT split by quantity) ─────
  let toolingCost = 0;
  if (tech.hasTooling && tech.tooling) {
    toolingCost = (tech.tooling.baseCost || 0) +
                  (geometry.surfaceArea * (tech.tooling.costPerCm2SurfaceArea || 0));
  }

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

  // ── Unit price ────────────────────────────────────────
  const baseUnit = (materialCost + finishCost) * toleranceMult * complexityMult;
  const adjustedUnit = baseUnit * leadTimeMult;

  // ── Quantity pricing ──────────────────────────────────
  const qty = Math.max(1, config.quantity);
  let qtyDiscount = 1.0;
  for (const tier of G.quantityDiscountBreaks) {
    if (qty >= tier.minQty) qtyDiscount = tier.multiplier;
  }
  const unitPrice = adjustedUnit * qtyDiscount;

  // ── Add-ons ───────────────────────────────────────────
  const dfmFee = config.dfm ? G.dfmFee : 0;
  const colorFee = (config.color && config.color.length > 2) ? G.colorMatchingFee : 0;
  const threadsFee = (config.threads && config.threads.length > 2) ? G.threadsFee : 0;
  const customMult = (config.customDetails && config.customDetails.length > 10) ? G.customComplexityAdder : 1.0;

  // ── Setup per unit (amortized) ────────────────────────
  const setupPerUnit = setupFee / qty;

  // ── Totals ────────────────────────────────────────────
  const unitPriceWithSetup = (unitPrice * customMult) + setupPerUnit;
  const partsSubtotal = unitPriceWithSetup * qty;
  const totalPrice = partsSubtotal + toolingCost + dfmFee + colorFee + threadsFee;

  return {
    // ── Breakdown ─────────────────────────────────────
    techLabel:       tech.label,
    materialLabel,
    materialCost:    round2(materialCost),
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
    unitPrice:       round2(unitPrice),
    unitPriceWithSetup: round2(unitPriceWithSetup),
    dfmFee:          round2(dfmFee),
    quantity:        qty,
    volume:          round2(geometry.volume),
    surfaceArea:     round2(geometry.surfaceArea),
    estimatedWeight: round2(estimatedWeightG),
    partsSubtotal:   round2(partsSubtotal),
    totalPrice:      round2(totalPrice),

    // ── Display helpers ──────────────────────────────
    formatted: {
      unitPrice:       `$${round2(unitPriceWithSetup).toFixed(2)}`,
      totalPrice:      `$${round2(totalPrice).toFixed(2)}`,
      perUnit:         `$${round2(unitPriceWithSetup).toFixed(2)} ea.`,
      toolingCost:     `$${round2(toolingCost).toFixed(2)}`,
      estimatedWeight: `${round2(estimatedWeightG)}g`,
    },
  };
}

function emptyQuote() {
  return {
    techLabel: '—', materialLabel: '—', materialCost: 0, finishCost: 0,
    setupFee: 0, setupPerUnit: 0, toolingCost: 0, hasTooling: false,
    colorFee: 0, threadsFee: 0, toleranceMult: 1, leadTimeMult: 1,
    complexityMult: 1, qtyDiscount: 0, unitPrice: 0, unitPriceWithSetup: 0,
    dfmFee: 0, quantity: 0, volume: 0, surfaceArea: 0, estimatedWeight: 0,
    partsSubtotal: 0, totalPrice: 0,
    formatted: { unitPrice: '$0.00', totalPrice: '$0.00', perUnit: '$0.00 ea.', toolingCost: '$0.00', estimatedWeight: '0g' },
  };
}

function round2(v) { return Math.round(v * 100) / 100; }

const fs = require('fs');

const path = 'src/js/data/pricing-config.json';
const data = JSON.parse(fs.readFileSync(path));

data._meta.notes = "Hierarchical costing model: Material Cost + Machining Time + Setup Fee + Tooling -> + Margin";
data.globalMarginMultiplier = 1.30;

// CNC
data.technologies.cnc.manufacturingType = "subtractive";
data.technologies.cnc.setupFeeUsd = 50;
data.technologies.cnc.machineRateUsdPerHour = 40;
data.technologies.cnc.baselineMaterialPriceKg = 4.0; // Al6061 T6 billet
data.technologies.cnc.baselineRemovalRateCm3PerMin = 25; // Al6061 MRR
data.technologies.cnc.scrapWasteMultiplier = 1.5; // Starts with a blank 50% larger than part
delete data.technologies.cnc.baseCostPerCm3;
delete data.technologies.cnc.setupFee;

Object.keys(data.technologies.cnc.materials).forEach(k => {
    let mat = data.technologies.cnc.materials[k];
    mat.rawCostMultiplier = mat.priceIndex;
    mat.processingDifficultyMultiplier = mat.priceIndex; 
    delete mat.priceIndex;
});

// Injection
data.technologies.injection.manufacturingType = "formative";
data.technologies.injection.setupFeeUsd = 150;
data.technologies.injection.machineRateUsdPerHour = 35;
data.technologies.injection.baselineMaterialPriceKg = 3.0; // ABS pellets
data.technologies.injection.baseCycleTimeSecs = 15;
data.technologies.injection.volumetricCoolingSecsPerCm3 = 0.5;
data.technologies.injection.scrapWasteMultiplier = 1.05; // 5% runner waste
delete data.technologies.injection.baseCostPerCm3;
delete data.technologies.injection.setupFee;

Object.keys(data.technologies.injection.materials).forEach(k => {
    let mat = data.technologies.injection.materials[k];
    mat.rawCostMultiplier = mat.priceIndex;
    mat.processingDifficultyMultiplier = mat.priceIndex;
    delete mat.priceIndex;
});

// 3DP
data.technologies['3dp'].manufacturingType = "additive";
data.technologies['3dp'].setupFeeUsd = 15;
data.technologies['3dp'].machineRateUsdPerHour = 10;
data.technologies['3dp'].baselineMaterialPriceKg = 20.0; // PLA filament
data.technologies['3dp'].baseExtrusionRateCm3PerHour = 10;
data.technologies['3dp'].scrapWasteMultiplier = 1.25; // 25% support
delete data.technologies['3dp'].baseCostPerCm3;
delete data.technologies['3dp'].setupFee;

Object.keys(data.technologies['3dp'].materials).forEach(k => {
    let mat = data.technologies['3dp'].materials[k];
    mat.rawCostMultiplier = mat.priceIndex;
    mat.processingDifficultyMultiplier = mat.priceIndex;
    delete mat.priceIndex;
});

// Sheet Metal
data.technologies.sheet.manufacturingType = "sheet";
data.technologies.sheet.setupFeeUsd = 60;
data.technologies.sheet.machineRateUsdPerHour = 50; // Laser cutter
data.technologies.sheet.baselineMaterialPriceKg = 3.5; // Al5052 sheet
data.technologies.sheet.baseCutRateCm2PerMin = 50; 
data.technologies.sheet.scrapWasteMultiplier = 1.30; // 30% nesting waste
delete data.technologies.sheet.baseCostPerCm3;
delete data.technologies.sheet.setupFee;

Object.keys(data.technologies.sheet.materials).forEach(k => {
    let mat = data.technologies.sheet.materials[k];
    mat.rawCostMultiplier = mat.priceIndex;
    mat.processingDifficultyMultiplier = mat.priceIndex;
    delete mat.priceIndex;
});

// Die Casting
data.technologies.casting.manufacturingType = "formative";
data.technologies.casting.setupFeeUsd = 350;
data.technologies.casting.machineRateUsdPerHour = 45;
data.technologies.casting.baselineMaterialPriceKg = 2.5; // A380 Ingot
data.technologies.casting.baseCycleTimeSecs = 20;
data.technologies.casting.volumetricCoolingSecsPerCm3 = 0.2;
data.technologies.casting.scrapWasteMultiplier = 1.10; // 10% lost/waste
delete data.technologies.casting.baseCostPerCm3;
delete data.technologies.casting.setupFee;

Object.keys(data.technologies.casting.materials).forEach(k => {
    let mat = data.technologies.casting.materials[k];
    mat.rawCostMultiplier = mat.priceIndex;
    mat.processingDifficultyMultiplier = mat.priceIndex;
    delete mat.priceIndex;
});

// Vac Casting
data.technologies.vac_casting.manufacturingType = "formative";
data.technologies.vac_casting.setupFeeUsd = 120;
data.technologies.vac_casting.machineRateUsdPerHour = 20;
data.technologies.vac_casting.baselineMaterialPriceKg = 15.0; // PU Resin
data.technologies.vac_casting.baseCycleTimeSecs = 600; // 10 minutes to cure
data.technologies.vac_casting.volumetricCoolingSecsPerCm3 = 1;
data.technologies.vac_casting.scrapWasteMultiplier = 1.15;
delete data.technologies.vac_casting.baseCostPerCm3;
delete data.technologies.vac_casting.setupFee;

Object.keys(data.technologies.vac_casting.materials).forEach(k => {
    let mat = data.technologies.vac_casting.materials[k];
    mat.rawCostMultiplier = mat.priceIndex;
    mat.processingDifficultyMultiplier = mat.priceIndex;
    delete mat.priceIndex;
});

fs.writeFileSync(path, JSON.stringify(data, null, 2));
console.log("JSON schema updated successfully.");

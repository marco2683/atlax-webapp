const fs = require('fs');

const path = 'src/js/data/pricing-config.json';
const data = JSON.parse(fs.readFileSync(path));

// 1. CNC Setup Config
data.technologies.cnc.setupConfig = {
  baseFee: 25, // CAM programming baseline
  sizeTiers: [
    { maxVolumeCm3: 150, adder: 15 },    // Fits easy in standard 6" vise
    { maxVolumeCm3: 1000, adder: 45 },   // Needs larger stock, maybe soft jaws
    { maxVolumeCm3: 5000, adder: 95 },   // Needs heavy lifting, step clamps
    { maxVolumeCm3: 999999, adder: 180 } // Massive billet, complex indication
  ],
  applyComplexityToBase: true // Triangles/complexity increases CAM time
};
delete data.technologies.cnc.setupFeeUsd;

// 2. Injection Moulding Setup Config
data.technologies.injection.setupConfig = {
  baseFee: 100, // Barrel heating, basic purge
  sizeTiers: [
    { maxVolumeCm3: 50, adder: 25 },     // 50-Ton Press (fast mold hang)
    { maxVolumeCm3: 350, adder: 75 },    // 150-Ton Press
    { maxVolumeCm3: 1500, adder: 150 },  // 400-Ton Press (crane needed to hang tool)
    { maxVolumeCm3: 999999, adder: 300 } // 1000-Ton+ Press
  ],
  applyComplexityToBase: false 
};
delete data.technologies.injection.setupFeeUsd;

// 3. 3D Printing Setup Config
data.technologies['3dp'].setupConfig = {
  baseFee: 10, // Nesting on build tray 
  sizeTiers: [
    { maxVolumeCm3: 100, adder: 0 },
    { maxVolumeCm3: 500, adder: 5 },     // Takes up more bed space, careful orientation
    { maxVolumeCm3: 999999, adder: 15 }  // Large part limits batching, high failure risk
  ],
  applyComplexityToBase: false
};
delete data.technologies['3dp'].setupFeeUsd;

// 4. Sheet Metal Setup Config
data.technologies.sheet.setupConfig = {
  baseFee: 20, // Nesting software path generation
  sizeTiers: [
    { maxVolumeCm3: 500, adder: 10 },    // Easy to handle manually
    { maxVolumeCm3: 2000, adder: 25 },   // Requires 2 people or lifter
    { maxVolumeCm3: 999999, adder: 50 }  // Huge sheet, large press brake bending
  ],
  applyComplexityToBase: true // Complex origami folds = lots of brake setup
};
delete data.technologies.sheet.setupFeeUsd;

// 5. Die Casting Setup Config
data.technologies.casting.setupConfig = {
  baseFee: 150, // Furnace prep, die lube setup
  sizeTiers: [
    { maxVolumeCm3: 200, adder: 50 },    // Small machine
    { maxVolumeCm3: 1000, adder: 120 },  // Mid-size machine (requires heavy crane)
    { maxVolumeCm3: 999999, adder: 250 } // Massive automotive-scale machine
  ],
  applyComplexityToBase: false
};
delete data.technologies.casting.setupFeeUsd;

// 6. Vacuum Casting Setup Config
data.technologies.vac_casting.setupConfig = {
  baseFee: 40, // Pattern prep and silicone mixing
  sizeTiers: [
    { maxVolumeCm3: 100, adder: 10 },    // Small pour box
    { maxVolumeCm3: 500, adder: 35 },    // Medium mould, more silicone
    { maxVolumeCm3: 999999, adder: 80 }  // Giant silicone mould, vacuum chamber limit
  ],
  applyComplexityToBase: true // Complex master means complex parting lines 
};
delete data.technologies.vac_casting.setupFeeUsd;

fs.writeFileSync(path, JSON.stringify(data, null, 2));
console.log("Setup fees upgraded to hierarchical bounds.");

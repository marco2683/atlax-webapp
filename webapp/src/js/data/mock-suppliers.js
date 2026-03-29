/* ============================================================
   PRD — Mock Supplier Data Aggregator
   ============================================================ */

import { MOLDING_SUPPLIERS } from './Suppliers/molding.js';
import { CNC_SUPPLIERS } from './Suppliers/cnc.js';
import { ELECTRONICS_SUPPLIERS } from './Suppliers/electronics.js';
import { FINISHING_SUPPLIERS } from './Suppliers/finishing.js';
import { CASTING_SUPPLIERS } from './Suppliers/casting.js';
import { MOTORS_SUPPLIERS } from './Suppliers/motors.js';
import { PROTOTYPING_SUPPLIERS } from './Suppliers/prototyping.js';
import { DESIGN_SUPPLIERS } from './Suppliers/design.js';

export const MOCK_SUPPLIERS = [
  ...MOLDING_SUPPLIERS,
  ...CNC_SUPPLIERS,
  ...ELECTRONICS_SUPPLIERS,
  ...FINISHING_SUPPLIERS,
  ...CASTING_SUPPLIERS,
  ...MOTORS_SUPPLIERS,
  ...PROTOTYPING_SUPPLIERS,
  ...DESIGN_SUPPLIERS,
];

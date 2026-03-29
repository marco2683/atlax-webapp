/* ============================================================
   PRD — Filter Pills v3 (sequential cascading selector)
   ============================================================ */

/**
 * Initialize the sequential selector flow: Type → Mode → Stage.
 * Each step enables the next when a selection is made.
 * Also handles region chip multi-select.
 * @param {Function} onChange - Callback with { mode, stage, searchType, regions }
 */
export function initFilterPills(onChange) {
  const state = {
    searchType: 'suppliers',
    regions: [],
  };

  // ── Step 1: Search Type (I'm looking for...) ───────────
  const stepType = document.getElementById('step-type');

  const typeBtns = stepType?.querySelectorAll('.selector-btn[data-type]');
  typeBtns?.forEach(btn => {
    btn.addEventListener('click', () => {
      typeBtns.forEach(b => b.classList.remove('selector-btn--active'));
      btn.classList.add('selector-btn--active');
      state.searchType = btn.dataset.type;

      // Update search placeholder
      const input = document.getElementById('search-input');
      if (input) {
        const placeholders = {
          suppliers: 'e.g. injection moulding, CNC machining, PCBA assembly...',
          rfq: 'Instant Quote Engine: Upload your design for pricing...',
          part: 'e.g. stepper motor, ball bearing, M3 brass insert...',
          product: 'e.g. drone, lab pipette, power bank, smart watch...',
        };
        input.placeholder = placeholders[state.searchType] || '';
      }
      emit();
    });
  });

  // ── Region chips (multi-select) ────────────────────────
  const regionChips = document.querySelectorAll('.region-chip');
  regionChips.forEach(chip => {
    chip.addEventListener('click', () => {
      const region = chip.dataset.region;
      const idx = state.regions.indexOf(region);

      if (idx >= 0) {
        state.regions.splice(idx, 1);
        chip.classList.remove('region-chip--active');
      } else {
        state.regions.push(region);
        chip.classList.add('region-chip--active');
      }
      emit();
    });
  });

  function emit() {
    if (typeof onChange === 'function') onChange({ ...state });
  }

  return state;
}

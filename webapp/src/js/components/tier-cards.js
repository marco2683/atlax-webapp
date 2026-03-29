/* ============================================================
   PRD — Tier Cards (v2 — modal-based)
   ============================================================ */
import { setCurrentTier } from './supplier-carousel.js';

const TIERS = [
  {
    id: 'free',
    name: 'Free',
    price: '$0',
    priceSuffix: '',
    description: 'Basic search with 3 results per day. Public data only — perfect for exploring the platform.',
    cta: 'Get Started',
    cssClass: 'tier-card--free',
  },
  {
    id: 'contacts',
    name: 'Contacts',
    price: '$49',
    priceSuffix: '/mo',
    description: 'Full contact details including email, phone, and WeChat. Direct supplier outreach enabled.',
    cta: 'Unlock Contacts',
    cssClass: 'tier-card--contacts',
  },
  {
    id: 'intel',
    name: 'Intelligence',
    price: '$199',
    priceSuffix: '/mo',
    description: 'Audit reports, factory-vs-trader scores, technical specs, satellite imagery, and risk analysis.',
    cta: 'Get Intelligence',
    cssClass: 'tier-card--intel',
  },
  {
    id: 'consult',
    name: 'MJS Consulting',
    price: 'Custom',
    priceSuffix: '',
    description: 'Full-service: supply chain strategy, factory audits, RFQ management, and on-ground support in Asia.',
    cta: 'Talk to Us',
    cssClass: 'tier-card--consult',
  },
];

/**
 * Initialize tier cards in the pricing modal.
 * @param {Function} onTierSelect - Callback(tierId)
 */
export function initTierCards(onTierSelect) {
  const grid = document.getElementById('pricing-grid');
  const fab = document.getElementById('pricing-fab');
  const backdrop = document.getElementById('pricing-backdrop');
  const modal = document.getElementById('pricing-modal');
  const closeBtn = document.getElementById('pricing-close');

  if (!grid) return;

  // Render cards into modal grid
  grid.innerHTML = TIERS.map(t => `
    <div class="tier-card ${t.cssClass}" data-tier="${t.id}">
      <div class="tier-card__header">
        <div class="tier-card__name">${t.name}</div>
        <div class="tier-card__price">${t.price}<small>${t.priceSuffix}</small></div>
      </div>
      <p class="tier-card__desc">${t.description}</p>
      <button class="tier-card__cta-btn">${t.cta}</button>
    </div>
  `).join('');

  // Open modal
  fab?.addEventListener('click', () => {
    backdrop?.classList.remove('hidden');
    modal?.classList.remove('hidden');
  });

  // Close modal
  function closeModal() {
    backdrop?.classList.add('hidden');
    modal?.classList.add('hidden');
  }

  closeBtn?.addEventListener('click', closeModal);
  backdrop?.addEventListener('click', closeModal);

  // Tier click handlers
  grid.querySelectorAll('.tier-card__cta-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const tierId = btn.closest('.tier-card').dataset.tier;
      console.log('[PRD] Tier selected:', tierId);
      
      // Update local carousel state
      setCurrentTier(tierId);
      
      // Notify main app state
      if (onTierSelect) onTierSelect(tierId);
      
      closeModal(); // Close the modal to show the unblurred results immediately
    });
  });
}
/**
 * Open the pricing modal.
 */
export function openTierModal() {
  const backdrop = document.getElementById('pricing-backdrop');
  const modal = document.getElementById('pricing-modal');
  backdrop?.classList.remove('hidden');
  modal?.classList.remove('hidden');
}

/* ================================================================
   Portfolio Detail Modal — Controller
   Opens a glass-panel overlay when clicking a portfolio masonry item.
   ================================================================ */
(function () {
  'use strict';

  // Inject modal container into the DOM
  function injectModal() {
    if (document.getElementById('portfolio-detail-modal')) return;

    const html = `
      <div class="portfolio-modal-overlay" id="portfolio-modal-overlay"></div>
      <div class="portfolio-modal" id="portfolio-detail-modal">
        <button class="portfolio-modal__close" id="portfolio-modal-close" aria-label="Close">&times;</button>
        <div class="portfolio-modal__image">
          <img id="portfolio-modal-img" src="" alt="" />
        </div>
        <div class="portfolio-modal__content">
          <div class="portfolio-modal__tags" id="portfolio-modal-tags"></div>
          <h2 class="portfolio-modal__title" id="portfolio-modal-title"></h2>
          <p class="portfolio-modal__description" id="portfolio-modal-desc"></p>
          <div class="portfolio-modal__cta">
            <a href="#" class="portfolio-modal__cta-btn portfolio-modal__cta-btn--primary" id="portfolio-modal-rfq">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>
              Request a Quote
            </a>
            <button class="portfolio-modal__cta-btn portfolio-modal__cta-btn--secondary" id="portfolio-modal-contact">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>
              Contact Us
            </button>
          </div>
        </div>
      </div>
    `;
    document.body.insertAdjacentHTML('beforeend', html);

    // Wire close
    const overlay = document.getElementById('portfolio-modal-overlay');
    const modal = document.getElementById('portfolio-detail-modal');
    const closeBtn = document.getElementById('portfolio-modal-close');

    function closeModal() {
      overlay.classList.remove('active');
      modal.classList.remove('active');
      document.body.style.overflow = '';
    }

    closeBtn.addEventListener('click', closeModal);
    overlay.addEventListener('click', closeModal);
    document.addEventListener('keydown', e => { if (e.key === 'Escape') closeModal(); });

    // Wire Contact Us button to global contact modal
    document.getElementById('portfolio-modal-contact')?.addEventListener('click', () => {
      closeModal();
      // Trigger the global contact modal if available
      setTimeout(() => {
        const contactLink = document.querySelector('[data-open-contact-modal]');
        if (contactLink) contactLink.click();
      }, 300);
    });

    // Wire RFQ button
    document.getElementById('portfolio-modal-rfq')?.addEventListener('click', (e) => {
      e.preventDefault();
      closeModal();
      window.location.href = '/app.html#rfq';
    });
  }

  /**
   * Open the portfolio modal with item data.
   * @param {Object} item — { image, alt, title, description, tags }
   */
  function openPortfolioModal(item) {
    injectModal();

    const overlay = document.getElementById('portfolio-modal-overlay');
    const modal = document.getElementById('portfolio-detail-modal');
    const img = document.getElementById('portfolio-modal-img');
    const title = document.getElementById('portfolio-modal-title');
    const desc = document.getElementById('portfolio-modal-desc');
    const tagsContainer = document.getElementById('portfolio-modal-tags');

    img.src = item.image || '';
    img.alt = item.alt || item.title || '';
    title.textContent = item.title || 'Untitled';
    desc.textContent = item.description || '';

    // Render tags
    tagsContainer.innerHTML = (item.tags || []).map(
      t => `<span class="portfolio-modal__tag">${t}</span>`
    ).join('');

    // Show
    document.body.style.overflow = 'hidden';
    requestAnimationFrame(() => {
      overlay.classList.add('active');
      modal.classList.add('active');
    });
  }

  // Expose globally for CMS loader to call
  window.openPortfolioModal = openPortfolioModal;

  // Wire existing masonry items (fallback if CMS loader hasn't run)
  document.addEventListener('DOMContentLoaded', () => {
    injectModal();
  });
})();

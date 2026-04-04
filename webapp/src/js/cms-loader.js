/* ================================================================
   CMS Loader — Patches marketing pages from site-content.json
   Loaded on all marketing pages to apply CMS content dynamically.
   ================================================================ */
(function () {
  'use strict';

  const CMS_URL = '/cms/site-content.json';
  const LS_KEY = 'atlasdt_cms_content';

  /**
   * Load CMS data — prefers localStorage (draft/published),
   * falls back to static JSON file.
   */
  async function loadCMSData() {
    // Check localStorage first (admin drafts / publishes)
    const stored = localStorage.getItem(LS_KEY);
    if (stored) {
      try { return JSON.parse(stored); } catch (e) { /* fall through */ }
    }
    // Fall back to static file
    try {
      const res = await fetch(CMS_URL);
      if (res.ok) return await res.json();
    } catch (e) { /* silent fail — page uses HTML defaults */ }
    return null;
  }

  /**
   * Patch the portfolio page from CMS data.
   */
  function patchPortfolioPage(data) {
    if (!data?.pages?.portfolio) return;
    const p = data.pages.portfolio;

    // Patch hero
    const heroTitle = document.querySelector('.portfolio-hero h1');
    const heroSubtitle = document.querySelector('.portfolio-hero p');
    if (heroTitle && p.hero?.title) heroTitle.textContent = p.hero.title;
    if (heroSubtitle && p.hero?.subtitle) heroSubtitle.textContent = p.hero.subtitle;

    // Patch sections
    const sectionEls = document.querySelectorAll('.portfolio-section');
    if (!p.sections || !sectionEls.length) return;

    p.sections.forEach((section, idx) => {
      const sectionEl = sectionEls[idx];
      if (!sectionEl) return;

      // Patch section header
      const h2 = sectionEl.querySelector('.portfolio-section-header h2');
      const desc = sectionEl.querySelector('.portfolio-section-header p');
      if (h2 && section.title) h2.textContent = section.title;
      if (desc && section.description) desc.textContent = section.description;

      // Rebuild masonry grid from items
      const grid = sectionEl.querySelector('.masonry-grid');
      if (!grid || !section.items) return;

      grid.innerHTML = section.items.map((item, i) => `
        <div class="masonry-item" data-cms-item-id="${item.id}" data-section-idx="${idx}" data-item-idx="${i}" style="cursor:pointer;">
          <img src="${item.image}" alt="${item.alt || item.title}" />
        </div>
      `).join('');

      // Wire click handlers for modal
      grid.querySelectorAll('.masonry-item').forEach(card => {
        card.addEventListener('click', () => {
          const sIdx = parseInt(card.dataset.sectionIdx);
          const iIdx = parseInt(card.dataset.itemIdx);
          const itemData = p.sections[sIdx]?.items[iIdx];
          if (itemData && window.openPortfolioModal) {
            window.openPortfolioModal(itemData);
          }
        });
      });
    });
  }

  /**
   * Patch the home page (index.html) from CMS data.
   */
  function patchHomePage(data) {
    if (!data?.pages?.home) return;
    const h = data.pages.home;

    // Hero
    const heroChip = document.querySelector('[data-cms-id="hero-chip"], .m-hero__chip');
    const heroTitle = document.querySelector('[data-cms-id="hero-title"], .m-hero__title');
    const heroSubtitle = document.querySelector('.m-hero__content h2');
    const heroDesc = document.querySelector('[data-cms-id="hero-desc"], .m-hero__subtitle');
    if (heroChip && h.hero?.chip) heroChip.textContent = h.hero.chip;
    if (heroTitle && h.hero?.title) heroTitle.textContent = h.hero.title;
    if (heroSubtitle && h.hero?.subtitle) heroSubtitle.textContent = h.hero.subtitle;
    if (heroDesc && h.hero?.description) heroDesc.textContent = h.hero.description;

    // CTA buttons
    const ctaBtns = document.querySelectorAll('.m-hero__cta-group a');
    if (ctaBtns[0] && h.hero?.ctaPrimary) ctaBtns[0].textContent = h.hero.ctaPrimary;
    if (ctaBtns[1] && h.hero?.ctaSecondary) ctaBtns[1].textContent = h.hero.ctaSecondary;

    // Merger cards
    if (h.mergerCards) {
      const westCard = document.querySelector('.m-merger-card--west');
      const eastCard = document.querySelector('.m-merger-card--east');
      if (westCard && h.mergerCards.west) {
        patchMergerCard(westCard, h.mergerCards.west);
      }
      if (eastCard && h.mergerCards.east) {
        patchMergerCard(eastCard, h.mergerCards.east);
      }
    }

    // Core Capabilities section
    if (h.capabilities) {
      const capTitle = document.querySelector('#services .m-section-title');
      const capDesc = document.querySelector('#services .m-section-desc');
      if (capTitle && h.capabilities.sectionTitle) capTitle.textContent = h.capabilities.sectionTitle;
      if (capDesc && h.capabilities.sectionDescription) capDesc.textContent = h.capabilities.sectionDescription;

      // Patch bento cards
      const bentoCards = document.querySelectorAll('.m-bento-card');
      (h.capabilities.cards || []).forEach((card, i) => {
        const el = bentoCards[i];
        if (!el) return;
        const img = el.querySelector('.m-bento-image');
        const title = el.querySelector('.m-bento-content h3');
        const desc = el.querySelector('.m-bento-content p');
        if (img && card.image) img.style.backgroundImage = `url('${card.image}')`;
        if (title && card.title) title.textContent = card.title;
        if (desc && card.description) desc.textContent = card.description;
      });
    }

    // One-Stop Shop
    if (h.oneStopShop) {
      const ossSection = document.querySelector('#onestop');
      if (ossSection) {
        const ossTitle = ossSection.querySelector('.m-section-title');
        const ossDesc = ossSection.querySelector('.m-section-desc');
        if (ossTitle && h.oneStopShop.sectionTitle) ossTitle.textContent = h.oneStopShop.sectionTitle;
        if (ossDesc && h.oneStopShop.sectionDescription) ossDesc.textContent = h.oneStopShop.sectionDescription;
      }
    }

    // Portfolio Preview
    if (h.portfolioPreview) {
      const ppSection = document.querySelector('#portfolio');
      if (ppSection) {
        const ppChip = ppSection.querySelector('.m-section-chip');
        const ppTitle = ppSection.querySelector('.m-section-title');
        const ppDesc = ppSection.querySelector('.m-section-desc');
        if (ppChip && h.portfolioPreview.sectionChip) ppChip.textContent = h.portfolioPreview.sectionChip;
        if (ppTitle && h.portfolioPreview.sectionTitle) ppTitle.textContent = h.portfolioPreview.sectionTitle;
        if (ppDesc && h.portfolioPreview.sectionDescription) ppDesc.textContent = h.portfolioPreview.sectionDescription;
      }
    }

    // Locations
    if (h.locations) {
      const locSection = document.querySelector('#locations');
      if (locSection) {
        const locTitle = locSection.querySelector('.m-section-title');
        const locDesc = locSection.querySelector('.m-section-desc');
        if (locTitle && h.locations.sectionTitle) locTitle.textContent = h.locations.sectionTitle;
        if (locDesc && h.locations.sectionDescription) locDesc.textContent = h.locations.sectionDescription;

        const locCards = locSection.querySelectorAll('.m-facility-card');
        (h.locations.cards || []).forEach((loc, i) => {
          const card = locCards[i];
          if (!card) return;
          const img = card.querySelector('.m-facility-img');
          const country = card.querySelector('h3');
          const label = card.querySelector('.m-facility-info > p:first-of-type');
          if (img && loc.image) img.style.backgroundImage = `url('${loc.image}')`;
          if (country && loc.country) country.textContent = loc.country;
          if (label && loc.label) label.textContent = loc.label;
        });
      }
    }

    // Data CTA
    if (h.dataCta) {
      const ctaSection = document.querySelector('.m-app-cta');
      if (ctaSection) {
        const ctaTitle = ctaSection.querySelector('.m-section-title');
        const ctaDesc = ctaSection.querySelector('.m-section-desc');
        if (ctaTitle && h.dataCta.title) ctaTitle.textContent = h.dataCta.title;
        if (ctaDesc && h.dataCta.description) ctaDesc.textContent = h.dataCta.description;
      }
    }
  }

  function patchMergerCard(cardEl, data) {
    const img = cardEl.querySelector('.m-merger-card__image');
    const tag = cardEl.querySelector('.m-merger-card__tag');
    const title = cardEl.querySelector('h4');
    const paras = cardEl.querySelectorAll('.m-merger-card__content p');
    if (img && data.image) img.style.backgroundImage = `url('${data.image}')`;
    if (tag && data.tag) tag.innerHTML = data.tag;
    if (title && data.title) title.textContent = data.title;
    if (paras[0] && data.line1) paras[0].textContent = data.line1;
    if (paras[1] && data.line2) paras[1].textContent = data.line2;
  }

  /**
   * Patch the services/capabilities page from CMS data.
   */
  function patchServicesPage(data) {
    if (!data?.pages?.services) return;
    const svc = data.pages.services;

    // Hero
    const heroTitle = document.querySelector('.services-hero h1');
    const heroDesc = document.querySelector('.services-hero p');
    if (heroTitle && svc.hero?.title) heroTitle.textContent = svc.hero.title;
    if (heroDesc && svc.hero?.description) heroDesc.textContent = svc.hero.description;

    // Service blocks
    const blockEls = document.querySelectorAll('.service-block');
    (svc.blocks || []).forEach((block, bIdx) => {
      const el = blockEls[bIdx];
      if (!el) return;

      const img = el.querySelector('.service-block__image img');
      const title = el.querySelector('.service-block__content h2');
      const desc = el.querySelector('.service-block__content > p');
      if (img && block.image) img.src = block.image;
      if (title && block.title) title.textContent = block.title;
      if (desc && block.description) desc.textContent = block.description;

      // Bullet items
      const listItems = el.querySelectorAll('.service-list li');
      (block.listItems || []).forEach((li, liIdx) => {
        const liEl = listItems[liIdx];
        if (!liEl) return;
        const strong = liEl.querySelector('strong');
        if (strong && li.bold) strong.textContent = li.bold;
        // Set remaining text
        if (li.text) {
          const textNode = liEl.childNodes[liEl.childNodes.length - 1];
          if (textNode && textNode.nodeType === 3) {
            textNode.textContent = ' ' + li.text;
          }
        }
      });

      // Result
      const resultTitle = el.querySelector('.service-result h4');
      const resultText = el.querySelector('.service-result p');
      if (resultTitle && block.resultTitle) resultTitle.textContent = block.resultTitle;
      if (resultText && block.resultText) resultText.textContent = block.resultText;
    });
  }

  /**
   * Patch the about us page from CMS data.
   */
  function patchAboutPage(data) {
    if (!data?.pages?.about) return;
    const about = data.pages.about;

    // Hero
    const heroChip = document.querySelector('[data-cms-id="about-hero-chip"], .m-hero__chip');
    const heroTitle = document.querySelector('[data-cms-id="about-hero-title"]');
    const heroDesc = document.querySelector('[data-cms-id="about-hero-desc"]');

    if (heroChip && about.hero?.chip) heroChip.textContent = about.hero.chip;
    if (heroTitle && about.hero?.title) heroTitle.textContent = about.hero.title;
    if (heroDesc && about.hero?.description) heroDesc.textContent = about.hero.description;

    // Media grid images
    if (about.mediaGrid) {
      const gridImages = document.querySelectorAll('[data-cms-id="about-media"] > div > div');
      if (gridImages[0] && about.mediaGrid.image1) {
        gridImages[0].style.backgroundImage = `url('${about.mediaGrid.image1}')`;
      }
      if (gridImages[1] && about.mediaGrid.image2) {
        gridImages[1].style.backgroundImage = `url('${about.mediaGrid.image2}')`;
      }
    }

    // Methodology
    if (about.methodology) {
      const methSection = document.querySelector('#methodology');
      if (methSection) {
        const methTitle = methSection.querySelector('.m-section-title');
        const methDesc = methSection.querySelector('.m-section-desc');
        if (methTitle && about.methodology.sectionTitle) methTitle.textContent = about.methodology.sectionTitle;
        if (methDesc && about.methodology.sectionDescription) methDesc.textContent = about.methodology.sectionDescription;
      }
    }

    // Team members
    if (about.team) {
      const teamSection = document.querySelector('#team');
      if (teamSection) {
        const teamTitle = teamSection.querySelector('h2');
        const teamDesc = teamSection.querySelector('p');
        if (teamTitle && about.team.sectionTitle) teamTitle.textContent = about.team.sectionTitle;
        if (teamDesc && about.team.sectionDescription) teamDesc.textContent = about.team.sectionDescription;

        const memberCards = teamSection.querySelectorAll('[data-cms-id="team-member"]');
        (about.team.members || []).forEach((member, i) => {
          const card = memberCards[i];
          if (!card) return;
          const photo = card.querySelector('img');
          const name = card.querySelector('h4');
          const role = card.querySelector('[data-cms-field="role"]');
          const desc = card.querySelector('[data-cms-field="description"]');
          if (photo && member.photo) photo.src = member.photo;
          if (name && member.name) name.textContent = member.name;
          if (role && member.role) role.textContent = member.role;
          if (desc && member.description) desc.textContent = member.description;
        });
      }
    }
  }

  /**
   * Determine which page we're on and patch accordingly.
   */
  function patchPage(data) {
    const path = window.location.pathname;
    if (path.includes('portfolio')) {
      patchPortfolioPage(data);
    } else if (path.includes('services')) {
      patchServicesPage(data);
    } else if (path.includes('about')) {
      patchAboutPage(data);
    } else if (path === '/' || path.includes('index')) {
      patchHomePage(data);
    }
  }

  // Run on DOM ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', async () => {
      const data = await loadCMSData();
      if (data) patchPage(data);
    });
  } else {
    loadCMSData().then(data => { if (data) patchPage(data); });
  }

  // Expose for admin panel usage
  window.__CMS_LOADER = { loadCMSData, patchPage, LS_KEY, CMS_URL };
})();


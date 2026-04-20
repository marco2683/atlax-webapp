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

    // --- Hero Section ---
    if (h.hero) {
      const headline = document.querySelector('.hero-headline__west');
      if (headline && h.hero.headline) headline.textContent = h.hero.headline;

      const prompts = document.querySelectorAll('.hero-prompt__text');
      if (prompts[0] && h.hero.prompt) prompts[0].innerHTML = h.hero.prompt;
      if (prompts[1] && h.hero.gatePrompt) prompts[1].textContent = h.hero.gatePrompt;
    }

    // --- Phase Cards ---
    if (h.phaseCards && h.phaseCards.length > 0) {
      const cards = document.querySelectorAll('.pb-stage-card');
      h.phaseCards.forEach((cardData, idx) => {
        const cardEl = cards[idx];
        if (!cardEl) return;
        
        const title = cardEl.querySelector('.pb-stage-title');
        const prompt = cardEl.querySelector('.pb-stage-prompt');
        const cta = cardEl.querySelector('.pb-stage-cta');
        const bullets = cardEl.querySelectorAll('.pb-stage-list li');
        
        if (title && cardData.title) title.textContent = cardData.title;
        if (prompt && cardData.prompt) prompt.textContent = cardData.prompt;
        if (cta && cardData.cta) {
          // If you change the CTA text care must be taken to not lose the onclick.
          // By updating innerText we keep the inline onclick unless we replace the whole node
          cta.textContent = cardData.cta;
        }
        
        if (cardData.bullets && cardData.bullets.length > 0) {
          cardData.bullets.forEach((bulletText, bIdx) => {
            if (bullets[bIdx] && bulletText) {
              bullets[bIdx].innerHTML = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"></polyline></svg> ${bulletText}`;
            }
          });
        }
      });
    }

    // --- Who We Are ---
    if (h.whoWeAre) {
      const eyebrow = document.querySelector('.prd-who-eyebrow');
      const title = document.querySelector('.prd-who-title');
      const bodies = document.querySelectorAll('.prd-who-body');
      
      if (eyebrow && h.whoWeAre.eyebrow) eyebrow.textContent = h.whoWeAre.eyebrow;
      if (title && h.whoWeAre.title) title.innerHTML = h.whoWeAre.title;
      if (bodies[0] && h.whoWeAre.body1) bodies[0].textContent = h.whoWeAre.body1;
      if (bodies[1] && h.whoWeAre.body2) bodies[1].textContent = h.whoWeAre.body2;
      
      if (h.whoWeAre.pillars && h.whoWeAre.pillars.length > 0) {
        const pillarEls = document.querySelectorAll('.prd-pillar div');
        h.whoWeAre.pillars.forEach((pData, pIdx) => {
          const pel = pillarEls[pIdx];
          if (!pel) return;
          const str = pel.querySelector('strong');
          const sp = pel.querySelector('span');
          if (str && pData.title) str.textContent = pData.title;
          if (sp && pData.desc) sp.textContent = pData.desc;
        });
      }
    }
  }

  function patchMergerCard(cardEl, data) {}

  /**
   * Patch the services/capabilities page from CMS data.
   * DISABLED — services page is now managed directly in HTML.
   */
  function patchServicesPage(data) {
    // Services page content is now maintained in services.html directly.
    // CMS patching disabled to prevent stale localStorage data from overwriting.
    return;
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

  function patchFaqPage(data) {
    if (!data?.pages?.faq?.sections) return;
    const container = document.getElementById('faq-cms-container');
    if (!container) return;
    
    let html = '';
    data.pages.faq.sections.forEach(sec => {
      html += `<div class="faq-section"><h2>${sec.title || ''}</h2>`;
      if (sec.items) {
        sec.items.forEach(item => {
          html += `
          <div class="faq-item">
            <div class="faq-question" onclick="toggleFaq(this)">
              ${item.question || ''}
              <svg class="faq-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M6 9l6 6 6-6"/></svg>
            </div>
            <div class="faq-answer">${item.answer || ''}</div>
          </div>`;
        });
      }
      html += `</div>`;
    });
    container.innerHTML = html;
  }

  function patchBlogPage(data) {
    if (!data?.pages?.blog?.posts) return;
    const container = document.getElementById('blog-cms-container');
    if (!container) return;

    window.__blogPosts = data.pages.blog.posts;

    let html = '';
    data.pages.blog.posts.forEach((post, i) => {
      html += `
      <div class="blog-card" onclick="openBlogModal(window.__blogPosts[${i}])">
        <div class="blog-image" style="background-image: url('${post.image || ''}')"></div>
        <div class="blog-content">
          <div class="blog-date">${post.date || ''}</div>
          <h3 class="blog-title">${post.title || ''}</h3>
          <div class="blog-excerpt">${post.content || ''}</div>
        </div>
      </div>
      `;
    });
    container.innerHTML = html;
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
    } else if (path.includes('faq')) {
      patchFaqPage(data);
    } else if (path.includes('blog')) {
      patchBlogPage(data);
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


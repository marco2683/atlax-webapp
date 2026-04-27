import './css/design-system.css';
import './css/marketing.css';
import './css/convergence.css';
import './css/team.css';
import { initAuthModal } from './js/components/auth-modal.js';
import './js/mobile-menu.js';

document.addEventListener('DOMContentLoaded', () => {
  console.log('[PRD] Marketing Homepage Loaded');
  initAuthModal();
  
  // Navbar scroll effect
  const nav = document.getElementById('navbar');
  window.addEventListener('scroll', () => {
    if (window.scrollY > 50) {
      nav.style.background = 'rgba(8, 10, 15, 0.9)';
      nav.style.backdropFilter = 'blur(10px)';
      nav.style.borderBottom = '1px solid rgba(255,255,255,0.05)';
      nav.classList.add('nav-scrolled');
    } else {
      nav.style.background = 'transparent';
      nav.style.backdropFilter = 'none';
      nav.style.borderBottom = 'none';
      nav.classList.remove('nav-scrolled');
    }
  });

  // ── Mobile Cards: USP Sentences + Bouncy Scroll Arrows ───
  // On mobile, after each phase gate card, show the inspiring sentence
  // + a bouncy down-arrow. Each card takes ~100vh.
  function initMobileCardFlow() {
    if (window.innerWidth > 768) return;

    const grid = document.querySelector('.pb-stages-grid');
    if (!grid) return;
    const cards = Array.from(grid.querySelectorAll('.pb-stage-card'));
    if (cards.length === 0) return;

    // Don't re-init
    if (grid.dataset.mobileFlowInit) return;
    grid.dataset.mobileFlowInit = '1';

    // USP sentences matching the desktop hover USPs
    const usps = [
      "We\u2019re here to help you turn that spark into something real. We\u2019ll sit down with you, look at the big picture, and figure out the smartest path to bring your idea to life.",
      "Our team loves diving into designs to catch the tricky details early and remove the hardest challenges first, so when you\u2019re ready to build, you can be completely confident.",
      "We\u2019re local to you and on the ground in Asia. We\u2019ll introduce you to factory partners we trust personally, so you get the quality you expect without the headaches.",
      "We know margins matter. We\u2019ll roll up our sleeves and look for creative engineering and sourcing solutions to thoughtfully lower your costs without cutting corners."
    ];

    // Build wrappers: card + USP sentence + bouncy arrow
    const wrappers = [];
    cards.forEach((card, i) => {
      const wrapper = document.createElement('div');
      wrapper.className = 'mobile-card-wrapper';
      wrapper.appendChild(card);

      // USP text — let CSS handle styling
      const usp = document.createElement('p');
      usp.className = 'mobile-card-usp';
      usp.textContent = usps[i] || '';
      wrapper.appendChild(usp);

      // Bouncy down-arrow
      const arrow = document.createElement('div');
      arrow.className = 'mobile-card-arrow';
      arrow.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.6)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"></polyline></svg>';
      wrapper.appendChild(arrow);

      wrappers.push({ wrapper, usp, arrow, card });
    });

    // Insert wrappers into the DOM in order, after the grid
    let insertAfter = grid;
    wrappers.forEach(({ wrapper }) => {
      insertAfter.after(wrapper);
      insertAfter = wrapper;
    });

    // Hide the now-empty grid
    grid.style.display = 'none';
    console.log('[PRD] Mobile card flow: inserted', wrappers.length, 'full-screen card wrappers');

    // Wire up click handlers (elements now in DOM)
    wrappers.forEach(({ wrapper, usp, arrow, card }, i) => {
      // Arrow click → scroll to next card or "Who We Are"
      arrow.addEventListener('click', () => {
        let target;
        if (i < wrappers.length - 1) {
          target = wrappers[i + 1].wrapper;
        } else {
          // Last card → "Who We Are" section
          target = document.querySelector('.m-who-section')
            || document.querySelector('[id*="who-we-are"]')
            || document.querySelector('.m-who');
          if (!target) {
            const headings = document.querySelectorAll('h2, .m-section-label');
            for (const h of headings) {
              if (h.textContent.trim().toUpperCase().includes('WHO WE ARE')) {
                target = h.closest('section') || h;
                break;
              }
            }
          }
        }
        if (target) {
          const offset = 80;
          const y = target.getBoundingClientRect().top + window.scrollY - offset;
          window.scrollTo({ top: y, behavior: 'smooth' });
        }
      });
    });
  }

  initMobileCardFlow();

  // ── Show Workspace link on mobile for logged-in users ──
  const wsLink = document.getElementById('nav-workspace-mobile');
  if (wsLink) {
    const hasAuth = Object.keys(localStorage).some(k => k.startsWith('sb-') && k.endsWith('-auth-token'));
    if (hasAuth && window.innerWidth <= 768) {
      wsLink.style.display = '';  // Let CSS handle the display
    }
  }

  // Smooth scroll
  document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
      const targetHash = this.getAttribute('href');
      if (targetHash.startsWith('#')) {
        e.preventDefault();
        const target = document.querySelector(targetHash);
        if (target) {
          target.scrollIntoView({
            behavior: 'smooth'
          });
        }
      }
    });
  });

  // Intersection Observer for scroll animations (fade up)
  const fadeUpElements = document.querySelectorAll('.m-fade-up');
  
  const observerOptions = {
    root: null,
    rootMargin: '0px',
    threshold: 0.15
  };

  const fadeUpObserver = new IntersectionObserver((entries, observer) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('is-visible');
        observer.unobserve(entry.target); // Only animate once
      }
    });
  }, observerOptions);

  fadeUpElements.forEach(el => fadeUpObserver.observe(el));
});

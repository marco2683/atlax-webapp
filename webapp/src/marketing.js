import './css/design-system.css';
import './css/marketing.css';
import './css/convergence.css';
import './css/team.css';
import { initAuthModal } from './js/components/auth-modal.js';

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
    } else {
      nav.style.background = 'transparent';
      nav.style.backdropFilter = 'none';
      nav.style.borderBottom = 'none';
    }
  });

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

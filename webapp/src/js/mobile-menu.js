/* ═══════════════════════════════════════════════════
   Mobile Menu — Icon swap & auto-close on navigation
   Include on all pages to enhance the hamburger toggle.
   ═══════════════════════════════════════════════════ */

(function () {
  'use strict';

  document.addEventListener('DOMContentLoaded', () => {
    const navbar = document.getElementById('navbar');
    const toggle = navbar?.querySelector('.mobile-menu-toggle');
    if (!navbar || !toggle) return;

    // Override the onclick to also swap icon
    toggle.addEventListener('click', () => {
      // The classList.toggle('menu-open') is already handled by the inline onclick
      // But we also update the icon text
      requestAnimationFrame(() => {
        toggle.textContent = navbar.classList.contains('menu-open') ? '✕' : '☰';
      });
    });

    // Auto-close menu when any nav link inside the dropdown is tapped
    navbar.addEventListener('click', (e) => {
      const link = e.target.closest('a.global-nav-link, a.nav-link, a.dropdown-item');
      if (link && navbar.classList.contains('menu-open')) {
        navbar.classList.remove('menu-open');
        toggle.textContent = '☰';
      }
    });
  });
})();

/* ============================================================
   PRD — Navbar Component (Auth-Integrated)
   ============================================================ */
import { getCurrentUser } from '../services/auth.js';
import { getMyProfile } from '../services/profile.js';
import { openProfilePanel, initProfilePanel } from './profile-panel.js';

/**
 * Initialize the navigation bar behavior.
 */
export async function initNavbar() {
  const navbar = document.getElementById('navbar');
  const menuItems = document.querySelectorAll('.navbar__menu-item');
  const loginBtn = document.getElementById('btn-login');

  if (!navbar) return;

  // ── Scroll Effect ──────────────────────────────────────
  let lastScrollY = 0;
  let ticking = false;

  function onScroll() {
    lastScrollY = window.scrollY;
    if (!ticking) {
      requestAnimationFrame(() => {
        if (lastScrollY > 40) {
          navbar.classList.add('navbar--scrolled');
        } else {
          navbar.classList.remove('navbar--scrolled');
        }
        ticking = false;
      });
      ticking = true;
    }
  }

  window.addEventListener('scroll', onScroll, { passive: true });

  // ── View Navigation ────────────────────────────────────
  menuItems.forEach(item => {
    item.addEventListener('click', (e) => {
      const view = item.dataset.view;
      
      // If it's the home view, let the <a> tag handle it naturally
      if (view === 'home') return;

      e.preventDefault();
      
      // Update active state
      menuItems.forEach(i => i.classList.remove('navbar__menu-item--active'));
      item.classList.add('navbar__menu-item--active');

      // Dispatch global event for view switching
      window.dispatchEvent(new CustomEvent('prd-nav-switch', { 
        detail: { view: view } 
      }));
    });
  });

  // ── Auth Integration — User Avatar ─────────────────────
  // Init the profile panel (injects HTML, wires events)
  await initProfilePanel();

  // Populate the navbar avatar with real user data
  const user = await getCurrentUser();
  if (user && loginBtn) {
    const profile = await getMyProfile();
    const firstName = profile?.first_name || user.user_metadata?.first_name || '';
    const initial = (firstName || user.email || '?')[0].toUpperCase();
    const company = profile?.company || '';

    // Replace the generic person icon with user initial
    loginBtn.innerHTML = initial;
    loginBtn.title = [firstName, company].filter(Boolean).join(' · ') || user.email;
    loginBtn.style.cssText += `
      background: linear-gradient(135deg, var(--color-electric), var(--color-neon-purple));
      font-size: 15px;
      font-weight: 700;
      color: white;
      border: 2px solid rgba(255,255,255,0.15);
    `;
  }

  // ── Click Handlers ─────────────────────────────────────
  loginBtn?.addEventListener('click', () => openProfilePanel());

  document.getElementById('btn-notifications')?.addEventListener('click', () => {
    console.log('[PRD] Notifications — coming soon');
  });

  document.getElementById('btn-settings')?.addEventListener('click', () => {
    openProfilePanel();
  });
}


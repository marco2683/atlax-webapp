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
  const navUserMenu = document.getElementById('nav-user-menu');
  const navAvatar = document.getElementById('nav-avatar');
  const navLoginBtn = document.getElementById('nav-login-btn');

  let sysTier = sessionStorage.getItem('atlasdt_tier') || 'basic';

  if (user) {
    if (navUserMenu) navUserMenu.classList.add('active');
    if (navLoginBtn) navLoginBtn.style.display = 'none';

    const profile = await getMyProfile();
    if (profile && profile.tier) {
      sysTier = profile.tier;
      sessionStorage.setItem('atlasdt_tier', sysTier);
    }
    
    const firstName = profile?.first_name || user.user_metadata?.first_name || '';
    const initial = (firstName || user.email || '?')[0].toUpperCase();
    const company = profile?.company || '';
    const tooltipText = [firstName, company].filter(Boolean).join(' · ') || user.email;

    // Handle generic button (index.html)
    if (loginBtn) {
      loginBtn.innerHTML = initial;
      loginBtn.title = tooltipText;
      loginBtn.style.cssText += `
        background: linear-gradient(135deg, var(--color-electric), var(--color-neon-purple));
        font-size: 15px;
        font-weight: 700;
        color: white;
        border: 2px solid rgba(255,255,255,0.15);
      `;
    }
    
    // Handle specific avatar (app.html)
    if (navAvatar) {
      navAvatar.innerHTML = initial;
      navAvatar.title = tooltipText;
    }
  } else {
    if (navUserMenu) navUserMenu.classList.remove('active');
    if (navLoginBtn) navLoginBtn.style.display = 'block';
  }

  // Handle Tab Visibility based on Zero-Trust Guard
  const restrictedViews = ['tariff', 'taxonomy'];
  const isBasic = sysTier.toLowerCase().trim() === 'basic';
  
  if (isBasic || !user) {
    menuItems.forEach(item => {
      if (restrictedViews.includes(item.dataset.view)) {
        item.style.display = 'none';
      }
    });
  } else {
    // If user is logged in and NOT basic, affirmatively un-hide tabs and remove the anti-flash guard
    document.documentElement.classList.remove('is-basic-tier');
    menuItems.forEach(item => {
      if (restrictedViews.includes(item.dataset.view)) {
        item.style.display = 'flex';
      }
    });
  }

  // ── Click Handlers ─────────────────────────────────────
  loginBtn?.addEventListener('click', () => {
    // If we're on a page with generic btn-login (like index.html)
    // clicking the avatar should take you to the main profile page
    if (user) {
      window.location.href = '/profile.html';
    }
  });
  
  // Notice we purposefully DO NOT hijack the profile settings btn click anymore
  // so it proceeds with normal href="/profile.html" navigation.

  const logoutBtn = document.getElementById('nav-logout-btn');
  logoutBtn?.addEventListener('click', async (e) => {
    e.preventDefault();
    const { logoutUser } = await import('../services/auth.js');
    await logoutUser();
  });

  document.getElementById('btn-notifications')?.addEventListener('click', () => {
    window.location.href = '/workspace.html';
  });

  document.getElementById('btn-settings')?.addEventListener('click', () => {
    openProfilePanel();
  });

  // ── Notification Badge — Real-time RFQ count ──────────
  if (user) {
    try {
      const { supabase } = await import('../supabase.js');
      const { count, error } = await supabase
        .from('rfq_history')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .in('status', ['confirmed', 'rejected', 'request_info']);

      if (!error && count > 0) {
        const badge = document.getElementById('nav-notif-badge');
        if (badge) {
          badge.textContent = count;
          badge.style.display = 'inline-block';
        }
      }
    } catch (e) {
      console.warn('[Navbar] Notification badge fetch failed:', e);
    }
  }
}


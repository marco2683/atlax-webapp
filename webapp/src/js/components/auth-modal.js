import { signUpUser, loginUser, logoutUser, onAuthStateChange, getCurrentUser } from '../services/auth.js';
import { getMyProfile } from '../services/profile.js';

export function initAuthModal() {
  const modal = document.getElementById('auth-modal');
  const overlay = modal?.querySelector('.auth-modal-glass');
  const closeBtn = document.getElementById('close-auth-modal');
  
  // Triggers
  const navLoginBtn = document.getElementById('nav-login-btn');
  const navUserMenu = document.getElementById('nav-user-menu');
  const navLogoutBtn = document.getElementById('nav-logout-btn');
  const navAvatar = document.getElementById('nav-avatar');

  // Form wrappers
  const formLogin = document.getElementById('form-login');
  const formSignup = document.getElementById('form-signup');
  const formsContainer = document.getElementById('auth-forms-container');

  // Toggles
  const toggleToSignup = document.getElementById('toggle-to-signup');
  const toggleToLogin = document.getElementById('toggle-to-login');

  // Forms
  const loginForm = document.getElementById('login-form');
  const signupForm = document.getElementById('signup-form');

  // Function to open modal
  function openModal(state = 'login') {
    if (!modal) return;
    switchState(state);
    modal.classList.remove('hidden');
    document.body.style.overflow = 'hidden'; // Prevent scrolling
  }

  // Function to close modal
  function closeModal() {
    if (!modal) return;
    modal.classList.add('hidden');
    document.body.style.overflow = '';
  }

  // Function to switch between login and signup
  function switchState(state) {
    if (state === 'signup') {
      formsContainer.classList.remove('auth-state-login');
      formsContainer.classList.add('auth-state-signup');
      formLogin.style.display = 'none';
      formSignup.style.display = 'block';
    } else {
      formsContainer.classList.remove('auth-state-signup');
      formsContainer.classList.add('auth-state-login');
      formSignup.style.display = 'none';
      formLogin.style.display = 'block';
    }
  }

  // Event Listeners for Opening/Closing
  if (navLoginBtn) {
    navLoginBtn.addEventListener('click', (e) => {
      e.preventDefault();
      openModal('login');
    });
  }

  if (closeBtn) closeBtn.addEventListener('click', closeModal);
  if (modal) {
    modal.addEventListener('click', (e) => {
      if (e.target === modal) closeModal();
    });
  }

  // Event Listeners for Toggles
  if (toggleToSignup) toggleToSignup.addEventListener('click', () => switchState('signup'));
  if (toggleToLogin) toggleToLogin.addEventListener('click', () => switchState('login'));

  // Event Listeners for Forms
  if (loginForm) {
    loginForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const email = document.getElementById('login-email').value;
      const pass = document.getElementById('login-password').value;
      const btn = document.getElementById('login-submit-btn');
      const err = document.getElementById('login-error');
      
      btn.disabled = true;
      btn.textContent = 'Logging in...';
      err.classList.remove('visible');

      const { data, error } = await loginUser(email, pass);
      
      btn.disabled = false;
      btn.textContent = 'Log In';

      if (error) {
        err.textContent = error.message;
        err.classList.add('visible');
      } else {
        // Redirect into the engine after successful login
        window.location.href = '/app.html';
      }
    });
  }

  if (signupForm) {
    signupForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const first = document.getElementById('signup-first').value;
      const last = document.getElementById('signup-last').value;
      const company = document.getElementById('signup-company').value;
      const email = document.getElementById('signup-email').value;
      const pass = document.getElementById('signup-password').value;
      const btn = document.getElementById('signup-submit-btn');
      const err = document.getElementById('signup-error');

      btn.disabled = true;
      btn.textContent = 'Creating account...';
      err.classList.remove('visible');

      const { data, error } = await signUpUser(email, pass, {
        first_name: first,
        last_name: last,
        company: company
      });

      btn.disabled = false;
      btn.textContent = 'Create Account';

      if (error) {
        err.textContent = error.message;
        err.classList.add('visible');
      } else {
        alert("Registration successful! You can now log in.");
        switchState('login');
      }
    });
  }

  // Logout listener
  if (navLogoutBtn) {
    navLogoutBtn.addEventListener('click', async (e) => {
      e.preventDefault();
      await logoutUser();
    });
  }

  // Listen to Auth State Changes
  onAuthStateChange(async (event, session) => {
    if (session && session.user) {
      // Fetch real profile from DB for accurate display
      const profile = await getMyProfile();
      const firstName = profile?.first_name || session.user.user_metadata?.first_name || '';
      const email = session.user.email || '';
      const initial = (firstName || email)[0].toUpperCase();
      
      if (navLoginBtn) navLoginBtn.style.display = 'none';
      if (navUserMenu) {
        navUserMenu.style.display = 'flex';
        navUserMenu.classList.add('active');
      }
      if (navAvatar) {
        navAvatar.textContent = initial;
        navAvatar.title = `${firstName} ${profile?.last_name || ''} · ${profile?.company || email}`.trim();
      }
    } else {
      // User is logged out
      if (navUserMenu) {
        navUserMenu.style.display = 'none';
        navUserMenu.classList.remove('active');
      }
      if (navLoginBtn) navLoginBtn.style.display = 'block';
    }
  });
}

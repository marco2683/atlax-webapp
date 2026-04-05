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

  // Auto-open if query parameter has login=true (e.g. from email verification links or splash screens)
  if (window.location.search.includes('login=true') && modal) {
    switchState('login');
    modal.classList.remove('hidden');
    document.body.style.overflow = 'hidden';
    
    // Check if coming from verification
    if (window.location.hash.includes('type=verify') || window.location.search.includes('login=true')) {
      // Optional: add a tiny message
      const loginHeader = document.querySelector('#form-login .auth-header p');
      if (loginHeader && window.location.hash.includes('type=verify')) {
         loginHeader.innerText = "Email verified! Please log in.";
         loginHeader.style.color = "var(--color-electric, #5ea2ff)";
      }
    }
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
        // Show verify email splash
        formSignup.innerHTML = `
          <div style="text-align: center; padding: 30px 10px;">
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="var(--color-electric, #5ea2ff)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="margin-bottom: 16px;"><path d="M22 10.5V6a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v12c0 1.1.9 2 2 2h12.5"></path><polyline points="22 7 12 14 2 7"></polyline><path d="M20 14v6"></path><path d="M17 17l3 3 3-3"></path></svg>
            <h3 style="margin-bottom: 12px; font-size: 24px; color: white;">Verify Your Email</h3>
            <p style="font-size: 14px; color: rgba(255,255,255,0.6); margin-bottom: 24px; line-height: 1.5;">We've sent a verification link to <strong style="color:white;">${email}</strong>.<br>Please check your inbox to activate your account.</p>
            <button id="auth-modal-splash-return" class="auth-btn" style="background: rgba(94, 162, 255, 0.1); border: 1px solid rgba(94, 162, 255, 0.3); color: var(--color-electric, #5ea2ff);">Return to Login</button>
          </div>
        `;
        document.getElementById('auth-modal-splash-return').addEventListener('click', (ev) => {
          ev.preventDefault();
          switchState('login');
        });
      }
    });
  }

  if (navLogoutBtn) {
    navLogoutBtn.addEventListener('click', async (e) => {
      e.preventDefault();
      await logoutUser();
    });
  }

  // Handle Reset toggle
  const toggleToReset = document.getElementById('toggle-to-reset');
  const toggleResetToLogin = document.getElementById('toggle-reset-to-login');
  const formReset = document.getElementById('form-reset');
  const resetForm = document.getElementById('reset-form');

  if (toggleToReset && toggleResetToLogin && formReset) {
    toggleToReset.addEventListener('click', () => {
      formsContainer.classList.remove('auth-state-login', 'auth-state-signup');
      formsContainer.classList.add('auth-state-reset');
    });

    toggleResetToLogin.addEventListener('click', () => {
      switchState('login');
    });
  }

  if (resetForm) {
    resetForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const email = document.getElementById('reset-email').value;
      const btn = document.getElementById('reset-submit-btn');
      const err = document.getElementById('reset-error');
      
      btn.disabled = true;
      btn.textContent = 'Sending...';
      err.classList.remove('visible');

      // We use import() to dynamically get the reset function if it wasn't statically imported
      const { resetPasswordForEmail } = await import('../services/auth.js');
      const { error } = await resetPasswordForEmail(email);
      
      btn.disabled = false;
      
      if (error) {
        err.textContent = error.message;
        err.classList.add('visible');
        btn.textContent = 'Send Instructions';
      } else {
        btn.textContent = 'Check your email!';
        btn.style.background = 'var(--color-emerald)';
        setTimeout(() => switchState('login'), 3000);
      }
    });
  }

  // Handle Change Password flow
  const navChangePwdBtn = document.getElementById('nav-changepwd-btn');
  const toggleChangepwdClose = document.getElementById('toggle-changepwd-close');
  const formChangepwd = document.getElementById('form-changepwd');
  const changepwdForm = document.getElementById('changepwd-form');

  // If triggered by a password recovery link
  if (window.location.hash.includes('type=recovery') || window.location.search.includes('type=recovery')) {
    if (formChangepwd) {
      formsContainer.className = 'auth-forms-container auth-state-changepwd';
      modal.classList.remove('hidden');
      document.body.style.overflow = 'hidden';
      // Hide old password requirement since they securely used an email link
      const oldPwdCnt = document.getElementById('old-pwd-container');
      if (oldPwdCnt) oldPwdCnt.style.display = 'none';
      if (toggleChangepwdClose) toggleChangepwdClose.style.display = 'none'; // Force them to change
    }
  }

  if (navChangePwdBtn && formChangepwd) {
    navChangePwdBtn.addEventListener('click', (e) => {
      e.preventDefault();
      // Un-hide the old password if it was hidden
      const oldPwdCnt = document.getElementById('old-pwd-container');
      if (oldPwdCnt) oldPwdCnt.style.display = '';
      if (toggleChangepwdClose) toggleChangepwdClose.style.display = '';
      
      formsContainer.className = 'auth-forms-container auth-state-changepwd';
      modal.classList.remove('hidden');
      document.body.style.overflow = 'hidden';
      // Hide drop-down
      if (navUserMenu) navUserMenu.classList.remove('active');
    });
  }

  if (toggleChangepwdClose) {
    toggleChangepwdClose.addEventListener('click', () => {
      closeModal();
    });
  }

  if (changepwdForm) {
    changepwdForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const oldPwdInput = document.getElementById('change-old-password');
      const newPwd = document.getElementById('change-new-password').value;
      const confirmPwd = document.getElementById('change-confirm-password').value;
      const btn = document.getElementById('changepwd-submit-btn');
      const err = document.getElementById('changepwd-error');
      
      err.classList.remove('visible');

      if (newPwd !== confirmPwd) {
        err.textContent = "New passwords don't match.";
        err.classList.add('visible');
        return;
      }

      if (newPwd.length < 8) {
        err.textContent = "Password must be at least 8 characters.";
        err.classList.add('visible');
        return;
      }

      btn.disabled = true;
      btn.textContent = 'Updating...';

      const user = await getCurrentUser();
      
      // If the old password field is visible and they are logged in, verify it natively
      if (oldPwdInput && oldPwdInput.style.display !== 'none' && user) {
        const { error: verifyError } = await loginUser(user.email, oldPwdInput.value);
        if (verifyError) {
          err.textContent = "Old password is incorrect.";
          err.classList.add('visible');
          btn.disabled = false;
          btn.textContent = 'Update Password';
          return;
        }
      }

      const { updatePassword } = await import('../services/auth.js');
      const { error } = await updatePassword(newPwd);
      
      btn.disabled = false;
      if (error) {
        err.textContent = error.message;
        err.classList.add('visible');
        btn.textContent = 'Update Password';
      } else {
        btn.textContent = 'Success!';
        btn.style.background = 'var(--color-emerald)';
        setTimeout(() => {
          closeModal();
          // Clean URLs if they came from recovery
          if (window.location.href.includes('type=recovery')) {
             window.history.replaceState({}, document.title, window.location.pathname);
          }
          btn.textContent = 'Update Password';
          btn.style.background = '';
          changepwdForm.reset();
        }, 2000);
      }
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


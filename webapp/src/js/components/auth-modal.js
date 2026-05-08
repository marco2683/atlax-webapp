import { signUpUser, loginUser, logoutUser, onAuthStateChange, getCurrentUser } from '../services/auth.js';
import { getMyProfile } from '../services/profile.js';
import { markFormLoaded, injectHoneypot, checkForBot } from '../utils/botGuard.js';

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

  // Bot Guard: inject honeypot into signup form
  if (signupForm) injectHoneypot(signupForm);

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
      markFormLoaded(); // Bot Guard: start the timer
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
        // Do not redirect to /app.html, simply close the modal to keep the user where they are
        closeModal();
        loginForm.reset();
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

      // Bot Guard: check before proceeding
      const botCheck = checkForBot(
        { firstName: first, lastName: last, company, email },
        signupForm
      );
      if (botCheck.isBot) {
        // Show a generic error — don't reveal detection method
        err.textContent = 'Unable to create account. Please try again later.';
        err.classList.add('visible');
        console.warn('[BotGuard] Blocked signup:', botCheck.reason);
        return;
      }

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

  // If triggered by a password recovery link
  if (window.location.hash.includes('type=recovery') || window.location.search.includes('type=recovery')) {
    formsContainer.innerHTML = ''; // Clear all other forms
    
    // Inject the new password form dynamically
    formsContainer.innerHTML = `
      <div id="form-changepwd" class="auth-card" style="display: block;">
        <div class="auth-header">
          <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="margin-bottom: 20px; color: var(--color-emerald);">
            <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
            <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
          </svg>
          <h2 style="font-size: 24px;">Set New Password</h2>
          <p>Please enter your new password below.</p>
        </div>
        <form id="changepwd-form" class="auth-form">
          <div class="auth-input-group">
            <label>New Password</label>
            <div class="password-input-wrapper">
               <input type="password" id="changepwd-new" required placeholder="Enter new password" style="width: 100%;">
               <button type="button" class="pwd-reveal-btn" style="position: absolute; right: 12px; top: 50%; transform: translateY(-50%); background: none; border: none; cursor: pointer; color: #8b949e;">
                 <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>
               </button>
            </div>
          </div>
          <div class="auth-input-group">
            <label>Confirm Password</label>
            <div class="password-input-wrapper">
               <input type="password" id="changepwd-confirm" required placeholder="Confirm new password" style="width: 100%;">
               <button type="button" class="pwd-reveal-btn" style="position: absolute; right: 12px; top: 50%; transform: translateY(-50%); background: none; border: none; cursor: pointer; color: #8b949e;">
                 <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>
               </button>
            </div>
            <p class="input-helper" style="font-size: 11px; color: var(--color-steel-400); margin-top: 6px;">Must be at least 8 characters with a mix of numbers, letters, and symbols.</p>
          </div>
          <div id="changepwd-error" class="auth-error-msg"></div>
          <button type="submit" id="changepwd-submit-btn" class="auth-btn">Save New Password</button>
        </form>
      </div>
    `;
    
    // Add eye icon reveal logic
    document.querySelectorAll('.pwd-reveal-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const input = btn.previousElementSibling;
        const type = input.getAttribute('type') === 'password' ? 'text' : 'password';
        input.setAttribute('type', type);
        btn.style.color = type === 'text' ? 'var(--color-electric)' : '#8b949e';
      });
    });

    modal.classList.remove('hidden');
    document.body.style.overflow = 'hidden';

    // Handle form submit
    document.getElementById('changepwd-form').addEventListener('submit', async (e) => {
      e.preventDefault();
      const newPwd = document.getElementById('changepwd-new').value;
      const confirmPwd = document.getElementById('changepwd-confirm').value;
      const btn = document.getElementById('changepwd-submit-btn');
      const err = document.getElementById('changepwd-error');
      
      btn.disabled = true;
      err.classList.remove('visible');

      if (newPwd !== confirmPwd) {
        err.textContent = "Passwords do not match!";
        err.classList.add('visible');
        btn.disabled = false;
        return;
      }
      if (newPwd.length < 8) {
        err.textContent = "Password must be at least 8 characters long.";
        err.classList.add('visible');
        btn.disabled = false;
        return;
      }

      btn.textContent = 'Saving...';
      const { updatePassword } = await import('../services/auth.js');
      const { error } = await updatePassword(newPwd);
      
      if (error) {
        err.textContent = error.message;
        err.classList.add('visible');
        btn.textContent = 'Save New Password';
        btn.disabled = false;
      } else {
        btn.textContent = 'Password Updated!';
        btn.style.background = 'var(--color-emerald)';
        setTimeout(() => {
          // Clean URLs if they came from recovery
          if (window.location.hash.includes('type=recovery') || window.location.search.includes('type=recovery')) {
             window.history.replaceState({}, document.title, window.location.pathname);
          }
          // Redirect to app since they are authenticated
          window.location.href = '/app.html';
        }, 2000);
      }
    });

    // Skip the rest of initialization for normal forms
    return;
  }

  // Handle Change Password flow
  const navChangePwdBtn = document.getElementById('nav-changepwd-btn');
  const toggleChangepwdClose = document.getElementById('toggle-changepwd-close');
  const formChangepwd = document.getElementById('form-changepwd');
  const changepwdForm = document.getElementById('changepwd-form');

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


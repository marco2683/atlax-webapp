import { signUpUser, loginUser } from './services/auth.js';
import { supabase } from './utils/supabaseClient.js';
document.addEventListener('DOMContentLoaded', () => {
  const authModal = document.getElementById('auth-modal');
  if (!authModal) return;

  const closeBtn = document.getElementById('close-auth-modal');
  
  // Triggers (Any button with class 'trigger-auth-modal', or id 'btn-login', 'nav-login-btn')
  const triggers = document.querySelectorAll('.trigger-auth-modal, #btn-login, #nav-login-btn');
  triggers.forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      authModal.classList.remove('hidden');
    });
  });

  if (closeBtn) {
    closeBtn.addEventListener('click', () => {
      authModal.classList.add('hidden');
    });
  }

  // Auto-open if query parameter has login=true (e.g. from email verification links or splash screens)
  if (window.location.search.includes('login=true') || window.location.search.includes('auth=login')) {
    authModal.classList.remove('hidden');
    // Ensure login form is displayed
    const containerLogin = document.getElementById('form-login');
    const containerSignup = document.getElementById('form-signup');
    if (containerLogin) containerLogin.style.display = 'block';
    if (containerSignup) containerSignup.style.display = 'none';
    
    // Check if coming from verification
    if (window.location.hash.includes('type=verify') || window.location.search.includes('login=true')) {
      // Optional: add a tiny message
      const loginHeader = document.querySelector('#form-login .auth-header p');
      if (loginHeader && window.location.hash.includes('type=signup')) {
         loginHeader.innerText = "Email verified! Please log in.";
         loginHeader.style.color = "var(--color-electric, #5ea2ff)";
      }
    }
  }

  // Handle Form UI toggles
  const loginForm = document.getElementById('login-form');
  const signupForm = document.getElementById('signup-form');
  const loginBtn = document.getElementById('login-submit-btn');
  const signupBtn = document.getElementById('signup-submit-btn');
  const loginError = document.getElementById('login-error');
  const signupError = document.getElementById('signup-error');
  const toggleToSignup = document.getElementById('toggle-to-signup');
  const toggleToLogin = document.getElementById('toggle-to-login');
  const containerLogin = document.getElementById('form-login');
  const containerSignup = document.getElementById('form-signup');

  if (toggleToSignup && toggleToLogin && containerLogin && containerSignup) {
    toggleToSignup.addEventListener('click', (e) => {
      e.preventDefault();
      containerLogin.style.display = 'none';
      containerSignup.style.display = 'block';

      // Inject Turnstile into signup form
      const signupFormEl = document.getElementById('signup-form');
      if (signupFormEl && !document.querySelector('#signup-form .cf-turnstile')) {
         const turnstileContainer = document.createElement('div');
         turnstileContainer.className = 'cf-turnstile auth-input-group';
         turnstileContainer.dataset.sitekey = '0x4AAAAAADOr_yhZAEAJ5dWN'; // Turnstile test key
         turnstileContainer.style.marginTop = '15px';
         signupFormEl.insertBefore(turnstileContainer, document.getElementById('signup-submit-btn'));
    
         if (!document.getElementById('turnstile-script')) {
            const script = document.createElement('script');
            script.id = 'turnstile-script';
            script.src = "https://challenges.cloudflare.com/turnstile/v0/api.js";
            script.async = true;
            script.defer = true;
            document.head.appendChild(script);
         }
      }
    });

    toggleToLogin.addEventListener('click', (e) => {
      e.preventDefault();
      containerSignup.style.display = 'none';
      containerLogin.style.display = 'block';
    });
  }

  // Login Logic
  if (loginForm) {
    loginForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      loginError.innerText = '';
      loginError.classList.remove('visible');
      const email = document.getElementById('login-email').value;
      const pass = document.getElementById('login-password').value;
      
      loginBtn.innerText = 'Authenticating...';
      loginBtn.disabled = true;

      const { data, error } = await loginUser(email, pass);
      
      if (error) {
        loginError.innerText = error.message;
        loginError.classList.add('visible');
        loginBtn.innerText = 'Log In';
        loginBtn.disabled = false;
      } else {
        loginBtn.innerText = 'Success!';
        const { data: profile } = await supabase.from('profiles').select('tier').eq('id', data.user.id).single();
        if (profile && profile.tier) {
          sessionStorage.setItem('atlasdt_tier', profile.tier);
        } else {
          sessionStorage.setItem('atlasdt_tier', 'basic');
        }
        window.location.reload();
      }
    });
  }

  // Signup Logic
  if (signupForm) {
    signupForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      signupError.innerText = '';
      signupError.classList.remove('visible');
      
      const email = document.getElementById('signup-email').value;
      const pass = document.getElementById('signup-password').value;
      const first = document.getElementById('signup-first').value;
      const last = document.getElementById('signup-last').value;
      const company = document.getElementById('signup-company').value;
      const marketingOptIn = document.getElementById('signup-marketing')?.checked || false;
      const captchaToken = document.querySelector('#form-signup [name="cf-turnstile-response"]')?.value || document.querySelector('#signup-form [name="cf-turnstile-response"]')?.value;

      if (!captchaToken) {
        signupError.innerText = 'Please complete the CAPTCHA to proceed.';
        signupError.classList.add('visible');
        signupBtn.innerText = 'Create Account';
        signupBtn.disabled = false;
        return;
      }

      signupBtn.innerText = 'Creating Account...';
      signupBtn.disabled = true;

      const metadata = {
        first_name: first,
        last_name: last,
        company: company,
        marketing_opt_in: marketingOptIn,
        tier: 'basic'
      };

      const { data, error } = await signUpUser(email, pass, metadata, captchaToken);
      
      if (error) {
        signupError.innerText = error.message;
        signupError.classList.add('visible');
        signupBtn.innerText = 'Create Account';
        signupBtn.disabled = false;
      } else {
        containerSignup.innerHTML = `
          <div style="text-align: center; padding: 30px 10px;">
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="var(--color-electric, #5ea2ff)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="margin-bottom: 16px;"><path d="M22 10.5V6a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v12c0 1.1.9 2 2 2h12.5"></path><polyline points="22 7 12 14 2 7"></polyline><path d="M20 14v6"></path><path d="M17 17l3 3 3-3"></path></svg>
            <h3 style="margin-bottom: 12px; font-size: 24px; color: white;">Verify Your Email</h3>
            <p style="font-size: 14px; color: rgba(255,255,255,0.6); margin-bottom: 24px; line-height: 1.5;">We've sent a verification link to <strong style="color:white;">${email}</strong>.<br>Please check your inbox to activate your account.</p>
            <button id="auth-modal-splash-return" class="auth-btn" style="background: rgba(94, 162, 255, 0.1); border: 1px solid rgba(94, 162, 255, 0.3); color: var(--color-electric, #5ea2ff);">Return to Login</button>
          </div>
        `;
        document.getElementById('auth-modal-splash-return').addEventListener('click', (ev) => {
          ev.preventDefault();
          containerSignup.style.display = 'none';
          containerLogin.style.display = 'block';
        });
      }
    });
  }
});


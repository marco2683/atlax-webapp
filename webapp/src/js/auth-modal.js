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
      
      signupBtn.innerText = 'Creating Account...';
      signupBtn.disabled = true;

      const pendingTier = document.getElementById('signup-tier')?.value || 'basic';
      const metadata = {
        first_name: first,
        last_name: last,
        company: company,
        tier: pendingTier
      };
      
      if (pendingTier !== 'basic') {
        sessionStorage.setItem('pending_tier_subscription', pendingTier);
      }

      const { data, error } = await signUpUser(email, pass, metadata);
      
      if (error) {
        signupError.innerText = error.message;
        signupError.classList.add('visible');
        signupBtn.innerText = 'Create Account';
        signupBtn.disabled = false;
      } else {
        signupBtn.innerText = 'Check your email to verify!';
        setTimeout(() => {
          containerSignup.style.display = 'none';
          containerLogin.style.display = 'block';
        }, 3000);
      }
    });
  }
});


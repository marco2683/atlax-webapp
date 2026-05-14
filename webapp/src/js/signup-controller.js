import { supabase } from './utils/supabaseClient.js';
import { getMyProfile } from './services/profile.js';
document.addEventListener('DOMContentLoaded', async () => {
  const urlParams = new URLSearchParams(window.location.search);
  const initialTier = urlParams.get('tier') || 'free';
  
  const tierCards = document.querySelectorAll('.tier-card');
  const step1Btn = document.getElementById('step-1-btn');
  const step2Btn = document.getElementById('step-2-btn');
  const step1Container = document.getElementById('step-1-container');
  const step2Container = document.getElementById('step-2-container');
  const pip1 = document.getElementById('pip-1');
  const pip2 = document.getElementById('pip-2');
  
  let currentTier = initialTier;

  // Inject Turnstile widget
  const step1Form = document.getElementById('step-1-form');
  if (step1Form) {
     const turnstileContainer = document.createElement('div');
     turnstileContainer.className = 'cf-turnstile auth-input-group';
     turnstileContainer.dataset.sitekey = '0x4AAAAAADOr_yhZAEAJ5dWN'; // Turnstile dummy key
     turnstileContainer.style.marginTop = '15px';
     step1Form.insertBefore(turnstileContainer, step1Btn);
     
     if (!document.getElementById('turnstile-script')) {
        const script = document.createElement('script');
        script.id = 'turnstile-script';
        script.src = "https://challenges.cloudflare.com/turnstile/v0/api.js";
        script.async = true;
        script.defer = true;
        document.head.appendChild(script);
     }
  }
  
  const colors = {
    free: '#94a3b8',
    designer: '#a78bfa',
    entrepreneur: '#fdba74',
    professional: '#5ea2ff',
    enterprise: '#ffffff'
  };

  // Initialize UI
  setTier(initialTier);

  // Check Auth State
  let isLoggedIn = false;
  const { data: { session } } = await supabase.auth.getSession();
  
  if (session) {
    isLoggedIn = true;
    const profile = await getMyProfile();
    
    // Fill and lock inputs
    const fnameInput = document.getElementById('fname');
    const lnameInput = document.getElementById('lname');
    const companyInput = document.getElementById('company');
    const emailInput = document.getElementById('email');
    const pwdInput = document.getElementById('password');

    if (fnameInput) {
      fnameInput.value = profile?.first_name || '';
      fnameInput.readOnly = true;
      fnameInput.style.opacity = '0.6';
    }
    if (lnameInput) {
      lnameInput.value = profile?.last_name || '';
      lnameInput.readOnly = true;
      lnameInput.style.opacity = '0.6';
    }
    if (companyInput) {
      companyInput.value = profile?.company || '';
      companyInput.readOnly = true;
      companyInput.style.opacity = '0.6';
    }
    if (emailInput) {
      emailInput.value = session.user.email;
      emailInput.readOnly = true;
      emailInput.style.opacity = '0.6';
    }
    
    // Disable password so it doesn't block form submission (required)
    if (pwdInput) {
      pwdInput.parentElement.style.display = 'none';
      pwdInput.disabled = true;
      pwdInput.removeAttribute('required');
    }
    
    // Hide login links since they are logged in
    const loginLink = document.querySelector('#step-1-form p');
    if (loginLink) loginLink.style.display = 'none';
  }

  // Add click listeners to tier cards (Left sidebar)
  tierCards.forEach(card => {
    card.addEventListener('click', () => {
      setTier(card.dataset.tier);
    });
  });

  function setTier(tier) {
    currentTier = tier;
    
    // Update active visual states
    tierCards.forEach(card => {
      card.classList.toggle('active', card.dataset.tier === tier);
    });
    
    // Update active primary color dynamically
    const pColor = colors[tier] || colors.free;
    document.documentElement.style.setProperty('--tier-pro-color', pColor);
    
    // Update Main Action button text depending on free/paid
    const entGroup = document.getElementById('enterprise-needs-group');
    const entNeeds = document.getElementById('enterprise-needs');
    
    if (tier === 'free') {
      step1Btn.innerHTML = 'Complete Setup <div class="spinner"></div>';
      pip2.style.display = 'none'; // Hide step 2 pip
      if (entGroup) entGroup.style.display = 'none';
      if (entNeeds) entNeeds.required = false;
    } else if (tier === 'enterprise') {
      step1Btn.innerHTML = 'Submit Inquiry <div class="spinner"></div>';
      pip2.style.display = 'none'; // Hide step 2 pip
      if (entGroup) entGroup.style.display = 'block';
      if (entNeeds) entNeeds.required = true;
    } else {
      step1Btn.innerHTML = 'Next Step: Payment <div class="spinner"></div>';
      pip2.style.display = 'block'; 
      if (entGroup) entGroup.style.display = 'none';
      if (entNeeds) entNeeds.required = false;
    }
  }

  // Next Step Action (Account Setup submit)
  document.getElementById('step-1-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    step1Btn.classList.add('loading');
    
    const fname = document.getElementById('fname')?.value || '';
    const lname = document.getElementById('lname')?.value || '';
    const company = document.getElementById('company')?.value || '';
    const email = document.getElementById('email')?.value || '';
    const password = document.getElementById('password')?.value || '';

    const captchaToken = document.querySelector('#step-1-form [name="cf-turnstile-response"]')?.value;

    if (!isLoggedIn && password && !captchaToken) {
      step1Btn.classList.remove('loading');
      alert('Please complete the CAPTCHA to proceed.');
      return;
    }

    // If not already logged in, create the account
    if (!isLoggedIn && password) {
      const { signUpUser } = await import('./services/auth.js');
      const { data, error } = await signUpUser(email, password, {
        first_name: fname,
        last_name: lname,
        company: company,
        tier: currentTier
      }, captchaToken);
      
      if (error) {
        step1Btn.classList.remove('loading');
        alert(error.message);
        return;
      }

      if (data && data.user && !data.session) {
        step1Btn.classList.remove('loading');
        // Show email verification splash
        const container = document.querySelector('.form-steps') || document.body;
        container.innerHTML = `
          <div style="text-align: center; padding: 40px; color: white; margin-top: 60px;">
            <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="var(--color-electric, #5ea2ff)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="margin-bottom: 24px;"><path d="M22 10.5V6a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v12c0 1.1.9 2 2 2h12.5"></path><polyline points="22 7 12 14 2 7"></polyline><path d="M20 14v6"></path><path d="M17 17l3 3 3-3"></path></svg>
            <h2 style="font-size: 32px; margin-bottom: 16px;">Verify your email</h2>
            <p style="font-size: 16px; color: rgba(255,255,255,0.7); margin-bottom: 32px;">We've sent a verification link to <strong style="color:white;">${email}</strong>. Please check your inbox and click the link to activate your account.</p>
            <a href="/index.html?login=true" style="display: inline-block; padding: 12px 24px; background: rgba(94, 162, 255, 0.1); border: 1px solid rgba(94, 162, 255, 0.3); border-radius: 8px; color: var(--color-electric, #5ea2ff); text-decoration: none; font-weight: 500; transition: all 0.2s;">Return to Login</a>
          </div>
        `;
        return;
      }
    } else if (isLoggedIn) {
      // Just update tier preference if already logged in
      sessionStorage.setItem('pending_tier_subscription', currentTier);
    }
    
    step1Btn.classList.remove('loading');
    
    if (currentTier === 'free') {
      window.location.href = '/profile.html';
    } else if (currentTier === 'enterprise') {
      alert('Inquiry sent! Our team will contact you shortly to scope your custom requirements.');
      window.location.href = '/index.html';
    } else {
      step1Container.classList.remove('active');
      step2Container.classList.add('active');
      pip1.classList.remove('active');
      pip2.classList.add('active');
      const stepLabel = document.getElementById('step-text-label');
      if (stepLabel) stepLabel.innerHTML = 'Step 2 of 2: Payment';
    }
  });

  // Final Step Action (Checkout submit)
  if (document.getElementById('step-2-form')) {
    document.getElementById('step-2-form').addEventListener('submit', (e) => {
      e.preventDefault();
      step2Btn.classList.add('loading');
      
      // Simulate real Stripe processing
      setTimeout(() => {
        step2Btn.classList.remove('loading');
        // On success redirect to profile/workspace hub
        window.location.href = '/workspace.html'; 
      }, 2000);
    });
  }

  // Go Back
  document.getElementById('go-back-btn')?.addEventListener('click', (e) => {
    e.preventDefault();
    step2Container.classList.remove('active');
    step1Container.classList.add('active');
    pip2.classList.remove('active');
    pip1.classList.add('active');
    
    const stepLabel = document.getElementById('step-text-label');
    if (stepLabel) stepLabel.innerHTML = 'Step 1 of 2';
  });

});

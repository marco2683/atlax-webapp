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
      if (card.dataset.tier === 'enterprise') {
        alert('Enterprise requires a custom scope. Please contact sales on the profile page.');
        window.location.href = '/profile.html';
        return;
      }
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
    if (tier === 'free') {
      step1Btn.innerHTML = 'Complete Setup <div class="spinner"></div>';
      pip2.style.display = 'none'; // Hide step 2 pip
    } else {
      step1Btn.innerHTML = 'Next Step: Payment <div class="spinner"></div>';
      pip2.style.display = 'block'; 
    }
  }

  // Next Step Action (Account Setup submit)
  document.getElementById('step-1-form').addEventListener('submit', (e) => {
    e.preventDefault();
    step1Btn.classList.add('loading');
    
    // Simulate Supabase user creation / API delay
    setTimeout(() => {
      step1Btn.classList.remove('loading');
      
      if (currentTier === 'free') {
        // Complete the signup directly
        window.location.href = '/profile.html';
      } else {
        // Unlocks checkout step
        step1Container.classList.remove('active');
        step2Container.classList.add('active');
        
        pip1.classList.remove('active');
        pip2.classList.add('active');
      }
    }, 1000);
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
  });

});

import { getMyProfile, updateMyProfile } from './services/profile.js';
import { supabase } from './utils/supabaseClient.js';
import { logoutUser } from './services/auth.js';

document.addEventListener('DOMContentLoaded', async () => {
  // Check auth state
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) {
    window.location.href = '/auth.html';
    return;
  }

  // Load User Data
  const emailInput = document.getElementById('prof-email');
  emailInput.value = session.user.email;

  const profile = await getMyProfile();
  if (profile) {
    document.getElementById('prof-first').value = profile.first_name || '';
    document.getElementById('prof-last').value = profile.last_name || '';
    document.getElementById('prof-phone').value = profile.phone || '';
    document.getElementById('prof-company').value = profile.company || '';
    document.getElementById('prof-title').value = profile.job_title || '';
    document.getElementById('prof-address').value = profile.address || '';
    document.getElementById('prof-age').value = profile.age || '';
    document.getElementById('prof-gender').value = profile.gender || '';
    
    // New Extended Attributes
    const careerEl = document.getElementById('prof-career');
    if (careerEl) careerEl.value = profile.career_description || '';
    const skillsEl = document.getElementById('prof-skills');
    if (skillsEl) skillsEl.value = profile.skills || '';
    const linkedinEl = document.getElementById('prof-linkedin');
    if (linkedinEl) linkedinEl.value = profile.linkedin_url || '';

    // Billing info
    const isPro = profile.tier === 'professional';
    document.getElementById('billing-tier-name').textContent = isPro ? 'Professional Tier' : 'Basic Tier';
    const badge = document.getElementById('billing-tier-badge');
    const desc = document.getElementById('billing-tier-desc');
    const upgradeBtn = document.getElementById('btn-upgrade');
    
    badge.textContent = isPro ? 'PRO' : 'BASIC';
    if (isPro) {
      badge.classList.add('professional');
      desc.textContent = "You have full, unrestricted access to the ATLAX Professional platform.";
      desc.style.color = "var(--color-electric)";
      upgradeBtn.style.display = 'none'; // Hide upgrade button if already pro
    } else {
      desc.textContent = "You currently have restricted platform access.";
    }
  }

  // Tab switching logic
  const tabs = document.querySelectorAll('.profile-tab');
  const panes = document.querySelectorAll('.profile-content-pane');

  tabs.forEach(tab => {
    tab.addEventListener('click', async () => {
      const target = tab.getAttribute('data-tab');
      
      // Handle logout pseudo-tab
      if (tab.textContent === 'Log Out') {
        await logoutUser();
        window.location.href = '/';
        return;
      }

      tabs.forEach(t => t.classList.remove('active'));
      panes.forEach(p => p.classList.remove('active'));

      tab.classList.add('active');
      document.getElementById(`pane-${target}`).classList.add('active');
    });
  });

  // Handle Generel Form Submission
  const form = document.getElementById('profile-general-form');
  const saveBtn = document.getElementById('prof-save-btn');
  const saveMsg = document.getElementById('prof-save-msg');

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    saveBtn.textContent = 'Saving...';
    saveBtn.disabled = true;

    const updates = {
      first_name: document.getElementById('prof-first').value,
      last_name: document.getElementById('prof-last').value,
      phone: document.getElementById('prof-phone').value,
      company: document.getElementById('prof-company').value,
      job_title: document.getElementById('prof-title').value,
      address: document.getElementById('prof-address').value,
      age: document.getElementById('prof-age').value ? parseInt(document.getElementById('prof-age').value) : null,
      gender: document.getElementById('prof-gender').value,
      career_description: document.getElementById('prof-career') ? document.getElementById('prof-career').value : null,
      skills: document.getElementById('prof-skills') ? document.getElementById('prof-skills').value : null,
      linkedin_url: document.getElementById('prof-linkedin') ? document.getElementById('prof-linkedin').value : null
    };

    const { error } = await updateMyProfile(updates);

    if (!error) {
      saveBtn.textContent = 'Save Changes';
      saveBtn.disabled = false;
      saveMsg.style.display = 'inline-block';
      setTimeout(() => saveMsg.style.display = 'none', 3000);
    } else {
      alert('Error updating profile: ' + error.message);
      saveBtn.textContent = 'Save Changes';
      saveBtn.disabled = false;
    }
  });

  // Handle Work Profile Submission
  const workForm = document.getElementById('profile-work-form');
  if (workForm) {
    workForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const wBtn = document.getElementById('prof-work-save-btn');
      wBtn.textContent = 'Saving...';
      wBtn.disabled = true;

      const updates = {
        work_history: document.getElementById('prof-work-history').value,
        experience_years: document.getElementById('prof-experience').value ? parseInt(document.getElementById('prof-experience').value) : null,
        methodologies: document.getElementById('prof-methodologies').value
      };

      const { error } = await updateMyProfile(updates);
      wBtn.textContent = 'Save Work Profile';
      wBtn.disabled = false;

      if (!error) {
        alert('Work Profile saved successfully.');
      } else {
        alert('Error: ' + error.message);
      }
    });
  }

  // Handle Resume Upload
  const resumeUploadInput = document.getElementById('resume-upload-input');
  if (resumeUploadInput) {
    resumeUploadInput.addEventListener('change', async (e) => {
      const file = e.target.files[0];
      if (!file) return;

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const labelTxt = document.getElementById('resume-upload-label-text');
      const statusHtml = document.getElementById('resume-upload-status');
      
      labelTxt.innerText = `Uploading ${file.name}...`;
      
      // Upload to user_resumes bucket
      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}_resume_${Date.now()}.${fileExt}`;
      const { data, error } = await supabase.storage.from('user_resumes').upload(fileName, file);

      if (error) {
        alert("Upload Error: " + error.message);
        labelTxt.innerText = "Click to upload your Resume/CV";
        return;
      }

      // Get public URL
      const { data: { publicUrl } } = supabase.storage.from('user_resumes').getPublicUrl(fileName);
      
      // Update profile
      await updateMyProfile({ resume_url: publicUrl });

      labelTxt.innerText = "Click to upload a newer Resume/CV";
      statusHtml.style.display = 'block';
      setTimeout(() => statusHtml.style.display = 'none', 4000);
      
      const currContainer = document.getElementById('current-resume-container');
      const currLink = document.getElementById('current-resume-link');
      currContainer.style.display = 'block';
      currLink.href = publicUrl;
    });
  }

  // Handle Portfolio Uploads
  const portfolioInput = document.getElementById('portfolio-upload-input');
  if (portfolioInput) {
    portfolioInput.addEventListener('change', async (e) => {
      const files = Array.from(e.target.files);
      if (!files.length) return;

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const labelTxt = document.getElementById('portfolio-upload-label-text');
      const statusHtml = document.getElementById('portfolio-upload-status');
      const gallery = document.getElementById('portfolio-gallery-container');
      
      labelTxt.innerText = `Uploading ${files.length} files...`;
      
      let newUrls = [];
      
      for (const file of files) {
        const fileExt = file.name.split('.').pop();
        const fileName = `${user.id}_portfolio_${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;
        const { error } = await supabase.storage.from('user_portfolios').upload(fileName, file);
        if (!error) {
          const { data: { publicUrl } } = supabase.storage.from('user_portfolios').getPublicUrl(fileName);
          newUrls.push(publicUrl);
          
          // Render instantly
          const img = document.createElement('img');
          img.src = publicUrl;
          img.style.width = '100%';
          img.style.height = '120px';
          img.style.objectFit = 'cover';
          img.style.borderRadius = '8px';
          img.style.border = '1px solid rgba(255,255,255,0.1)';
          gallery.appendChild(img);
        }
      }

      // We need to fetch existing portfolio array to append?
      // Or just append. We'll simply re-fetch the profile.
      const profile = await getMyProfile();
      let existingArray = [];
      if (profile && profile.portfolio_assets) {
        try {
           existingArray = Array.isArray(profile.portfolio_assets) ? profile.portfolio_assets : JSON.parse(profile.portfolio_assets);
        } catch(e) {}
      }
      
      const combined = [...existingArray, ...newUrls];
      await updateMyProfile({ portfolio_assets: combined });

      labelTxt.innerText = "Select more files to add to Portfolio";
      statusHtml.innerText = `Successfully uploaded ${newUrls.length} file(s)!`;
      statusHtml.style.display = 'block';
      setTimeout(() => statusHtml.style.display = 'none', 4000);
    });
  }

  // Load existing data into new tabs
  if (profile) {
    // Work
    const workHistoryEl = document.getElementById('prof-work-history');
    if (workHistoryEl) workHistoryEl.value = profile.work_history || '';
    const expEl = document.getElementById('prof-experience');
    if (expEl) expEl.value = profile.experience_years || '';
    const methEl = document.getElementById('prof-methodologies');
    if (methEl) methEl.value = profile.methodologies || '';
    
    // Resume
    if (profile.resume_url) {
      document.getElementById('current-resume-container').style.display = 'block';
      document.getElementById('current-resume-link').href = profile.resume_url;
    }
    
    // Portfolio
    const pContainer = document.getElementById('portfolio-gallery-container');
    if (pContainer && profile.portfolio_assets) {
      try {
        const assets = Array.isArray(profile.portfolio_assets) ? profile.portfolio_assets : JSON.parse(profile.portfolio_assets);
        assets.forEach(url => {
          const img = document.createElement('img');
          img.src = url;
          img.style.width = '100%';
          img.style.height = '120px';
          img.style.objectFit = 'cover';
          img.style.borderRadius = '8px';
          img.style.border = '1px solid rgba(255,255,255,0.1)';
          pContainer.appendChild(img);
        });
      } catch(e) { console.error('Failed to parse portfolio assets', e); }
    }
  }

  // Stripe Integration Triggers
  document.getElementById('btn-upgrade').addEventListener('click', async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return alert("You must be logged in.");

      document.getElementById('btn-upgrade').textContent = 'Loading...';
      
      const response = await fetch('/.netlify/functions/create-checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user.id
        })
      });

      const data = await response.json();
      if (data.url) {
        window.location.href = data.url;
      } else {
        alert('Checkout API Error: ' + JSON.stringify(data));
        btn.textContent = originalText;
        btn.disabled = false;
      }
    } catch (err) {
      alert('Network/Fetch Error: ' + err.message);
      btn.textContent = 'Upgrade to Professional';
      btn.disabled = false;
    }
  });

  document.getElementById('btn-customer-portal').addEventListener('click', async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return alert("You must be logged in.");

      const btn = document.getElementById('btn-customer-portal');
      btn.textContent = 'Loading Portal...';
      
      const response = await fetch('/.netlify/functions/create-portal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.id })
      });

      const data = await response.json();
      if (data.url) {
        window.location.href = data.url;
      } else {
        alert(data.error || 'Failed to initialize customer portal');
      }
    } catch (err) {
      console.error(err);
      alert('Network error initializing portal.');
    } finally {
      document.getElementById('btn-customer-portal').textContent = 'Open Stripe Portal';
    }
  });

  // Updated Role Checkout -> Onboarding Flow
  const onboardingModal = document.getElementById('role-onboarding-modal');
  const onboardingContent = document.getElementById('onboarding-content-area');
  const closeOnboardingBtn = document.getElementById('close-role-onboarding');

  const closeOnboarding = () => {
    onboardingModal.classList.add('hidden');
    document.body.style.overflow = '';
  };
  
  if (closeOnboardingBtn) closeOnboardingBtn.addEventListener('click', closeOnboarding);

  const performStripeCheckout = async (planType, btn) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return alert("You must be logged in.");

      const originalText = btn.innerHTML;
      btn.innerHTML = 'Connecting to Secure Checkout...';
      btn.disabled = true;
      
      const response = await fetch('/.netlify/functions/create-checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user.id,
          planType: planType
        })
      });

      const data = await response.json();
      if (data.url) {
        window.location.href = data.url;
      } else {
        alert('Checkout API Error: ' + JSON.stringify(data));
        btn.innerHTML = originalText;
        btn.disabled = false;
      }
    } catch (err) {
      alert('Network/Fetch Error: ' + err.message);
      btn.innerHTML = 'Proceed to Checkout';
      btn.disabled = false;
    }
  };

  const setupRoleOnboarding = (btnId, planType) => {
    const btn = document.getElementById(btnId);
    if (!btn) return;
    
    btn.addEventListener('click', async () => {
      onboardingModal.classList.remove('hidden');
      document.body.style.overflow = 'hidden';
      
      let html = '';
      if (planType === 'designer') {
        html = `
          <div style="margin-bottom: 24px; text-align: center;">
            <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="rgba(139, 92, 246, 1)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="margin-bottom: 16px;"><path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z"/></svg>
            <h2 style="font-size: 28px; margin-bottom: 8px;">Join the Global Designer Network</h2>
            <p style="color: var(--color-steel-400); font-size: 15px; margin-bottom: 24px;">Gain visibility, secure international projects, and work directly with global hardware creators.</p>
            <div style="background: rgba(139, 92, 246, 0.1); border: 1px solid rgba(139, 92, 246, 0.3); border-radius: 12px; padding: 24px; display: inline-block;">
              <div style="font-size: 13px; text-transform: uppercase; letter-spacing: 1px; color: rgba(139, 92, 246, 0.8); margin-bottom: 8px;">Designer Membership</div>
              <div style="font-size: 36px; font-weight: bold; color: white;">$29<span style="font-size: 16px; color: var(--color-steel-400); font-weight: normal;">/month</span></div>
            </div>
          </div>
          <p style="color: var(--color-steel-300); font-size: 14px; text-align: center; margin-bottom: 32px;">By proceeding, your profile will be listed globally and you'll be able to receive direct inquiries from Entrepreneurs.</p>
          <button class="btn-save" id="onboarding-checkout-btn" style="width: 100%; font-size: 16px; background: linear-gradient(135deg, rgba(139, 92, 246, 0.9), rgba(124, 58, 237, 1));">Proceed to Secure Checkout</button>
        `;
      } else {
        html = `
          <div style="margin-bottom: 24px; text-align: center;">
            <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="rgba(249, 115, 22, 1)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="margin-bottom: 16px;"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/></svg>
            <h2 style="font-size: 28px; margin-bottom: 8px;">Post Jobs & Build Teams</h2>
            <p style="color: var(--color-steel-400); font-size: 15px; margin-bottom: 24px;">Find top-tier engineering talent, post RFQs, and securely manage your product development phases.</p>
            <div style="background: rgba(249, 115, 22, 0.1); border: 1px solid rgba(249, 115, 22, 0.3); border-radius: 12px; padding: 24px; display: inline-block;">
              <div style="font-size: 13px; text-transform: uppercase; letter-spacing: 1px; color: rgba(249, 115, 22, 0.8); margin-bottom: 8px;">Entrepreneur Membership</div>
              <div style="font-size: 36px; font-weight: bold; color: white;">$49<span style="font-size: 16px; color: var(--color-steel-400); font-weight: normal;">/month</span></div>
            </div>
          </div>
          <p style="color: var(--color-steel-300); font-size: 14px; text-align: center; margin-bottom: 32px;">Proceed to upgrade your account and instantly start hiring and collaborating.</p>
          <button class="btn-save" id="onboarding-checkout-btn" style="width: 100%; font-size: 16px; background: linear-gradient(135deg, rgba(249, 115, 22, 0.9), rgba(234, 88, 12, 1));">Proceed to Secure Checkout</button>
        `;
      }
      
      onboardingContent.innerHTML = html;
      
      document.getElementById('onboarding-checkout-btn').addEventListener('click', (e) => {
        performStripeCheckout(planType, e.target);
      });
    });
  };

  setupRoleOnboarding('btn-role-designer', 'designer');
  setupRoleOnboarding('btn-role-entrepreneur', 'entrepreneur');

});

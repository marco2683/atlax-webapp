import { getMyProfile, updateMyProfile } from './services/profile.js';
import { supabase } from './utils/supabaseClient.js';
import { logoutUser } from './services/auth.js';

document.addEventListener('DOMContentLoaded', async () => {
  // Check auth state
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) {
    window.location.href = '/index.html';
    return;
  }

  // 1. Populate Industry Dropdown dynamically
  const industryDropdown = document.getElementById('comp-industry');
  if (industryDropdown) {
    const industries = [
      { value: "aerospace", label: "Aerospace & Defense" },
      { value: "agriculture", label: "Agriculture & Farming" },
      { value: "apparel_fashion", label: "Apparel & Fashion" },
      { value: "automotive", label: "Automotive & Mobility" },
      { value: "biotech", label: "Biotechnology" },
      { value: "chemicals", label: "Chemicals & Plastics" },
      { value: "construction", label: "Construction & Engineering" },
      { value: "consumer_electronics", label: "Consumer Electronics" },
      { value: "consumer_goods", label: "FMCG / Consumer Goods" },
      { value: "energy", label: "Energy & Cleantech" },
      { value: "food_beverage", label: "Food & Beverage" },
      { value: "furniture", label: "Furniture & Decor" },
      { value: "healthcare", label: "Healthcare Equipment" },
      { value: "home_appliances", label: "Home Appliances" },
      { value: "industrial_machinery", label: "Industrial Machinery" },
      { value: "iot_robotics", label: "IoT & Robotics" },
      { value: "medical_devices", label: "Medical Devices" },
      { value: "packaging", label: "Packaging" },
      { value: "pharmaceuticals", label: "Pharmaceuticals" },
      { value: "semiconductors", label: "Semiconductors" },
      { value: "sporting_goods", label: "Sporting Goods" },
      { value: "telecommunications", label: "Telecommunications" },
      { value: "toys_games", label: "Toys & Games" },
      { value: "transportation", label: "Transportation / Logistics" },
      { value: "other", label: "Other" }
    ];

    industries.forEach(ind => {
      const option = document.createElement('option');
      option.value = ind.value;
      option.textContent = ind.label;
      industryDropdown.appendChild(option);
    });
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
    
    const setSafe = (id, val) => { const el = document.getElementById(id); if (el) el.value = val || ''; };
    setSafe('comp-name', profile.company);
    setSafe('comp-website', profile.company_website);
    setSafe('comp-industry', profile.company_industry);
    setSafe('comp-size', profile.company_size);
    setSafe('comp-tax-id', profile.tax_id);
    setSafe('comp-reg-num', profile.registration_number);

    // ── Populate rich billing address ──
    const loadAddr = (prefix, jsonStr) => {
      try {
        const addr = typeof jsonStr === 'string' ? JSON.parse(jsonStr) : jsonStr;
        if (!addr) return;
        setSafe(`${prefix}-line1`, addr.line1);
        setSafe(`${prefix}-line2`, addr.line2);
        setSafe(`${prefix}-city`, addr.city);
        setSafe(`${prefix}-state`, addr.state);
        setSafe(`${prefix}-postcode`, addr.postcode);
        setSafe(`${prefix}-country`, addr.country);
        setSafe(`${prefix}-phone-prefix`, addr.phone_prefix);
        setSafe(`${prefix}-phone`, addr.phone);
      } catch(e) {
        // Legacy plain-text address — put it in line1
        if (typeof jsonStr === 'string' && jsonStr) setSafe(`${prefix}-line1`, jsonStr);
      }
    };
    loadAddr('bill', profile.address);
    loadAddr('ship', profile.shipping_address);


    if (profile.designer_status === 'approved') {
      const designerMenu = document.getElementById('approved-designer-tabs');
      if (designerMenu) designerMenu.style.display = 'flex';
    }
  }

  // Tab switching logic
  const tabs = document.querySelectorAll('.profile-tab');
  const panes = document.querySelectorAll('.profile-content-pane');

  tabs.forEach(tab => {
    tab.addEventListener('click', async () => {
      const target = tab.getAttribute('data-tab');
      
      // Handle logout pseudo-tab
      if (tab.textContent.includes('Log Out')) {
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

  // Handle URL tab param
  const urlParams = new URLSearchParams(window.location.search);
  const startTab = urlParams.get('tab');
  if (startTab) {
    const tabEl = document.querySelector(`.profile-tab[data-tab="${startTab}"]`);
    if (tabEl) {
      setTimeout(() => tabEl.click(), 50);
    }
  }

  

  // ── Rich Address Helpers ─────────────────────────────────
  const collectAddr = (prefix) => ({
    line1: document.getElementById(`${prefix}-line1`)?.value || '',
    line2: document.getElementById(`${prefix}-line2`)?.value || '',
    city: document.getElementById(`${prefix}-city`)?.value || '',
    state: document.getElementById(`${prefix}-state`)?.value || '',
    postcode: document.getElementById(`${prefix}-postcode`)?.value || '',
    country: document.getElementById(`${prefix}-country`)?.value || '',
    phone_prefix: document.getElementById(`${prefix}-phone-prefix`)?.value || '',
    phone: document.getElementById(`${prefix}-phone`)?.value || ''
  });

  // "Same as billing" checkbox wiring
  const sameChk = document.getElementById('ship-same-as-billing');
  const shipFields = document.getElementById('shipping-fields');
  if (sameChk && shipFields) {
    sameChk.addEventListener('change', () => {
      const inputs = shipFields.querySelectorAll('.ship-input');
      if (sameChk.checked) {
        const billIds = ['line1','line2','city','state','postcode','country','phone-prefix','phone'];
        billIds.forEach(f => {
          const src = document.getElementById(`bill-${f}`);
          const dst = document.getElementById(`ship-${f}`);
          if (src && dst) { dst.value = src.value; dst.disabled = true; }
        });
        shipFields.style.opacity = '0.45';
        shipFields.style.pointerEvents = 'none';
      } else {
        inputs.forEach(el => el.disabled = false);
        shipFields.style.opacity = '1';
        shipFields.style.pointerEvents = 'auto';
      }
    });
  }
  // ── Persistent Global Save Logic ─────────────────────────────────
  const globalSaveBtn = document.getElementById('global-save-btn');
  const globalSaveMsg = document.getElementById('global-save-msg');

  if (globalSaveBtn) {
    globalSaveBtn.addEventListener('click', async (e) => {
      e.preventDefault();
      globalSaveBtn.textContent = 'Saving...';
      globalSaveBtn.disabled = true;

      const getVal = (id) => document.getElementById(id) ? document.getElementById(id).value : null;

      const updates = {
        first_name: getVal('prof-first'),
        last_name: getVal('prof-last'),
        phone: getVal('prof-phone'),
        company: getVal('prof-company'),
        job_title: getVal('prof-title'),
        address: getVal('prof-address'),
        age: getVal('prof-age') ? parseInt(getVal('prof-age')) : null,
        gender: getVal('prof-gender'),
        career_description: getVal('prof-career'),
        skills: getVal('prof-skills'),
        linkedin_url: getVal('prof-linkedin'),
        work_history: getVal('prof-work-history'),
        experience_years: getVal('prof-experience') ? parseInt(getVal('prof-experience')) : null,
        methodologies: getVal('prof-methodologies'),
        company: getVal('comp-name') || getVal('prof-company'),
        tax_id: getVal('comp-tax-id'),
        company_website: getVal('comp-website'),
        company_industry: getVal('comp-industry'),
        company_size: getVal('comp-size'),
        registration_number: getVal('comp-reg-num'),
        address: JSON.stringify(collectAddr('bill')),
        shipping_address: document.getElementById('ship-same-as-billing')?.checked
          ? JSON.stringify(collectAddr('bill'))
          : JSON.stringify(collectAddr('ship'))
      };

      // Filter out nulls/undefineds for partial saves
      const filteredUpdates = Object.fromEntries(Object.entries(updates).filter(([_, v]) => v != null));

      const { error } = await updateMyProfile(filteredUpdates);

      if (!error) {
        globalSaveBtn.textContent = 'Save All Changes';
        globalSaveBtn.disabled = false;
        globalSaveMsg.style.display = 'inline-block';
        setTimeout(() => globalSaveMsg.style.display = 'none', 3000);
      } else {
        alert('Error updating profile: ' + error.message + "\n\n(Did you forget to add the missing columns in Supabase?)");
        globalSaveBtn.textContent = 'Save All Changes';
        globalSaveBtn.disabled = false;
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
      let { data: { publicUrl } } = supabase.storage.from('user_resumes').getPublicUrl(fileName);
      publicUrl += `?download=${encodeURIComponent(file.name)}`;
      
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

  
  // Setup remove resume
  const removeResumeBtn = document.getElementById('remove-resume-btn');
  if (removeResumeBtn) {
    removeResumeBtn.addEventListener('click', async (e) => {
      e.preventDefault();
      if (!confirm("Are you sure you want to remove your uploaded resume?")) return;
      
      removeResumeBtn.innerText = 'Removing...';
      const { error } = await updateMyProfile({ resume_url: null });
      if (!error) {
        document.getElementById('current-resume-container').style.display = 'none';
        document.getElementById('resume-upload-label-text').innerText = "Click to upload your Resume/CV";
      } else {
        alert("Failed to remove resume: " + error.message);
      }
      removeResumeBtn.innerText = 'Remove';
    });
  }

  // Setup remove single Portfolio Document (PDF)
  const removePortfolioBtn = document.getElementById('remove-portfolio-link-btn');
  if (removePortfolioBtn) {
    removePortfolioBtn.addEventListener('click', async (e) => {
      e.preventDefault();
      if (!confirm("Are you sure you want to remove your attached portfolio PDF?")) return;
      
      removePortfolioBtn.innerText = 'Removing...';
      const { error } = await updateMyProfile({ portfolio_url: null });
      if (!error) {
        document.getElementById('current-portfolio-container').style.display = 'none';
      } else {
        alert("Failed to remove portfolio document: " + error.message);
      }
      removePortfolioBtn.innerText = 'Remove';
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

    // Single Portfolio PDF Document (From Application Flow)
    if (profile.portfolio_url) {
      const portLinkCont = document.getElementById('current-portfolio-container');
      if (portLinkCont) {
        portLinkCont.style.display = 'block';
        document.getElementById('current-portfolio-link').href = profile.portfolio_url;
      }
    }

    // Company (rich addresses already loaded above)
    const compName = document.getElementById('comp-name');
    if (compName) compName.value = profile.company || '';
    const compTax = document.getElementById('comp-tax-id');
    if (compTax) compTax.value = profile.tax_id || '';

    if (profile.company_logo_url) {
      document.getElementById('company-logo-preview').style.display = 'block';
      document.getElementById('company-logo-img').src = profile.company_logo_url;
      document.getElementById('company-logo-label-text').innerText = "Change Logo";
    }
    if (profile.company_hero_url) {
      document.getElementById('company-hero-preview').style.display = 'block';
      document.getElementById('company-hero-img').src = profile.company_hero_url;
      document.getElementById('company-hero-label-text').innerText = "Change Image";
    }
  }

  // Handle Company Uploads
  const companyLogoInput = document.getElementById('company-logo-input');
  if (companyLogoInput) {
    companyLogoInput.addEventListener('change', async (e) => {
      const file = e.target.files[0];
      if (!file) return;

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      document.getElementById('company-logo-label-text').innerText = "Uploading...";
      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}_logo_${Date.now()}.${fileExt}`;
      const { error } = await supabase.storage.from('user_portfolios').upload(fileName, file);

      if (!error) {
        const { data: { publicUrl } } = supabase.storage.from('user_portfolios').getPublicUrl(fileName);
        await updateMyProfile({ company_logo_url: publicUrl });
        document.getElementById('company-logo-preview').style.display = 'block';
        document.getElementById('company-logo-img').src = publicUrl;
        document.getElementById('company-logo-label-text').innerText = "Change Logo";
      } else {
        alert("Upload Error: " + error.message);
        document.getElementById('company-logo-label-text').innerText = "Upload Transparent PNG/SVG";
      }
    });
  }

  const companyHeroInput = document.getElementById('company-hero-input');
  if (companyHeroInput) {
    companyHeroInput.addEventListener('change', async (e) => {
      const file = e.target.files[0];
      if (!file) return;

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      document.getElementById('company-hero-label-text').innerText = "Uploading...";
      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}_hero_${Date.now()}.${fileExt}`;
      const { error } = await supabase.storage.from('user_portfolios').upload(fileName, file);

      if (!error) {
        const { data: { publicUrl } } = supabase.storage.from('user_portfolios').getPublicUrl(fileName);
        await updateMyProfile({ company_hero_url: publicUrl });
        document.getElementById('company-hero-preview').style.display = 'block';
        document.getElementById('company-hero-img').src = publicUrl;
        document.getElementById('company-hero-label-text').innerText = "Change Image";
      } else {
        alert("Upload Error: " + error.message);
        document.getElementById('company-hero-label-text').innerText = "Upload Office/Factory Image";
      }
    });
  }



  // Updated Role Checkout -> Onboarding Flow
  const onboardingModal = document.getElementById('role-onboarding-modal');
  const onboardingContent = document.getElementById('onboarding-content-area');
  const closeOnboardingBtn = document.getElementById('close-role-onboarding');

  const closeOnboarding = () => {
    // Restore file inputs to their respective panes
    const resumeMount = document.getElementById('modal-resume-mount');
    if (resumeMount && resumeMount.children.length > 0) {
      document.getElementById('pane-resume').appendChild(resumeMount.firstElementChild);
    }
    const portfolioMount = document.getElementById('modal-portfolio-mount');
    if (portfolioMount && portfolioMount.children.length > 0) {
      document.getElementById('pane-portfolio').appendChild(portfolioMount.firstElementChild);
    }

    onboardingModal.classList.add('hidden');
    document.body.style.overflow = '';
  };
  
  if (closeOnboardingBtn) closeOnboardingBtn.addEventListener('click', closeOnboarding);

  const performApplication = async (btn) => {
    // 1. Validate LinkedIn URL
    const linkedinVal = document.getElementById('app-linkedin-url')?.value?.trim();
    if (!linkedinVal || !/^https?:\/\/(www\.)?linkedin\.com\/.*$/i.test(linkedinVal)) {
      alert("A valid LinkedIn Profile URL is completely mandatory to apply.");
      return;
    }

    // 2. Format Specialized Skills
    const skillInputs = Array.from(document.querySelectorAll('.skill-rank-input'));
    const specializedSkillsIds = [];
    skillInputs.forEach((input, index) => {
      const val = input.value.trim();
      if (val) {
        specializedSkillsIds.push({ rank: index + 1, skill: val });
      }
    });

    if (specializedSkillsIds.length === 0) {
      alert("Please add at least one specialized skill (e.g. Injection Molding).");
      return;
    }

    // 3. Format Software Used
    const softwarePills = Array.from(document.querySelectorAll('#software-container .skill-pill'));
    const softwareUsed = softwarePills.map(pill => pill.dataset.software);

    if (softwareUsed.length === 0) {
      alert("Please add at least one software tool you are proficient in.");
      return;
    }

    // 4. Format Spoken Languages
    const languagePills = Array.from(document.querySelectorAll('#languages-container .skill-pill'));
    const spokenLanguages = languagePills.map(pill => pill.dataset.language);

    if (spokenLanguages.length === 0) {
      alert("Please add at least one spoken language.");
      return;
    }

    // Fetch previously attached files from the UI dataset
    const coverUrl = document.getElementById('z-cover')?.dataset?.url || null;
    const resumeUrl = document.getElementById('z-resume')?.dataset?.url || null;
    const portfolioUrl = document.getElementById('z-portfolio')?.dataset?.url || null;

    if (!resumeUrl) {
      alert("Please upload your Resume/CV to proceed.");
      return;
    }

    const typedPitch = document.getElementById('app-pitch-text')?.value;
    const pitchText = typedPitch ? typedPitch : ("Cover Letter Attached: " + (coverUrl ? "Yes" : "No"));

    const dbPayload = { 
      designer_status: 'pending',
      cover_letter: pitchText,
      cover_letter_url: coverUrl,
      resume_url: resumeUrl,
      portfolio_url: portfolioUrl,
      contact_email: document.getElementById('app-contact-email')?.value || '',
      linkedin_url: linkedinVal,
      online_portfolio_url: document.getElementById('app-online-portfolio')?.value || '',
      hourly_rate_currency: document.getElementById('app-currency')?.value || 'USD',
      hourly_rate: document.getElementById('app-hourly-rate')?.value ? parseFloat(document.getElementById('app-hourly-rate').value) : null,
      availability: document.getElementById('app-availability')?.value || '',
      schedule_type: document.getElementById('app-schedule-type')?.value || 'Weekly',
      timezone: document.getElementById('app-timezone')?.value || '',
      working_days: document.getElementById('app-working-days')?.value || '',
      working_hours: document.getElementById('app-working-hours')?.value || '',
      specialized_skills: specializedSkillsIds,
      software_used: softwareUsed,
      spoken_languages: spokenLanguages,
      comms_tools: JSON.stringify(Array.from(document.querySelectorAll('.comm-row')).map(row => ({
        type: row.querySelector('.comm-type').value,
        detail: row.querySelector('.comm-detail').value
      })).filter(c => c.detail.trim() !== ''))
    };

    btn.disabled = true;
    btn.textContent = 'Submitting Application...';

    // Update their profile in Supabase
    const { error } = await updateMyProfile(dbPayload);

    if (error) {
      alert("Error submitting application: " + error.message);
      btn.disabled = false;
      btn.textContent = 'Submit Application';
      return;
    }

    // Call Netlify Function to send email alert
    try {
      const { data: { user } } = await supabase.auth.getUser();
      await fetch('/.netlify/functions/send-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          email: user.email, 
          userId: user.id, 
          type: 'designer_application',
          cover_letter: pitchText
        })
      });
    } catch(err) {
      console.error("Failed to trigger email hook", err);
    }

    btn.style.background = 'var(--color-emerald)';
    btn.textContent = 'Application Submitted Successfully!';
    setTimeout(() => {
      closeOnboarding();
      alert("Your application has been submitted to the Atlas DT team for review. We will be in touch shortly.");
      const appBtn = document.getElementById('btn-role-designer');
      if (appBtn) {
        appBtn.textContent = 'Application Pending';
        appBtn.disabled = true;
        appBtn.style.opacity = '0.5';
      }
    }, 2000);
  };

  const setupRoleOnboarding = (btnId, planType) => {
    const btn = document.getElementById(btnId);
    if (!btn) return;
    
    // Check if they are already pending
    supabase.auth.getUser().then(async ({data: { user }}) => {
      if (!user) return;
      const { data } = await supabase.from('profiles').select('designer_status').eq('id', user.id).single();
      if (data && data.designer_status === 'pending') {
         if (planType === 'designer') {
           btn.textContent = 'Application Pending';
           btn.disabled = true;
           btn.style.opacity = '0.5';
         }
      } else if (data && data.designer_status === 'approved') {
         if (planType === 'designer') {
           btn.textContent = 'Approved Designer';
           btn.disabled = true;
           btn.style.background = 'var(--color-emerald)';
         }
      }
    });

    btn.addEventListener('click', async () => {
      onboardingModal.classList.remove('hidden');
      document.body.style.overflow = 'hidden';
      
      const { data: { user } } = await supabase.auth.getUser();
      const userEmail = user?.email || '';
      
      let html = '';
      if (planType === 'designer') {
        html = `
            <div style="display: flex; flex-direction: column; gap: 20px;">
              <h2 style="font-size: 28px; margin-bottom: 4px; line-height: 1.2;">Apply to the Designer Hub</h2>
              <p style="color: rgba(255,255,255,0.6); font-size: 15px; margin-bottom: 4px; line-height: 1.6; font-style: italic;">Great design doesn't just look good — it solves real problems, inspires emotion, and shapes the future. If you believe your craft can turn ambitious ideas into products people love, we want to hear from you. Tell us your story.</p>

              <!-- Cover Letter / Pitch (moved to top) -->
              <div class="profile-form-group" style="margin-top: 0;">
                <label style="margin-bottom: 8px; font-weight: 600; font-size: 11px; letter-spacing: 1px; text-transform: uppercase;">Your Pitch</label>
                <textarea id="app-pitch-text" class="profile-input" rows="5" placeholder="Why do you design? What drives your craft? Share your background, the projects that define you, and why Atlas DT is the right platform for your next chapter..." style="width: 100%; resize: vertical; margin-bottom: 8px;"></textarea>
              </div>
              
              <!-- Core Bio Profile -->
              <div class="profile-form-grid" style="grid-template-columns: 1fr 1fr; gap: 16px;">
                <div class="profile-form-group">
                  <label>Hourly Rate</label>
                  <div style="display: flex; gap: 8px;">
                    <select id="app-currency" class="profile-input" style="width: 80px; padding-left: 8px; padding-right: 8px;">
                      <option value="USD">USD</option>
                      <option value="EUR">EUR</option>
                      <option value="GBP">GBP</option>
                      <option value="AUD">AUD</option>
                      <option value="CAD">CAD</option>
                      <option value="SGD">SGD</option>
                      <option value="JPY">JPY</option>
                      <option value="AED">AED</option>
                    </select>
                    <input type="number" id="app-hourly-rate" class="profile-input" placeholder="e.g. 50" style="flex: 1;">
                  </div>
                </div>
                <div class="profile-form-group">
                  <label>Availability Frequency</label>
                  <div style="display: flex; gap: 8px;">
                    <select id="app-schedule-type" class="profile-input" style="width: 120px;">
                      <option value="Daily">Daily</option>
                      <option value="Weekly">Weekly</option>
                      <option value="Monthly">Monthly</option>
                      <option value="Project-Based">Project-Based</option>
                    </select>
                    <input type="text" id="app-availability" class="profile-input" placeholder="e.g. 20 hours/week" style="flex: 1;">
                  </div>
                </div>
              </div>

              <!-- Typical Working Schedule -->
              <div class="profile-form-group" style="background: rgba(255,255,255,0.02); border: 1px solid rgba(255,255,255,0.05); padding: 16px; border-radius: 8px;">
                <label style="margin-bottom: 16px; color: var(--color-electric); font-weight: 600; display: block; font-size: 11px; letter-spacing: 1px; text-transform: uppercase;">Typical Working Schedule</label>
                <div class="profile-form-grid" style="grid-template-columns: 1fr 1fr 1fr; gap: 16px;">
                  <div style="display: flex; flex-direction: column; gap: 6px;">
                    <label style="font-size: 11px; font-weight: 600; opacity: 0.7;">Timezone</label>
                    <select id="app-timezone" class="profile-input" style="width: 100%;">
                      <option value="UTC-8 (PST)">UTC-8 (PST)</option>
                      <option value="UTC-5 (EST)">UTC-5 (EST)</option>
                      <option value="UTC+0 (GMT)">UTC+0 (GMT)</option>
                      <option value="UTC+1 (CET)">UTC+1 (CET)</option>
                      <option value="UTC+4 (GST)">UTC+4 (GST)</option>
                      <option value="UTC+8 (CST/AWST)">UTC+8 (CST/AWST)</option>
                      <option value="UTC+10 (AEST)">UTC+10 (AEST)</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>
                  <div style="display: flex; flex-direction: column; gap: 6px;">
                    <label style="font-size: 11px; font-weight: 600; opacity: 0.7;">Working Days</label>
                    <input type="text" id="app-working-days" class="profile-input" placeholder="e.g. Mon - Fri">
                  </div>
                  <div style="display: flex; flex-direction: column; gap: 6px;">
                    <label style="font-size: 11px; font-weight: 600; opacity: 0.7;">Working Hours</label>
                    <input type="text" id="app-working-hours" class="profile-input" placeholder="e.g. 9AM - 5PM">
                  </div>
                </div>
              </div>

              <!-- Skill Tagging -->
              <div class="profile-form-group">
                <label>Specialized Skills (Ranked) <span class="req">*</span></label>
                <div class="profile-form-grid" style="grid-template-columns: 1fr 1fr; gap: 12px; margin-top: 4px;">
                  <div style="display: flex; align-items: center; gap: 8px;">
                    <span style="font-size: 12px; font-weight: 600; color: var(--color-electric); width: 14px;">1.</span>
                    <input type="text" class="profile-input skill-rank-input" placeholder="e.g. Injection Molding">
                  </div>
                  <div style="display: flex; align-items: center; gap: 8px;">
                    <span style="font-size: 12px; font-weight: 600; color: var(--color-electric); width: 14px;">2.</span>
                    <input type="text" class="profile-input skill-rank-input" placeholder="e.g. Sheet Metal">
                  </div>
                  <div style="display: flex; align-items: center; gap: 8px;">
                    <span style="font-size: 12px; font-weight: 600; color: var(--color-electric); width: 14px;">3.</span>
                    <input type="text" class="profile-input skill-rank-input" placeholder="e.g. Tool Design">
                  </div>
                  <div style="display: flex; align-items: center; gap: 8px;">
                    <span style="font-size: 12px; opacity: 0.5; width: 14px;">4.</span>
                    <input type="text" class="profile-input skill-rank-input" placeholder="Optional">
                  </div>
                  <div style="display: flex; align-items: center; gap: 8px;">
                    <span style="font-size: 12px; opacity: 0.5; width: 14px;">5.</span>
                    <input type="text" class="profile-input skill-rank-input" placeholder="Optional">
                  </div>
                  <div style="display: flex; align-items: center; gap: 8px;">
                    <span style="font-size: 12px; opacity: 0.5; width: 14px;">6.</span>
                    <input type="text" class="profile-input skill-rank-input" placeholder="Optional">
                  </div>
                </div>
              </div>

              <!-- Software Used Tagging -->
              <div class="profile-form-group">
                <label>Software Used <span class="req">*</span></label>
                <p style="font-size: 11px; opacity: 0.6; margin-bottom: 8px; margin-top:-4px;">Type a software tool and press Enter (e.g. Solidworks, AutoCAD...).</p>
                <div id="software-container" style="display: flex; flex-wrap: wrap; gap: 8px; padding: 8px; border: 1px solid rgba(255,255,255,0.1); border-radius: 8px; min-height: 48px; background: rgba(0,0,0,0.2);">
                  <input type="text" id="app-software-input" style="background: transparent; border: none; color: inherit; outline: none; flex: 1; min-width: 150px;" placeholder="Add software...">
                </div>
              </div>

              <!-- Spoken Languages Tagging -->
              <div class="profile-form-group">
                <label>Spoken Languages <span class="req">*</span></label>
                <p style="font-size: 11px; opacity: 0.6; margin-bottom: 8px; margin-top:-4px;">Type a language and press Enter (e.g. English, Mandarin...).</p>
                <div id="languages-container" style="display: flex; flex-wrap: wrap; gap: 8px; padding: 8px; border: 1px solid rgba(255,255,255,0.1); border-radius: 8px; min-height: 48px; background: rgba(0,0,0,0.2);">
                  <input type="text" id="app-language-input" style="background: transparent; border: none; color: inherit; outline: none; flex: 1; min-width: 150px;" placeholder="Add language...">
                </div>
              </div>

              <div class="profile-form-grid" style="grid-template-columns: 1fr 1fr; gap: 16px;">
                <div class="profile-form-group">
                  <label>Online Portfolio URL</label>
                  <input type="url" id="app-online-portfolio" class="profile-input" placeholder="https://dribbble.com/yourprofile">
                </div>
                <div class="profile-form-group">
                  <label>LinkedIn Profile URL <span class="req" style="color: #ef4444;">*</span></label>
                  <input type="url" id="app-linkedin-url" class="profile-input" placeholder="https://linkedin.com/in/yourprofile" required>
                </div>
              </div>

              <div class="profile-form-group">
                <label>Contact Email (For Designer Work)</label>
                <input type="email" id="app-contact-email" class="profile-input" value="${userEmail}" placeholder="designer@example.com">
              </div>

              <div class="profile-form-group">
                <label style="display:flex; justify-content:space-between; align-items:center; margin-bottom: 8px;">
                  <span>Contact Tools & Profiles</span>
                  <button type="button" id="btn-add-comm" style="background:transparent; border:1px solid rgba(255,255,255,0.1); color:var(--color-electric); cursor:pointer; font-size:12px; padding:4px 8px; border-radius:4px;">+ Add Tool</button>
                </label>
                <div id="comms-container" style="display: flex; flex-direction: column; gap: 8px;">
                  <div class="comm-row" style="display: flex; gap: 8px;">
                    <select class="profile-input comm-type" style="width: 120px;">
                      <option value="WhatsApp">WhatsApp</option>
                      <option value="WeChat">WeChat</option>
                      <option value="Skype">Skype</option>
                      <option value="Zoom">Zoom</option>
                      <option value="Teams">Teams</option>
                      <option value="Other">Other</option>
                    </select>
                    <input type="text" class="profile-input comm-detail" placeholder="ID, Number or Link" style="flex: 1;">
                  </div>
                </div>
              </div>



              <!-- Native File Uploads -->
              <div class="profile-form-grid" style="grid-template-columns: 1fr 1fr 1fr; gap: 16px; margin-top: 8px;">
                <!-- Cover Letter Upload -->
                <div class="profile-form-group">
                  <label style="font-size: 13px;">Cover Letter</label>
                  <div class="upload-zone" id="z-cover" style="border: 1px dashed rgba(255,255,255,0.2); padding: 16px 8px; text-align: center; border-radius: 8px; cursor: pointer; transition: 0.2s;">
                    <div id="l-cover" style="font-size: 12px; color: #9ca3af;">Click to upload (.pdf)</div>
                    <input type="file" id="f-cover" style="display: none;" accept=".pdf,.doc,.docx">
                  </div>
                  <div id="a-cover" style="display: none; justify-content: center; margin-top: 8px; gap: 8px;">
                    <button class="btn btn-primary" type="button" style="padding: 4px 8px; font-size: 11px;" onclick="document.getElementById('f-cover').click()">Replace</button>
                    <button class="btn" type="button" style="padding: 4px 8px; font-size: 11px; border: 1px solid #ef4444; color: #ef4444;" id="r-cover">X</button>
                  </div>
                </div>

                <!-- Resume Upload -->
                <div class="profile-form-group">
                  <label style="font-size: 13px;">Resume / CV</label>
                  <div class="upload-zone" id="z-resume" style="border: 1px dashed rgba(255,255,255,0.2); padding: 16px 8px; text-align: center; border-radius: 8px; cursor: pointer; transition: 0.2s;">
                    <div id="l-resume" style="font-size: 12px; color: #9ca3af;">Click to upload (.pdf)</div>
                    <input type="file" id="f-resume" style="display: none;" accept=".pdf,.doc,.docx">
                  </div>
                  <div id="a-resume" style="display: none; justify-content: center; margin-top: 8px; gap: 8px;">
                    <button class="btn btn-primary" type="button" style="padding: 4px 8px; font-size: 11px;" onclick="document.getElementById('f-resume').click()">Replace</button>
                    <button class="btn" type="button" style="padding: 4px 8px; font-size: 11px; border: 1px solid #ef4444; color: #ef4444;" id="r-resume">X</button>
                  </div>
                </div>

                <!-- Portfolio Upload -->
                <div class="profile-form-group">
                  <label style="font-size: 13px;">Portfolio</label>
                  <div class="upload-zone" id="z-portfolio" style="border: 1px dashed rgba(255,255,255,0.2); padding: 16px 8px; text-align: center; border-radius: 8px; cursor: pointer; transition: 0.2s;">
                    <div id="l-portfolio" style="font-size: 12px; color: #9ca3af;">Click to upload (.pdf)</div>
                    <input type="file" id="f-portfolio" style="display: none;" accept=".pdf,.zip">
                  </div>
                  <div id="a-portfolio" style="display: none; justify-content: center; margin-top: 8px; gap: 8px;">
                    <button class="btn btn-primary" type="button" style="padding: 4px 8px; font-size: 11px;" onclick="document.getElementById('f-portfolio').click()">Replace</button>
                    <button class="btn" type="button" style="padding: 4px 8px; font-size: 11px; border: 1px solid #ef4444; color: #ef4444;" id="r-portfolio">X</button>
                  </div>
                </div>
              </div>

              <div style="display: flex; gap: 12px; margin-top: 12px;">
                <button type="button" class="btn btn-primary" id="btn-submit-application" style="flex: 1; padding: 16px;">Submit Application</button>
              </div>
            </div>
        `;
      } else {
        html = `
            <div style="display: flex; flex-direction: column; gap: 20px;">
              <h2 style="font-size: 28px; line-height: 1.2;">Coming Soon</h2>
              <p style="color: rgba(255,255,255,0.7); font-size: 15px;">Entrepreneur onboarding is currently restricted. Please contact sales.</p>
            </div>
        `;
      }
      
      onboardingContent.innerHTML = html;
      
      if (planType === 'designer') {
        const btnAddComm = document.getElementById('btn-add-comm');
        if (btnAddComm) {
          btnAddComm.addEventListener('click', () => {
            const container = document.getElementById('comms-container');
            const row = document.createElement('div');
            row.className = 'comm-row';
            row.style = 'display: flex; gap: 8px; margin-top: 4px;';
            row.innerHTML = `
              <select class="profile-input comm-type" style="width: 120px;">
                <option value="WhatsApp">WhatsApp</option>
                <option value="WeChat">WeChat</option>
                <option value="Skype">Skype</option>
                <option value="Zoom">Zoom</option>
                <option value="Teams">Teams</option>
                <option value="Other">Other</option>
              </select>
              <input type="text" class="profile-input comm-detail" placeholder="ID, Number or Link" style="flex: 1;">
              <button type="button" class="btn-remove-comm" style="background:transparent; border:none; color:#ef4444; cursor:pointer;" onclick="this.parentElement.remove()">✕</button>
            `;
            container.appendChild(row);
          });
        }

        // Native Uploader Helper
        const setupNativeUpload = (id, bucket) => {
          const fileInput = document.getElementById(`f-${id}`);
          const zone = document.getElementById(`z-${id}`);
          const label = document.getElementById(`l-${id}`);
          const actions = document.getElementById(`a-${id}`);
          const removeBtn = document.getElementById(`r-${id}`);
          
          if(!fileInput) return;

          zone.addEventListener('click', () => { if(!zone.dataset.url) fileInput.click(); });
          
          fileInput.addEventListener('change', async (e) => {
            const file = e.target.files[0];
            if (!file) return;

            label.innerText = `Uploading ${file.name}...`;
            zone.style.opacity = '0.5';

            const { data: { user } } = await supabase.auth.getUser();
            const fileExt = file.name.split('.').pop();
            const fileName = `${user.id}_${id}_${Date.now()}.${fileExt}`;
            
            const { data, error } = await supabase.storage.from(bucket).upload(fileName, file);

            if (error) {
              alert("Upload Error: " + error.message);
              label.innerText = "Click to upload";
              zone.style.opacity = '1';
              return;
            }

            let { data: { publicUrl } } = supabase.storage.from(bucket).getPublicUrl(fileName);
            publicUrl += `?download=${encodeURIComponent(file.name)}`;
            
            zone.dataset.url = publicUrl;
            label.innerText = `✅ ${file.name}`;
            label.style.color = '#10b981';
            zone.style.opacity = '1';
            zone.style.borderStyle = 'solid';
            zone.style.borderColor = 'var(--color-electric)';
            actions.style.display = 'flex';
          });

          removeBtn?.addEventListener('click', () => {
             zone.dataset.url = '';
             label.innerText = 'Click to upload';
             label.style.color = '#9ca3af';
             zone.style.borderStyle = 'dashed';
             zone.style.borderColor = 'rgba(255,255,255,0.2)';
             actions.style.display = 'none';
             fileInput.value = '';
          });
        };

        setupNativeUpload('cover', 'user_resumes');
        setupNativeUpload('resume', 'user_resumes');
        setupNativeUpload('portfolio', 'user_portfolios');

        // Software Tagging Logic
        const softwareInput = document.getElementById('app-software-input');
        const softwareContainer = document.getElementById('software-container');
        if (softwareInput) {
          softwareInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' || e.key === ',') {
              e.preventDefault();
              const val = softwareInput.value.trim();
              if (val) {
                const count = softwareContainer.querySelectorAll('.skill-pill').length + 1;
                const pill = document.createElement('div');
                pill.className = 'skill-pill';
                pill.dataset.software = val;
                pill.style = `display: flex; align-items: center; gap: 4px; padding: 4px 8px; border-radius: 4px; font-size: 13px; background: rgba(59,130,246,0.2); color: #60a5fa; border: 1px solid rgba(59,130,246,0.3);`;
                pill.innerHTML = `${val} <span style="cursor:pointer; margin-left:4px; opacity:0.7;">✕</span>`;
                softwareContainer.insertBefore(pill, softwareInput);
                softwareInput.value = '';
                
                pill.querySelector('span:last-child').addEventListener('click', () => {
                   pill.remove();
                });
              }
            }
          });
        }

        // Spoken Languages Tagging Logic
        const languageInput = document.getElementById('app-language-input');
        const languageContainer = document.getElementById('languages-container');
        if (languageInput) {
          languageInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' || e.key === ',') {
              e.preventDefault();
              const val = languageInput.value.trim();
              if (val) {
                const count = languageContainer.querySelectorAll('.skill-pill').length + 1;
                const pill = document.createElement('div');
                pill.className = 'skill-pill';
                pill.dataset.language = val;
                pill.style = `display: flex; align-items: center; gap: 4px; padding: 4px 8px; border-radius: 4px; font-size: 13px; background: rgba(16,185,129,0.2); color: #34d399; border: 1px solid rgba(16,185,129,0.3);`;
                pill.innerHTML = `${val} <span style="cursor:pointer; margin-left:4px; opacity:0.7;">✕</span>`;
                languageContainer.insertBefore(pill, languageInput);
                languageInput.value = '';
                
                pill.querySelector('span:last-child').addEventListener('click', () => {
                   pill.remove();
                });
              }
            }
          });
        }

        const submitBtn = document.getElementById('btn-submit-application');
        if (submitBtn) {
          submitBtn.addEventListener('click', () => performApplication(submitBtn));
        }
      }
    });
  };

  setupRoleOnboarding('btn-role-designer', 'designer');
  setupRoleOnboarding('btn-role-entrepreneur', 'entrepreneur');

  // ── Account Management Actions ─────────────────────────────
  
  const customActionModal = document.getElementById('custom-action-modal');
  const closeCustomAction = document.getElementById('close-custom-action');

  if (closeCustomAction) {
    closeCustomAction.addEventListener('click', () => {
      customActionModal.classList.add('hidden');
      document.body.style.overflow = '';
    });
  }

  const btnChangeEmail = document.getElementById('btn-change-email');
  if (btnChangeEmail) {
    btnChangeEmail.addEventListener('click', () => {
      customActionModal.classList.remove('hidden');
      document.body.style.overflow = 'hidden';
      // Auto-focus email
      const emailInput = document.getElementById('new-email-input');
      if (emailInput) setTimeout(() => emailInput.focus(), 100);
      
      if (window.initPasswordToggles) {
        window.initPasswordToggles();
      }
    });
  }

  const emailForm = document.getElementById('update-email-form');

  if (emailForm) {
    emailForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const newEmail = document.getElementById('new-email-input').value;
      const btn = document.getElementById('submit-email-btn');
      const err = document.getElementById('email-error-msg');
      
      err.classList.remove('visible');
      btn.textContent = 'Sending...';
      btn.disabled = true;

      const { error } = await supabase.auth.updateUser({ email: newEmail.trim() });
      
      if (error) {
        err.textContent = error.message;
        err.classList.add('visible');
        btn.textContent = 'Change Email';
        btn.disabled = false;
      } else {
        btn.textContent = 'Sent!';
        btn.style.background = 'var(--color-emerald)';
        setTimeout(async () => {
          customActionModal.classList.add('hidden');
          document.body.style.overflow = '';
          btn.textContent = 'Change Email';
          btn.style.background = '';
          btn.disabled = false;
          emailForm.reset();
          await logoutUser();
        }, 3000);
      }
    });
  }

  const btnRoutePassword = document.getElementById('btn-route-password');
  if (btnRoutePassword) {
    btnRoutePassword.addEventListener('click', () => {
      customActionModal.classList.remove('hidden');
      document.body.style.overflow = 'hidden';
      
      const pwdInput = document.getElementById('prof-old-pwd');
      if (pwdInput) setTimeout(() => pwdInput.focus(), 100);
      
      // Auto-trigger the password visibility toggle hook if they were dynamically added
      if (window.initPasswordToggles) {
        window.initPasswordToggles();
      }
    });
  }

  const pwdForm = document.getElementById('update-pwd-form');
  if (pwdForm) {
    pwdForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const oldPass = document.getElementById('prof-old-pwd').value;
      const newPass = document.getElementById('prof-new-pwd').value;
      const confirmPass = document.getElementById('prof-confirm-pwd').value;
      
      const btn = document.getElementById('submit-pwd-btn');
      const err = document.getElementById('pwd-error-msg');
      
      err.classList.remove('visible');

      if (newPass !== confirmPass) {
        err.textContent = 'Passwords do not match.';
        err.classList.add('visible');
        return;
      }

      if (newPass.length < 8) {
        err.textContent = 'Password must be at least 8 characters.';
        err.classList.add('visible');
        return;
      }

      btn.textContent = 'Verifying...';
      btn.disabled = true;

      const { data: { user } } = await supabase.auth.getUser();
      const { error: verifyError } = await supabase.auth.signInWithPassword({ email: user.email, password: oldPass });
      
      if (verifyError) {
        err.textContent = "Incorrect current password.";
        err.classList.add('visible');
        btn.textContent = 'Update Password';
        btn.disabled = false;
        return;
      }

      btn.textContent = 'Updating...';
      const { error: updateError } = await supabase.auth.updateUser({ password: newPass });

      if (updateError) {
        err.textContent = updateError.message;
        err.classList.add('visible');
        btn.textContent = 'Update Password';
        btn.disabled = false;
      } else {
        btn.textContent = 'Success!';
        btn.style.background = 'var(--color-emerald)';
        setTimeout(() => {
          customActionModal.classList.add('hidden');
          document.body.style.overflow = '';
          btn.textContent = 'Update Password';
          btn.style.background = '';
          btn.disabled = false;
          pwdForm.reset();
        }, 2000);
      }
    });
  }

  const btnDeleteAccount = document.getElementById('btn-delete-account');
  if (btnDeleteAccount) {
    btnDeleteAccount.addEventListener('click', () => {
      const confirmation = confirm("WARNING: Deleting your account is permanent and irreversible. All your personal data, past RFQs, projects, and portfolio items will be destroyed.");
      if (confirmation) {
          alert("For regulatory and data security reasons, irreversible account deletion must be handled by our support team. \n\nPlease email support@atlasdt.com from your registered email address with the subject 'Account Deletion Request'.");
      }
    });
  }

  // ── Theme Toggle Logic ──────────────────────────────────────
  const themeToggle = document.getElementById('theme-toggle');
  const iconLight = document.getElementById('theme-icon-light');
  const iconDark = document.getElementById('theme-icon-dark');

  const updateThemeUI = (theme) => {
    if (theme === 'light') {
      document.body.classList.add('theme-light');
      if(iconLight) iconLight.style.display = 'block';
      if(iconDark) iconDark.style.display = 'none';
      
      const logo = document.querySelector('.profile-nav img');
      if(logo) logo.src = '/logos/atlasdt-logo-full.png'; // Swap to dark text logo for light theme
    } else {
      document.body.classList.remove('theme-light');
      if(iconLight) iconLight.style.display = 'none';
      if(iconDark) iconDark.style.display = 'block';
      
      const logo = document.querySelector('.profile-nav img');
      if(logo) logo.src = '/logos/atlasdt-logo-light.png'; // Swap back
    }
  };

  if (themeToggle) {
    const savedTheme = localStorage.getItem('theme') || 'dark';
    updateThemeUI(savedTheme);

    themeToggle.addEventListener('click', () => {
      const isLight = document.body.classList.contains('theme-light');
      const newTheme = isLight ? 'dark' : 'light';
      localStorage.setItem('theme', newTheme);
      updateThemeUI(newTheme);
    });
  } else {
    // Just enforce saved theme on load if button is missing
    const savedTheme = localStorage.getItem('theme') || 'dark';
    if(savedTheme === 'light') document.body.classList.add('theme-light');
  }

});

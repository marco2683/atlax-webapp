/* ═══════════════════════════════════════════════════
   Atlas DT — Global Contact Modal (Auto-Inject)
   ═══════════════════════════════════════════════════
   Include this script on any page to automatically:
   1. Inject a "Contact Us" link into the navbar
   2. Inject the full contact modal HTML into <body>
   3. Wire open/close and form submission logic
   ═══════════════════════════════════════════════════ */

import { supabase } from './utils/supabaseClient.js';
import { signUpUser } from './services/auth.js';

(async function () {
  'use strict';

  // Load Cloudflare Turnstile
  if (!document.getElementById('cf-turnstile-script')) {
    const s = document.createElement('script');
    s.id = 'cf-turnstile-script';
    s.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js';
    s.async = true;
    s.defer = true;
    document.head.appendChild(s);
  }

  // ─── 1. Inject Modal HTML ────────────────────────────
  const modalHTML = `
  <div class="contact-modal-overlay" id="atlasdt-contact-overlay">
    <div class="contact-modal-panel">

      <div class="contact-modal-header">
        <div>
          <h2>Get In Touch</h2>
          <p>We'd love to hear about your project</p>
        </div>
        <button class="contact-modal-close" id="atlasdt-contact-close">&times;</button>
      </div>

      <!-- Book a Call — Top, prominent -->
      <div class="contact-booking-banner">
        <div class="contact-booking-banner__text">
          <strong>Prefer a live conversation?</strong>
          <span>Schedule a free 30-min consultation with our team</span>
        </div>
        <button class="contact-booking-btn book-consultation">
          <svg viewBox="0 0 24 24" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
          Book a Teams Call
        </button>
      </div>

      <!-- Contact Info -->
      <div class="contact-info-strip">
        <a href="mailto:info@atlasdt.com" class="contact-info-chip">
          <svg viewBox="0 0 24 24"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>
          info@atlasdt.com
        </a>
        <a href="tel:+610406238458" class="contact-info-chip">
          <svg viewBox="0 0 24 24"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/></svg>
          +61 0406238458
        </a>
        <a href="https://wa.me/610406238458" target="_blank" class="contact-info-chip">
          <svg viewBox="0 0 24 24"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6A8.38 8.38 0 0 1 12.5 3h.5A8.48 8.48 0 0 1 21 11.5z"/></svg>
          WhatsApp
        </a>
        <a href="#" class="contact-info-chip">
          <svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><path d="M8 12h8M12 8v8"/></svg>
          WeChat: +61 0406238458
        </a>
      </div>

      <!-- Form -->
      <div class="contact-modal-body">
        <iframe name="contact-hidden-iframe" id="contact-hidden-iframe" style="display:none;"></iframe>
        <form id="atlasdt-contact-form" method="POST" target="contact-hidden-iframe" enctype="multipart/form-data">
          <input type="hidden" name="_captcha" value="false">
          <input type="text" name="_honey" style="display:none">
          <div class="contact-form-grid">
            <div class="contact-field">
              <label>First Name <span class="cf-req">*</span></label>
              <input type="text" name="firstName" required placeholder="John">
            </div>
            <div class="contact-field">
              <label>Last Name <span class="cf-req">*</span></label>
              <input type="text" name="lastName" required placeholder="Smith">
            </div>
            <div class="contact-field">
              <label>Email Address <span class="cf-req">*</span></label>
              <input type="email" name="email" required placeholder="john@company.com">
            </div>
            <div class="contact-field">
              <label>Phone Number</label>
              <input type="tel" name="phone" placeholder="+1 415 555 1234">
            </div>
            <div class="contact-field">
              <label>Company / Organization <span class="cf-req">*</span></label>
              <input type="text" name="company" required placeholder="Acme Corp">
            </div>
            <div class="contact-field">
              <label>Job Title</label>
              <input type="text" name="jobTitle" placeholder="Head of Product">
            </div>
            <div class="contact-field">
              <label>Country</label>
              <input type="text" name="country" placeholder="Australia">
            </div>
            <div class="contact-field">
              <label>Inquiry Type</label>
              <select name="inquiryType">
                <option value="">Select…</option>
                <option value="rfq">Get a Quote (RFQ)</option>
                <option value="partnership">Partnership / Collaboration</option>
                <option value="design">Product Design Services</option>
                <option value="sourcing">Sourcing / Supply Chain</option>
                <option value="general">General Inquiry</option>
                <option value="careers">Careers</option>
              </select>
            </div>
            <div class="contact-field full">
              <label>Message <span class="cf-req">*</span></label>
              <textarea name="message" required placeholder="Tell us about your project, timeline, and any specific requirements…"></textarea>
            </div>
            <div class="contact-field full">
              <label>Attach Files</label>
              <div class="contact-file-zone" id="atlasdt-file-zone">
                <svg viewBox="0 0 24 24"><path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"/></svg>
                <p><span>Click to upload</span> or drag files here</p>
                <p class="cf-hint">PDF, CAD, Images — max 25 MB per file</p>
                <input type="file" id="atlasdt-file-input" name="attachment" multiple accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.step,.stp,.igs,.iges,.stl,.3mf,.obj,.dwg,.dxf,.png,.jpg,.jpeg,.webp,.zip,.rar">
              </div>
              <div class="contact-file-list" id="atlasdt-file-list"></div>
            </div>
            
            <div class="contact-field full" style="margin-top: 12px; display: flex; justify-content: center;">
              <div class="cf-turnstile" data-sitekey="0x4AAAAAADOr_yhZAEAJ5dWN" data-theme="light"></div>
            </div>
          </div>

          <div class="contact-submit-row">
            <button type="submit" class="contact-submit-btn">Send Inquiry</button>
          </div>
        </form>
      </div>

    </div>
  </div>`;

  document.body.insertAdjacentHTML('beforeend', modalHTML);


  // Marketing pages: look for .navbar__actions (Contact Us goes BEFORE avatar to match app order)
  const navActions = document.querySelector('.navbar__actions');
  if (navActions && !document.querySelector('.navbar__menu')) {
    // Only inject if it's a marketing page (no .navbar__menu = no app SPA tabs)
    const contactBtn = document.createElement('button');
    contactBtn.className = 'nav-contact-trigger';
    contactBtn.id = 'atlasdt-contact-nav-trigger';
    contactBtn.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg> Contact Us`;

    // Insert before the user avatar/dropdown (matches app order: Contact Us → Avatar)
    const loginBtn = navActions.querySelector('#nav-login-btn');
    const userMenu = navActions.querySelector('#nav-user-menu');
    if (loginBtn) {
      navActions.insertBefore(contactBtn, loginBtn);
    } else if (userMenu) {
      navActions.insertBefore(contactBtn, userMenu);
    } else {
      navActions.appendChild(contactBtn);
    }
  }

  // App page: look for .navbar__actions (with .navbar__menu present)
  const navbarActions = document.querySelector('.navbar__actions');
  if (navbarActions && document.querySelector('.navbar__menu')) {
    const contactBtn = document.createElement('button');
    contactBtn.className = 'nav-contact-trigger';
    contactBtn.id = 'atlasdt-contact-nav-trigger-app';
    contactBtn.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg> Contact Us`;
    // Insert before the login button (so order is Workspace -> Contact Us -> Log In / Avatar)
    const loginBtn = navbarActions.querySelector('#nav-login-btn');
    const userMenu = navbarActions.querySelector('#nav-user-menu');
    if (loginBtn) {
      navbarActions.insertBefore(contactBtn, loginBtn);
    } else if (userMenu) {
      navbarActions.insertBefore(contactBtn, userMenu);
    } else {
      navbarActions.appendChild(contactBtn);
    }
  }


  // ─── 3. Wire Logic ───────────────────────────────────
  const overlay = document.getElementById('atlasdt-contact-overlay');
  const closeBtn = document.getElementById('atlasdt-contact-close');
  const form = document.getElementById('atlasdt-contact-form');
  const fileInput = document.getElementById('atlasdt-file-input');
  const fileList = document.getElementById('atlasdt-file-list');

  // --- Check Auth and Pre-fill ---
  let isLoggedIn = false;
  let userSession = null;
  let userProfile = null;

  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (session) {
      isLoggedIn = true;
      userSession = session;
      const { data: profile } = await supabase.from('profiles').select('*').eq('id', session.user.id).single();
      userProfile = profile;
    }
  } catch(e) { console.error('Auth error in contact modal', e); }

  function applyPreFill(targetForm) {
    if (!isLoggedIn || !userProfile || !targetForm) return;
    
    // Attempt to fill name
    const fnameInput = targetForm.querySelector('input[name="firstName"]');
    const lnameInput = targetForm.querySelector('input[name="lastName"]');
    const emailInput = targetForm.querySelector('input[name="email"]');
    const companyInput = targetForm.querySelector('input[name="company"]');
    // For footer forms which have "name"
    const nameInput = targetForm.querySelector('input[name="name"]');

    if (fnameInput) { fnameInput.value = userProfile.first_name || ''; fnameInput.readOnly = true; fnameInput.style.opacity = '0.6'; }
    if (lnameInput) { lnameInput.value = userProfile.last_name || ''; lnameInput.readOnly = true; lnameInput.style.opacity = '0.6'; }
    if (nameInput) { nameInput.value = `${userProfile.first_name || ''} ${userProfile.last_name || ''}`.trim(); nameInput.readOnly = true; nameInput.style.opacity = '0.6'; }
    if (emailInput) { emailInput.value = userSession.user.email || ''; emailInput.readOnly = true; emailInput.style.opacity = '0.6'; }
    if (companyInput) { companyInput.value = userProfile.company || ''; companyInput.readOnly = true; companyInput.style.opacity = '0.6'; }
  }

  // Pre-fill modal form
  if (form) applyPreFill(form);
  
  // Pre-fill footer forms
  const footerForms = document.querySelectorAll('.atlasdt-footer-form');
  footerForms.forEach(applyPreFill);

  function openContact(e) {
    if (e) e.preventDefault();
    overlay.classList.add('open');
    document.body.style.overflow = 'hidden';
  }

  function closeContact() {
    overlay.classList.remove('open');
    document.body.style.overflow = '';
  }

  // Trigger from any "Contact Us" element
  document.addEventListener('click', e => {
    if (e.target.closest('.nav-contact-trigger')) {
      openContact(e);
    }
  });

  closeBtn?.addEventListener('click', closeContact);
  overlay?.addEventListener('click', e => { if (e.target === overlay) closeContact(); });
  document.addEventListener('keydown', e => { if (e.key === 'Escape') closeContact(); });

  // File upload handling
  let uploadedFiles = [];

  fileInput?.addEventListener('change', () => {
    for (const file of fileInput.files) {
      if (!uploadedFiles.find(f => f.name === file.name)) {
        uploadedFiles.push(file);
      }
    }
    renderFileList();
    fileInput.value = ''; // Reset so same file can be re-added
  });

  function renderFileList() {
    if (!fileList) return;
    fileList.innerHTML = uploadedFiles.map((f, i) => `
      <div class="contact-file-tag">
        ${f.name} (${(f.size / 1024).toFixed(0)} KB)
        <button type="button" data-remove="${i}">&times;</button>
      </div>
    `).join('');

    fileList.querySelectorAll('[data-remove]').forEach(btn => {
      btn.addEventListener('click', () => {
        uploadedFiles.splice(parseInt(btn.dataset.remove), 1);
        renderFileList();
      });
    });
  }

  // Form submission — uses hidden iframe instead of AJAX
  // because FormSubmit's /ajax/ endpoint doesn't support file attachments.
  // Standard form POST via hidden iframe = attachments work + no page redirect.
  form?.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    // Check Turnstile token before proceeding
    const turnstileResponse = form.querySelector('[name="cf-turnstile-response"]')?.value;
    if (!turnstileResponse) {
      alert('Please complete the security check to verify you are human.');
      return;
    }
    
    const submitBtn = form.querySelector('.contact-submit-btn');
    const originalText = submitBtn.textContent;
    submitBtn.textContent = 'Verifying...';
    submitBtn.disabled = true;

    const email = form.querySelector('input[name="email"]')?.value;
    const fname = form.querySelector('input[name="firstName"]')?.value;
    const lname = form.querySelector('input[name="lastName"]')?.value;
    const company = form.querySelector('input[name="company"]')?.value;

    if (!isLoggedIn && email) {
      // Auto sign-up to check existence and register
      const randomPwd = Math.random().toString(36).slice(-10) + "A1!";
      const { data, error } = await signUpUser(email, randomPwd, { first_name: fname, last_name: lname, company: company });
      if (error && error.message.toLowerCase().includes('already registered')) {
        alert('You already have an account associated with this email. Please log in first.');
        closeContact();
        const authModal = document.getElementById('auth-modal');
        if (authModal) {
            authModal.classList.remove('hidden');
        } else {
            window.location.href = '/index.html'; // Fallback
        }
        submitBtn.textContent = originalText;
        submitBtn.disabled = false;
        return;
      }
    }

    submitBtn.textContent = 'Sending...';

    // Populate the file input with all uploadedFiles via DataTransfer
    const dt = new DataTransfer();
    uploadedFiles.forEach(file => dt.items.add(file));
    const realFileInput = form.querySelector('input[type="file"]');
    if (realFileInput) {
      realFileInput.files = dt.files;
    }

    // Since target="contact-hidden-iframe", we submit the form directly.
    let isContactSubmitted = false;

    // Show success state when iframe loads
    const iframe = document.getElementById('contact-hidden-iframe');
    if (iframe) {
      iframe.onload = () => {
        if (!isContactSubmitted) return;
        const body = document.querySelector('.contact-modal-body');
        if (body) {
          body.innerHTML = `
            <div style="text-align:center; padding: 60px 20px;">
              <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#10b981" stroke-width="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
              <h3 style="color:#0f172a; margin:20px 0 8px 0; font-size:22px;">Inquiry Sent Successfully</h3>
              <p style="color:#64748b; font-size:14px; max-width:400px; margin:0 auto;">Thank you for reaching out. Our team will review your inquiry and get back to you within 24 hours.</p>
              <button onclick="document.getElementById('atlasdt-contact-overlay').classList.remove('open'); document.body.style.overflow='';" style="margin-top:28px; padding:12px 28px; background:#0f172a; color:#fff; border:none; border-radius:10px; font-weight:700; font-size:14px; cursor:pointer; font-family:inherit;">Close</button>
            </div>`;
        }
      };
    }
    
    isContactSubmitted = true;
    
    // Obfuscate the FormSubmit action URL to prevent static HTML scraping
    const p1 = 'https://formsubmit.co';
    const p2 = '/info@atlasdt.com';
    form.action = p1 + p2;
    
    form.submit();
  });

  // Footer forms AJAX submission
  footerForms.forEach(footerForm => {
    footerForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const submitBtn = footerForm.querySelector('button[type="submit"]');
      const originalText = submitBtn ? submitBtn.textContent : 'Send Message';
      if (submitBtn) {
        submitBtn.textContent = 'Verifying...';
        submitBtn.disabled = true;
      }

      const email = footerForm.querySelector('input[name="email"]')?.value;
      const fullName = footerForm.querySelector('input[name="name"]')?.value || '';
      const company = footerForm.querySelector('input[name="company"]')?.value || '';
      const nameParts = fullName.split(' ');
      const fname = nameParts[0] || '';
      const lname = nameParts.slice(1).join(' ') || '';

      if (!isLoggedIn && email) {
        const randomPwd = Math.random().toString(36).slice(-10) + "A1!";
        const { data, error } = await signUpUser(email, randomPwd, { first_name: fname, last_name: lname, company: company });
        if (error && error.message.toLowerCase().includes('already registered')) {
          alert('You already have an account associated with this email. Please log in first.');
          const authModal = document.getElementById('auth-modal');
          if (authModal) {
              authModal.classList.remove('hidden');
          } else {
              window.location.href = '/index.html';
          }
          if (submitBtn) {
            submitBtn.textContent = originalText;
            submitBtn.disabled = false;
          }
          return;
        }
      }

      if (submitBtn) submitBtn.textContent = 'Sending...';
      
      try {
        const payload = {
          name: fullName || 'Not provided',
          email: email,
          company: company || 'Not provided',
          message: footerForm.querySelector('textarea[name="message"]')?.value || 'No message'
        };
        
        const response = await fetch('/.netlify/functions/submit-contact', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
        
        if (!response.ok) throw new Error('Network response was not ok');
        
        footerForm.innerHTML = `
          <div style="text-align:center; padding: 20px 0;">
            <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#10b981" stroke-width="2" style="margin-bottom:12px;"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
            <h4 style="color:#0f172a; margin:0 0 8px 0; font-size:18px;">Message Sent</h4>
            <p style="color:#64748b; font-size:13px;">Thank you! We'll be in touch shortly.</p>
          </div>
        `;
      } catch (error) {
        console.error('Error submitting footer form:', error);
        if (submitBtn) {
          submitBtn.textContent = 'Error! Try Again';
          submitBtn.disabled = false;
          setTimeout(() => {
            submitBtn.textContent = originalText;
          }, 3000);
        }
      }
    });
  });

  // --- CAL.COM BOOKING MODAL ---
  // Sleek embedded booking modal using Cal.com (replaces Microsoft Bookings which blocks iframes via CSP)
  const calModalHTML = `
    <div id="atlasdt-booking-overlay" style="
      position:fixed; top:0; left:0; width:100%; height:100%;
      background:rgba(0,0,0,0.75); backdrop-filter:blur(12px);
      z-index:99999; display:none; justify-content:center; align-items:center;
      opacity:0; transition:opacity 0.35s ease;
    ">
      <div style="
        background:linear-gradient(145deg, #0f172a, #1e293b);
        width:92%; max-width:1000px; height:88vh;
        border-radius:16px; overflow:hidden; position:relative;
        box-shadow:0 25px 60px -12px rgba(0,0,0,0.6), 0 0 0 1px rgba(255,255,255,0.08);
        border:1px solid rgba(255,255,255,0.06);
      ">
        <!-- Header bar -->
        <div style="
          display:flex; align-items:center; justify-content:space-between;
          padding:16px 20px; background:rgba(0,0,0,0.3);
          border-bottom:1px solid rgba(255,255,255,0.08);
        ">
          <div style="display:flex; align-items:center; gap:10px;">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#38bdf8" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
            </svg>
            <span style="color:#e2e8f0; font-family:'Inter',sans-serif; font-size:14px; font-weight:500; letter-spacing:0.3px;">
              Book a Consultation — AtlasDT
            </span>
          </div>
          <button id="close-booking-modal" style="
            background:rgba(255,255,255,0.08); border:none; width:32px; height:32px;
            border-radius:8px; font-size:18px; cursor:pointer; display:flex;
            align-items:center; justify-content:center; color:#94a3b8;
            transition:all 0.2s ease;
          " onmouseover="this.style.background='rgba(239,68,68,0.2)';this.style.color='#f87171'"
             onmouseout="this.style.background='rgba(255,255,255,0.08)';this.style.color='#94a3b8'"
          >&times;</button>
        </div>
        <!-- Cal.com iframe -->
        <iframe
          id="cal-embed-iframe"
          src=""
          width="100%" height="100%"
          frameborder="0"
          scrolling="yes"
          style="border:0; background:#fff; height:calc(100% - 57px);"
          allow="payment"
        ></iframe>
      </div>
    </div>
  `;
  document.body.insertAdjacentHTML('beforeend', calModalHTML);

  const bookingOverlay = document.getElementById('atlasdt-booking-overlay');
  const closeBookingBtn = document.getElementById('close-booking-modal');
  const calIframe = document.getElementById('cal-embed-iframe');
  const CAL_URL = 'https://cal.com/atlasdt-marco/30min?embed=true&layout=month_view&hideBranding=true';

  window.openBookingsModal = function(e) {
    if (e) e.preventDefault();
    // Lazy-load the iframe src only when opened (prevents background requests)
    if (!calIframe.src || calIframe.src === '' || calIframe.src === window.location.href) {
      calIframe.src = CAL_URL;
    }
    bookingOverlay.style.display = 'flex';
    setTimeout(() => bookingOverlay.style.opacity = '1', 10);
    document.body.style.overflow = 'hidden';
  };

  function closeBooking() {
    bookingOverlay.style.opacity = '0';
    setTimeout(() => {
      bookingOverlay.style.display = 'none';
      document.body.style.overflow = '';
    }, 350);
  }

  closeBookingBtn?.addEventListener('click', closeBooking);
  bookingOverlay?.addEventListener('click', e => { if (e.target === bookingOverlay) closeBooking(); });

  // Attach to any .book-consultation button
  document.querySelectorAll('.book-consultation').forEach(btn => {
    btn.addEventListener('click', window.openBookingsModal);
  });

  // ─── SIMPLIFIED CAD UPLOAD MODAL ─────────────────────
  const uploadModalHTML = `
  <div class="upload-modal-overlay" id="atlasdt-upload-overlay">
    <div class="upload-modal-panel">

      <div class="upload-modal-header">
        <div>
          <h2>Upload CAD / BOM for Review</h2>
          <p>Share your files and project details — we'll get back to you within 24h</p>
        </div>
        <button class="upload-modal-close" id="atlasdt-upload-close">&times;</button>
      </div>

      <div class="upload-modal-body">
        <iframe name="upload-hidden-iframe" id="upload-hidden-iframe" style="display:none;"></iframe>
        <form id="atlasdt-upload-form" method="POST" target="upload-hidden-iframe" enctype="multipart/form-data">
          <input type="hidden" name="_captcha" value="false">
          <input type="hidden" name="_subject" value="[AtlasDT] New CAD/BOM Upload">
          <input type="text" name="_honey" style="display:none">
          <div class="upload-form-grid">
            <div class="upload-field">
              <label>Name <span class="cf-req">*</span></label>
              <input type="text" name="firstName" required placeholder="Your full name">
            </div>
            <div class="upload-field">
              <label>Email <span class="cf-req">*</span></label>
              <input type="email" name="email" required placeholder="you@company.com">
            </div>
            <div class="upload-field full">
              <label>Company</label>
              <input type="text" name="company" placeholder="Company name (optional)">
            </div>
            <div class="upload-field full">
              <label>Project Description <span class="cf-req">*</span></label>
              <textarea name="message" required rows="4" placeholder="Briefly describe your project: what is the part, material preferences, target quantities, timeline…"></textarea>
            </div>
            <div class="upload-field full">
              <label>Upload Files <span class="cf-req">*</span></label>
              <div class="upload-drop-zone" id="upload-drop-zone">
                <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                  <polyline points="17 8 12 3 7 8"/>
                  <line x1="12" y1="3" x2="12" y2="15"/>
                </svg>
                <p><strong>Drop your CAD, BOM, or design files here</strong></p>
                <p class="upload-hint">STEP · STP · IGES · STL · DWG · DXF · PDF · ZIP — max 25 MB per file</p>
                <input type="file" id="upload-file-input" name="attachment" multiple accept=".pdf,.doc,.docx,.xls,.xlsx,.step,.stp,.igs,.iges,.stl,.3mf,.obj,.dwg,.dxf,.png,.jpg,.jpeg,.webp,.zip,.rar,.bom,.csv">
              </div>
              <div class="upload-file-list" id="upload-file-list"></div>
            </div>
          </div>
          <div class="upload-submit-row">
            <button type="submit" class="upload-submit-btn">Submit for Review</button>
          </div>
        </form>
      </div>

    </div>
  </div>`;

  document.body.insertAdjacentHTML('beforeend', uploadModalHTML);

  // ─── Upload Modal Styles (injected once) ─────────────
  const uploadStyles = document.createElement('style');
  uploadStyles.textContent = `
    .upload-modal-overlay {
      position: fixed; inset: 0;
      background: rgba(0,0,0,0.7); backdrop-filter: blur(16px);
      z-index: 10000; display: flex; align-items: center; justify-content: center;
      opacity: 0; pointer-events: none; transition: opacity 0.35s ease;
      padding: 20px;
    }
    .upload-modal-overlay.open { opacity: 1; pointer-events: auto; }

    .upload-modal-panel {
      background: linear-gradient(165deg, #0c1425 0%, #111827 100%);
      border: 1px solid rgba(94, 234, 212, 0.12);
      border-radius: 20px; width: 100%; max-width: 600px; max-height: 90vh;
      overflow-y: auto; box-shadow: 0 30px 80px rgba(0,0,0,0.5), 0 0 0 1px rgba(255,255,255,0.04);
    }

    .upload-modal-header {
      display: flex; justify-content: space-between; align-items: flex-start;
      padding: 28px 32px 20px; border-bottom: 1px solid rgba(255,255,255,0.06);
    }
    .upload-modal-header h2 {
      color: #e2e8f0; font-family: 'Space Grotesk','Inter',sans-serif;
      font-size: 20px; font-weight: 600; margin: 0 0 4px 0; letter-spacing: -0.3px;
    }
    .upload-modal-header p {
      color: #64748b; font-size: 13px; margin: 0; font-family: 'Inter',sans-serif;
    }
    .upload-modal-close {
      background: rgba(255,255,255,0.06); border: none; color: #94a3b8;
      width: 32px; height: 32px; border-radius: 8px; font-size: 20px;
      cursor: pointer; display: flex; align-items: center; justify-content: center;
      transition: all 0.2s;
    }
    .upload-modal-close:hover { background: rgba(239,68,68,0.15); color: #f87171; }

    .upload-modal-body { padding: 24px 32px 32px; }

    .upload-form-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
    .upload-field.full { grid-column: 1 / -1; }
    .upload-field label {
      display: block; color: #94a3b8; font-size: 12px; font-weight: 600;
      margin-bottom: 6px; text-transform: uppercase; letter-spacing: 0.5px;
      font-family: 'Inter',sans-serif;
    }
    .upload-field label .cf-req { color: #5eead4; }
    .upload-field input, .upload-field textarea, .upload-field select {
      width: 100%; padding: 10px 14px; background: rgba(255,255,255,0.04);
      border: 1px solid rgba(255,255,255,0.1); border-radius: 10px;
      color: #e2e8f0; font-size: 14px; font-family: 'Inter',sans-serif;
      outline: none; transition: border-color 0.2s, box-shadow 0.2s;
      box-sizing: border-box;
    }
    .upload-field textarea { resize: vertical; min-height: 80px; }
    .upload-field input:focus, .upload-field textarea:focus {
      border-color: rgba(94,234,212,0.4);
      box-shadow: 0 0 0 3px rgba(94,234,212,0.08);
    }
    .upload-field input::placeholder, .upload-field textarea::placeholder {
      color: #475569;
    }

    .upload-drop-zone {
      border: 2px dashed rgba(94,234,212,0.2); border-radius: 14px;
      padding: 32px 20px; text-align: center; cursor: pointer;
      transition: all 0.3s; position: relative; overflow: hidden;
      background: rgba(94,234,212,0.02);
    }
    .upload-drop-zone:hover, .upload-drop-zone.dragover {
      border-color: rgba(94,234,212,0.5); background: rgba(94,234,212,0.06);
    }
    .upload-drop-zone svg { color: #5eead4; margin-bottom: 8px; opacity: 0.7; }
    .upload-drop-zone p { color: #cbd5e1; font-size: 14px; margin: 4px 0; font-family: 'Inter',sans-serif; }
    .upload-drop-zone .upload-hint { color: #475569; font-size: 11px; letter-spacing: 0.3px; }
    .upload-drop-zone input[type="file"] {
      position: absolute; inset: 0; opacity: 0; cursor: pointer;
    }

    .upload-file-list { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 10px; }
    .upload-file-tag {
      display: inline-flex; align-items: center; gap: 6px;
      background: rgba(94,234,212,0.08); border: 1px solid rgba(94,234,212,0.15);
      padding: 4px 10px; border-radius: 6px; font-size: 12px; color: #5eead4;
      font-family: 'Inter',sans-serif;
    }
    .upload-file-tag button {
      background: none; border: none; color: #ef4444; cursor: pointer;
      font-size: 14px; padding: 0; line-height: 1;
    }

    .upload-submit-row {
      margin-top: 24px; display: flex; justify-content: flex-end;
    }
    .upload-submit-btn {
      background: linear-gradient(135deg, #0d9488, #14b8a6);
      color: #fff; border: none; padding: 12px 32px;
      border-radius: 10px; font-size: 14px; font-weight: 700;
      cursor: pointer; font-family: 'Inter',sans-serif;
      transition: all 0.2s; letter-spacing: 0.3px;
    }
    .upload-submit-btn:hover {
      background: linear-gradient(135deg, #0f766e, #0d9488);
      transform: translateY(-1px);
      box-shadow: 0 4px 16px rgba(20,184,166,0.3);
    }

    @media (max-width: 600px) {
      .upload-form-grid { grid-template-columns: 1fr; }
      .upload-modal-panel { max-width: 100%; }
      .upload-modal-header, .upload-modal-body { padding-left: 20px; padding-right: 20px; }
    }
  `;
  document.head.appendChild(uploadStyles);

  // ─── Upload Modal Logic ──────────────────────────────
  const uploadOverlay = document.getElementById('atlasdt-upload-overlay');
  const uploadCloseBtn = document.getElementById('atlasdt-upload-close');
  const uploadForm = document.getElementById('atlasdt-upload-form');
  const uploadFileInput = document.getElementById('upload-file-input');
  const uploadFileList = document.getElementById('upload-file-list');
  const uploadDropZone = document.getElementById('upload-drop-zone');
  let uploadFiles = [];

  function openUpload(e) {
    if (e) e.preventDefault();
    uploadOverlay.classList.add('open');
    document.body.style.overflow = 'hidden';
    // Pre-fill if logged in
    if (isLoggedIn && userProfile && uploadForm) {
      const nameInput = uploadForm.querySelector('input[name="firstName"]');
      const emailInput = uploadForm.querySelector('input[name="email"]');
      const companyInput = uploadForm.querySelector('input[name="company"]');
      if (nameInput && !nameInput.value) { nameInput.value = ((userProfile.first_name || '') + ' ' + (userProfile.last_name || '')).trim(); }
      if (emailInput && !emailInput.value) { emailInput.value = userSession?.user?.email || ''; }
      if (companyInput && !companyInput.value) { companyInput.value = userProfile.company || ''; }
    }
  }

  function closeUpload() {
    uploadOverlay.classList.remove('open');
    document.body.style.overflow = '';
  }

  uploadCloseBtn?.addEventListener('click', closeUpload);
  uploadOverlay?.addEventListener('click', e => { if (e.target === uploadOverlay) closeUpload(); });

  // Trigger from any .upload-cad-trigger element
  document.addEventListener('click', e => {
    if (e.target.closest('.upload-cad-trigger')) {
      openUpload(e);
    }
  });

  // Drag & drop
  uploadDropZone?.addEventListener('dragover', e => { e.preventDefault(); uploadDropZone.classList.add('dragover'); });
  uploadDropZone?.addEventListener('dragleave', () => uploadDropZone.classList.remove('dragover'));
  uploadDropZone?.addEventListener('drop', e => {
    e.preventDefault();
    uploadDropZone.classList.remove('dragover');
    for (const file of e.dataTransfer.files) {
      if (!uploadFiles.find(f => f.name === file.name)) uploadFiles.push(file);
    }
    renderUploadFiles();
  });

  uploadFileInput?.addEventListener('change', () => {
    for (const file of uploadFileInput.files) {
      if (!uploadFiles.find(f => f.name === file.name)) uploadFiles.push(file);
    }
    renderUploadFiles();
    uploadFileInput.value = '';
  });

  function renderUploadFiles() {
    if (!uploadFileList) return;
    uploadFileList.innerHTML = uploadFiles.map((f, i) => `
      <div class="upload-file-tag">
        ${f.name} (${(f.size / 1024).toFixed(0)} KB)
        <button type="button" data-rm="${i}">&times;</button>
      </div>
    `).join('');
    uploadFileList.querySelectorAll('[data-rm]').forEach(btn => {
      btn.addEventListener('click', () => {
        uploadFiles.splice(parseInt(btn.dataset.rm), 1);
        renderUploadFiles();
      });
    });
  }

  uploadForm?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const submitBtn = uploadForm.querySelector('.upload-submit-btn');
    const originalText = submitBtn.textContent;
    submitBtn.textContent = 'Submitting...';
    submitBtn.disabled = true;

    const email = uploadForm.querySelector('input[name="email"]')?.value;
    const fname = uploadForm.querySelector('input[name="firstName"]')?.value;
    const company = uploadForm.querySelector('input[name="company"]')?.value;

    if (!isLoggedIn && email) {
      const randomPwd = Math.random().toString(36).slice(-10) + "A1!";
      const { error } = await signUpUser(email, randomPwd, { first_name: fname, company: company });
      if (error && error.message.toLowerCase().includes('already registered')) {
        // Silently continue — user exists, that's fine for an upload
      }
    }

    // Transfer files to the real input
    const dt = new DataTransfer();
    uploadFiles.forEach(file => dt.items.add(file));
    const realInput = uploadForm.querySelector('input[type="file"]');
    if (realInput) realInput.files = dt.files;

    let isSubmitted = false;
    const iframe = document.getElementById('upload-hidden-iframe');
    if (iframe) {
      iframe.onload = () => {
        if (!isSubmitted) return;
        const body = uploadForm.parentElement;
        if (body) {
          body.innerHTML = '<div style="text-align:center; padding: 60px 20px;">' +
              '<svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#5eead4" stroke-width="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>' +
              '<h3 style="color:#e2e8f0; margin:20px 0 8px 0; font-size:20px; font-family:Space Grotesk,sans-serif;">Files Received!</h3>' +
              '<p style="color:#64748b; font-size:14px; max-width:380px; margin:0 auto; font-family:Inter,sans-serif;">Our engineering team will review your files and respond within 24 hours.</p>' +
              '<button onclick="document.getElementById(\'atlasdt-upload-overlay\').classList.remove(\'open\');document.body.style.overflow=\'\';" style="margin-top:28px; padding:12px 28px; background:rgba(94,234,212,0.1); color:#5eead4; border:1px solid rgba(94,234,212,0.3); border-radius:10px; font-weight:700; font-size:14px; cursor:pointer; font-family:inherit;">Close</button>' +
            '</div>';
        }
      };
    }

    isSubmitted = true;
    const p1 = 'https://formsubmit.co';
    const p2 = '/info@atlasdt.com';
    uploadForm.action = p1 + p2;
    uploadForm.submit();
  });

})();



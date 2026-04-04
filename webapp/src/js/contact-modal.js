/* ═══════════════════════════════════════════════════
   Atlas DT — Global Contact Modal (Auto-Inject)
   ═══════════════════════════════════════════════════
   Include this script on any page to automatically:
   1. Inject a "Contact Us" link into the navbar
   2. Inject the full contact modal HTML into <body>
   3. Wire open/close and form submission logic
   ═══════════════════════════════════════════════════ */

(function () {
  'use strict';

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
        <form id="atlasdt-contact-form" enctype="multipart/form-data">
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
          </div>

          <div class="contact-submit-row">
            <button type="submit" class="contact-submit-btn">Send Inquiry</button>
          </div>
        </form>
      </div>

    </div>
  </div>`;

  document.body.insertAdjacentHTML('beforeend', modalHTML);


  // ─── 2. Inject "Contact Us" Link into Nav ────────────
  // Strategy: detect which navbar pattern we're on

  // Marketing pages: look for .nav-links-container
  const navLinksContainer = document.querySelector('.nav-links-container');
  if (navLinksContainer) {
    // Insert before the "Log In" link or user menu, or at the end
    const loginLink = navLinksContainer.querySelector('#nav-login-btn');
    const userMenu = navLinksContainer.querySelector('#nav-user-menu');
    const contactLink = document.createElement('a');
    contactLink.href = '#';
    contactLink.className = 'nav-link nav-contact-trigger';
    contactLink.id = 'atlasdt-contact-nav-trigger';
    contactLink.textContent = 'Contact Us';

    if (loginLink) {
      navLinksContainer.insertBefore(contactLink, loginLink);
    } else if (userMenu) {
      navLinksContainer.insertBefore(contactLink, userMenu);
    } else {
      navLinksContainer.appendChild(contactLink);
    }
  }

  // App page: look for .navbar__actions
  const navbarActions = document.querySelector('.navbar__actions');
  if (navbarActions) {
    const contactBtn = document.createElement('button');
    contactBtn.className = 'nav-contact-trigger';
    contactBtn.id = 'atlasdt-contact-nav-trigger-app';
    contactBtn.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg> Contact Us`;
    // Insert before the avatar/login button
    const avatar = navbarActions.querySelector('.navbar__avatar');
    if (avatar) {
      navbarActions.insertBefore(contactBtn, avatar);
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
    if (e.target.closest('#atlasdt-contact-nav-trigger') || e.target.closest('#atlasdt-contact-nav-trigger-app')) {
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
  form?.addEventListener('submit', (e) => {
    e.preventDefault();
    
    const submitBtn = form.querySelector('.contact-submit-btn');
    const originalText = submitBtn.textContent;
    submitBtn.textContent = 'Sending...';
    submitBtn.disabled = true;

    // Reconstruct the file input from the uploadedFiles array
    // (the input was cleared after each selection for UX reasons)
    if (fileInput && uploadedFiles && uploadedFiles.length > 0) {
      const dataTransfer = new DataTransfer();
      uploadedFiles.forEach(file => dataTransfer.items.add(file));
      fileInput.files = dataTransfer.files;
    }

    // Create hidden iframe to receive the form POST (avoids page redirect)
    const iframeName = 'atlasdt-contact-iframe-' + Date.now();
    const iframe = document.createElement('iframe');
    iframe.name = iframeName;
    iframe.style.display = 'none';
    document.body.appendChild(iframe);

    // Inject hidden fields for FormSubmit config
    const addHidden = (name, value) => {
      let input = form.querySelector(`input[name="${name}"]`);
      if (!input) {
        input = document.createElement('input');
        input.type = 'hidden';
        input.name = name;
        form.appendChild(input);
      }
      input.value = value;
    };
    addHidden('_captcha', 'false');
    addHidden('_template', 'table');
    addHidden('_next', window.location.href); // FormSubmit redirects iframe here after submit

    // Point the form at FormSubmit's standard endpoint (not /ajax/)
    form.action = 'https://formsubmit.co/marco@panianiproducts.com';
    form.method = 'POST';
    form.enctype = 'multipart/form-data';
    form.target = iframeName;

    // Listen for iframe load = submission complete
    iframe.addEventListener('load', () => {
      // Clean up
      setTimeout(() => iframe.remove(), 2000);

      const body = document.querySelector('.contact-modal-body');
      if (body) {
        body.innerHTML = `
          <div style="text-align:center; padding: 60px 20px;">
            <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#10b981" stroke-width="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
            <h3 style="color:#fff; margin:20px 0 8px 0; font-size:22px;">Inquiry Sent Successfully</h3>
            <p style="color:rgba(255,255,255,0.5); font-size:14px; max-width:400px; margin:0 auto;">Thank you for reaching out. Our team will review your inquiry and get back to you within 24 hours.</p>
            <button onclick="document.getElementById('atlasdt-contact-overlay').classList.remove('open'); document.body.style.overflow='';" style="margin-top:28px; padding:12px 28px; background:#3b82f6; color:#fff; border:none; border-radius:10px; font-weight:700; font-size:14px; cursor:pointer; font-family:inherit;">Close</button>
          </div>`;
      }
    });

    // Actually submit the form
    form.submit();
  });

  // Footer forms AJAX submission
  const footerForms = document.querySelectorAll('.atlasdt-footer-form');
  footerForms.forEach(footerForm => {
    footerForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const submitBtn = footerForm.querySelector('button[type="submit"]');
      const originalText = submitBtn ? submitBtn.textContent : 'Send Message';
      if (submitBtn) {
        submitBtn.textContent = 'Sending...';
        submitBtn.disabled = true;
      }
      
      try {
        const formData = new FormData(footerForm);
        formData.append('_captcha', 'false');
        formData.append('_template', 'table');
        
        const response = await fetch('https://formsubmit.co/ajax/marco@panianiproducts.com', {
          method: 'POST',
          body: formData
        });
        
        if (!response.ok) throw new Error('Network response was not ok');
        
        footerForm.innerHTML = `
          <div style="text-align:center; padding: 20px 0;">
            <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#10b981" stroke-width="2" style="margin-bottom:12px;"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
            <h4 style="color:#fff; margin:0 0 8px 0; font-size:18px;">Message Sent</h4>
            <p style="color:rgba(255,255,255,0.6); font-size:13px;">Thank you! We'll be in touch shortly.</p>
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

})();



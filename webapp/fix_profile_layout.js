import fs from 'fs';
import path from 'path';

const basePath = process.cwd();
const htmlFilePath = path.join(basePath, 'profile.html');
const jsFilePath = path.join(basePath, 'src', 'js', 'profile-app.js');

let html = fs.readFileSync(htmlFilePath, 'utf8');
let js = fs.readFileSync(jsFilePath, 'utf8');

// 1. UPDATE HTML
// Apply fixed height to .profile-content-pane so they are exactly the same height
if (!html.includes('min-height: 700px;')) {
  html = html.replace('.profile-content-pane {', '.profile-content-pane {\n      min-height: 700px;\n      display: none;\n      /* Overrides existing display */');
}

// Remove the individual save buttons from General Details tab
html = html.replace(
  /<div style="margin-top: 40px; display: flex; justify-content: flex-end; align-items: center; gap: 16px;">[\s\S]*?<\/div>\s*<\/form>/,
  '</form>'
);

// Remove the individual save buttons from Work Profile tab
html = html.replace(
  /<div style="margin-top: 40px; display: flex; justify-content: flex-end;">[\s\S]*?<\/button>\s*<\/div>\s*<\/form>/,
  '</form>'
);

// Add the unified Save Card at the bottom of .profile-layout, just outside .profile-content
// Actually, putting it at the bottom of .profile-content is better so it aligns with the panes.
const globalSaveCard = `

      <!-- Persistent Global Save Action Card -->
      <div class="billing-card" style="margin-top: 24px; padding: 24px 32px; display: flex; justify-content: space-between; align-items: center; box-shadow: 0 -10px 30px rgba(0,0,0,0.3);">
        <div>
          <h3 style="font-size: 16px; margin: 0; font-family: 'Space Grotesk', sans-serif;">Save Profile Changes</h3>
          <p style="color: rgba(255,255,255,0.5); font-size: 13px; margin: 4px 0 0 0;">Don't forget to save your edits across all tabs.</p>
        </div>
        <div style="display: flex; align-items: center; gap: 16px;">
          <span id="global-save-msg" style="font-size: 14px; font-weight: 500; color: #4ade80; display: none;">Saved successfully!</span>
          <button class="btn-save" id="global-save-btn">Save All Changes</button>
        </div>
      </div>
`;

if (!html.includes('id="global-save-btn"')) {
  // Insert before the end of .profile-content
  html = html.replace('</div>\n  </div>\n\n  <!-- Onboarding Modal Container -->', `${globalSaveCard}    </div>\n  </div>\n\n  <!-- Onboarding Modal Container -->`);
}

fs.writeFileSync(htmlFilePath, html);
console.log("Updated profile.html");


// 2. UPDATE JS
// Remove old individual form attach logic and replace with global save
if (!js.includes("globalSaveBtn.addEventListener")) {
  // Strip out old form bindings
  js = js.replace(/\/\/ Handle Generel Form Submission[\s\S]*?\/\/ Handle Work Profile Submission/, '// Handle Work Profile Submission');
  js = js.replace(/\/\/ Handle Work Profile Submission[\s\S]*?\/\/ Handle Resume Upload/, '// Handle Resume Upload');

  // Add the new global save listener after tabs logic
  const globalSaveJs = `
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
        methodologies: getVal('prof-methodologies')
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
        alert('Error updating profile: ' + error.message + "\\n\\n(Did you forget to add the missing columns in Supabase?)");
        globalSaveBtn.textContent = 'Save All Changes';
        globalSaveBtn.disabled = false;
      }
    });
  }
`;

  // Inject before Resume Upload
  js = js.replace('// Handle Resume Upload', `${globalSaveJs}\n  // Handle Resume Upload`);
}

// Fix Resume Upload UI to make sure it waits for upload
fs.writeFileSync(jsFilePath, js);
console.log("Updated profile-app.js");


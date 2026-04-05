import fs from 'fs';

// UPDATE PROFILE.HTML
let html = fs.readFileSync('profile.html', 'utf8');

html = html.replace(
  /<div style="font-weight: 600; font-family: 'Space Grotesk', sans-serif; letter-spacing: 2px;">Atlas DT HUB<\/div>/,
  '<img src="/images/atlog.webp" alt="Atlas DT Logo" style="height: 28px;">'
);

const origContainer = `<h4 style="font-size: 14px; margin-bottom: 8px;">Current Resume:</h4>
            <a href="#" id="current-resume-link" target="_blank" style="color: var(--color-electric); text-decoration: underline;">View Uploaded Resume</a>`;

const newContainer = `<h4 style="font-size: 14px; margin-bottom: 8px;">Current Resume:</h4>
            <div style="display: flex; gap: 16px; align-items: center;">
              <a href="#" id="current-resume-link" target="_blank" style="color: var(--color-electric); text-decoration: underline;">View Uploaded Resume</a>
              <button id="remove-resume-btn" class="btn-save" style="background: rgba(239, 68, 68, 0.1); color: #ef4444; border: 1px solid #ef4444; padding: 6px 12px; font-size: 12px;">Remove</button>
            </div>`;

html = html.replace(origContainer, newContainer);
fs.writeFileSync('profile.html', html);
console.log('Done profile.html updates');

// UPDATE PROFILE-APP.JS
let js = fs.readFileSync('src/js/profile-app.js', 'utf8');

const jsUploadOrig = `// Get public URL
      const { data: { publicUrl } } = supabase.storage.from('user_resumes').getPublicUrl(fileName);
      
      // Update profile
      await updateMyProfile({ resume_url: publicUrl });`;

const jsUploadNew = `// Get public URL
      let { data: { publicUrl } } = supabase.storage.from('user_resumes').getPublicUrl(fileName);
      publicUrl += \`?download=\${encodeURIComponent(file.name)}\`;
      
      // Update profile
      await updateMyProfile({ resume_url: publicUrl });`;

js = js.replace(jsUploadOrig, jsUploadNew);

const jsRemoveBtnSetup = `
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

  // Handle Portfolio Uploads`;

js = js.replace('// Handle Portfolio Uploads', jsRemoveBtnSetup);

fs.writeFileSync('src/js/profile-app.js', js);
console.log('Done profile-app.js updates');

import fs from 'fs';
import path from 'path';

const htmlPath = path.join(process.cwd(), 'profile.html');
let html = fs.readFileSync(htmlPath, 'utf8');

// The first regex targets the .profile-content-pane block:
html = html.replace('.profile-content-pane {\n      min-height: 700px;\n      display: none;\n      /* Overrides existing display */', 
'.profile-content-pane {');

html = html.replace('.profile-content-pane {\n      background: rgba(20,20,20,0.4);',
`.profile-content {
      align-items: stretch;
      display: flex;
      flex-direction: column;
    }

    .profile-content-pane {
      background: rgba(20,20,20,0.4);`);
      
html = html.replace('box-shadow: 0 20px 40px rgba(0,0,0,0.2);\n    }', 
`box-shadow: 0 20px 40px rgba(0,0,0,0.2);
      flex: 1;
      height: 750px;
      overflow-y: auto;
    }`);

const saveCard = `
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
    html = html.replace('</div>\n    </div>\n  </div>\n\n  <!-- Onboarding Modal Container -->', 
    `  </div>\n${saveCard}    </div>\n  </div>\n\n  <!-- Onboarding Modal Container -->`);
}

fs.writeFileSync(htmlPath, html);
console.log('Fixed HTML layout.');

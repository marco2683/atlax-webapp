import fs from 'fs';

let content = fs.readFileSync('app.html', 'utf8');

const authModalHtml = `
  <!-- ── Authentication Modal (Login / Sign Up) ────────────────────────────────────────── -->
  <div class="auth-modal hidden" id="auth-modal">
    <div class="auth-modal-glass">
      <button class="close-auth-modal" id="close-auth-modal">&times;</button>

      <div class="auth-forms-container auth-state-login" id="auth-forms-container">

        <!-- LOGIN FORM -->
        <div class="auth-form-wrapper" id="form-login">
          <div class="auth-header">
            <h2>Welcome Back.</h2>
            <p>Access the PRD Manufacturing Engine</p>
          </div>
          <form id="login-form" class="auth-form">
            <div class="auth-input-group">
              <label for="login-email">Email Address</label>
              <input type="email" id="login-email" required placeholder="name@company.com">
            </div>
            <div class="auth-input-group">
              <label for="login-password">Password</label>
              <input type="password" id="login-password" required
                placeholder="&bull;&bull;&bull;&bull;&bull;&bull;&bull;&bull;">
            </div>
            <div id="login-error" class="auth-error-msg"></div>
            <button type="submit" class="auth-btn" id="login-submit-btn">Log In</button>
          </form>
          <div class="auth-toggle-link">
            No account yet? <a id="toggle-to-signup" style="cursor:pointer">Sign up for access</a>
          </div>
        </div>

        <!-- SIGN UP FORM -->
        <div class="auth-form-wrapper" id="form-signup" style="display: none;">
          <div class="auth-header">
            <h2>Request Access.</h2>
            <p>Join the procurement intelligence platform</p>
          </div>
          <form id="signup-form" class="auth-form">
            <div class="auth-input-group">
              <label for="signup-tier">Select Your Plan</label>
              <select id="signup-tier" required style="width: 100%; padding: 12px; background: rgba(0,0,0,0.5); border: 1px solid rgba(255,255,255,0.1); border-radius: 8px; color: #fff; font-size: 13px; margin-bottom: 2px;">
                <option value="basic">Basic (Free)</option>
                <option value="professional">Professional ($49/mo)</option>
                <option value="enterprise">Enterprise (Custom)</option>
              </select>
            </div>
            <div class="auth-input-group" style="display: flex; flex-direction: row; gap: 8px;">
              <div style="flex: 1; display: flex; flex-direction: column; gap: 6px;">
                <label for="signup-first">First Name</label>
                <input type="text" id="signup-first" required placeholder="John">
              </div>
              <div style="flex: 1; display: flex; flex-direction: column; gap: 6px;">
                <label for="signup-last">Last Name</label>
                <input type="text" id="signup-last" required placeholder="Doe">
              </div>
            </div>
            <div class="auth-input-group">
              <label for="signup-company">Company</label>
              <input type="text" id="signup-company" required placeholder="Acme Corp">
            </div>
            <div class="auth-input-group">
              <label for="signup-email">Work Email</label>
              <input type="email" id="signup-email" required placeholder="john@acmecorp.com">
            </div>
            <div class="auth-input-group">
              <label for="signup-password">Password</label>
              <input type="password" id="signup-password" required
                placeholder="&bull;&bull;&bull;&bull;&bull;&bull;&bull;&bull;">
            </div>
            <div id="signup-error" class="auth-error-msg"></div>
            <button type="submit" class="auth-btn" id="signup-submit-btn">Create Account</button>
          </form>
          <div class="auth-toggle-link">
            Already have an account? <a id="toggle-to-login" style="cursor:pointer">Log In instead</a>
          </div>
        </div>

      </div>
    </div>
  </div>`;

if (!content.includes('id="auth-modal"')) {
   content = content.replace('</body>', `${authModalHtml}\n</body>`);
} else {
   // Already has auth modal. We must make sure signup-tier is inside it!
   if (!content.includes('id="signup-tier"')) {
      const authGroupRegex = /<div class="auth-input-group" style="display: flex; flex-direction: row; gap: 8px;">/g;
      const planSelectHtml = `
            <div class="auth-input-group">
              <label for="signup-tier">Select Your Plan</label>
              <select id="signup-tier" required style="width: 100%; padding: 12px; background: rgba(0,0,0,0.5); border: 1px solid rgba(255,255,255,0.1); border-radius: 8px; color: #fff; font-size: 13px; margin-bottom: 2px;">
                <option value="basic">Basic (Free)</option>
                <option value="professional">Professional ($49/mo)</option>
                <option value="enterprise">Enterprise (Custom)</option>
              </select>
            </div>
            <div class="auth-input-group" style="display: flex; flex-direction: row; gap: 8px;">`;
      content = content.replace(authGroupRegex, planSelectHtml);
   }
}

fs.writeFileSync('app.html', content, 'utf8');
console.log("Successfully injected auth-modal with tier into app.html");

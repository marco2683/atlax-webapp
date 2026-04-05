import fs from 'fs';
import path from 'path';

const appHtmlPath = path.resolve('app.html');
let appContent = fs.readFileSync(appHtmlPath, 'utf8');

// The auth modal block
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
              <p style="font-size: 11px; color: rgba(255,255,255,0.4); margin-top: 6px; margin-bottom: 0;">Min 8 chars: 1 uppercase, 1 lowercase, 1 number, 1 symbol.</p>
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

if (!appContent.includes('id="auth-modal"')) {
  // Insert auth css in <head>
  const cssNode = '<link rel="stylesheet" href="/src/css/auth.css">\n';
  appContent = appContent.replace('</head>', `  ${cssNode}</head>`);

  // Insert modal code before bottom scripts
  appContent = appContent.replace(/<script src="\/src\/main\.js"/, `${authModalHtml}\n\n  <script src="/src/main.js"`);
  
  // Insert module script at the end
  appContent = appContent.replace('</body>', '  <script type="module" src="/src/js/auth-modal.js"></script>\n</body>');
  
  fs.writeFileSync(appHtmlPath, appContent, 'utf8');
  console.log("Injected auth modal into app.html");
} else {
  console.log("Auth modal already exists in app.html");
}

import os
import glob

# Ensure CSS wrapper
css = '''
.password-input-wrapper {
  position: relative;
  display: flex;
  align-items: center;
  width: 100%;
}
.password-toggle {
  position: absolute;
  right: 12px;
  background: transparent;
  border: none;
  cursor: pointer;
  color: var(--color-steel-400);
  padding: 4px;
}
.password-toggle:hover {
  color: var(--color-electric);
}
.auth-state-reset #form-login, .auth-state-reset #form-signup { display: none !important; }
.auth-state-reset #form-reset { display: block !important; }

#form-reset { display: none; }
'''
with open('src/css/auth.css', 'a', encoding='utf-8') as f:
    f.write(css)

# Inject the reset form into HTML files
files = glob.glob('*.html')
for f in files:
    with open(f, 'r', encoding='utf-8') as file:
        content = file.read()
    
    if '<div class="auth-form-wrapper" id="form-login">' in content and 'id="form-reset"' not in content:
        reset_html = '''
        <!-- RESET PASSWORD FORM -->
        <div class="auth-form-wrapper" id="form-reset" style="display: none;">
          <div class="auth-header">
            <h2>Reset Password.</h2>
            <p>Enter your email to receive recovery instructions.</p>
          </div>
          <form id="reset-form" class="auth-form">
            <div class="auth-input-group">
              <label for="reset-email">Email Address</label>
              <input type="email" id="reset-email" required placeholder="name@company.com">
            </div>
            <div id="reset-error" class="auth-error-msg"></div>
            <button type="submit" class="auth-btn" id="reset-submit-btn">Send Instructions</button>
          </form>
          <div class="auth-toggle-link">
            Remembered it? <a id="toggle-reset-to-login" style="cursor:pointer">Log In instead</a>
          </div>
        </div>
        '''
        # Insert before form-signup
        content = content.replace('<div class="auth-form-wrapper" id="form-signup"', reset_html + '\n        <div class="auth-form-wrapper" id="form-signup"')
        
        # Add forgot password link to login form
        if 'id="toggle-to-reset"' not in content:
            link = '<div style="text-align:right; margin-top:-10px; margin-bottom:15px;"><a id="toggle-to-reset" style="font-size:12px; color:var(--color-electric); cursor:pointer;">Forgot password?</a></div>'
            content = content.replace('<div id="login-error"', link + '\n            <div id="login-error"')

        with open(f, 'w', encoding='utf-8') as wfile:
            wfile.write(content)

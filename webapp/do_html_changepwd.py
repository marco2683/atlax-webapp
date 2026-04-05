import glob

# Inject the change password form into HTML files
files = glob.glob('*.html')
for f in files:
    with open(f, 'r', encoding='utf-8') as file:
        content = file.read()
    
    if '<div class="auth-form-wrapper" id="form-reset">' in content and 'id="form-changepwd"' not in content:
        changepwd_html = '''
        <!-- CHANGE PASSWORD FORM -->
        <div class="auth-form-wrapper" id="form-changepwd" style="display: none;">
          <div class="auth-header">
            <h2>Change Password.</h2>
            <p>Update your credentials for secure access.</p>
          </div>
          <form id="changepwd-form" class="auth-form">
            <div id="old-pwd-container" class="auth-input-group">
              <label for="change-old-password">Old Password</label>
              <input type="password" id="change-old-password" placeholder="••••••••">
            </div>
            <div class="auth-input-group">
              <label for="change-new-password">New Password</label>
              <input type="password" id="change-new-password" required placeholder="••••••••">
            </div>
            <div class="auth-input-group">
              <label for="change-confirm-password">Confirm New Password</label>
              <input type="password" id="change-confirm-password" required placeholder="••••••••">
            </div>
            <div id="changepwd-error" class="auth-error-msg"></div>
            <button type="submit" class="auth-btn" id="changepwd-submit-btn">Update Password</button>
          </form>
          <div class="auth-toggle-link">
            <a id="toggle-changepwd-close" style="cursor:pointer">Cancel</a>
          </div>
        </div>
        '''
        
        # Insert before form-reset
        content = content.replace('<div class="auth-form-wrapper" id="form-reset"', changepwd_html + '\n        <div class="auth-form-wrapper" id="form-reset"')
        
        # We need a way to open the change password form for logged-in users.
        # Let's add a "Change Password" link to the nav-user-menu dropdown if it's there
        if 'id="nav-logout-btn"' in content and 'id="nav-changepwd-btn"' not in content:
            content = content.replace('<a href="#" id="nav-logout-btn"', '<a href="#" id="nav-changepwd-btn" class="dropdown-item">Change Password</a>\n            <a href="#" id="nav-logout-btn"')

        with open(f, 'w', encoding='utf-8') as wfile:
            wfile.write(content)

with open('src/css/auth.css', 'a', encoding='utf-8') as f:
    f.write('\n.auth-state-changepwd #form-login,.auth-state-changepwd #form-signup,.auth-state-changepwd #form-reset { display: none !important; }\n.auth-state-changepwd #form-changepwd { display: block !important; }\n')


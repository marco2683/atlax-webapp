import re
import os

pwd_hint = '''              <p style="font-size: 11px; color: rgba(255,255,255,0.4); margin-top: 6px;">Min 8 chars: 1 uppercase, 1 lowercase, 1 number, 1 symbol.</p>'''

# 1. Update auth.js / profile-app.js
files = ['src/js/profile-app.js', 'src/js/components/auth-modal.js']
for f in files:
    with open(f, 'r', encoding='utf-8') as file:
        js = file.read()
    
    js = js.replace('length < 6', 'length < 8')
    js = js.replace('at least 6 characters', 'at least 8 characters')
    
    with open(f, 'w', encoding='utf-8') as file:
        file.write(js)

# 2. Add sub-text to all instances of password input fields that are NOT for login
html_files = [f for f in os.listdir('.') if f.endswith('.html')]
for f in html_files:
    with open(f, 'r', encoding='utf-8') as file:
        html = file.read()
        
    original = html
    # We want to target:
    # 1. <input type="password" id="signup-password"...>
    html = re.sub(
        r'(<input type="password" id="signup-password"[^>]*>)',
        rf'\1\n{pwd_hint}',
        html
    )
    # 2. <input type="password" id="prof-new-pwd"...>
    html = re.sub(
        r'(<input type="password" id="prof-new-pwd"[^>]*>)',
        rf'\1\n{pwd_hint}',
        html
    )
    # 3. reset password in auth modal
    html = re.sub(
        r'(<input type="password" id="change-new-password"[^>]*>)',
        rf'\1\n{pwd_hint}',
        html
    )
    
    if original != html:
        with open(f, 'w', encoding='utf-8') as file:
            file.write(html)

print("Done")

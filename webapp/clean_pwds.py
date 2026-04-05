import os, re

html_files = [f for f in os.listdir('.') if f.endswith('.html')] + ['inject_auth_modal.js', 'src/js/components/auth-modal.js']

regex_clean = re.compile(r'\n*\s*<p style=\"font-size: 11px; color: rgba\(255,255,255,0\.4\).*?>Min 8 chars.*?</p>', re.IGNORECASE)
hint = '\n              <p style="font-size: 11px; color: rgba(255,255,255,0.4); margin-top: 6px; margin-bottom: 0;">Min 8 chars: 1 uppercase, 1 lowercase, 1 number, 1 symbol.</p>'

ids_to_add = ['id="signup-password"', 'id="prof-new-pwd"', 'id="change-new-password"']

for f in html_files:
    if not os.path.exists(f): continue
    with open(f, 'r', encoding='utf-8') as file:
        t = file.read()
        
    original = t
    t = regex_clean.sub('', t)
    
    for input_id in ids_to_add:
        idx = 0
        while True:
            idx = t.find(input_id, idx)
            if idx == -1: break
            
            end_idx = t.find('>', idx) + 1
            t = t[:end_idx] + hint + t[end_idx:]
            idx = end_idx + len(hint)
            
    if original != t:
        with open(f, 'w', encoding='utf-8') as file:
            file.write(t)
        print(f'Fixed {f}')

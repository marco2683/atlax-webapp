import os

html_files = [f for f in os.listdir('.') if f.endswith('.html')]
hint = '\n              <p style="font-size: 11px; color: rgba(255,255,255,0.4); margin-top: 6px; margin-bottom: 0;">Min 8 chars: 1 uppercase, 1 lowercase, 1 number, 1 symbol.</p>'

ids_to_find = ['id="signup-password"', 'id="prof-new-pwd"', 'id="change-new-password"']

for f in html_files:
    with open(f, 'r', encoding='utf-8') as file:
        t = file.read()
    
    modified = False
    for input_id in ids_to_find:
        if hint not in t and input_id in t:
            idx = t.find(input_id)
            end_idx = t.find('>', idx) + 1
            t = t[:end_idx] + hint + t[end_idx:]
            modified = True
            
    if modified:
        with open(f, 'w', encoding='utf-8') as file:
            file.write(t)
        print(f"Updated {f}")

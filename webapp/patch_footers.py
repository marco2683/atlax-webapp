import os
import re

files = ['index.html', 'services.html', 'portfolio.html', 'app.html']
for fn in files:
    with open(fn, 'r', encoding='utf-8') as f:
        cnt = f.read()
    
    # Catch both single-line and multi-line formats for Privacy Policy
    target = r'<li>\s*<a href="[^"]*"\s*style="color: var\(--color-steel-400\); text-decoration: none; font-size: 14px;">Privacy[^<]*Policy</a>\s*</li>'
    replacement = r'''<li><a href="blog.html" style="color: var(--color-steel-400); text-decoration: none; font-size: 14px;">Blog</a></li>
              <li><a href="faq.html" style="color: var(--color-steel-400); text-decoration: none; font-size: 14px;">FAQ</a></li>
              <li><a href="#" style="color: var(--color-steel-400); text-decoration: none; font-size: 14px;">Privacy Policy</a></li>'''
    
    new_cnt = re.sub(target, replacement, cnt)
    
    if cnt != new_cnt:
        with open(fn, 'w', encoding='utf-8') as f:
            f.write(new_cnt)
        print("Patched", fn)
    else:
        print("No change", fn)

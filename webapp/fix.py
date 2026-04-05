import sys
import re

with open('profile.html', 'r', encoding='utf-8') as f:
    text = f.read()

# Replace logo
text = text.replace(
    r"""<div style="font-weight: 600; font-family: 'Space Grotesk', sans-serif; letter-spacing: 2px;">Atlas DT HUB</div>""",
    r"""<img src="/logos/atlasdt-logo-light.png" alt="Atlas DT Logo" style="height: 28px;">"""
)

# Replace resume container
text = re.sub(
    r'<div id=\"current-resume-container\"[^>]*>.*?<h4[^>]*>Current Resume:</h4>\s*<a href=\"#\" id=\"current-resume-link\"[^>]*>View Uploaded Resume</a>\s*</div>',
    """<div id="current-resume-container" style="margin-top: 24px; padding-top: 24px; border-top: 1px solid rgba(255,255,255,0.1); width: 100%; display: none;">\n            <h4 style="font-size: 14px; margin-bottom: 8px;">Current Resume:</h4>\n            <div style="display: flex; gap: 16px; align-items: center;">\n              <a href="#" id="current-resume-link" target="_blank" style="color: var(--color-electric); text-decoration: underline;">View Uploaded Resume</a>\n              <button id="remove-resume-btn" class="btn-save" style="background: rgba(239, 68, 68, 0.1); color: #ef4444; border: 1px solid #ef4444; padding: 6px 12px; font-size: 12px;">Remove</button>\n            </div>\n          </div>""",
    text,
    flags=re.DOTALL
)

with open('profile.html', 'w', encoding='utf-8') as f:
    f.write(text)

print("HTML Replaced successfully")

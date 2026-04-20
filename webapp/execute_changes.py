import os
import glob
import re

# 1. Create Legal Pages
legal_pages = [
    {"slug": "data-protection", "title": "Data Protection", "desc": "How we secure your data through baked-in NDA protection.", "content": "<p>At Atlas DT (a brand of Paniani Products Pty Ltd), we take your privacy and proprietary information seriously. By agreeing to our terms during signup, you are automatically covered by our mutual Non-Disclosure Agreement (NDA) framework built into this data protection policy. Your CAD files, intellectual property, and supply chain data remain strictly confidential under this legally binding agreement.</p>"},
    {"slug": "email-security", "title": "Email Security", "desc": "Guarding against phishing and unauthorized communications.", "content": "<p>All official communications from Atlas DT or Paniani Products Pty Ltd will come exclusively from @atlasdt.com or other verified company domains. We will never ask for your password, API keys, or financial details over email unprompted. Please report any suspicious communications immediately to our security team.</p>"},
    {"slug": "privacy-policy", "title": "Privacy Policy", "desc": "How we handle your personal data.", "content": "<p>Our privacy policy outlines exactly what personal and corporate data we collect, how we store it, and your rights concerning it. We comply with major international and local data protection frameworks. Your data is used exclusively to facilitate quoting, sourcing, and project management on the Manufacturing Engine, and is never sold to third parties.</p>"},
    {"slug": "website-terms", "title": "Website Conditions of Use", "desc": "Rules and guidelines for interacting with our platform.", "content": "<p>These terms govern your use of the Atlas DT website and platform. They cover acceptable use, intellectual property restrictions, and liability limitations. By accessing the site, you agree to these conditions, which protect both you as the user and Paniani Products Pty Ltd as the operator.</p>"},
    {"slug": "conditions-of-sale", "title": "Terms and Conditions of Sale", "desc": "The legal foundation of our transactions.", "content": "<p>All instant quotes, project quotes, and marketplace orders are governed by these Terms and Conditions of Sale. They outline payment terms, delivery expectations, quality warranties, and dispute resolution for all physical and digital transactions processed through Atlas DT.</p>"},
    {"slug": "cookie-policy", "title": "Cookie Policy", "desc": "How tracking tokens keep your session secure.", "content": "<p>We use essential cookies to maintain your authenticated login session and secure your data. We also use minimal performance cookies to understand how our application is being used so we can improve the Manufacturing Engine. You have full control over non-essential cookie tracking via your browser settings.</p>"},
    {"slug": "nda", "title": "Non-Disclosure Agreement (NDA)", "desc": "Automatic IP protection and confidentiality.", "content": "<p>As part of our commitment to your innovation, this NDA goes into effect the moment you create an account and tick the agreement box. It legally binds Paniani Products Pty Ltd to treat all uploaded CAD files, BOMs, specifications, and project communications as highly confidential Trade Secrets. We mandate matching NDA terms with every factory in our network before they are granted access to view your files for quoting or manufacturing purposes.</p>"}
]

html_files = glob.glob('*.html')
if 'faq.html' in html_files:
    with open('faq.html', 'r', encoding='utf-8') as f:
        template = f.read()

    for page in legal_pages:
        html = template
        
        # Change Title
        html = re.sub(r'<title>.*?</title>', f'<title>Atlas DT - {page["title"]}</title>', html)
        
        # Change Header
        html = re.sub(
            r'<h1[^>]*>.*?</h1>',
            f'<h1 style="font-size: 60px; font-weight: 800; color: white; letter-spacing: -2px; margin-bottom: 20px;">{page["title"]}</h1>',
            html
        )
        html = re.sub(
            r'<p style="font-size: 18px; color: var\(--color-steel-400\);.*?">.*?</p>',
            f'<p style="font-size: 18px; color: var(--color-steel-400);">{page["desc"]}</p>',
            html
        )
        
        # Change Content Container
        # The faq container is `<div class="faq-container" id="faq-cms-container"> ... </div>`
        content_html = f'<div class="legal-container" style="max-width: 800px; margin: 0 auto; padding: 40px 5% 100px 5%;"><div style="background: rgba(255,255,255,0.03); border-radius: 12px; border: 1px solid rgba(255,255,255,0.05); padding: 40px; color: var(--color-steel-300); line-height: 1.8; font-size: 16px;">{page["content"]}</div></div>'
        html = re.sub(r'<div class="faq-container" id="faq-cms-container">.*?</div>\s*<script>\s*function toggleFaq.*?<\/script>', content_html, html, flags=re.DOTALL)
        
        # Write
        with open(f'{page["slug"]}.html', 'w', encoding='utf-8') as out:
            out.write(html)
            print(f'Created {page["slug"]}.html')

# 2. Patch Footers & Signup Modal in ALL HTML files
legal_links = """<div>
            <h4 style="color: var(--color-white); margin-bottom: 20px; font-weight: 600;">Legal</h4>
            <ul style="list-style: none; padding: 0; display: flex; flex-direction: column; gap: 12px;">
              <li><a href="data-protection.html" style="color: var(--color-steel-400); text-decoration: none; font-size: 14px;">Data Protection</a></li>
              <li><a href="email-security.html" style="color: var(--color-steel-400); text-decoration: none; font-size: 14px;">Email Security</a></li>
              <li><a href="privacy-policy.html" style="color: var(--color-steel-400); text-decoration: none; font-size: 14px;">Privacy Policy</a></li>
              <li><a href="website-terms.html" style="color: var(--color-steel-400); text-decoration: none; font-size: 14px;">Website Terms</a></li>
              <li><a href="conditions-of-sale.html" style="color: var(--color-steel-400); text-decoration: none; font-size: 14px;">Conditions of Sale</a></li>
              <li><a href="cookie-policy.html" style="color: var(--color-steel-400); text-decoration: none; font-size: 14px;">Cookie Policy</a></li>
              <li><a href="nda.html" style="color: var(--color-steel-400); text-decoration: none; font-size: 14px;">NDA</a></li>
            </ul>
          </div>
        </div>"""

checkbox_html = """<p style="font-size: 11px; color: rgba(255,255,255,0.4); margin-top: 6px; margin-bottom: 0;">Min 8 chars: 1 uppercase, 1 lowercase, 1 number, 1 symbol.</p>
            </div>
            <div class="auth-input-group" style="display: flex; gap: 10px; align-items: start; margin-top: 10px; margin-bottom: 15px;">
              <input type="checkbox" id="signup-terms" required style="margin-top: 4px;">
              <label for="signup-terms" style="font-size: 12px; color: var(--color-steel-300); line-height: 1.4; padding-left: 0;">
                I agree to the <a href="website-terms.html" style="color: var(--color-electric); text-decoration: underline;">Terms & Conditions</a>, <a href="privacy-policy.html" style="color: var(--color-electric); text-decoration: underline;">Privacy Policy</a>, and understand my data is protected under the <a href="nda.html" style="color: var(--color-electric); text-decoration: underline;">NDA & Data Protection Policy</a>.
              </label>
            </div>"""

for filepath in glob.glob('*.html'):
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()

    original_content = content
    
    # Replace footer columns (change 'display: flex' to 'display: grid', update columns, add Legal)
    target_flex = r'<div style="display: flex; gap: 40px;">([\s\S]*?)<div>\s*<h4[^>]*>Company</h4>\s*<ul[^>]*>([\s\S]*?)</ul>\s*</div>\s*</div>'
    
    # We want to keep Platform and Company, but replace the wrapper to be a grid and append Legal.
    # Note: Company has "Privacy Policy" linked, we should remove it from Company list.
    def footer_repl(match):
        platform_part = match.group(1)
        company_items = match.group(2)
        # Remove privacy policy from Company
        company_items = re.sub(r'<li>\s*<a href="[^"]*"[^>]*>Privacy Policy</a>\s*</li>', '', company_items)
        
        replacement = f"""<div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 40px;">
{platform_part}<div>
            <h4 style="color: var(--color-white); margin-bottom: 20px; font-weight: 600;">Company</h4>
            <ul style="list-style: none; padding: 0; display: flex; flex-direction: column; gap: 12px;">{company_items}</ul>
          </div>
          {legal_links}"""
        return replacement

    content = re.sub(target_flex, footer_repl, content)
    
    # Also fix footer columns definition in outer grid: `<div style="display: grid; grid-template-columns: 1fr 1fr 1.5fr; gap: 60px; max-width: 1400px; margin: 0 auto; text-align: left;">`
    # We might need `grid-template-columns: 1.5fr 1fr 1fr;` to give more space for the 3 sub-columns.
    outer_grid = r'(<footer id="footer"[^>]*>\s*<div\s*style="display: grid; grid-template-columns:) 1fr 1fr 1.5fr(;)'
    content = re.sub(outer_grid, r'\1 1.5fr 1fr 1fr\2', content)
    outer_grid_2 = r'(<footer id="footer"[^>]*>\s*<div\s*style="display: grid; grid-template-columns:) 1.5fr 1fr 1fr(;)' # just in case
    
    # Add Checkbox to signup form
    target_pwd_info = r'<p style="font-size: 11px; color: rgba\(255,255,255,0\.4\); margin-top: 6px; margin-bottom: 0;">Min 8 chars: 1 uppercase, 1 lowercase, 1 number, 1 symbol.</p>\s*</div>'
    
    # To avoid double-adding if script is run multiple times
    if 'id="signup-terms"' not in content:
        content = re.sub(target_pwd_info, checkbox_html, content)

    if content != original_content:
        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(content)
        print(f"Updated {filepath}")
    else:
        print(f"Skipped {filepath} (no match or already updated)")

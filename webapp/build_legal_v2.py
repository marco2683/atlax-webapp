import os
import re

files_to_process = [
    "data-protection.html",
    "email-security.html",
    "privacy-policy.html",
    "website-terms.html",
    "conditions-of-sale.html",
    "cookie-policy.html",
    "nda.html"
]

placeholders = {
    "{{LEGAL_ENTITY_NAME}}": "Paniani Products Pty Ltd",
    "{{ABN}}": "[Pending]",
    "{{ADDRESS}}": "Corner Carrington Rd & Thurston St, Suite 10/1 Main St, Box Hill VIC 3128",
    "{{LEGAL_EMAIL}}": "info@atlasdt.com",
    "{{PRIVACY_EMAIL}}": "info@atlasdt.com",
    "{{SECURITY_EMAIL}}": "info@atlasdt.com",
    "{{SUPPORT_EMAIL}}": "info@atlasdt.com",
    "{{WEBSITE_URL}}": "www.atlasdt.com",
    "{{GOVERNING_LAW_STATE}}": "Victoria",
    "{{EFFECTIVE_DATE}}": "20 April 2026",
    "{{COOKIE_PREFERENCES_LINK}}": "<a href=\"#\">Cookie Preferences</a>"
}

# Load the base template (faq.html) to get the global nav & footer
with open('faq.html', 'r', encoding='utf-8') as f:
    faq_html = f.read()

# Extract from <body> start up to the header
nav_head = re.search(r'(<!DOCTYPE html>.*?</nav>)', faq_html, re.DOTALL).group(1)
# Extract starting from <footer... to </html>
footer_tail = re.search(r'(<footer id="footer".*?</html>)', faq_html, re.DOTALL).group(1)

css = """
  <style>
    .legal-framework-container { max-width: 1400px; margin: 0 auto; padding: 120px 5% 100px 5%; display: grid; grid-template-columns: 280px 1fr; gap: 40px; align-items: start; }
    @media (max-width: 900px) { .legal-framework-container { grid-template-columns: 1fr; } }
    .legal-sidebar { position: sticky; top: 100px; background: rgba(255,255,255,0.02); border: 1px solid rgba(255,255,255,0.05); border-radius: 16px; padding: 24px; box-shadow: 0 4px 20px rgba(0,0,0,0.5); }
    .legal-sidebar-menu { list-style: none; padding: 0; margin: 20px 0 0; }
    .legal-sidebar-menu li { margin-bottom: 8px; }
    .legal-sidebar-menu a { display: block; padding: 10px 14px; border-radius: 8px; color: var(--color-steel-300); text-decoration: none; font-size: 14px; transition: all 0.2s; }
    .legal-sidebar-menu a:hover, .legal-sidebar-menu a.active { background: rgba(91,124,255,0.1); color: var(--color-electric); }
    .legal-content { background: rgba(255,255,255,0.02); border: 1px solid rgba(255,255,255,0.05); border-radius: 16px; padding: 50px 60px; box-shadow: 0 4px 20px rgba(0,0,0,0.5); color: var(--color-steel-300); font-size: 15px; line-height: 1.8; }
    @media (max-width: 600px) { .legal-content { padding: 30px 20px; } }
    .legal-content h1 { font-family: 'Montserrat', sans-serif; font-size: 40px; color: #fff; margin-top: 0; margin-bottom: 12px; letter-spacing: -1px; }
    .legal-content .meta { color: var(--color-steel-500); font-size: 13px; margin-bottom: 40px; }
    .legal-content h2 { font-family: 'Montserrat', sans-serif; font-size: 24px; color: #fff; margin-top: 50px; margin-bottom: 20px; border-bottom: 1px solid rgba(255,255,255,0.1); padding-bottom: 10px; }
    .legal-content h3 { font-size: 18px; color: #fff; margin-top: 40px; margin-bottom: 15px; }
    .legal-content p, .legal-content li { margin-bottom: 16px; }
    .legal-content ul, .legal-content ol { padding-left: 24px; margin-bottom: 24px; }
    .legal-content table { width: 100%; border-collapse: collapse; margin: 30px 0; font-size: 14px; }
    .legal-content th, .legal-content td { padding: 14px; text-align: left; border-bottom: 1px solid rgba(255,255,255,0.1); }
    .legal-content th { color: #fff; background: rgba(255,255,255,0.05); }
    .legal-content .notice { background: rgba(91,124,255,0.08); border: 1px solid rgba(91,124,255,0.2); border-radius: 8px; padding: 16px; margin: 30px 0; color: #a9baf0; font-size: 14px; }
    .legal-content a { color: var(--color-electric); text-decoration: underline; text-underline-offset: 3px; }
  </style>
"""

# Modify title correctly per file later

for fname in files_to_process:
    tmp_path = os.path.join('.tmp', fname)
    if not os.path.exists(tmp_path):
        print(f"File not found: {tmp_path}")
        continue
        
    with open(tmp_path, 'r', encoding='utf-8') as f:
        chatgpt_html = f.read()
        
    # Replace placeholders
    for p, v in placeholders.items():
        chatgpt_html = chatgpt_html.replace(p, v)
        
    # Extract Title 
    title_match = re.search(r'<title>(.*?)</title>', chatgpt_html)
    page_title = title_match.group(1) if title_match else f"AtlasDT - {fname}"

    # Extract the main and sidebar content
    sidebar_match = re.search(r'<ul class="menu">(.*?)</ul>', chatgpt_html, re.DOTALL)
    sidebar_ul = sidebar_match.group(1) if sidebar_match else ""
    
    # Correcting classes in sidebar
    sidebar_ul = sidebar_ul.replace('class="menu"', 'class="legal-sidebar-menu"')
    
    main_match = re.search(r'<main class="doc">(.*?)</main>', chatgpt_html, re.DOTALL)
    main_content = main_match.group(1) if main_match else ""
    
    # Remove the footer inserted by ChatGPT
    main_content = re.sub(r'<div class="footer">.*?</div>', '', main_content, flags=re.DOTALL)
    
    # Re-build document
    # Set the title properly
    current_nav_head = re.sub(r'<title>.*?</title>', f'<title>{page_title}</title>', nav_head)
    
    # Need to inject the style to head
    current_nav_head = current_nav_head.replace('</head>', css + '\n</head>')
    
    grid = f'''
  <!-- OVERRIDE FOR LEGAL SUBPAGES -->
  <style> body {{ background: var(--color-void); }} </style>
  <div class="legal-framework-container">
    <aside class="legal-sidebar">
      <div style="font-size: 11px; letter-spacing: 2px; text-transform: uppercase; color: var(--color-steel-500); margin-bottom: 20px;">AtlasDT Legal</div>
      <h2 style="font-size: 20px; color: #fff; margin:0 0 10px 0; padding-bottom:15px; border-bottom:1px solid rgba(255,255,255,0.05); font-weight: 500;">Framework</h2>
      <ul class="legal-sidebar-menu">
        {sidebar_ul}
      </ul>
    </aside>
    <main class="legal-content">
      {main_content}
    </main>
  </div>
'''
    
    final_output = current_nav_head + grid + footer_tail
    
    with open(fname, 'w', encoding='utf-8') as f:
        f.write(final_output)

    print(f"Migrated and overwritten: {fname}")

print("All legal pages updated with congruency framework.")

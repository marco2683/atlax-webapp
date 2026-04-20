import os
import re

about_path = 'about.html'
with open(about_path, 'r', encoding='utf-8') as f:
    about_html = f.read()

# Extract Navbar
nav_match = re.search(r'<nav class="navbar" id="navbar".*?</nav>', about_html, re.DOTALL)
navbar = nav_match.group(0) if nav_match else ''

# Extract Footer (including auth modal)
footer_match = re.search(r'<footer id="footer" class="m-footer".*?</html>', about_html, re.DOTALL)
footer = footer_match.group(0) if footer_match else ''

# Clean up any trailing tags we don't want like <script type="module" src="/src/marketing.js"></script>
# Actually they are needed for auth-modal to work, so leave them.

faq_html = f"""<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <link rel="icon" type="image/svg+xml" href="/vite.svg" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Atlas DT - FAQ</title>
  <link rel="stylesheet" href="/src/css/advantage.css">
  <link rel="stylesheet" href="/src/css/auth.css">
  <link rel="stylesheet" href="/src/css/responsive.css">
  <link rel="stylesheet" href="/src/css/global-nav.css">
  <link rel="stylesheet" href="/src/css/contact-modal.css">
  <script type="module" src="/src/js/contact-modal.js"></script>
  <script defer src="/src/js/cms-loader.js"></script>
  <style>
    .faq-container {{ max-width: 800px; margin: 0 auto; padding: 100px 5%; }}
    .faq-section {{ margin-bottom: 40px; }}
    .faq-section h2 {{ color: white; margin-bottom: 20px; font-size: 24px; font-weight: 600; border-bottom: 1px solid rgba(255,255,255,0.1); padding-bottom: 10px; }}
    .faq-item {{ background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.05); border-radius: 12px; margin-bottom: 12px; overflow: hidden; }}
    .faq-question {{ padding: 20px; cursor: pointer; display: flex; justify-content: space-between; align-items: center; font-weight: 500; font-size: 16px; color: white; transition: background 0.2s; }}
    .faq-question:hover {{ background: rgba(255,255,255,0.05); }}
    .faq-answer {{ padding: 0 20px; max-height: 0; overflow: hidden; transition: max-height 0.3s ease-out, padding 0.3s ease-out; color: var(--color-steel-300); line-height: 1.6; }}
    .faq-item.active .faq-answer {{ padding: 0 20px 20px 20px; max-height: 1000px; }}
    .faq-icon {{ transition: transform 0.3s; }}
    .faq-item.active .faq-icon {{ transform: rotate(180deg); }}
  </style>
</head>
<body class="marketing-page" style="background: var(--color-void);">
  {navbar}
  
  <header style="padding: 150px 5% 50px 5%; max-width: 800px; margin: 0 auto; text-align: center;">
    <h1 style="font-size: 60px; font-weight: 800; color: white; letter-spacing: -2px; margin-bottom: 20px;">Frequently Asked Questions</h1>
    <p style="font-size: 18px; color: var(--color-steel-400);">Find answers to common questions about our platform and services.</p>
  </header>
  
  <div class="faq-container" id="faq-cms-container">
    <!-- Populated by CMS Loader -->
    <div style="text-align:center;color:var(--color-steel-500);padding:40px;">Loading FAQ...</div>
  </div>

  <script>
    function toggleFaq(el) {{
        el.parentElement.classList.toggle('active');
    }}
  </script>

  {footer}
"""

blog_html = f"""<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <link rel="icon" type="image/svg+xml" href="/vite.svg" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Atlas DT - Blog</title>
  <link rel="stylesheet" href="/src/css/advantage.css">
  <link rel="stylesheet" href="/src/css/auth.css">
  <link rel="stylesheet" href="/src/css/responsive.css">
  <link rel="stylesheet" href="/src/css/global-nav.css">
  <link rel="stylesheet" href="/src/css/contact-modal.css">
  <script type="module" src="/src/js/contact-modal.js"></script>
  <script defer src="/src/js/cms-loader.js"></script>
  <style>
    .blog-container {{ max-width: 1200px; margin: 0 auto; padding: 100px 5%; }}
    .blog-grid {{ display: grid; grid-template-columns: repeat(auto-fill, minmax(340px, 1fr)); gap: 40px; }}
    .blog-card {{ background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.05); border-radius: 16px; overflow: hidden; transition: transform 0.3s; cursor: pointer; display: flex; flex-direction: column; }}
    .blog-card:hover {{ transform: translateY(-8px); border-color: rgba(94, 234, 212, 0.4); box-shadow: 0 10px 30px rgba(0,0,0,0.5); }}
    .blog-image {{ height: 200px; background-size: cover; background-position: center; border-bottom: 1px solid rgba(255,255,255,0.1); }}
    .blog-content {{ padding: 24px; flex: 1; display: flex; flex-direction: column; }}
    .blog-date {{ color: var(--color-electric); font-size: 12px; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 12px; font-weight: 600; }}
    .blog-title {{ color: white; font-size: 20px; font-weight: 700; margin-bottom: 12px; line-height: 1.4; }}
    .blog-excerpt {{ color: var(--color-steel-400); font-size: 14px; line-height: 1.6; margin-bottom: 24px; overflow: hidden; display: -webkit-box; -webkit-line-clamp: 3; -webkit-box-orient: vertical; }}
    
    /* Blog Modal */
    .blog-modal {{ position: fixed; inset: 0; background: rgba(0,0,0,0.8); backdrop-filter: blur(8px); z-index: 1000; opacity: 0; pointer-events: none; transition: opacity 0.3s; display: flex; justify-content: center; align-items: flex-start; padding: 40px 20px; overflow-y: auto; }}
    .blog-modal.active {{ opacity: 1; pointer-events: auto; }}
    .blog-modal-content {{ background: #111; border: 1px solid rgba(255,255,255,0.1); border-radius: 20px; max-width: 800px; width: 100%; padding: 40px; position: relative; transform: translateY(20px); transition: transform 0.3s; margin-top:20px; margin-bottom: 40px; }}
    .blog-modal.active .blog-modal-content {{ transform: translateY(0); }}
    .blog-modal-close {{ position: absolute; top: 20px; right: 20px; background: none; border: none; color: white; font-size: 28px; cursor: pointer; opacity: 0.7; }}
    .blog-modal-close:hover {{ opacity: 1; }}
    .blog-modal-image {{ width: 100%; height: 400px; background-size: cover; background-position: center; border-radius: 12px; margin-bottom: 30px; }}
  </style>
</head>
<body class="marketing-page" style="background: var(--color-void);">
  {navbar}
  
  <header style="padding: 150px 5% 50px 5%; max-width: 800px; margin: 0 auto; text-align: center;">
    <h1 style="font-size: 60px; font-weight: 800; color: white; letter-spacing: -2px; margin-bottom: 20px;">Insights & Updates</h1>
    <p style="font-size: 18px; color: var(--color-steel-400);">The latest on manufacturing, engineering, and supply chain strategy.</p>
  </header>
  
  <div class="blog-container">
    <div class="blog-grid" id="blog-cms-container">
      <!-- Populated by CMS Loader -->
      <div style="text-align:center;color:var(--color-steel-500);grid-column:1/-1;">Loading Blog Posts...</div>
    </div>
  </div>

  <div class="blog-modal" id="blog-modal">
    <div class="blog-modal-content">
      <button class="blog-modal-close" onclick="document.getElementById('blog-modal').classList.remove('active')">&times;</button>
      <div class="blog-date" id="blog-modal-date" style="margin-bottom: 16px;"></div>
      <h2 class="blog-title" id="blog-modal-title" style="font-size: 32px; margin-bottom: 24px;"></h2>
      <div class="blog-modal-image" id="blog-modal-image"></div>
      <div id="blog-modal-body" style="color: var(--color-steel-300); line-height: 1.8; font-size: 16px; white-space: pre-wrap;"></div>
    </div>
  </div>

  <script>
    window.openBlogModal = function(post) {{
        document.getElementById('blog-modal-date').textContent = post.date || '';
        document.getElementById('blog-modal-title').textContent = post.title || '';
        if(post.image) {{
            document.getElementById('blog-modal-image').style.display = 'block';
            document.getElementById('blog-modal-image').style.backgroundImage = 'url(' + post.image + ')';
        }} else {{
            document.getElementById('blog-modal-image').style.display = 'none';
        }}
        document.getElementById('blog-modal-body').textContent = post.content || '';
        document.getElementById('blog-modal').classList.add('active');
    }};
  </script>

  {footer}
"""

with open('faq.html', 'w', encoding='utf-8') as f: f.write(faq_html)
with open('blog.html', 'w', encoding='utf-8') as f: f.write(blog_html)
print("Created faq.html and blog.html")

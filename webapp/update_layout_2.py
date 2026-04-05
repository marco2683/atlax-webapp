import sys

with open('app.html', 'r', encoding='utf-8') as f:
    html = f.read()

# 1. Update max-width and headings in sales-value-props
# We'll just replace the original static strings injected earlier.

html = html.replace(
    'max-width: 1400px;',
    'max-width: 1600px;'
)

html = html.replace(
    '<h3 style="color: #c4b5fd; font-size: 20px; margin-bottom: 12px;">Designer Identity</h3>',
    '<h3 style="color: #c4b5fd; font-size: 20px; margin-bottom: 12px;">Designers Engine</h3>'
)

html = html.replace(
    '<h3 style="color: #fdba74; font-size: 20px; margin-bottom: 12px;">Entrepreneur Hub</h3>',
    '<h3 style="color: #fdba74; font-size: 20px; margin-bottom: 12px;">Entrepreneurs Engine</h3>'
)

html = html.replace(
    '<h3 style="color: #5eead4; font-size: 18px; margin-bottom: 20px; text-transform: uppercase; letter-spacing: 1px;">Professional (Engineers, Procurement Managers)</h3>',
    '<h3 style="color: #5eead4; font-size: 18px; margin-bottom: 20px; text-transform: uppercase; letter-spacing: 1px;">Professional Engine (Engineers, Procurement, Managers)</h3>'
)

# 2. Update Pricing Section for 5 tiers in one line
html = html.replace(
    'grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));',
    'grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); max-width: 1400px; margin: 0 auto;' # Add wider wrapper limits directly on grid or via generic style
)

# Currently pricing grid looks like:
# <div class="pricing-grid" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 24px; align-items: stretch;">

# We need to prepend the Free Tier.
free_tier_html = """
              <!-- Tier 0: Free -->
              <div class="pricing-card" style="border-top: 4px solid #94a3b8; display: flex; flex-direction: column; background: #0E1117; border-radius: 12px; padding: 24px;">
                <div class="pricing-card-header" style="margin-bottom: 24px;">
                  <h3 style="font-size: 20px; color: #fff; margin-bottom: 8px;">Free</h3>
                  <div class="price" style="font-size: 36px; font-weight: bold; color: #fff; margin-bottom: 8px;">$0<span style="font-size: 16px; color: rgba(255,255,255,0.5); font-weight: normal;">/mo</span></div>
                  <p style="font-size: 14px; color: rgba(255,255,255,0.7);">Get started with quotation insights and marketplace viewing.</p>
                </div>
                <ul class="pricing-features" style="list-style: none; padding: 0; margin-bottom: 32px; flex: 1; display: flex; flex-direction: column; gap: 12px;">
                  <li style="display: flex; gap: 8px; font-size: 14px; color: #eee;"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#22c55e" stroke-width="2" style="flex-shrink:0;"><polyline points="20 6 9 17 4 12"></polyline></svg> Instant RFQ access</li>
                  <li style="display: flex; gap: 8px; font-size: 14px; color: #eee;"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#22c55e" stroke-width="2" style="flex-shrink:0;"><polyline points="20 6 9 17 4 12"></polyline></svg> View Designer Hub</li>
                  <li style="display: flex; gap: 8px; font-size: 14px; color: #eee;"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#22c55e" stroke-width="2" style="flex-shrink:0;"><polyline points="20 6 9 17 4 12"></polyline></svg> View Entrepreneur Hub</li>
                </ul>
                <button class="pricing-btn" style="width: 100%; padding: 12px; background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.2); color: #ccc; border-radius: 8px; cursor: pointer; transition: 0.2s;" onmouseover="this.style.background='rgba(255,255,255,0.1)'" onmouseout="this.style.background='rgba(255,255,255,0.05)'" onclick="window.location.href='/profile.html'">Get Started Free</button>
              </div>

"""

if '<!-- Tier 0: Free -->' not in html:
    html = html.replace(
        '<!-- Tier 1: Designer -->',
        free_tier_html + '              <!-- Tier 1: Designer -->'
    )

# Also update professional tier to have consulting and managed staff.
# Find the line:
# <li style="display: flex; gap: 8px; font-size: 14px; color: #eee;"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#22c55e" stroke-width="2" style="flex-shrink:0;"><polyline points="20 6 9 17 4 12"></polyline></svg> Direct Factory Messaging</li>
new_pro_features = """<li style="display: flex; gap: 8px; font-size: 14px; color: #eee;"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#22c55e" stroke-width="2" style="flex-shrink:0;"><polyline points="20 6 9 17 4 12"></polyline></svg> Direct Factory Messaging</li>
                  <li style="display: flex; gap: 8px; font-size: 14px; color: #eee;"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#22c55e" stroke-width="2" style="flex-shrink:0;"><polyline points="20 6 9 17 4 12"></polyline></svg> 5h/mo Expert Consulting</li>
                  <li style="display: flex; gap: 8px; font-size: 14px; color: #eee;"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#22c55e" stroke-width="2" style="flex-shrink:0;"><polyline points="20 6 9 17 4 12"></polyline></svg> Managed on-ground staff limits</li>"""

if '5h/mo Expert Consulting' not in html:
    html = html.replace(
        '<li style="display: flex; gap: 8px; font-size: 14px; color: #eee;"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#22c55e" stroke-width="2" style="flex-shrink:0;"><polyline points="20 6 9 17 4 12"></polyline></svg> Direct Factory Messaging</li>',
        new_pro_features
    )

# Maximize grid container sizes for 5 tiers
# We added max-width: 1400px above in grid replacement.
html = html.replace('<section class="sales-pricing" style="max-width: 1200px; margin: 0 auto; margin-bottom: 80px;">', '<section class="sales-pricing" style="max-width: 1600px; margin: 0 auto; margin-bottom: 80px;">')


with open('app.html', 'w', encoding='utf-8') as f:
    f.write(html)

print("Done tweaking layout!")

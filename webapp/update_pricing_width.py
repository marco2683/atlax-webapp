import sys

with open('app.html', 'r', encoding='utf-8') as f:
    html = f.read()

# Replace the max-width: 1600px of the wrapper with max-width: 95%

html = html.replace(
    '<section class="sales-pricing" style="max-width: 1600px; margin: 0 auto; margin-bottom: 80px;">',
    '<section class="sales-pricing" style="max-width: 95%; margin: 0 auto; margin-bottom: 80px;">'
)

html = html.replace(
    '<div class="pricing-grid" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 24px; align-items: stretch;">',
    '<div class="pricing-grid" style="display: grid; grid-template-columns: repeat(5, 1fr); gap: 20px; align-items: stretch;">'
)

# Wait, if I do repeat(5, 1fr), it forces exactly 5 columns, preventing wrap on slightly smaller screens.
# Since it's a funnel page, maybe repeat(auto-fit, minmax(280px, 1fr)) is better so they stack on mobile.
# But "Make them all fit in one line" was the previous requirement. If he wants them to not wrap and be super wide, max-width: 95% helps.
# I'll use repeat(auto-fit, minmax(240px, 1fr)).

html = html.replace(
    '<div class="pricing-grid" style="display: grid; grid-template-columns: repeat(5, 1fr); gap: 20px; align-items: stretch;">',
    '<div class="pricing-grid" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); gap: 20px; align-items: stretch;">'
)

# Let me ensure I haven't messed up the replacement.
html = html.replace(
    '<div class="pricing-grid" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 24px; align-items: stretch;">',
    '<div class="pricing-grid" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); gap: 20px; align-items: stretch;">'
)

with open('app.html', 'w', encoding='utf-8') as f:
    f.write(html)

print("done")

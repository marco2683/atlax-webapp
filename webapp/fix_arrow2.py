import re

with open('index.html', 'r', encoding='utf-8') as f:
    content = f.read()

# Update the section style
old_section = '<section id="who-we-are" class="prd-who-section" style="min-height: 100vh; display: flex; flex-direction: column; justify-content: center; padding-top: 80px;">'
new_section = '<section id="who-we-are" class="prd-who-section" style="min-height: 100vh; display: flex; flex-direction: column; justify-content: center; padding-top: 80px; position: relative; padding-bottom: 80px;">'
content = content.replace(old_section, new_section)

# Update the arrow styling
old_arrow = 'style="display: flex; flex-direction: column; align-items: center; cursor: pointer; padding: 0px 0 0px; margin-top: 40px; transition: opacity 0.3s; opacity: 0.5; position: sticky; bottom: 6vh; z-index: 10; width: 100%;"'
new_arrow = 'style="display: flex; flex-direction: column; align-items: center; cursor: pointer; padding: 0px; margin-top: 0; transition: opacity 0.3s; opacity: 0.5; position: absolute; bottom: 30px; left: 50%; transform: translateX(-50%); z-index: 10; width: auto;"'
content = content.replace(old_arrow, new_arrow)

with open('index.html', 'w', encoding='utf-8') as f:
    f.write(content)
print("SUCCESS")

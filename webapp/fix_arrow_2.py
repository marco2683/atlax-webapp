import re

with open('index.html', 'r', encoding='utf-8') as f:
    content = f.read()

# Reduce height of images in the 3 cards from 320px to 260px
content = content.replace('height: 320px;', 'height: 260px;')

# Reduce bottom spacing of the section
content = content.replace('<section id="design-engineering" class="prd-who-section" style="min-height: 100vh; display: flex; flex-direction: column; justify-content: flex-start; position: relative; padding-bottom: 80px;">',
                          '<section id="design-engineering" class="prd-who-section" style="min-height: 100vh; display: flex; flex-direction: column; justify-content: center; position: relative; padding-bottom: 60px; padding-top: 40px;">')

# Update arrow position from bottom: 4vh to bottom: 20px
old_arrow_style = '''style="position: absolute; bottom: 4vh; left: 50%; transform: translateX(-50%); display: flex; flex-direction: column; align-items: center; cursor: pointer; z-index: 10; transition: opacity 0.3s; opacity: 0.5;"'''
new_arrow_style = '''style="position: absolute; bottom: 15px; left: 50%; transform: translateX(-50%); display: flex; flex-direction: column; align-items: center; cursor: pointer; z-index: 10; transition: opacity 0.3s; opacity: 0.5;"'''
content = content.replace(old_arrow_style, new_arrow_style)

# Also let's change justify-content to center to ensure it behaves like who-we-are
# It was justify-content: flex-start. I changed it to center in the section string replacement above.

with open('index.html', 'w', encoding='utf-8') as f:
    f.write(content)
print("SUCCESS")

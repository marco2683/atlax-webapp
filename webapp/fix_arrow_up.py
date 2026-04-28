import re

with open('index.html', 'r', encoding='utf-8') as f:
    content = f.read()

# For who-we-are arrow: change bottom: 30px to bottom: 100px
old_arrow_1 = 'position: absolute; bottom: 30px; left: 50%; transform: translateX(-50%);'
new_arrow_1 = 'position: absolute; bottom: 100px; left: 50%; transform: translateX(-50%);'
content = content.replace(old_arrow_1, new_arrow_1)

# For design-engineering arrow: change bottom: 15px to bottom: 80px
old_arrow_2 = 'position: absolute; bottom: 15px; left: 50%; transform: translateX(-50%);'
new_arrow_2 = 'position: absolute; bottom: 80px; left: 50%; transform: translateX(-50%);'
content = content.replace(old_arrow_2, new_arrow_2)

with open('index.html', 'w', encoding='utf-8') as f:
    f.write(content)
print("SUCCESS")

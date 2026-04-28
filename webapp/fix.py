import re

with open('index.html', 'r', encoding='utf-8') as f:
    text = f.read()

text_match = re.search(r'(<p class="prd-who-eyebrow".*?<!-- RIGHT: Photo stacked above Spider Chart -->)', text, flags=re.DOTALL)
text_block = text_match.group(1).replace('<!-- RIGHT: Photo stacked above Spider Chart -->', '').strip()
text_block = text_block[:text_block.rfind('</div>')].strip()

photo_match = re.search(r'(<!-- Team Photo -->.*?</div>\s*</div>\s*</div>)', text, flags=re.DOTALL)
photo_block = photo_match.group(1)
photo_block = photo_block[:photo_block.rfind('</div>')].strip()
photo_block = photo_block[:photo_block.rfind('</div>')].strip()

pillars_match = re.search(r'(<div class="prd-pillars".*?</div>\s*</div>\s*</div>\s*<div class="prd-who-right">)', text, flags=re.DOTALL)
pillars_block = pillars_match.group(1).replace('<div class="prd-who-right">', '').strip()
pillars_block = pillars_block[:pillars_block.rfind('</div>')].strip()

quote_match = re.search(r'(<!-- Typographic Message -->.*?</div>\s*</div>\s*</div>\s*</div>)', text, flags=re.DOTALL)
quote_block = quote_match.group(1)
quote_block = quote_block[:quote_block.rfind('</div>')].strip()
quote_block = quote_block[:quote_block.rfind('</div>')].strip()

new_html = f'''    <div class="prd-who-inner" style="flex-shrink: 0; align-items: flex-start;">
      <!-- LEFT: Messaging + Pillars -->
      <div class="prd-who-left" style="display: flex; flex-direction: column; gap: 64px;">
        <div>
          {text_block}
        </div>
        {pillars_block}
      </div>

      <!-- RIGHT: Photo + Quote -->
      <div class="prd-who-right" style="display: flex; flex-direction: column; gap: 64px; align-items: center; justify-content: flex-start;">
        {photo_block}
        
        {quote_block}
      </div>
    </div>'''

start_str = '<div class="prd-who-inner" style="flex-shrink: 0;">'
end_str = '<!-- Scroll to Our Expertise Arrow -->'
s_idx = text.find(start_str)
e_idx = text.find(end_str)

if s_idx != -1 and e_idx != -1:
    with open('index.html', 'w', encoding='utf-8') as out:
        out.write(text[:s_idx] + new_html + '\n\n    ' + text[e_idx:])
    print('SUCCESS')
else:
    print('Failed to find boundaries')

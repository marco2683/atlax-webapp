import re

with open('index.html', 'r', encoding='utf-8') as f:
    content = f.read()

# We need to insert closing divs for prd-photo-frame and prd-who-photo
# right before the Typographic Message

old_block = '''            <div class="prd-photo-badge prd-photo-badge--2">
              <span class="prd-badge-num">12+</span>
              <span class="prd-badge-label">Years in PRD</span>
            </div>
        
        <!-- Typographic Message -->'''

new_block = '''            <div class="prd-photo-badge prd-photo-badge--2">
              <span class="prd-badge-num">12+</span>
              <span class="prd-badge-label">Years in PRD</span>
            </div>
          </div> <!-- Close prd-photo-frame -->
        </div> <!-- Close prd-who-photo -->
        
        <!-- Typographic Message -->'''

if old_block in content:
    content = content.replace(old_block, new_block)
    
    # We also need to fix the arrow styling to make sure it's at the absolute bottom
    # The user says "at the bottomof the page but make sure it is visible . When accessing (transitioning) to this page, you can scroll further down by about 30px and not have any issue. that'll help with fitting that element at the bottom"
    # To do this, we should change the arrow's position to absolute and place it at bottom: 30px, or just use absolute positioning relative to the section.
    # The section is position: relative (if not we should make it so). Actually it might be better to just leave the flex flow.
    # Let's check the section first.
    
    with open('index.html', 'w', encoding='utf-8') as f:
        f.write(content)
    print("SUCCESS")
else:
    print("OLD BLOCK NOT FOUND")

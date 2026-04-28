import re

with open('app.html', 'r', encoding='utf-8') as f:
    content = f.read()

# First replace the bad extra divs at the end that were added
content = content.replace('''                </div>
                  </div>
                </div>
              </div>

              <!-- Main Drop Zone -->''', '''                </div>
              </div>

              <!-- Main Drop Zone -->''')

# Now let's find the rfq-project-info and wrap the shipping
# The project info starts with <div class="rfq-project-info"
# We want to replace the whole block

old_block = '''              <div class="rfq-project-info" style="margin-bottom: 24px; display: grid; grid-template-columns: 1fr 1fr; gap: 24px; align-items: flex-start;">
                <div class="rfq-field">
                  <label style="display:block; font-size:12px; font-weight:700; color:#64748b; text-transform:uppercase; letter-spacing:0.5px; margin-bottom:8px;">Project Name</label>
                  <input type="text" class="rfq-part-name-input" id="instant-rfq-project-name" placeholder="e.g. Drone Chassis Prototype V2" style="width:100%; padding:12px 16px; border-radius:10px; font-size:15px; font-weight:600; outline:none; box-shadow:inset 0 2px 4px rgba(0,0,0,0.02); transition:all 0.2s;">
                </div>
                
                <div class="rfq-field">
                  <label style="display:flex; align-items:center; gap:8px; font-size:13px; font-weight:600; color:var(--color-steel-200); cursor:pointer;">
                    <input type="checkbox" id="calc-shipping-cb" style="width:16px; height:16px; cursor:pointer;">
                    Include Shipping Calculation
                  </label>
                </div>
                
                <div id="shipping-details-section" class="hidden" style="padding:16px; background:var(--color-bg); border-radius:10px; border:1px solid rgba(255,255,255,0.1); margin-top:8px; display: flex; justify-content: space-between; align-items: center;">
                  <div>
                    <h4 style="margin:0 0 4px 0; font-size:12px; color:var(--color-steel-400); text-transform: uppercase; letter-spacing: 0.5px;">Shipping Destination</h4>
                    <div id="shipping-summary-text" style="font-size: 14px; color: var(--color-white); font-weight: 500; line-height: 1.4;">
                      No address provided.
                    </div>
                  </div>
                  <button id="edit-shipping-btn" style="padding: 6px 12px; background: transparent; border: 1px solid var(--color-electric); color: var(--color-electric); border-radius: 6px; cursor: pointer; font-size: 12px; font-weight: 600;">Add Address</button>
                </div>
              </div>'''

new_block = '''              <div class="rfq-project-info" style="margin-bottom: 24px; display: grid; grid-template-columns: 1fr 1fr; gap: 24px; align-items: flex-start;">
                <!-- Left Column -->
                <div class="rfq-field" style="margin-bottom: 0;">
                  <label style="display:block; font-size:12px; font-weight:700; color:#64748b; text-transform:uppercase; letter-spacing:0.5px; margin-bottom:8px;">Project Name</label>
                  <input type="text" class="rfq-part-name-input" id="instant-rfq-project-name" placeholder="e.g. Drone Chassis Prototype V2" style="width:100%; padding:12px 16px; border-radius:10px; font-size:15px; font-weight:600; outline:none; box-shadow:inset 0 2px 4px rgba(0,0,0,0.02); transition:all 0.2s;">
                </div>
                
                <!-- Right Column -->
                <div style="display: flex; flex-direction: column; gap: 12px;">
                  <div class="rfq-field" style="margin-bottom: 0;">
                    <label style="display:flex; align-items:center; gap:8px; font-size:13px; font-weight:600; color:var(--color-steel-200); cursor:pointer;">
                      <input type="checkbox" id="calc-shipping-cb" style="width:16px; height:16px; cursor:pointer;">
                      Include Shipping Calculation
                    </label>
                  </div>
                  
                  <div id="shipping-details-section" class="hidden" style="padding:12px 16px; background:var(--color-bg); border-radius:10px; border:1px solid rgba(255,255,255,0.1); display: flex; justify-content: space-between; align-items: center;">
                    <div>
                      <h4 style="margin:0 0 4px 0; font-size:11px; color:var(--color-steel-400); text-transform: uppercase; letter-spacing: 0.5px;">Shipping Destination</h4>
                      <div id="shipping-summary-text" style="font-size: 13px; color: var(--color-white); font-weight: 500; line-height: 1.4;">
                        No address provided.
                      </div>
                    </div>
                    <button id="edit-shipping-btn" style="padding: 6px 12px; background: transparent; border: 1px solid var(--color-electric); color: var(--color-electric); border-radius: 6px; cursor: pointer; font-size: 11px; font-weight: 600; flex-shrink: 0;">Add Address</button>
                  </div>
                </div>
              </div>'''

if old_block in content:
    content = content.replace(old_block, new_block)
    with open('app.html', 'w', encoding='utf-8') as f:
        f.write(content)
    print("SUCCESS")
else:
    print("OLD BLOCK NOT FOUND")

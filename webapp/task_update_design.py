import re

with open('index.html', 'r', encoding='utf-8') as f:
    text = f.read()

card1_new = """          <!-- CARD 1 -->
          <div style="background: transparent; border: none; box-shadow: none; display: flex; flex-direction: column; align-items: center; text-align: center; padding: 20px;">
            <div style="position: relative; width: 100%; height: 320px; border-radius: 16px; overflow: hidden; margin-bottom: 24px; box-shadow: 0 15px 40px rgba(0,0,0,0.1); background: #f8fafc;">
              <img src="/assets/images/phases/concept.png" style="width: 100%; height: 100%; object-fit: cover; transition: transform 0.4s ease;" onmouseover="this.style.transform='scale(1.05)'" onmouseout="this.style.transform='scale(1)'">
              <div style="position: absolute; inset: 0; background: linear-gradient(180deg, transparent 40%, rgba(15, 23, 42, 0.85) 100%); pointer-events: none;"></div>
              <div style="position: absolute; bottom: 20px; left: 0; width: 100%; text-align: center; pointer-events: none;">
                <h3 style="font-family: 'Outfit', sans-serif; font-size: 1.6rem; color: #ffffff; margin: 0; font-weight: 700; letter-spacing: 0.5px;">Industrial Design</h3>
              </div>
            </div>
            <ul style="list-style: none; padding: 0; margin: 0 0 24px 0; display: flex; flex-direction: column; gap: 8px; font-size: 0.95rem; color: #475569;">
              <li>User Journey Mapping (UJM)</li>
              <li>Renders and Animation</li>
              <li>Graphic Design</li>
            </ul>
            <button onclick="document.querySelector('.nav-contact-trigger')?.click();" style="padding: 12px 32px; background: #0e7a6c; color: #fff; border: none; border-radius: 99px; font-weight: 600; font-size: 0.9rem; cursor: pointer; transition: all 0.3s; box-shadow: 0 4px 12px rgba(14, 122, 108, 0.3);" onmouseover="this.style.transform='translateY(-2px)';" onmouseout="this.style.transform='none';">Talk to Us</button>
          </div>"""

card2_new = """          <!-- CARD 2 -->
          <div style="background: transparent; border: none; box-shadow: none; display: flex; flex-direction: column; align-items: center; text-align: center; padding: 20px;">
            <div style="position: relative; width: 100%; height: 320px; border-radius: 16px; overflow: hidden; margin-bottom: 24px; box-shadow: 0 15px 40px rgba(0,0,0,0.1); background: #f8fafc;">
              <img src="/assets/images/phases/prototype.png" style="width: 100%; height: 100%; object-fit: cover; transition: transform 0.4s ease;" onmouseover="this.style.transform='scale(1.05)'" onmouseout="this.style.transform='scale(1)'">
              <div style="position: absolute; inset: 0; background: linear-gradient(180deg, transparent 40%, rgba(15, 23, 42, 0.85) 100%); pointer-events: none;"></div>
              <div style="position: absolute; bottom: 20px; left: 0; width: 100%; text-align: center; pointer-events: none;">
                <h3 style="font-family: 'Outfit', sans-serif; font-size: 1.6rem; color: #ffffff; margin: 0; font-weight: 700; letter-spacing: 0.5px;">Mechanical Design</h3>
              </div>
            </div>
            <ul style="list-style: none; padding: 0; margin: 0 0 24px 0; display: flex; flex-direction: column; gap: 8px; font-size: 0.95rem; color: #475569;">
              <li>DFM embedded from sketch</li>
              <li>Prototyping &amp; CAD</li>
              <li>Engineering Feasibility</li>
            </ul>
            <button onclick="window.location.href='/app.html#project-quote'" style="padding: 12px 32px; background: #0e7a6c; color: #fff; border: none; border-radius: 99px; font-weight: 600; font-size: 0.9rem; cursor: pointer; transition: all 0.3s; box-shadow: 0 4px 12px rgba(14, 122, 108, 0.3);" onmouseover="this.style.transform='translateY(-2px)';" onmouseout="this.style.transform='none';">Get a Prototype Quote</button>
          </div>"""

card3_new = """          <!-- CARD 3 -->
          <div style="background: transparent; border: none; box-shadow: none; display: flex; flex-direction: column; align-items: center; text-align: center; padding: 20px;">
            <div style="position: relative; width: 100%; height: 320px; border-radius: 16px; overflow: hidden; margin-bottom: 24px; box-shadow: 0 15px 40px rgba(0,0,0,0.1); background: #f8fafc;">
              <img src="/assets/images/expertise/factory-automation.png" style="width: 100%; height: 100%; object-fit: cover; transition: transform 0.4s ease;" onmouseover="this.style.transform='scale(1.05)'" onmouseout="this.style.transform='scale(1)'">
              <div style="position: absolute; inset: 0; background: linear-gradient(180deg, transparent 40%, rgba(15, 23, 42, 0.85) 100%); pointer-events: none;"></div>
              <div style="position: absolute; bottom: 20px; left: 0; width: 100%; text-align: center; pointer-events: none;">
                <h3 style="font-family: 'Outfit', sans-serif; font-size: 1.6rem; color: #ffffff; margin: 0; font-weight: 700; letter-spacing: 0.5px;">Factory Automation</h3>
              </div>
            </div>
            <ul style="list-style: none; padding: 0; margin: 0 0 24px 0; display: flex; flex-direction: column; gap: 8px; font-size: 0.95rem; color: #475569;">
              <li>PLC &amp; Robotics integration</li>
              <li>Custom assembly lines</li>
              <li>Automated quality inspection</li>
            </ul>
            <button onclick="window.location.href='/app.html#suppliers'" style="padding: 12px 32px; background: #0e7a6c; color: #fff; border: none; border-radius: 99px; font-weight: 600; font-size: 0.9rem; cursor: pointer; transition: all 0.3s; box-shadow: 0 4px 12px rgba(14, 122, 108, 0.3);" onmouseover="this.style.transform='translateY(-2px)';" onmouseout="this.style.transform='none';">Start Manufacturing</button>
          </div>"""

# Isolate the grid contents
start_idx = text.find('<!-- CARD 1 -->')
end_idx = text.find('</div></div>', start_idx)

# If end_idx is not found due to whitespace, let's find the closing div of the grid.
# We'll just find the "<!-- Scroll to Manufacturing Capabilities Arrow -->" and trace back to the end of the grid.
if start_idx != -1:
    arrow_idx = text.find('<!-- Scroll to Manufacturing Capabilities Arrow -->')
    grid_end_idx = text.rfind('</div>', 0, text.rfind('</div>', 0, arrow_idx))
    
    new_text = text[:start_idx] + card1_new + '\n\n' + card2_new + '\n\n' + card3_new + '\n\n        ' + text[grid_end_idx:]
    with open('index.html', 'w', encoding='utf-8') as f:
        f.write(new_text)
    print("Successfully replaced cards")
else:
    print("Could not find start_idx")

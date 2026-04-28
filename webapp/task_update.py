import re

with open('index.html', 'r', encoding='utf-8') as f:
    text = f.read()

# 1. Fix the #home-cards-section layout
text = text.replace(
    'padding: 40px 1.5% 50vh;',
    'padding: 10vh 1.5% 15vh; min-height: 100vh; display: flex; flex-direction: column; justify-content: center;'
)

# Move USP text and bottom arrow higher
text = text.replace('bottom: 28vh;', 'bottom: 22vh;')
text = text.replace('bottom: 13vh;', 'bottom: 6vh;')

# 2. Update USP animation: remove onmouseenter/onmouseleave from .pb-stage-card
text = re.sub(r' onmouseenter="showUSP\(\d+\)" onmouseleave="hideUSP\(\)"', '', text)

# Rewrite the USP Script
new_usp_script = """
      <style>
        @keyframes usp-cycle {
          0% { opacity: 0; transform: scale(0.9); filter: blur(4px); }
          10% { opacity: 1; transform: scale(1); filter: blur(0); }
          80% { opacity: 1; transform: scale(1.02); filter: blur(0); }
          100% { opacity: 0; transform: scale(1.05); filter: blur(4px); }
        }
      </style>
      <script>
        const usps = [
          "We’re here to help you turn that spark into something real. We've done it countless times. We’ll sit down with you, look at the big picture, and figure out the smartest, most practical path to bring your idea to life.",
          "We’ve got your back on the engineering side. Our team loves diving into designs to catch the tricky details early and remove the hardest challenges first, so when you’re ready to build, you can be completely confident.",
          "Navigating overseas manufacturing can be daunting, but we’re local to you and also on the ground in Asia. We’ll introduce you to factory partners we trust personally, so you get the quality you expect without the headaches.",
          "We know margins matter. Instead of just tweaking numbers, we’ll roll up our sleeves and look for creative engineering and sourcing solutions to thoughtfully lower your costs without cutting corners."
        ];

        let currentUsp = 0;
        const uspEl = document.getElementById('usp-text');

        function cycleUSP() {
          uspEl.textContent = usps[currentUsp];
          uspEl.style.animation = 'none';
          void uspEl.offsetWidth; // trigger reflow
          uspEl.style.animation = 'usp-cycle 7s cubic-bezier(0.16, 1, 0.3, 1) forwards';
          currentUsp = (currentUsp + 1) % usps.length;
        }

        // Start cycle
        setTimeout(() => {
          cycleUSP();
          setInterval(cycleUSP, 7000);
        }, 1000); // slight initial delay
      </script>
"""
# Replace the old script block. The old script starts with "const usps = [" and ends with "hideUSP() {...}"
# The easiest way is to find the bounds
script_start = text.find('const usps = [')
script_end = text.find('</script>', script_start)
if script_start != -1 and script_end != -1:
    script_block_start = text.rfind('<script>', 0, script_start)
    text = text[:script_block_start] + new_usp_script + text[script_end + len('</script>'):]


# 3. Design & Engineering cards styling
# We want them to NOT look like .pb-stage-card (which are dark cards).
# The user wants them "matching the section background with nice images (no background) and little text"
# The section has #f0fdf4 to #ffffff gradient.
# Let's replace the .pb-stage-card inside #design-engineering with a simpler card.

# We'll isolate the #design-engineering section to rewrite its cards
design_eng_start = text.find('<section id="design-engineering"')
expertise_start = text.find('<section id="expertise"')

if design_eng_start != -1 and expertise_start != -1:
    section_content = text[design_eng_start:expertise_start]
    
    # We will replace the .pb-stage-card elements with new custom cards.
    # The new card will be:
    # <div class="prd-de-card">
    #   <img src="/assets/images/phases/concept.png" style="width: 100%; max-height: 200px; object-fit: contain; mix-blend-mode: multiply; margin-bottom: 24px;">
    #   <h3>Industrial Design, UI/UX</h3>
    #   <ul>...</ul>
    #   <button>...</button>
    # </div>
    
    # But wait, concept.png might not have a transparent background? If it has a solid background, mix-blend-mode: multiply will make it transparent if it's on a white background. Or if the user meant "images with no background", perhaps they actually are transparent PNGs!
    
    new_cards = """
          <!-- CARD 1 -->
          <div style="background: transparent; border: none; box-shadow: none; display: flex; flex-direction: column; align-items: center; text-align: center; padding: 20px;">
            <img src="/assets/images/phases/concept.png" style="width: 100%; max-width: 240px; height: auto; object-fit: contain; margin-bottom: 24px; filter: drop-shadow(0 20px 30px rgba(0,0,0,0.1));">
            <h3 style="font-family: 'Outfit', sans-serif; font-size: 1.5rem; color: #0f172a; margin-bottom: 8px;">Industrial Design</h3>
            <ul style="list-style: none; padding: 0; margin: 0 0 24px 0; display: flex; flex-direction: column; gap: 8px; font-size: 0.95rem; color: #475569;">
              <li>User Journey Mapping (UJM)</li>
              <li>Renders and Animation</li>
              <li>Graphic Design</li>
            </ul>
            <button onclick="document.querySelector('.nav-contact-trigger')?.click();" style="padding: 12px 32px; background: #0e7a6c; color: #fff; border: none; border-radius: 99px; font-weight: 600; font-size: 0.9rem; cursor: pointer; transition: all 0.3s; box-shadow: 0 4px 12px rgba(14, 122, 108, 0.3);" onmouseover="this.style.transform='translateY(-2px)';" onmouseout="this.style.transform='none';">Talk to Us</button>
          </div>

          <!-- CARD 2 -->
          <div style="background: transparent; border: none; box-shadow: none; display: flex; flex-direction: column; align-items: center; text-align: center; padding: 20px;">
            <img src="/assets/images/phases/prototype.png" style="width: 100%; max-width: 240px; height: auto; object-fit: contain; margin-bottom: 24px; filter: drop-shadow(0 20px 30px rgba(0,0,0,0.1));">
            <h3 style="font-family: 'Outfit', sans-serif; font-size: 1.5rem; color: #0f172a; margin-bottom: 8px;">Mechanical Design</h3>
            <ul style="list-style: none; padding: 0; margin: 0 0 24px 0; display: flex; flex-direction: column; gap: 8px; font-size: 0.95rem; color: #475569;">
              <li>DFM embedded from sketch</li>
              <li>Prototyping &amp; CAD</li>
              <li>Engineering Feasibility</li>
            </ul>
            <button onclick="window.location.href='/app.html#project-quote'" style="padding: 12px 32px; background: #0e7a6c; color: #fff; border: none; border-radius: 99px; font-weight: 600; font-size: 0.9rem; cursor: pointer; transition: all 0.3s; box-shadow: 0 4px 12px rgba(14, 122, 108, 0.3);" onmouseover="this.style.transform='translateY(-2px)';" onmouseout="this.style.transform='none';">Get a Prototype Quote</button>
          </div>

          <!-- CARD 3 -->
          <div style="background: transparent; border: none; box-shadow: none; display: flex; flex-direction: column; align-items: center; text-align: center; padding: 20px;">
            <img src="/assets/images/expertise/factory-automation.png" style="width: 100%; max-width: 240px; height: auto; object-fit: contain; margin-bottom: 24px; filter: drop-shadow(0 20px 30px rgba(0,0,0,0.1));">
            <h3 style="font-family: 'Outfit', sans-serif; font-size: 1.5rem; color: #0f172a; margin-bottom: 8px;">Factory Automation</h3>
            <ul style="list-style: none; padding: 0; margin: 0 0 24px 0; display: flex; flex-direction: column; gap: 8px; font-size: 0.95rem; color: #475569;">
              <li>PLC &amp; Robotics integration</li>
              <li>Custom assembly lines</li>
              <li>Automated quality inspection</li>
            </ul>
            <button onclick="window.location.href='/app.html#suppliers'" style="padding: 12px 32px; background: #0e7a6c; color: #fff; border: none; border-radius: 99px; font-weight: 600; font-size: 0.9rem; cursor: pointer; transition: all 0.3s; box-shadow: 0 4px 12px rgba(14, 122, 108, 0.3);" onmouseover="this.style.transform='translateY(-2px)';" onmouseout="this.style.transform='none';">Start Manufacturing</button>
          </div>
"""
    
    # We replace from <!-- CARD 1 --> to the end of the grid </div>
    card1_idx = section_content.find('<!-- CARD 1 -->')
    grid_end_idx = section_content.rfind('</div>', 0, section_content.find('</div>', section_content.find('<!-- Scroll to Manufacturing Capabilities Arrow -->')) - 100)
    
    # better to just replace <div class="pb-stages-grid" ... > contents
    grid_start_idx = section_content.find('<div class="pb-stages-grid"')
    grid_content_start = section_content.find('>', grid_start_idx) + 1
    
    # The grid ends at the div before <!-- Scroll to Manufacturing
    scroll_arrow_idx = section_content.find('<!-- Scroll to Manufacturing')
    
    # Backtrack 2 </div>s from scroll_arrow
    grid_end_idx = section_content.rfind('</div>', 0, section_content.rfind('</div>', 0, scroll_arrow_idx))
    
    new_section = section_content[:grid_content_start] + '\\n' + new_cards + '\\n        </div>' + section_content[grid_end_idx:]
    
    text = text[:design_eng_start] + new_section + text[expertise_start:]


with open('index.html', 'w', encoding='utf-8') as f:
    f.write(text)

print("Updated tasks successfully!")

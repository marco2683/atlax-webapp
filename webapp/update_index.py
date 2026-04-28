import re

filepath = "index.html"
with open(filepath, "r", encoding="utf-8") as f:
    text = f.read()

# 1. Update the arrow at the bottom of #who-we-are to point to #design-engineering
text = text.replace(
    "onclick=\"document.getElementById('expertise').scrollIntoView({ behavior: 'smooth' })\"",
    "onclick=\"document.getElementById('design-engineering').scrollIntoView({ behavior: 'smooth' })\""
)
text = text.replace(
    ">Our\n        Expertise</span>",
    ">Design &amp; Engineering</span>"
)
text = text.replace(
    ">Our Expertise</span>",
    ">Design &amp; Engineering</span>"
)

# 2. Extract the Factory Automation card removal from #expertise
# The entire #expertise starts at <section id="expertise" class="prd-expertise-section">
# We want to replace the first part of #expertise up to the Manufacturing Capabilities grid.

# Start of expertise section
exp_start = text.find('<section id="expertise" class="prd-expertise-section">')
# The "Manufacturing Capabilities" title
mfg_title_start = text.find('<h3 class="prd-section-subtitle m-fade-up"', exp_start)
# The start of the manufacturing capabilities grid
mfg_grid_start = text.find('<div class="prd-expertise-grid m-fade-up" style="gap: 16px;">', mfg_title_start)

if exp_start != -1 and mfg_grid_start != -1:
    new_expertise_header = """<section id="expertise" class="prd-expertise-section">
    <div class="prd-expertise-inner">
      <div class="prd-expertise-header m-fade-up">
        <h2 class="prd-expertise-title">Manufacturing Capabilities.</h2>
        <p class="prd-expertise-desc">From first prototype to mass production — every technology you need, under one roof of relationships.</p>
      </div>

      """
    
    text = text[:exp_start] + new_expertise_header + text[mfg_grid_start:]
else:
    print("Could not find the expertise section bounds to rewrite.")

# 3. Add the Design & Engineering section BEFORE #expertise
design_eng_section = """
  <!-- DESIGN & ENGINEERING SECTION -->
  <section id="design-engineering" class="prd-who-section" style="min-height: 100vh; display: flex; flex-direction: column; justify-content: center; position: relative;">
    <div class="prd-who-inner" style="display: flex; flex-direction: column; align-items: center; width: 100%; max-width: 1400px; margin: 0 auto; gap: 40px; padding-top: 60px;">
      
      <div class="prd-expertise-header m-fade-up" style="margin-bottom: 0; text-align: center; width: 100%;">
        <h2 class="prd-who-title" style="margin-bottom: 16px;">Design &amp; Engineering.</h2>
        <p class="prd-who-body" style="max-width: 700px; margin: 0 auto;">From sketching the first concept to engineering the mechanics that make it work.</p>
      </div>

      <div class="pb-stages-container m-fade-up" style="width: 100%; padding: 0;">
        <div class="pb-stages-grid" style="grid-template-columns: repeat(3, 1fr); padding-bottom: 20px;">
          
          <!-- CARD 1 -->
          <div class="pb-stage-card" data-color="purple">
            <div class="pb-stage-bg" style="background-image: url('/assets/images/phases/concept.png');"></div>
            <div class="pb-stage-avatar-overlay"></div>
            <div class="pb-stage-content">
              <div class="pb-stage-title-row">
                <h3 class="pb-stage-title">Industrial Design, UI/UX</h3>
                <p class="pb-stage-prompt">...we can help you with:</p>
              </div>
              <div class="pb-stage-expand-panel">
                <ul class="pb-stage-list">
                  <li><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"></polyline></svg> User Journey Mapping (UJM)</li>
                  <li><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"></polyline></svg> Renders and Animation</li>
                  <li><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"></polyline></svg> Graphic Design</li>
                </ul>
                <button class="pb-stage-cta" onclick="document.querySelector('.nav-contact-trigger')?.click();">Talk to Us</button>
              </div>
            </div>
          </div>

          <!-- CARD 2 -->
          <div class="pb-stage-card" data-color="blue">
            <div class="pb-stage-bg" style="background-image: url('/assets/images/phases/prototype.png');"></div>
            <div class="pb-stage-avatar-overlay"></div>
            <div class="pb-stage-content">
              <div class="pb-stage-title-row">
                <h3 class="pb-stage-title">Mechanical Design</h3>
                <p class="pb-stage-prompt">...we can help you with:</p>
              </div>
              <div class="pb-stage-expand-panel">
                <ul class="pb-stage-list">
                  <li><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"></polyline></svg> DFM embedded from sketch</li>
                  <li><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"></polyline></svg> Prototyping &amp; CAD</li>
                  <li><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"></polyline></svg> Engineering Feasibility</li>
                </ul>
                <button class="pb-stage-cta" onclick="window.location.href='/app.html#project-quote'">Get a Prototype Quote</button>
              </div>
            </div>
          </div>

          <!-- CARD 3 -->
          <div class="pb-stage-card" data-color="teal">
            <div class="pb-stage-bg" style="background-image: url('/assets/images/expertise/factory-automation.png');"></div>
            <div class="pb-stage-avatar-overlay"></div>
            <div class="pb-stage-content">
              <div class="pb-stage-title-row">
                <h3 class="pb-stage-title">Factory Automation</h3>
                <p class="pb-stage-prompt">...we can help you with:</p>
              </div>
              <div class="pb-stage-expand-panel">
                <ul class="pb-stage-list">
                  <li><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"></polyline></svg> PLC &amp; Robotics integration</li>
                  <li><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"></polyline></svg> Custom assembly lines</li>
                  <li><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"></polyline></svg> Automated quality inspection</li>
                </ul>
                <button class="pb-stage-cta" onclick="window.location.href='/app.html#suppliers'">Start Manufacturing</button>
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
    
    <!-- Scroll to Manufacturing Capabilities Arrow -->
    <div
      style="position: absolute; bottom: 8vh; left: 50%; transform: translateX(-50%); display: flex; flex-direction: column; align-items: center; cursor: pointer; z-index: 10; transition: opacity 0.3s; opacity: 0.5;"
      onclick="document.getElementById('expertise').scrollIntoView({ behavior: 'smooth' })"
      onmouseover="this.style.opacity='0.9'" onmouseout="this.style.opacity='0.5'">
      <span
        style="color: #0e7a6c; font-family: 'Outfit', sans-serif; font-size: 11px; text-transform: uppercase; letter-spacing: 3px; margin-bottom: 8px; font-weight: 700;">Manufacturing</span>
      <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#0e7a6c"
        stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="animation: bounce-arrow 2s infinite;">
        <polyline points="6 9 12 15 18 9"></polyline>
      </svg>
    </div>
  </section>
"""

# Insert before <section id="expertise" class="prd-expertise-section">
# Re-find it since we modified text
exp_start = text.find('<section id="expertise" class="prd-expertise-section">')
text = text[:exp_start] + design_eng_section + "\n" + text[exp_start:]

with open(filepath, "w", encoding="utf-8") as f:
    f.write(text)

print("Updated sections successfully!")

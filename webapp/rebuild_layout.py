import sys

with open('app.html', 'r', encoding='utf-8') as f:
    html = f.read()

# 1. Remove the old value props and showcase
# We need to find the start of the showcase, and the end of the value props
# Because the layout is:
# Hero -> Showcase -> Deep Dive -> Value Props -> Pricing

# Actually, I'll just use the old reliable Python replace_between to swap out sections.
# But wait, it's easier to grab everything between Hero and Pricing and rewrite it.
start_marker = "          <!-- Showcase Section (Using User's Screenshots) -->"
end_marker = "          <!-- Pricing Section -->"

start_idx = html.find(start_marker)
end_idx = html.find(end_marker)

if start_idx == -1 or end_idx == -1:
    print("Error finding markers")
    sys.exit(1)

# Now what is the new structure?
# Hero is BEFORE start_marker.
# We want: Value Props -> Showcase -> Deep Dive.
# Let's write the exact HTML for these 3 pieces.

value_props_html = """
          <!-- 5-Grid Values Area -->
          <section class="sales-value-props" style="display: flex; flex-wrap: wrap; gap: 20px; max-width: 1400px; margin: 40px auto 80px; align-items: stretch; padding: 0 20px;">
            
            <!-- Item: Designer (Purple accent) -->
            <div class="sales-value-item" style="border: 1px solid rgba(139, 92, 246, 0.4); background: rgba(139, 92, 246, 0.05); padding: 24px; text-align: left; border-radius: 12px; display: flex; flex-direction: column; flex: 1; min-width: 250px;">
              <h3 style="color: #c4b5fd; font-size: 20px; margin-bottom: 12px;">Designer Identity</h3>
              <p style="font-size: 14px; line-height: 1.5; color: rgba(255,255,255,0.7); flex: 1; margin-bottom: 20px;">Showcase your CAD skills globally. Join the job board and bid securely on hardware projects.</p>
              <img src="/images/showcase-6.png" style="width: 100%; border-radius: 8px; border: 1px solid rgba(139, 92, 246, 0.2);" onerror="this.style.display='none'">
            </div>

            <!-- Item: Entrepreneur (Orange accent) -->
            <div class="sales-value-item" style="border: 1px solid rgba(249, 115, 22, 0.4); background: rgba(249, 115, 22, 0.05); padding: 24px; text-align: left; border-radius: 12px; display: flex; flex-direction: column; flex: 1; min-width: 250px;">
              <h3 style="color: #fdba74; font-size: 20px; margin-bottom: 12px;">Entrepreneur Hub</h3>
              <p style="font-size: 14px; line-height: 1.5; color: rgba(255,255,255,0.7); flex: 1; margin-bottom: 20px;">Post projects, hire verified experts, and manage team NDAs.</p>
              <img src="/images/showcase-4.png" style="width: 100%; border-radius: 8px; border: 1px solid rgba(249, 115, 22, 0.2);" onerror="this.style.display='none'">
            </div>

            <!-- Professional Teal BUNDLE -->
            <div class="sales-value-item-bundle" style="border: 1px solid rgba(20, 184, 166, 0.4); background: rgba(20, 184, 166, 0.05); padding: 24px; border-radius: 12px; display: flex; flex-direction: column; flex: 3; min-width: 600px;">
              <h3 style="color: #5eead4; font-size: 18px; margin-bottom: 20px; text-transform: uppercase; letter-spacing: 1px;">Professional (Engineers, Procurement Managers)</h3>
              
              <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px; flex: 1;">
                
                <div style="display: flex; flex-direction: column;">
                  <img src="/images/showcase-2.png" alt="Instant Quoting" style="width: 100%; aspect-ratio: 16/9; object-fit: cover; border-radius: 6px; margin-bottom: 12px; border: 1px solid rgba(255,255,255,0.1);">
                  <h4 style="font-size: 15px; margin-bottom: 8px; color: #fff;">Instant Quoting</h4>
                  <p style="font-size: 13px; color: rgba(255,255,255,0.6); line-height: 1.4;">AI-driven part-by-part cost breakdowns.</p>
                </div>

                <div style="display: flex; flex-direction: column;">
                  <img src="/images/showcase-5.png" alt="Global Supply Chain" style="width: 100%; aspect-ratio: 16/9; object-fit: cover; border-radius: 6px; margin-bottom: 12px; border: 1px solid rgba(255,255,255,0.1);">
                  <h4 style="font-size: 15px; margin-bottom: 8px; color: #fff;">Global Supply Chain</h4>
                  <p style="font-size: 13px; color: rgba(255,255,255,0.6); line-height: 1.4;">Access 1,100+ vetted manufacturers.</p>
                </div>

                <div style="display: flex; flex-direction: column;">
                  <img src="/images/showcase-7.png" alt="End-to-End Control" style="width: 100%; aspect-ratio: 16/9; object-fit: cover; border-radius: 6px; margin-bottom: 12px; border: 1px solid rgba(255,255,255,0.1);">
                  <h4 style="font-size: 15px; margin-bottom: 8px; color: #fff;">End-to-End Control</h4>
                  <p style="font-size: 13px; color: rgba(255,255,255,0.6); line-height: 1.4;">Manage global freight & production phases.</p>
                </div>

                <div style="display: flex; flex-direction: column;">
                  <img src="/images/showcase-8.png" alt="HS Tariff Optimizer" style="width: 100%; aspect-ratio: 16/9; object-fit: cover; border-radius: 6px; margin-bottom: 12px; border: 1px solid rgba(255,255,255,0.1);">
                  <h4 style="font-size: 15px; margin-bottom: 8px; color: #fff;">HS Tariff Optimizer</h4>
                  <p style="font-size: 13px; color: rgba(255,255,255,0.6); line-height: 1.4;">AI codes compliance and import/export savings.</p>
                </div>

              </div>
            </div>

          </section>
"""

showcase_html = """
          <!-- Showcase Section (Using User's Screenshots) -->
          <section class="sales-showcase" style="overflow: hidden; width: 100vw; margin-left: calc(-50vw + 50%); margin-top: 20px; margin-bottom: 80px;">
            <div class="sales-marquee-container">
              <div class="sales-marquee-track">
                <!-- Group 1 -->
                <img src="/images/showcase-1.png" alt="Platform UI" class="sales-marquee-img" onerror="this.src='/images/placeholder-ui.png'">
                <img src="/images/showcase-2.png" alt="Platform UI" class="sales-marquee-img" onerror="this.src='/images/placeholder-ui.png'">
                <img src="/images/showcase-3.png" alt="Platform UI" class="sales-marquee-img" onerror="this.src='/images/placeholder-ui.png'">
                <img src="/images/showcase-4.png" alt="Platform UI" class="sales-marquee-img" onerror="this.src='/images/placeholder-ui.png'">
                <img src="/images/showcase-5.png" alt="Platform UI" class="sales-marquee-img" onerror="this.src='/images/placeholder-ui.png'">
                <img src="/images/showcase-6.png" alt="Platform UI" class="sales-marquee-img" onerror="this.src='/images/placeholder-ui.png'">
                <img src="/images/showcase-7.png" alt="Platform UI" class="sales-marquee-img" onerror="this.src='/images/placeholder-ui.png'">
                <img src="/images/showcase-8.png" alt="Platform UI" class="sales-marquee-img" onerror="this.src='/images/placeholder-ui.png'">
                <!-- Group 2 -->
                <img src="/images/showcase-1.png" alt="Platform UI" class="sales-marquee-img" onerror="this.src='/images/placeholder-ui.png'">
                <img src="/images/showcase-2.png" alt="Platform UI" class="sales-marquee-img" onerror="this.src='/images/placeholder-ui.png'">
                <img src="/images/showcase-3.png" alt="Platform UI" class="sales-marquee-img" onerror="this.src='/images/placeholder-ui.png'">
                <img src="/images/showcase-4.png" alt="Platform UI" class="sales-marquee-img" onerror="this.src='/images/placeholder-ui.png'">
                <img src="/images/showcase-5.png" alt="Platform UI" class="sales-marquee-img" onerror="this.src='/images/placeholder-ui.png'">
                <img src="/images/showcase-6.png" alt="Platform UI" class="sales-marquee-img" onerror="this.src='/images/placeholder-ui.png'">
                <img src="/images/showcase-7.png" alt="Platform UI" class="sales-marquee-img" onerror="this.src='/images/placeholder-ui.png'">
                <img src="/images/showcase-8.png" alt="Platform UI" class="sales-marquee-img" onerror="this.src='/images/placeholder-ui.png'">
              </div>
            </div>
          </section>
"""

deep_dive_html = """
          <!-- Feature Deep-Dive -->
          <section class="sales-deep-dive">
            <div class="deep-dive-row">
              <div class="deep-dive-text">
                <h2>AI-Driven Instant RFQs</h2>
                <p>Upload your 3D CAD files and our custom geometry engines instantly identify mass, volume, and complexity. Within seconds, get high-accuracy cost breakdowns driven by real-time raw material databases and machine learning models based on millions of past manufactured parts.</p>
                <ul class="deep-dive-list">
                  <li><svg viewBox="0 0 24 24" fill="none" stroke="#22c55e" stroke-width="2"><polyline points="20 6 9 17 4 12"></polyline></svg> Part-by-part transparent breakdown</li>
                  <li><svg viewBox="0 0 24 24" fill="none" stroke="#22c55e" stroke-width="2"><polyline points="20 6 9 17 4 12"></polyline></svg> DFM (Design for Manufacturing) insights</li>
                  <li><svg viewBox="0 0 24 24" fill="none" stroke="#22c55e" stroke-width="2"><polyline points="20 6 9 17 4 12"></polyline></svg> Supports STEP, IGES, SolidWorks, and more</li>
                </ul>
              </div>
              <div class="deep-dive-img">
                <img src="/images/showcase-1.png" alt="Instant RFQ Engine" style="width: 100%; border-radius: 12px; box-shadow: 0 20px 40px rgba(0,0,0,0.4); border: 1px solid rgba(255,255,255,0.1);">
              </div>
            </div>

            <div class="deep-dive-row reverse">
              <div class="deep-dive-text">
                <h2>Direct Access to the World's Best Factories</h2>
                <p>Say goodbye to brokers and black-box trading companies. Atlas DT connects you directly with a highly curated network of over 1,100 verified Tier 1, Tier 2, and OEM manufacturers across the globe. Each facility undergoes strenuous on-site quality and capability audits by our specialized ground teams.</p>
                <ul class="deep-dive-list">
                  <li><svg viewBox="0 0 24 24" fill="none" stroke="#22c55e" stroke-width="2"><polyline points="20 6 9 17 4 12"></polyline></svg> Verified ISO certifications and capabilities</li>
                  <li><svg viewBox="0 0 24 24" fill="none" stroke="#22c55e" stroke-width="2"><polyline points="20 6 9 17 4 12"></polyline></svg> Direct messaging and collaboration board</li>
                  <li><svg viewBox="0 0 24 24" fill="none" stroke="#22c55e" stroke-width="2"><polyline points="20 6 9 17 4 12"></polyline></svg> Complete transparency on facility locations</li>
                </ul>
              </div>
              <div class="deep-dive-img">
                <img src="/images/showcase-3.png" alt="Supplier Verification" style="width: 100%; border-radius: 12px; box-shadow: 0 20px 40px rgba(0,0,0,0.4); border: 1px solid rgba(255,255,255,0.1);">
              </div>
            </div>
            
            <div class="deep-dive-row">
              <div class="deep-dive-text">
                <h2>Hire Top Engineering Talent</h2>
                <p>Need extra hands to prepare your designs for mass production? Access our Global Designer Network to find pre-vetted industrial designers and engineers. Seamlessly augment your team, collaborate on CAD, and transition concepts to reality inside a single unified workspace.</p>
                <ul class="deep-dive-list">
                  <li><svg viewBox="0 0 24 24" fill="none" stroke="#22c55e" stroke-width="2"><polyline points="20 6 9 17 4 12"></polyline></svg> Hire per project or dedicated scope</li>
                  <li><svg viewBox="0 0 24 24" fill="none" stroke="#22c55e" stroke-width="2"><polyline points="20 6 9 17 4 12"></polyline></svg> Expert engineering and DFM optimizations</li>
                  <li><svg viewBox="0 0 24 24" fill="none" stroke="#22c55e" stroke-width="2"><polyline points="20 6 9 17 4 12"></polyline></svg> Secure escrow and milestone payments</li>
                </ul>
              </div>
              <div class="deep-dive-img">
                <img src="/images/showcase-6.png" alt="Designer Network" style="width: 100%; border-radius: 12px; box-shadow: 0 20px 40px rgba(0,0,0,0.4); border: 1px solid rgba(255,255,255,0.1);">
              </div>
            </div>
          </section>
"""

new_block = value_props_html + "\n" + showcase_html + "\n" + deep_dive_html + "\n"

final_text = html[:start_idx] + new_block + "          <!-- Pricing Section -->" + html[end_idx+len("          <!-- Pricing Section -->"):]

with open('app.html', 'w', encoding='utf-8') as f:
    f.write(final_text)

print("success rewriting html block")


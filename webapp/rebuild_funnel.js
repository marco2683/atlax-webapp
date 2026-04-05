const fs = require('fs');

let html = fs.readFileSync('app.html', 'utf8');

// 1. We replace from `<!-- Hero Section -->` down to `<!-- SUPPLIER TABULAR ENGINE -->` exclusively.

const newContent = `
          <!-- Hero Section -->
          <section class="sales-hero" style="margin-top: 40px; text-align: center;">
            <h1 class="sales-hero__title" style="font-size: 48px; max-width: 800px; margin: 0 auto 16px;">The Global <span style="background: linear-gradient(135deg, #ffffff 0%, #8892b0 100%); -webkit-background-clip: text; -webkit-text-fill-color: transparent; font-weight: 800;">Manufacturing Engine</span></h1>
            <p class="sales-hero__subtitle" style="font-size: 18px; color: rgba(255,255,255,0.7); max-width: 600px; margin: 0 auto;">Connect with world-class manufacturers, hire global talent, and manage your entire supply chain lifecycle in one workspace.</p>
          </section>

          <!-- Showcase Section (Using User's Screenshots) -->
          <section class="sales-showcase" style="overflow: hidden; width: 100vw; margin-left: calc(-50vw + 50%); margin-top: 60px; margin-bottom: 80px;">
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

          <!-- 5-Grid Values Area -->
          <section class="sales-value-props" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 20px; max-width: 1200px; margin: 80px auto; align-items: stretch;">
            
            <!-- Item: Designer (Purple accent) -->
            <div class="sales-value-item" style="border: 1px solid rgba(139, 92, 246, 0.3); background: rgba(139, 92, 246, 0.05); padding: 20px; text-align: left; border-radius: 12px; display: flex; flex-direction: column;">
              <h3 style="color: #c4b5fd; font-size: 18px; margin-bottom: 12px;">Designer Identity</h3>
              <p style="font-size: 14px; line-height: 1.5; color: rgba(255,255,255,0.7); flex: 1;">Showcase your CAD skills globally. Join the job board and bid securely on hardware projects.</p>
            </div>

            <!-- Item: Entrepreneur (Orange accent) -->
            <div class="sales-value-item" style="border: 1px solid rgba(249, 115, 22, 0.3); background: rgba(249, 115, 22, 0.05); padding: 20px; text-align: left; border-radius: 12px; display: flex; flex-direction: column;">
              <h3 style="color: #fdba74; font-size: 18px; margin-bottom: 12px;">Entrepreneur Hub</h3>
              <p style="font-size: 14px; line-height: 1.5; color: rgba(255,255,255,0.7); flex: 1;">Post projects, hire verified experts, and manage team NDAs.</p>
            </div>

            <!-- The Original 3 (Blue/Grey default accents) -->
            <div class="sales-value-item" style="padding: 20px; text-align: left; border-radius: 12px; display: flex; flex-direction: column;">
              <div class="sales-value-image" style="height: 120px; margin-bottom: 16px;">
                <img src="/images/showcase-2.png" alt="Rigorous Verification" style="width: 100%; height: 100%; object-fit: cover; border-radius: 8px;">
              </div>
              <h3 style="font-size: 18px; margin-bottom: 12px;">Instant Quoting</h3>
              <p style="font-size: 14px; line-height: 1.5; color: rgba(255,255,255,0.7); flex: 1;">AI-driven part-by-part cost breakdowns.</p>
            </div>

            <div class="sales-value-item" style="padding: 20px; text-align: left; border-radius: 12px; display: flex; flex-direction: column;">
              <div class="sales-value-image" style="height: 120px; margin-bottom: 16px;">
                <img src="/images/showcase-4.png" alt="Instant Quoting" style="width: 100%; height: 100%; object-fit: cover; border-radius: 8px;">
              </div>
              <h3 style="font-size: 18px; margin-bottom: 12px;">Global Supply Chain</h3>
              <p style="font-size: 14px; line-height: 1.5; color: rgba(255,255,255,0.7); flex: 1;">Access 1,100+ vetted & audited manufacturers.</p>
            </div>

            <div class="sales-value-item" style="padding: 20px; text-align: left; border-radius: 12px; display: flex; flex-direction: column;">
              <div class="sales-value-image" style="height: 120px; margin-bottom: 16px;">
                <img src="/images/showcase-5.png" alt="End-to-End Management" style="width: 100%; height: 100%; object-fit: cover; border-radius: 8px;">
              </div>
              <h3 style="font-size: 18px; margin-bottom: 12px;">End-to-End Control</h3>
              <p style="font-size: 14px; line-height: 1.5; color: rgba(255,255,255,0.7); flex: 1;">Unified workspace for global freight and manufacturing.</p>
            </div>
          </section>

          <!-- Pricing Section -->
          <section class="sales-pricing">
            <div class="sales-pricing-header">
              <h2 class="sales-section-title">Ecosystem Subscriptions</h2>
              <p class="sales-section-subtitle">Find your exact role in the manufacturing engine.</p>
            </div>

            <div class="pricing-grid" style="grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));">
              
              <!-- Tier 1: Designer -->
              <div class="pricing-card" style="border-top: 4px solid #a78bfa;">
                <div class="pricing-card-header">
                  <h3>Designer</h3>
                  <div class="price">$29<span>/mo</span></div>
                  <p>Freelancers and industrial design engineers.</p>
                </div>
                <ul class="pricing-features">
                  <li><svg viewBox="0 0 24 24" fill="none" stroke="#22c55e" stroke-width="2"><polyline points="20 6 9 17 4 12"></polyline></svg> Public Designer Profile</li>
                  <li><svg viewBox="0 0 24 24" fill="none" stroke="#22c55e" stroke-width="2"><polyline points="20 6 9 17 4 12"></polyline></svg> Access Job/Bid Boards</li>
                  <li><svg viewBox="0 0 24 24" fill="none" stroke="#22c55e" stroke-width="2"><polyline points="20 6 9 17 4 12"></polyline></svg> Bid on Global Projects</li>
                  <li><svg viewBox="0 0 24 24" fill="none" stroke="#22c55e" stroke-width="2"><polyline points="20 6 9 17 4 12"></polyline></svg> Escrow Setup & Protection</li>
                </ul>
                <button class="pricing-btn" onclick="window.location.href='/profile.html'">Become a Designer</button>
              </div>

              <!-- Tier 2: Entrepreneur -->
              <div class="pricing-card" style="border-top: 4px solid #fdba74;">
                <div class="pricing-card-header">
                  <h3>Entrepreneur</h3>
                  <div class="price">$59<span>/mo</span></div>
                  <p>Makers and independent product creators.</p>
                </div>
                <ul class="pricing-features">
                  <li><svg viewBox="0 0 24 24" fill="none" stroke="#fdba74" stroke-width="2"><polyline points="20 6 9 17 4 12"></polyline></svg> <b>All free tier basics</b></li>
                  <li><svg viewBox="0 0 24 24" fill="none" stroke="#22c55e" stroke-width="2"><polyline points="20 6 9 17 4 12"></polyline></svg> Hire Dedicated Designers</li>
                  <li><svg viewBox="0 0 24 24" fill="none" stroke="#22c55e" stroke-width="2"><polyline points="20 6 9 17 4 12"></polyline></svg> Generate NDAs safely</li>
                  <li><svg viewBox="0 0 24 24" fill="none" stroke="#22c55e" stroke-width="2"><polyline points="20 6 9 17 4 12"></polyline></svg> 50 Instant RFQ Queries / mo</li>
                </ul>
                <button class="pricing-btn" onclick="window.location.href='/profile.html'">Join as Entrepreneur</button>
              </div>

              <!-- Tier 3: Professional -->
              <div class="pricing-card" style="transform: scale(1.05); border-color: #5ea2ff; position: relative;">
                <div style="position: absolute; top: -12px; left: 50%; transform: translateX(-50%); background: #5ea2ff; color: #000; padding: 4px 12px; border-radius: 12px; font-size: 12px; font-weight: bold;">RECOMMENDED</div>
                <div class="pricing-card-header">
                  <h3>Professional</h3>
                  <div class="price">$199<span>/mo</span></div>
                  <p>Scaling companies needing robust supply chains.</p>
                </div>
                <ul class="pricing-features">
                  <li><svg viewBox="0 0 24 24" fill="none" stroke="#5ea2ff" stroke-width="2"><polyline points="20 6 9 17 4 12"></polyline></svg> <b>Includes Entrepreneur tools</b></li>
                  <li><svg viewBox="0 0 24 24" fill="none" stroke="#22c55e" stroke-width="2"><polyline points="20 6 9 17 4 12"></polyline></svg> Unlimited Instant RFQs</li>
                  <li><svg viewBox="0 0 24 24" fill="none" stroke="#22c55e" stroke-width="2"><polyline points="20 6 9 17 4 12"></polyline></svg> Access 1,100+ Supplier Net</li>
                  <li><svg viewBox="0 0 24 24" fill="none" stroke="#22c55e" stroke-width="2"><polyline points="20 6 9 17 4 12"></polyline></svg> Direct Factory Messaging</li>
                </ul>
                <button class="pricing-btn" style="background:#5ea2ff; color:#0e1117;" onclick="window.location.href='/profile.html'">Upgrade to Pro</button>
              </div>

              <!-- Tier 4: Enterprise -->
              <div class="pricing-card">
                <div class="pricing-card-header">
                  <h3>Enterprise</h3>
                  <div class="price">Custom</div>
                  <p>Global corporations operating fully integrated teams.</p>
                </div>
                <ul class="pricing-features">
                  <li><svg viewBox="0 0 24 24" fill="none" stroke="#22c55e" stroke-width="2"><polyline points="20 6 9 17 4 12"></polyline></svg> <b>Includes Professional tools</b></li>
                  <li><svg viewBox="0 0 24 24" fill="none" stroke="#22c55e" stroke-width="2"><polyline points="20 6 9 17 4 12"></polyline></svg> Dedicated Supply Manager</li>
                  <li><svg viewBox="0 0 24 24" fill="none" stroke="#22c55e" stroke-width="2"><polyline points="20 6 9 17 4 12"></polyline></svg> On-site factory audits</li>
                  <li><svg viewBox="0 0 24 24" fill="none" stroke="#22c55e" stroke-width="2"><polyline points="20 6 9 17 4 12"></polyline></svg> Custom ERP Integration</li>
                </ul>
                <button class="pricing-btn" style="background: transparent; border: 1px solid #5ea2ff; color: #5ea2ff;" onclick="window.location.href='/profile.html'">Contact Sales</button>
              </div>

            </div>
          </section>
`;

const startIndex = html.indexOf('<!-- Hero Section -->');
const endIndex = html.indexOf('<!-- Footer Area of Funnel -->');

if (startIndex !== -1 && endIndex !== -1) {
    const finalHtml = html.substring(0, startIndex) + newContent + '\n          ' + html.substring(endIndex);
    fs.writeFileSync('app.html', finalHtml);
    console.log("Successfully replaced the funnel content.");
} else {
    console.log("Could not find the target markers.");
}

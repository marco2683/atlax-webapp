import fs from 'fs';

const htmlPath = 'app.html';
let content = fs.readFileSync(htmlPath, 'utf8');

// Replace the sales showcase and pricing sections.
const regex = /<section class="sales-showcase">[\s\S]*?<\/section>\s*<!-- Pricing Section -->\s*<section class="sales-pricing">[\s\S]*?<\/section>/m;

const replacement = `<section class="sales-showcase" style="overflow: hidden; width: 100vw; margin-left: calc(-50vw + 50%);">
            <h2 class="sales-section-title">Built for Scale and Precision</h2>
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
                
                <!-- Group 2 (Duplicate for infinite scroll) -->
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

          <!-- Pricing Section -->
          <section class="sales-pricing">
            <div class="sales-pricing-header">
              <h2 class="sales-section-title">Select Your Plan</h2>
              <p class="sales-section-subtitle">Flexible pricing tailored for hardware teams of all sizes.</p>
            </div>
            
            <div class="pricing-grid">
              
              <!-- Basic -->
              <div class="pricing-card">
                <div class="pricing-card-header">
                  <h3>Basic</h3>
                  <div class="price">Free</div>
                  <p>Essential tools for designers & quoting.</p>
                </div>
                <ul class="pricing-features">
                  <li><svg viewBox="0 0 24 24" fill="none" stroke="#22c55e" stroke-width="2"><polyline points="20 6 9 17 4 12"></polyline></svg> Instant RFQ Quoting Engine</li>
                  <li><svg viewBox="0 0 24 24" fill="none" stroke="#22c55e" stroke-width="2"><polyline points="20 6 9 17 4 12"></polyline></svg> Bulk Upload Capabilities</li>
                  <li><svg viewBox="0 0 24 24" fill="none" stroke="#22c55e" stroke-width="2"><polyline points="20 6 9 17 4 12"></polyline></svg> Find Design Work Board</li>
                  <li><svg viewBox="0 0 24 24" fill="none" stroke="#22c55e" stroke-width="2"><polyline points="20 6 9 17 4 12"></polyline></svg> Offer Development Work</li>
                  <li style="color: rgba(255,255,255,0.3);"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg> No Global Supplier Access</li>
                </ul>
                <button class="pricing-btn pricing-btn--secondary btn-enter-platform" data-tier="basic">Start Building Free</button>
              </div>

              <!-- Professional -->
              <div class="pricing-card popular">
                <div class="pricing-glow"></div>
                <div class="popular-badge">Premium Toolkit</div>
                <div class="pricing-card-header">
                  <h3>Professional</h3>
                  <div class="price">$49<span>/mo</span></div>
                  <p>Full lifecycle supply chain.</p>
                </div>
                <ul class="pricing-features">
                  <li><svg viewBox="0 0 24 24" fill="none" stroke="#22c55e" stroke-width="2"><polyline points="20 6 9 17 4 12"></polyline></svg> Full All-Supplier Access</li>
                  <li><svg viewBox="0 0 24 24" fill="none" stroke="#22c55e" stroke-width="2"><polyline points="20 6 9 17 4 12"></polyline></svg> Platform Product Builder</li>
                  <li><svg viewBox="0 0 24 24" fill="none" stroke="#22c55e" stroke-width="2"><polyline points="20 6 9 17 4 12"></polyline></svg> HS Tariff Optimizer</li>
                  <li><svg viewBox="0 0 24 24" fill="none" stroke="#22c55e" stroke-width="2"><polyline points="20 6 9 17 4 12"></polyline></svg> Everything in Basic</li>
                </ul>
                <button class="pricing-btn pricing-btn--primary btn-enter-platform" data-tier="professional">Start Professional Trial</button>
              </div>

              <!-- Enterprise -->
              <div class="pricing-card enterprise">
                <div class="pricing-card-header">
                  <h3>Enterprise</h3>
                  <div class="price" style="font-size: 32px; padding-top: 5px; padding-bottom: 5px;">Custom</div>
                  <p>Dedicated on-ground management.</p>
                </div>
                <ul class="pricing-features">
                  <li><svg viewBox="0 0 24 24" fill="none" stroke="#22c55e" stroke-width="2"><polyline points="20 6 9 17 4 12"></polyline></svg> Turnkey Managed Supply Chain</li>
                  <li><svg viewBox="0 0 24 24" fill="none" stroke="#22c55e" stroke-width="2"><polyline points="20 6 9 17 4 12"></polyline></svg> ATLAX Team on the Ground</li>
                  <li><svg viewBox="0 0 24 24" fill="none" stroke="#22c55e" stroke-width="2"><polyline points="20 6 9 17 4 12"></polyline></svg> Negotiated T&Cs based on requirements</li>
                </ul>
                <button class="pricing-btn pricing-btn--secondary btn-enter-platform" data-tier="enterprise">Book Consultation</button>
              </div>

            </div>
          </section>`;

if (content.match(regex)) {
   content = content.replace(regex, replacement);
}

// Add the pulsing grid logic (the `<div class="grid-background"></div>`)
const funnelRegex = /<div class="sales-funnel-page hidden" id="sales-funnel">\s*<div class="sales-funnel__content">/m;
if (content.match(funnelRegex) && !content.includes('class="sales-grid-bg"')) {
   content = content.replace(funnelRegex, `<div class="sales-funnel-page hidden" id="sales-funnel">\n        <div class="sales-grid-bg"></div>\n        <div class="sales-funnel__content">`);
}

fs.writeFileSync(htmlPath, content, 'utf8');
console.log('HTML updated');

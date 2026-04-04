import fs from 'fs';

const htmlPath = 'app.html';
let content = fs.readFileSync(htmlPath, 'utf8');

const regex = /<section class="sales-showcase">[\s\S]*?<\/section>\s*<!-- Pricing Section -->\s*<section class="sales-pricing">[\s\S]*?<\/section>/m;

const replacement = `<section class="sales-showcase">
            <h2 class="sales-section-title">Built for Scale and Precision</h2>
            <div class="sales-gallery">
              <div class="sales-gallery-col">
                <img src="/images/showcase-1.png" alt="Platform UI" class="sales-img" onerror="this.src='/images/placeholder-ui.png'">
                <img src="/images/showcase-2.png" alt="Platform UI" class="sales-img" onerror="this.src='/images/placeholder-ui.png'">
                <img src="/images/showcase-5.png" alt="Platform UI" class="sales-img" onerror="this.src='/images/placeholder-ui.png'">
                <img src="/images/showcase-7.png" alt="Platform UI" class="sales-img" onerror="this.src='/images/placeholder-ui.png'">
              </div>
              <div class="sales-gallery-col" style="margin-top: 60px;">
                <img src="/images/showcase-3.png" alt="Platform UI" class="sales-img" onerror="this.src='/images/placeholder-ui.png'">
                <img src="/images/showcase-4.png" alt="Platform UI" class="sales-img" onerror="this.src='/images/placeholder-ui.png'">
                <img src="/images/showcase-6.png" alt="Platform UI" class="sales-img" onerror="this.src='/images/placeholder-ui.png'">
                <img src="/images/showcase-8.png" alt="Platform UI" class="sales-img" onerror="this.src='/images/placeholder-ui.png'">
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
                  <p>Essential tools for sourcing.</p>
                </div>
                <ul class="pricing-features">
                  <li><svg viewBox="0 0 24 24" fill="none" stroke="#22c55e" stroke-width="2"><polyline points="20 6 9 17 4 12"></polyline></svg> Access to Tier-1 Suppliers</li>
                  <li><svg viewBox="0 0 24 24" fill="none" stroke="#22c55e" stroke-width="2"><polyline points="20 6 9 17 4 12"></polyline></svg> Instant RFQ & Bulk Upload</li>
                  <li><svg viewBox="0 0 24 24" fill="none" stroke="#22c55e" stroke-width="2"><polyline points="20 6 9 17 4 12"></polyline></svg> Designer 'Find Work' Board</li>
                </ul>
                <button class="pricing-btn pricing-btn--secondary btn-enter-platform">Get Started Free</button>
              </div>

              <!-- Professional -->
              <div class="pricing-card popular">
                <div class="pricing-glow"></div>
                <div class="popular-badge">Most Popular</div>
                <div class="pricing-card-header">
                  <h3>Professional</h3>
                  <div class="price">$49<span>/mo</span></div>
                  <p>Full suite for hardware creators.</p>
                </div>
                <ul class="pricing-features">
                  <li><svg viewBox="0 0 24 24" fill="none" stroke="#22c55e" stroke-width="2"><polyline points="20 6 9 17 4 12"></polyline></svg> All 1,100+ Tier 1, 2 & OEM Suppliers</li>
                  <li><svg viewBox="0 0 24 24" fill="none" stroke="#22c55e" stroke-width="2"><polyline points="20 6 9 17 4 12"></polyline></svg> Platform Product Builder</li>
                  <li><svg viewBox="0 0 24 24" fill="none" stroke="#22c55e" stroke-width="2"><polyline points="20 6 9 17 4 12"></polyline></svg> HS Tariff Optimizer Tool</li>
                  <li><svg viewBox="0 0 24 24" fill="none" stroke="#22c55e" stroke-width="2"><polyline points="20 6 9 17 4 12"></polyline></svg> Advanced Quoting Features</li>
                </ul>
                <button class="pricing-btn pricing-btn--primary btn-enter-platform">Start Premium Trial</button>
              </div>

              <!-- Enterprise -->
              <div class="pricing-card enterprise">
                <div class="pricing-card-header">
                  <h3>Enterprise</h3>
                  <div class="price" style="font-size: 32px; padding-top: 5px; padding-bottom: 5px;">Custom</div>
                  <p>Managed supply chain. Designed for scale.</p>
                </div>
                <ul class="pricing-features">
                  <li><svg viewBox="0 0 24 24" fill="none" stroke="#22c55e" stroke-width="2"><polyline points="20 6 9 17 4 12"></polyline></svg> Dedicated ATLAX Account Management</li>
                  <li><svg viewBox="0 0 24 24" fill="none" stroke="#22c55e" stroke-width="2"><polyline points="20 6 9 17 4 12"></polyline></svg> Logistics & Compliance Processing</li>
                  <li><svg viewBox="0 0 24 24" fill="none" stroke="#22c55e" stroke-width="2"><polyline points="20 6 9 17 4 12"></polyline></svg> Negotiated Supply Chain Terms</li>
                </ul>
                <button class="pricing-btn pricing-btn--secondary btn-enter-platform">Book Consultation</button>
              </div>

            </div>
          </section>`;

content = content.replace(regex, replacement);
fs.writeFileSync(htmlPath, content, 'utf8');

console.log('HTML pricing and showcase updated');

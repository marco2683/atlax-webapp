import fs from 'fs';

const htmlPath = 'app.html';
let content = fs.readFileSync(htmlPath, 'utf8');

const regex = /<div class="supplier-selection hidden" id="supplier-selection">[\s\S]*?<!-- SUPPLIER TABULAR ENGINE -->/m;

const replacement = `<div class="sales-funnel-page hidden" id="sales-funnel">
        <div class="sales-funnel__content">
          
          <!-- Hero Section -->
          <section class="sales-hero">
            <h1 class="sales-hero__title">The Operating System for Global Manufacturing</h1>
            <p class="sales-hero__subtitle">Find, vet, and collaborate with world-class manufacturing partners. Remove friction from your supply chain with Atlas DT.</p>
          </section>

          <!-- Value / Pain Points Section -->
          <section class="sales-value-props">
            <div class="sales-value-item">
              <div class="sales-value-icon">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
              </div>
              <h3>Rigorous Verification</h3>
              <p>Say goodbye to unverified brokers. Every supplier on Atlas DT undergoes strict on-site audits, ISO compliance checks, and capability verification.</p>
            </div>
            <div class="sales-value-item">
              <div class="sales-value-icon">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"></path><polyline points="13 2 13 9 20 9"></polyline></svg>
              </div>
              <h3>Instant Quoting</h3>
              <p>Stop waiting weeks for RFQs. Upload CAD files for instant, AI-driven part-by-part cost breakdowns based on live material data.</p>
            </div>
            <div class="sales-value-item">
              <div class="sales-value-icon">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><line x1="2" y1="12" x2="22" y2="12"></line><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"></path></svg>
              </div>
              <h3>End-to-End Management</h3>
              <p>From industrial designers to global freight, manage your entire hardware development lifecycle in one unified workspace.</p>
            </div>
          </section>

          <!-- Showcase Section (Using User's Screenshots) -->
          <section class="sales-showcase">
            <h2 class="sales-section-title">Built for Scale and Precision</h2>
            <div class="sales-gallery">
              <div class="sales-gallery-col">
                <img src="/images/showcase-1.png" alt="Platform UI" class="sales-img" onerror="this.src='/images/placeholder-ui.png'">
                <img src="/images/showcase-2.png" alt="Platform UI" class="sales-img" onerror="this.src='/images/placeholder-ui.png'">
              </div>
              <div class="sales-gallery-col" style="margin-top: 40px;">
                <img src="/images/showcase-3.png" alt="Platform UI" class="sales-img" onerror="this.src='/images/placeholder-ui.png'">
                <img src="/images/showcase-4.png" alt="Platform UI" class="sales-img" onerror="this.src='/images/placeholder-ui.png'">
                <img src="/images/showcase-5.png" alt="Platform UI" class="sales-img" onerror="this.src='/images/placeholder-ui.png'">
              </div>
            </div>
          </section>

          <!-- Pricing Section -->
          <section class="sales-pricing">
            <h2 class="sales-section-title">Select Your Plan</h2>
            <div class="pricing-grid">
              
              <!-- Free -->
              <div class="pricing-card">
                <div class="pricing-card-header">
                  <h3>Basic</h3>
                  <div class="price">Free</div>
                  <p>Explore the network.</p>
                </div>
                <ul class="pricing-features">
                  <li><svg viewBox="0 0 24 24" fill="none" stroke="#22c55e" stroke-width="2"><polyline points="20 6 9 17 4 12"></polyline></svg> Access to Tier-1 Suppliers</li>
                  <li><svg viewBox="0 0 24 24" fill="none" stroke="#22c55e" stroke-width="2"><polyline points="20 6 9 17 4 12"></polyline></svg> Basic Supplier Search</li>
                  <li><svg viewBox="0 0 24 24" fill="none" stroke="#22c55e" stroke-width="2"><polyline points="20 6 9 17 4 12"></polyline></svg> 1 Project Estimator</li>
                </ul>
                <button class="pricing-btn pricing-btn--secondary btn-enter-platform">Get Started Free</button>
              </div>

              <!-- Pro -->
              <div class="pricing-card popular">
                <div class="popular-badge">Most Popular</div>
                <div class="pricing-card-header">
                  <h3>Pro</h3>
                  <div class="price">$49<span>/mo</span></div>
                  <p>Power tools for creators.</p>
                </div>
                <ul class="pricing-features">
                  <li><svg viewBox="0 0 24 24" fill="none" stroke="#22c55e" stroke-width="2"><polyline points="20 6 9 17 4 12"></polyline></svg> All 1,100+ Tier 1, 2 & OEM</li>
                  <li><svg viewBox="0 0 24 24" fill="none" stroke="#22c55e" stroke-width="2"><polyline points="20 6 9 17 4 12"></polyline></svg> Instant RFQ Quotes</li>
                  <li><svg viewBox="0 0 24 24" fill="none" stroke="#22c55e" stroke-width="2"><polyline points="20 6 9 17 4 12"></polyline></svg> Advanced 3D Processing</li>
                </ul>
                <button class="pricing-btn pricing-btn--primary btn-enter-platform">Start Premium Trial</button>
              </div>

              <!-- Enterprise -->
              <div class="pricing-card">
                <div class="pricing-card-header">
                  <h3>Enterprise</h3>
                  <div class="price">$299<span>/mo</span></div>
                  <p>For dedicated hardware teams.</p>
                </div>
                <ul class="pricing-features">
                  <li><svg viewBox="0 0 24 24" fill="none" stroke="#22c55e" stroke-width="2"><polyline points="20 6 9 17 4 12"></polyline></svg> Unlimited Designer Jobs</li>
                  <li><svg viewBox="0 0 24 24" fill="none" stroke="#22c55e" stroke-width="2"><polyline points="20 6 9 17 4 12"></polyline></svg> Real-time Comm Workspaces</li>
                  <li><svg viewBox="0 0 24 24" fill="none" stroke="#22c55e" stroke-width="2"><polyline points="20 6 9 17 4 12"></polyline></svg> Supplier Compliance Docs</li>
                </ul>
                <button class="pricing-btn pricing-btn--secondary btn-enter-platform">Contact Sales</button>
              </div>

              <!-- Managed -->
              <div class="pricing-card">
                <div class="pricing-card-header">
                  <h3>Managed OS</h3>
                  <div class="price">Custom</div>
                  <p>Turnkey supply chain mgmt.</p>
                </div>
                <ul class="pricing-features">
                  <li><svg viewBox="0 0 24 24" fill="none" stroke="#22c55e" stroke-width="2"><polyline points="20 6 9 17 4 12"></polyline></svg> Dedicated Account Manager</li>
                  <li><svg viewBox="0 0 24 24" fill="none" stroke="#22c55e" stroke-width="2"><polyline points="20 6 9 17 4 12"></polyline></svg> On-ground Quality Audits</li>
                  <li><svg viewBox="0 0 24 24" fill="none" stroke="#22c55e" stroke-width="2"><polyline points="20 6 9 17 4 12"></polyline></svg> Full Logistics Processing</li>
                </ul>
                <button class="pricing-btn pricing-btn--secondary btn-enter-platform">Book Consultation</button>
              </div>

            </div>
          </section>

          <!-- Footer Area of Funnel -->
          <div class="sales-footer-cta">
            <p>Already an enterprise partner? <a href="#" class="btn-enter-platform" style="color:var(--color-primary);text-decoration:underline;">Sign In</a></p>
          </div>

        </div>
      </div>

      <!-- SUPPLIER TABULAR ENGINE -->`;

content = content.replace(regex, replacement);
fs.writeFileSync(htmlPath, content, 'utf8');

console.log('Sales funnel HTML injected');


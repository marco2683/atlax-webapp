export function initProductBuilder() {
  const el = document.getElementById('product-builder-engine');
  if (!el) return;

  el.innerHTML = `
    <div class="pb-app-container" style="padding: 100px 20px;">
      <div class="pb-atmosphere"></div>
      
      <div class="pb-stages-container">
        <div class="pb-stages-header">
          <h2 class="pb-title-hyper">Product Development Lifecycle</h2>
          <p style="color: var(--color-steel-300); font-size: 18px; max-width: 700px; margin: 0 auto;">Select your current phase of development to discover how Atlas DT can accelerate your journey from idea to mass production.</p>
        </div>

        <div class="pb-stages-grid">
          
          <!-- STAGE 1: IDEA -->
          <div class="pb-stage-card" data-color="purple">
            <div class="pb-stage-hero" style="background-image: url('/images/showcase-1.png');"></div>
            <div class="pb-stage-content">
              <div class="pb-stage-title-row">
                <h3 class="pb-stage-title">I have an idea</h3>
                <div class="pb-stage-subtitle">Phase 1</div>
              </div>
              <div class="pb-stage-expand-panel">
            <p class="pb-stage-prompt">...and I want to:</p>
            <ul class="pb-stage-list">
                <li>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"></polyline></svg>
                  Business Plan Validation
                </li>
                <li>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"></polyline></svg>
                  Generate Concept Design
                </li>
                <li>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"></polyline></svg>
                  Evaluation of Idea
                </li>
              </ul>
              <button class="pb-stage-cta" onclick="document.querySelector('.nav-contact-trigger')?.click();">
                Talk to Our Experts
              </button>
            </div>
          </div>
        </div>

          <!-- STAGE 2: CONCEPT DESIGN -->
          <div class="pb-stage-card" data-color="blue">
            <div class="pb-stage-hero" style="background-image: url('/images/showcase-6.png');"></div>
            <div class="pb-stage-content">
              <div class="pb-stage-title-row">
                <h3 class="pb-stage-title">I have a Concept Design</h3>
                <div class="pb-stage-subtitle">Phase 2</div>
              </div>
              <div class="pb-stage-expand-panel">
            <p class="pb-stage-prompt">...and I want to:</p>
            <ul class="pb-stage-list">
                <li>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"></polyline></svg>
                  Make Prototype
                </li>
                <li>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"></polyline></svg>
                  Early Phase DFM & COGS
                </li>
                <li>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"></polyline></svg>
                  Manufacturing Tech Selection
                </li>
              </ul>
              <button class="pb-stage-cta" onclick="switchView('designers')">
                Find Designers
              </button>
            </div>
          </div>
        </div>

          <!-- STAGE 3: PROTOTYPE MVP -->
          <div class="pb-stage-card" data-color="teal">
            <div class="pb-stage-hero" style="background-image: url('/images/showcase-2.png');"></div>
            <div class="pb-stage-content">
              <div class="pb-stage-title-row">
                <h3 class="pb-stage-title">I have a Prototype/MVP</h3>
                <div class="pb-stage-subtitle">Phase 3</div>
              </div>
              <div class="pb-stage-expand-panel">
            <p class="pb-stage-prompt">...and I want to:</p>
            <ul class="pb-stage-list">
                <li>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"></polyline></svg>
                  Prototype Validation
                </li>
                <li>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"></polyline></svg>
                  Inputs for Detail Design
                </li>
                <li>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"></polyline></svg>
                  Detail Design
                </li>
                <li>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"></polyline></svg>
                  DFM & Cost
                </li>
              </ul>
              <button class="pb-stage-cta" onclick="switchView('rfq')">
                Calculate Instant Quote
              </button>
            </div>
          </div>
        </div>

          <!-- STAGE 4: TRANSFER TO MANUFACTURE -->
          <div class="pb-stage-card" data-color="orange">
            <div class="pb-stage-hero" style="background-image: url('/images/showcase-3.png');"></div>
            <div class="pb-stage-content">
              <div class="pb-stage-title-row">
                <h3 class="pb-stage-title">I want to transfer to Manufacture</h3>
                <div class="pb-stage-subtitle">Phase 4</div>
              </div>
              <div class="pb-stage-expand-panel">
            <p class="pb-stage-prompt">...and I want to:</p>
            <ul class="pb-stage-list">
                <li>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"></polyline></svg>
                  Regulatory Compliance
                </li>
                <li>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"></polyline></svg>
                  Production Line & SOP
                </li>
                <li>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"></polyline></svg>
                  Automation (If Req)
                </li>
                <li>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"></polyline></svg>
                  Manufacturing Readiness
                </li>
              </ul>
              <button class="pb-stage-cta" onclick="switchView('suppliers')">
                Supplier Network
              </button>
            </div>
          </div>
        </div>

          <!-- STAGE 5: IN THE MARKET -->
          <div class="pb-stage-card" data-color="green">
            <div class="pb-stage-hero" style="background-image: url('/images/showcase-4.png');"></div>
            <div class="pb-stage-content">
              <div class="pb-stage-title-row">
                <h3 class="pb-stage-title">My product is in the Market</h3>
                <div class="pb-stage-subtitle">Phase 5</div>
              </div>
              <div class="pb-stage-expand-panel">
            <p class="pb-stage-prompt">...and I want to:</p>
            <ul class="pb-stage-list">
                <li>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"></polyline></svg>
                  Cost Down (Reduction of COGS)
                </li>
                <li>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"></polyline></svg>
                  Next Gen
                </li>
                <li>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"></polyline></svg>
                  Optimization Quality
                </li>
                <li>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"></polyline></svg>
                  Lifecycle Automation
                </li>
              </ul>
              <button class="pb-stage-cta" onclick="switchView('suppliers')">
                Supply Chain Manager
              </button>
            </div>
          </div>
        </div>

        </div>
      </div>
    </div>
  `;
}

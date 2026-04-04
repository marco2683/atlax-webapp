import fs from 'fs';

const htmlPath = 'app.html';
let content = fs.readFileSync(htmlPath, 'utf8');

const regex = /<div class="supplier-selection__container">[\s\S]*?<\/div>\s*<\/div>\s*<!-- SUPPLIER TABULAR ENGINE -->/m;

const replacement = `<div class="supplier-selection__carousel-container">
          <!-- Text Area -->
          <div class="carousel-text-area">
            <h2 id="carousel-title">Manufacturing Engine</h2>
            <p id="carousel-desc">Search, filter, and sort through our extensive database of 1,100+ vetted manufacturing partners using a traditional tabular interface.</p>
          </div>
          
          <!-- Image Track Area -->
          <div class="carousel-track-wrapper">
             <div class="carousel-track" id="onboarding-carousel">
               <img class="carousel-slide active" src="/images/carousel-tabular.png" alt="Tabular Suppliers" data-title="Supplier Directory" data-desc="Search, filter, and sort through our extensive database of 1,100+ vetted manufacturing partners using a powerful tabular interface.">
               <img class="carousel-slide" src="/images/carousel-globe.png" alt="Globe Suppliers" data-title="Supply Chain Insights" data-desc="Explore suppliers geographically through our interactive 3D globe. Best for mapping regional clusters and discovering proximity-based networks.">
               <img class="carousel-slide" src="/images/carousel-rfq.png" alt="Instant RFQ" data-title="Instant RFQ Engine" data-desc="Get accurate, part-by-part cost breakdowns in seconds based on live material data and AI-driven manufacturing insights.">
               <img class="carousel-slide" src="/images/carousel-builder.png" alt="Design Builder" data-title="Assembly Tree Builder" data-desc="Visually structure multi-component assemblies. Break down complex products into manageable parts for precise quotation.">
               <img class="carousel-slide" src="/images/carousel-designers.png" alt="Designers Marketplace" data-title="Designer Marketplace" data-desc="Discover and hire elite industrial designers and mechanical engineers to bring your hardware concepts to life fast.">
             </div>
             
             <div class="carousel-dots" id="carousel-dots">
               <button class="carousel-dot active" data-index="0"></button>
               <button class="carousel-dot" data-index="1"></button>
               <button class="carousel-dot" data-index="2"></button>
               <button class="carousel-dot" data-index="3"></button>
               <button class="carousel-dot" data-index="4"></button>
             </div>
          </div>
          
          <!-- CTA Area -->
          <div class="carousel-cta-area">
            <button class="rfq-engine__submit-btn rfq-engine__submit-btn--primary" id="btn-enter-platform" style="width: 100%; padding: 16px; font-size: 16px;">
              Enter Manufacturing Platform
            </button>
          </div>
        </div>
      </div>

      <!-- SUPPLIER TABULAR ENGINE -->`;

content = content.replace(regex, replacement);
fs.writeFileSync(htmlPath, content, 'utf8');

console.log('Carousel HTML injected');

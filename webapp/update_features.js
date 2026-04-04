import fs from 'fs';

const htmlPath = 'app.html';
let content = fs.readFileSync(htmlPath, 'utf8');

const regex = /<section class="sales-value-props">[\s\S]*?<\/section>/m;
const replacement = `<section class="sales-value-props">
            <div class="sales-value-item">
              <div class="sales-value-image">
                <img src="/images/showcase-1.png" alt="Rigorous Verification" onerror="this.style.display='none'">
              </div>
              <h3>Rigorous Verification</h3>
              <p>Say goodbye to unverified brokers. Every supplier on ATLAX undergoes strict on-site audits, ISO compliance checks, and capability verification.</p>
            </div>
            <div class="sales-value-item">
              <div class="sales-value-image">
                <img src="/images/showcase-4.png" alt="Instant Quoting" onerror="this.style.display='none'">
              </div>
              <h3>Instant Quoting</h3>
              <p>Stop waiting weeks for RFQs. Upload CAD files for instant, AI-driven part-by-part cost breakdowns based on live material data.</p>
            </div>
            <div class="sales-value-item">
              <div class="sales-value-image">
                <img src="/images/showcase-5.png" alt="End-to-End Management" onerror="this.style.display='none'">
              </div>
              <h3>End-to-End Management</h3>
              <p>From industrial designers to global freight, manage your entire hardware development lifecycle in one unified workspace.</p>
            </div>
          </section>`;

if (content.match(regex)) {
  content = content.replace(regex, replacement);
  fs.writeFileSync(htmlPath, content, 'utf8');
}

const cssPath = 'src/css/supplier-engine.css';
let cssContent = fs.readFileSync(cssPath, 'utf8');

// I also need to style .sales-value-image
// Let's add it right after .sales-value-icon
const cssRegex = /\.sales-value-icon \{[\s\S]*?\}/m;
if (cssContent.match(cssRegex) && !cssContent.includes('.sales-value-image')) {
  cssContent = cssContent.replace(cssRegex, `$&
  
.sales-value-image {
  width: 100%;
  height: 180px;
  border-radius: var(--radius-md);
  margin-bottom: 24px;
  overflow: hidden;
  box-shadow: 0 10px 20px rgba(0,0,0,0.5);
  border: 1px solid rgba(255,255,255,0.05);
}

.sales-value-image img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  transition: transform 0.4s ease;
}

.sales-value-item:hover .sales-value-image img {
  transform: scale(1.05);
}`);
}

// And increase the h3 emphasis
const h3Regex = /\.sales-value-item h3 \{[\s\S]*?\}/m;
if (cssContent.match(h3Regex)) {
  // Replace it entirely to enforce bold and bigger size
  cssContent = cssContent.replace(h3Regex, `.sales-value-item h3 {
  font-size: 22px;
  font-weight: 700;
  margin-bottom: 12px;
  color: #fff;
}`);
}

fs.writeFileSync(cssPath, cssContent, 'utf8');
console.log('Value props updated with thumbnails and larger titles');

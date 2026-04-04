import fs from 'fs';

const cssPath = 'src/css/supplier-engine.css';
let content = fs.readFileSync(cssPath, 'utf8');

// Replace the old carousel CSS block we just added
const regex = /\/\* ═══════════════════════════════════════════════════════════\s*CAROUSEL MODAL\s*═══════════════════════════════════════════════════════════ \*\/[\s\S]*?(?=$)/m;

const replacement = `/* ═══════════════════════════════════════════════════════════
   SALES FUNNEL OVERLAY (REPLACES CAROUSEL)
   ═══════════════════════════════════════════════════════════ */
.sales-funnel-page {
  position: absolute;
  top: 0; left: 0; width: 100%; height: 100%;
  background: rgba(13, 17, 23, 0.95);
  backdrop-filter: blur(20px);
  z-index: 100;
  overflow-y: auto;
  overflow-x: hidden;
  padding: 80px 20px;
  box-sizing: border-box;
}

.sales-funnel-page.hidden {
  display: none !important;
}

.sales-funnel__content {
  max-width: 1200px;
  margin: 0 auto;
  display: flex;
  flex-direction: column;
  gap: 80px;
}

/* HERO */
.sales-hero {
  text-align: center;
  max-width: 800px;
  margin: 0 auto;
}

.sales-hero__title {
  font-size: clamp(36px, 5vw, 64px);
  line-height: 1.1;
  margin-bottom: 24px;
  background: linear-gradient(to right, #fff, #a1a1aa);
  -webkit-background-clip: text;
  color: transparent;
  letter-spacing: -0.02em;
}

.sales-hero__subtitle {
  font-size: 18px;
  color: var(--color-slate-400);
  line-height: 1.6;
}

/* VALUE PROPS */
.sales-value-props {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 32px;
}

.sales-value-item {
  background: var(--surface-2);
  border: 1px solid var(--border-color);
  padding: 32px;
  border-radius: var(--radius-lg);
  transition: transform 0.3s ease, border-color 0.3s ease;
}

.sales-value-item:hover {
  transform: translateY(-5px);
  border-color: rgba(255,255,255,0.3);
}

.sales-value-icon {
  width: 48px;
  height: 48px;
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.05);
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 24px;
}

.sales-value-icon svg {
  color: var(--color-primary);
}

.sales-value-item h3 {
  font-size: 20px;
  margin-bottom: 12px;
  color: #fff;
}

.sales-value-item p {
  font-size: 14px;
  color: var(--color-slate-400);
  line-height: 1.6;
}

/* SHOWCASE */
.sales-showcase {
  text-align: center;
}

.sales-section-title {
  font-size: 32px;
  margin-bottom: 48px;
  color: #fff;
}

.sales-gallery {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 24px;
  align-items: flex-start;
}

.sales-gallery-col {
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.sales-img {
  width: 100%;
  border-radius: var(--radius-lg);
  border: 1px solid var(--border-color);
  box-shadow: 0 10px 40px rgba(0,0,0,0.3);
  transition: transform 0.4s ease, box-shadow 0.4s ease;
}

.sales-img:hover {
  transform: scale(1.02);
  box-shadow: 0 20px 60px rgba(0,0,0,0.5);
  border-color: rgba(255,255,255,0.2);
  z-index: 2;
  position: relative;
}

/* PRICING */
.sales-pricing {
  text-align: center;
}

.pricing-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
  gap: 24px;
  align-items: stretch;
}

.pricing-card {
  background: var(--surface-2);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-lg);
  padding: 32px 24px;
  display: flex;
  flex-direction: column;
  position: relative;
  transition: transform 0.3s ease, border-color 0.3s ease;
}

.pricing-card:hover {
  transform: translateY(-8px);
  border-color: rgba(255,255,255,0.3);
}

.pricing-card.popular {
  border-color: var(--color-primary);
  background: rgba(43, 90, 255, 0.05); /* very soft primary bg */
}

.popular-badge {
  position: absolute;
  top: -12px; left: 50%;
  transform: translateX(-50%);
  background: var(--color-primary);
  color: #fff;
  padding: 4px 12px;
  border-radius: 20px;
  font-size: 12px;
  font-weight: 600;
  letter-spacing: 0.5px;
}

.pricing-card-header {
  margin-bottom: 24px;
  text-align: left;
}

.pricing-card-header h3 {
  font-size: 18px;
  color: var(--color-slate-300);
  margin-bottom: 12px;
  text-transform: uppercase;
  letter-spacing: 1px;
}

.pricing-card-header .price {
  font-size: 42px;
  font-weight: 700;
  color: #fff;
  margin-bottom: 8px;
}

.pricing-card-header .price span {
  font-size: 16px;
  font-weight: 400;
  color: var(--color-slate-400);
}

.pricing-card-header p {
  font-size: 14px;
  color: var(--color-slate-400);
}

.pricing-features {
  list-style: none;
  padding: 0; margin: 0 0 32px 0;
  text-align: left;
  flex-grow: 1;
}

.pricing-features li {
  font-size: 14px;
  color: #fff;
  margin-bottom: 16px;
  display: flex;
  align-items: center;
  gap: 12px;
}

.pricing-features li svg {
  width: 18px; height: 18px;
  flex-shrink: 0;
}

.pricing-btn {
  width: 100%;
  padding: 14px;
  border-radius: 8px;
  font-size: 15px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
  border: none;
}

.pricing-btn--primary {
  background: var(--color-primary);
  color: #fff;
}

.pricing-btn--primary:hover {
  background: #3c6bff;
}

.pricing-btn--secondary {
  background: rgba(255,255,255,0.05);
  color: #fff;
  border: 1px solid var(--border-color);
}

.pricing-btn--secondary:hover {
  background: rgba(255,255,255,0.1);
  border-color: rgba(255,255,255,0.2);
}

.sales-footer-cta {
  text-align: center;
  padding-bottom: 40px;
}

@media (max-width: 768px) {
  .sales-gallery {
    grid-template-columns: 1fr;
  }
  .sales-gallery-col {
    margin-top: 0 !important;
  }
}
`;

if (regex.test(content)) {
  content = content.replace(regex, replacement);
} else {
  content += '\n' + replacement;
}

fs.writeFileSync(cssPath, content, 'utf8');

console.log('CSS updated');

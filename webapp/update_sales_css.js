import fs from 'fs';

const cssPath = 'src/css/supplier-engine.css';
let content = fs.readFileSync(cssPath, 'utf8');

const regex = /\/\* ═══════════════════════════════════════════════════════════\s*SALES FUNNEL OVERLAY \(REPLACES CAROUSEL\)\s*═══════════════════════════════════════════════════════════ \*\/[\s\S]*?(?=$)/m;

const replacement = `/* ═══════════════════════════════════════════════════════════
   SALES FUNNEL OVERLAY (REPLACES CAROUSEL)
   ═══════════════════════════════════════════════════════════ */
.sales-funnel-page {
  position: absolute;
  top: 0; left: 0; width: 100%; height: 100%;
  background: radial-gradient(circle at 50% 10%, rgba(43, 90, 255, 0.1) 0%, rgba(13, 17, 23, 0.95) 60%), rgba(13, 17, 23, 0.95);
  backdrop-filter: blur(24px);
  z-index: 100;
  overflow-y: auto;
  overflow-x: hidden;
  padding: 80px 20px 120px 20px;
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
  gap: 120px; /* More breathing room */
}

/* HERO */
.sales-hero {
  text-align: center;
  max-width: 850px;
  margin: 0 auto;
  display: flex;
  flex-direction: column;
  align-items: center;
  position: relative;
}

.sales-hero::after {
  content: '';
  position: absolute;
  top: -50%; left: 50%;
  transform: translateX(-50%);
  width: 600px; height: 600px;
  background: radial-gradient(circle, rgba(60, 107, 255, 0.15) 0%, transparent 60%);
  z-index: -1;
  pointer-events: none;
}

.sales-hero__title {
  font-size: clamp(42px, 6vw, 76px);
  line-height: 1.1;
  margin-bottom: 24px;
  background: linear-gradient(135deg, #ffffff 0%, #a1a1aa 100%);
  -webkit-background-clip: text;
  color: transparent;
  letter-spacing: -0.03em;
  font-weight: 800;
  text-shadow: 0 10px 30px rgba(255,255,255,0.05);
}

.sales-hero__subtitle {
  font-size: 20px;
  color: var(--color-slate-400);
  line-height: 1.6;
  max-width: 650px;
}

/* VALUE PROPS */
.sales-value-props {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
  gap: 32px;
}

.sales-value-item {
  background: rgba(255, 255, 255, 0.02);
  border: 1px solid rgba(255,255,255,0.08);
  padding: 40px;
  border-radius: var(--radius-xl);
  transition: transform 0.4s cubic-bezier(0.16, 1, 0.3, 1), border-color 0.4s ease;
  backdrop-filter: blur(10px);
}

.sales-value-item:hover {
  transform: translateY(-8px);
  border-color: rgba(60, 107, 255, 0.4);
  background: rgba(43, 90, 255, 0.03);
}

.sales-value-icon {
  width: 56px;
  height: 56px;
  border-radius: 14px;
  background: linear-gradient(135deg, rgba(43, 90, 255, 0.2) 0%, rgba(43, 90, 255, 0.05) 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 24px;
  border: 1px solid rgba(60, 107, 255, 0.2);
  box-shadow: 0 8px 24px rgba(43, 90, 255, 0.15);
}

.sales-value-icon svg {
  color: #60a5fa;
}

.sales-value-item h3 {
  font-size: 22px;
  margin-bottom: 16px;
  color: #fff;
  font-weight: 600;
}

.sales-value-item p {
  font-size: 15px;
  color: var(--color-slate-400);
  line-height: 1.7;
}

/* SHOWCASE */
.sales-showcase {
  text-align: center;
}

.sales-section-title {
  font-size: 36px;
  margin-bottom: 12px;
  color: #fff;
  font-weight: 700;
  letter-spacing: -0.02em;
}

.sales-section-subtitle {
  font-size: 18px;
  color: var(--color-slate-400);
  margin-bottom: 56px;
}

.sales-gallery {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 32px;
  align-items: flex-start;
}

.sales-gallery-col {
  display: flex;
  flex-direction: column;
  gap: 32px;
}

.sales-img {
  width: 100%;
  border-radius: var(--radius-lg);
  border: 1px solid rgba(255, 255, 255, 0.1);
  box-shadow: 0 20px 50px rgba(0,0,0,0.5);
  transition: transform 0.5s cubic-bezier(0.16, 1, 0.3, 1), box-shadow 0.5s ease;
  background: #111; /* fallback for transparent PNGs */
}

.sales-img:hover {
  transform: scale(1.03) translateY(-10px);
  box-shadow: 0 30px 80px rgba(0,0,0,0.7), 0 0 0 1px rgba(60, 107, 255, 0.3);
  z-index: 2;
  position: relative;
}

/* PRICING */
.sales-pricing {
  text-align: center;
  position: relative;
}

.sales-pricing::before {
  content: '';
  position: absolute;
  top: 20%; left: 50%;
  transform: translateX(-50%);
  width: 800px; height: 500px;
  background: radial-gradient(ellipse, rgba(43, 90, 255, 0.08) 0%, transparent 60%);
  z-index: -1;
  pointer-events: none;
}

.pricing-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 32px;
  align-items: stretch;
  max-width: 1100px;
  margin: 0 auto;
}

.pricing-card {
  background: rgba(255, 255, 255, 0.02);
  border: 1px solid rgba(255,255,255,0.08);
  border-radius: var(--radius-xl);
  padding: 40px 32px;
  display: flex;
  flex-direction: column;
  position: relative;
  transition: transform 0.4s cubic-bezier(0.16, 1, 0.3, 1), border-color 0.4s ease;
  backdrop-filter: blur(10px);
}

.pricing-card:hover {
  transform: translateY(-8px);
  border-color: rgba(255,255,255,0.2);
}

.pricing-card.popular {
  border-color: rgba(60, 107, 255, 0.5);
  background: linear-gradient(180deg, rgba(43, 90, 255, 0.05) 0%, rgba(13, 17, 23, 0) 100%);
  box-shadow: 0 20px 40px rgba(0, 0, 0, 0.4), 0 0 80px rgba(43, 90, 255, 0.1);
  transform: scale(1.05); /* Pro is slightly larger */
  z-index: 2;
}

.pricing-card.popular:hover {
  transform: scale(1.05) translateY(-8px);
  border-color: rgba(60, 107, 255, 0.8);
}

.pricing-glow {
  position: absolute;
  top: 0; left: 0; width: 100%; height: 2px;
  background: linear-gradient(90deg, transparent, var(--color-primary), transparent);
  opacity: 0.8;
}

.popular-badge {
  position: absolute;
  top: -14px; left: 50%;
  transform: translateX(-50%);
  background: linear-gradient(90deg, #3c6bff, #2563eb);
  color: #fff;
  padding: 6px 16px;
  border-radius: 20px;
  font-size: 13px;
  font-weight: 700;
  letter-spacing: 0.5px;
  text-transform: uppercase;
  box-shadow: 0 4px 12px rgba(43, 90, 255, 0.4);
}

.pricing-card-header {
  margin-bottom: 32px;
  text-align: left;
}

.pricing-card-header h3 {
  font-size: 20px;
  color: var(--color-slate-300);
  margin-bottom: 12px;
  font-weight: 600;
}

.pricing-card-header .price {
  font-size: 48px;
  font-weight: 800;
  color: #fff;
  margin-bottom: 8px;
  letter-spacing: -1px;
}

.pricing-card-header .price span {
  font-size: 18px;
  font-weight: 500;
  color: var(--color-slate-400);
}

.pricing-card-header p {
  font-size: 15px;
  color: var(--color-slate-400);
  line-height: 1.5;
}

.pricing-features {
  list-style: none;
  padding: 0; margin: 0 0 40px 0;
  text-align: left;
  flex-grow: 1;
}

.pricing-features li {
  font-size: 15px;
  color: #e2e8f0;
  margin-bottom: 20px;
  display: flex;
  align-items: flex-start;
  gap: 14px;
  line-height: 1.5;
}

.pricing-features li svg {
  width: 20px; height: 20px;
  flex-shrink: 0;
  margin-top: 2px;
  filter: drop-shadow(0 2px 4px rgba(34, 197, 94, 0.3));
}

.pricing-btn {
  width: 100%;
  padding: 16px;
  border-radius: 12px;
  font-size: 16px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
  border: none;
}

.pricing-btn--primary {
  background: linear-gradient(135deg, #3c6bff, #2563eb);
  color: #fff;
  box-shadow: 0 8px 20px rgba(43, 90, 255, 0.3);
}

.pricing-btn--primary:hover {
  filter: brightness(1.1);
  box-shadow: 0 12px 24px rgba(43, 90, 255, 0.4);
  transform: translateY(-2px);
}

.pricing-btn--secondary {
  background: rgba(255,255,255,0.05);
  color: #fff;
  border: 1px solid rgba(255,255,255,0.1);
}

.pricing-btn--secondary:hover {
  background: rgba(255,255,255,0.1);
  border-color: rgba(255,255,255,0.2);
  transform: translateY(-2px);
}

.sales-footer-cta {
  text-align: center;
  margin-top: -20px;
}

@media (max-width: 900px) {
  .pricing-grid {
    grid-template-columns: 1fr;
  }
  .pricing-card.popular {
    transform: none;
  }
  .pricing-card.popular:hover {
    transform: translateY(-8px);
  }
  .sales-gallery {
    grid-template-columns: 1fr;
  }
  .sales-gallery-col {
    margin-top: 0 !important;
  }
}
`;

content = content.replace(regex, replacement);
fs.writeFileSync(cssPath, content, 'utf8');

console.log('CSS updated');

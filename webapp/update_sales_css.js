import fs from 'fs';

const cssPath = 'src/css/supplier-engine.css';
let content = fs.readFileSync(cssPath, 'utf8');

// Replace the old showcase CSS
const regexShowcase = /\/\* SHOWCASE \*\/[\s\S]*?(?=\/\* PRICING \*\/)/m;

const showcaseReplacement = `/* SHOWCASE (MARQUEE) */
.sales-showcase {
  text-align: center;
  position: relative;
}

.sales-section-title {
  font-size: 36px;
  margin-bottom: 24px;
  color: #fff;
  font-weight: 700;
  letter-spacing: -0.02em;
}

.sales-marquee-container {
  display: flex;
  overflow: hidden;
  position: relative;
  width: 100%;
  padding: 20px 0 60px 0;
  mask-image: linear-gradient(to right, transparent, black 10%, black 90%, transparent);
  -webkit-mask-image: linear-gradient(to right, transparent, black 10%, black 90%, transparent);
}

.sales-marquee-track {
  display: flex;
  gap: 32px;
  width: fit-content;
  animation: scroll-marquee 40s linear infinite;
}

.sales-marquee-track:hover {
  animation-play-state: paused;
}

.sales-marquee-img {
  width: 500px;
  height: 300px;
  object-fit: cover;
  border-radius: var(--radius-lg);
  border: 1px solid rgba(255, 255, 255, 0.1);
  box-shadow: 0 20px 40px rgba(0,0,0,0.5);
  transition: transform 0.4s ease, box-shadow 0.4s ease;
  background: #111;
  flex-shrink: 0;
}

.sales-marquee-img:hover {
  transform: scale(1.05) translateY(-5px);
  box-shadow: 0 30px 60px rgba(0,0,0,0.7), 0 0 0 1px rgba(60, 107, 255, 0.4);
  z-index: 2;
}

@keyframes scroll-marquee {
  0% { transform: translateX(0); }
  100% { transform: translateX(calc(-50% - 16px)); }
}

`;

if (content.match(regexShowcase)) {
  content = content.replace(regexShowcase, showcaseReplacement);
}

// Add the background grid CSS right after .sales-funnel-page
const bgRegex = /\.sales-funnel-page \{[\s\S]*?\}/m;
if (content.match(bgRegex) && !content.includes('.sales-grid-bg')) {
  content = content.replace(bgRegex, `$&

.sales-grid-bg {
  position: absolute;
  top: 0; left: 0; width: 100%; height: 100%;
  z-index: 0;
  pointer-events: none;
  background-size: 80px 80px;
  background-image: 
    linear-gradient(to right, rgba(255, 255, 255, 0.03) 1px, transparent 1px),
    linear-gradient(to bottom, rgba(255, 255, 255, 0.03) 1px, transparent 1px);
  transform: perspective(1000px) rotateX(60deg) translateY(100px) scale(3.5);
  transform-origin: top center;
  mask-image: radial-gradient(ellipse at center, black 0%, transparent 80%);
  -webkit-mask-image: radial-gradient(ellipse at center, black 0%, transparent 80%);
  animation: grid-pulse 8s infinite alternate ease-in-out;
}

@keyframes grid-pulse {
  0% { opacity: 0.3; transform: perspective(1000px) rotateX(60deg) translateY(100px) scale(3.5); }
  100% { opacity: 0.6; transform: perspective(1000px) rotateX(60deg) translateY(120px) scale(3.5); }
}

.sales-funnel__content {
  position: relative;
  z-index: 10;
}`);
}

fs.writeFileSync(cssPath, content, 'utf8');
console.log('CSS updated with marquee and grid bg');

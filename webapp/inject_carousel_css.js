import fs from 'fs';

const cssPath = 'src/css/supplier-engine.css';
let content = fs.readFileSync(cssPath, 'utf8');

const cssRules = `
/* ═══════════════════════════════════════════════════════════
   CAROUSEL MODAL
   ═══════════════════════════════════════════════════════════ */
.supplier-selection__carousel-container {
  max-width: 800px;
  width: 90%;
  background: var(--surface-2);
  border-radius: var(--radius-lg);
  border: 1px solid var(--border-color);
  padding: 32px;
  display: flex;
  flex-direction: column;
  gap: 24px;
  box-shadow: 0 20px 40px rgba(0,0,0,0.4);
  position: relative;
  z-index: 101;
  text-align: center;
}

.carousel-text-area h2 {
  font-size: 28px;
  color: var(--text-color);
  margin-top: 0;
  margin-bottom: 8px;
  transition: opacity 0.4s ease;
}

.carousel-text-area p {
  font-size: 14px;
  color: var(--color-slate-400);
  line-height: 1.5;
  margin: 0 auto;
  max-width: 600px;
  transition: opacity 0.4s ease;
  min-height: 42px; /* Prevent jumping */
}

/* Fading states for text wrapper */
.carousel-text-area.fading h2,
.carousel-text-area.fading p {
  opacity: 0;
}

.carousel-track-wrapper {
  position: relative;
  width: 100%;
  border-radius: var(--radius-md);
  overflow: hidden;
  background: var(--surface-1);
  border: 1px solid var(--border-color);
}

.carousel-track {
  position: relative;
  width: 100%;
  aspect-ratio: 16/9; 
  background-color: #0b0f19; /* dark placeholder bg */
}

.carousel-slide {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  object-fit: contain; /* ensures screenshot isn't cropped */
  opacity: 0;
  transition: opacity 0.8s ease-in-out;
  pointer-events: none;
}

.carousel-slide.active {
  opacity: 1;
  pointer-events: auto;
}

.carousel-dots {
  position: absolute;
  bottom: 12px;
  left: 0;
  width: 100%;
  display: flex;
  justify-content: center;
  gap: 8px;
  z-index: 10;
}

.carousel-dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.3);
  border: none;
  cursor: pointer;
  transition: background 0.3s ease, transform 0.3s ease;
}

.carousel-dot:hover {
  background: rgba(255, 255, 255, 0.6);
}

.carousel-dot.active {
  background: var(--color-primary);
  transform: scale(1.2);
}

.carousel-cta-area {
  margin-top: 8px;
}
`;

// remove old .supplier-selection__container if exists and replace with this at the end
// Actually I'll just append it to the end.
content += cssRules;
fs.writeFileSync(cssPath, content, 'utf8');

console.log('CSS updated');

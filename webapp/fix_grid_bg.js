import fs from 'fs';

const cssPath = 'src/css/supplier-engine.css';
let css = fs.readFileSync(cssPath, 'utf8');

if (!css.includes('.sales-grid-bg {')) {
  css += `
/* =========================================================
   Animated Perspective Grid Background
   ========================================================= */
.sales-funnel-page {
  position: relative;
  overflow-x: hidden;
  background-color: transparent; /* allow page body color to show or force slate 950 */
}

/* Creates the container with actual perspective */
.sales-grid-bg {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  z-index: 0;
  opacity: 0.5;
  perspective: 1000px;
  pointer-events: none;
  overflow: hidden;
}

/* The infinite moving grid floor */
.sales-grid-bg::after {
  content: "";
  position: absolute;
  width: 200vw;
  height: 200vh;
  left: -50vw;
  top: -50vh;
  
  /* Creates the 2D grid texture */
  background-image: 
    linear-gradient(rgba(31, 111, 235, 0.4) 1px, transparent 1px),
    linear-gradient(90deg, rgba(31, 111, 235, 0.4) 1px, transparent 1px);
  background-size: 80px 80px;
  
  /* Tilts the floor backwards to infinity */
  transform: rotateX(75deg);
  transform-origin: center center;
  
  animation: funnelGridContinuous 12s linear infinite;
}

/* Radial fade mask to make it look like it's drifting into fog/shadow at the edges */
.sales-grid-bg::before {
  content: "";
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: radial-gradient(circle at center, transparent 0%, var(--color-slate-950) 60%);
  z-index: 1;
}

/* Continuous movement along the tilted plane */
@keyframes funnelGridContinuous {
  0% { transform: rotateX(75deg) translateY(0); }
  100% { transform: rotateX(75deg) translateY(80px); } /* exactly one square size */
}

/* Ensure the text and cards sit on top of the grid */
.sales-funnel__content {
  position: relative;
  z-index: 2;
}
`;

  fs.writeFileSync(cssPath, css, 'utf8');
  console.log('Injected .sales-grid-bg CSS');
} else {
  console.log('Grid bg already present');
}

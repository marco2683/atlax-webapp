import fs from 'fs';

const jsPath = 'src/js/supplier-engine.js';
let content = fs.readFileSync(jsPath, 'utf8');

// Replace standard document selections
const oldListeners = /document\.getElementById\('card-select-table'\)\?\.addEventListener\('click', openTabularView\);[\s\S]*?document\.getElementById\('card-select-globe'\)\?\.addEventListener\('click', openGlobeView\);/m;

const newListeners = `// --- CAROUSEL LOGIC ---
  const carouselTrack = document.getElementById('onboarding-carousel');
  const slides = carouselTrack?.querySelectorAll('.carousel-slide');
  const dots = document.querySelectorAll('.carousel-dot');
  const titleEl = document.getElementById('carousel-title');
  const descEl = document.getElementById('carousel-desc');
  const textArea = document.querySelector('.carousel-text-area');
  
  if (slides && slides.length > 0) {
    let currentSlide = 0;
    let carouselInterval;
    
    function updateSlide(index) {
      if (index === currentSlide) return;
      
      // Fade text out
      textArea.classList.add('fading');
      
      setTimeout(() => {
        // change active slide
        slides[currentSlide].classList.remove('active');
        dots[currentSlide].classList.remove('active');
        
        currentSlide = index;
        
        slides[currentSlide].classList.add('active');
        dots[currentSlide].classList.add('active');
        
        // update text
        const newTitle = slides[currentSlide].getAttribute('data-title');
        const newDesc = slides[currentSlide].getAttribute('data-desc');
        titleEl.textContent = newTitle;
        descEl.textContent = newDesc;
        
        // fade back in
        textArea.classList.remove('fading');
      }, 400); // matches CSS transition
    }
    
    function nextSlide() {
      let next = currentSlide + 1;
      if (next >= slides.length) next = 0;
      updateSlide(next);
    }
    
    // Auto loop
    carouselInterval = setInterval(nextSlide, 4500);
    
    // Dot clicks
    dots.forEach(dot => {
      dot.addEventListener('click', () => {
        clearInterval(carouselInterval);
        const idx = parseInt(dot.getAttribute('data-index'), 10);
        updateSlide(idx);
        carouselInterval = setInterval(nextSlide, 4500);
      });
    });
    
    // Enter button triggers tabular view by default
    document.getElementById('btn-enter-platform')?.addEventListener('click', () => {
      openTabularView();
    });
  }`;

content = content.replace(oldListeners, newListeners);
fs.writeFileSync(jsPath, content, 'utf8');

console.log('JS Carousel logic injected');

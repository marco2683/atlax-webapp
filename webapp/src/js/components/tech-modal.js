import { TECH_DESCRIPTIONS } from '../data/technologies.js';

let currentImages = [];
let currentIndex = 0;

export function initTechModal() {
  document.getElementById('tech-modal-close')?.addEventListener('click', closeTechModal);
  document.getElementById('tech-modal-prev')?.addEventListener('click', () => navigateCarousel(-1));
  document.getElementById('tech-modal-next')?.addEventListener('click', () => navigateCarousel(1));
  
  // Close on backdrop click
  document.getElementById('tech-modal')?.addEventListener('click', (e) => {
    if (e.target.id === 'tech-modal') closeTechModal();
  });
}

export function openTechModal(techName) {
  const modal = document.getElementById('tech-modal');
  const title = document.getElementById('tech-modal-title');
  const text = document.getElementById('tech-modal-text');
  
  if (!modal || !title || !text) return;

  const data = TECH_DESCRIPTIONS[techName] || TECH_DESCRIPTIONS['default'];
  
  title.textContent = techName;
  text.textContent = data.desc;
  
  currentImages = data.images || [];
  currentIndex = 0;
  
  updateCarousel();
  
  modal.classList.remove('hidden');
}

function closeTechModal() {
  document.getElementById('tech-modal')?.classList.add('hidden');
}

function navigateCarousel(dir) {
  if (currentImages.length <= 1) return;
  currentIndex = (currentIndex + dir + currentImages.length) % currentImages.length;
  updateCarousel();
}

function updateCarousel() {
  const imgEL = document.getElementById('tech-modal-img');
  const dotsContainer = document.getElementById('tech-modal-dots');
  
  if (!imgEL || !dotsContainer) return;
  
  if (currentImages.length > 0) {
    imgEL.src = currentImages[currentIndex];
    imgEL.style.display = 'block';
  } else {
    imgEL.style.display = 'none';
  }
  
  // Update dots
  dotsContainer.innerHTML = '';
  if (currentImages.length > 1) {
    currentImages.forEach((_, i) => {
      const dot = document.createElement('span');
      dot.className = `tech-dot ${i === currentIndex ? 'active' : ''}`;
      dotsContainer.appendChild(dot);
    });
  }
}

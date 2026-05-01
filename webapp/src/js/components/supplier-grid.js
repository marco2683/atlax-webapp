/* ============================================================
   PRD — Supplier Grid Modal
   Updated: 2026-04-01 – shortlist buttons, narrow width, transparency
   ============================================================ */

import { openSupplierCarousel } from './supplier-carousel.js';

/**
 * Proxy insecure (http://) image URLs through images.weserv.nl
 * so they load on our HTTPS site without mixed-content blocking.
 */
function safeImgUrl(url) {
  if (!url) return '';
  if (url.startsWith('https://') || url.startsWith('/') || url.startsWith('data:')) return url;
  if (url.startsWith('http://')) {
    return `https://images.weserv.nl/?url=${encodeURIComponent(url)}`;
  }
  return url;
}

const POOL_IMAGES = [
  'https://images.unsplash.com/photo-1565043589221-1a6fd9ae45c7?w=400&q=80',
  'https://images.unsplash.com/photo-1581091226825-a6a2a5aee158?w=400&q=80',
  'https://images.unsplash.com/photo-1504328345606-18bbc8c9d7d1?w=400&q=80',
  'https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?w=400&q=80',
  'https://images.unsplash.com/photo-1563906267088-b029e7101114?w=400&q=80',
  'https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=400&q=80',
  'https://images.unsplash.com/photo-1567789884554-0b844b597180?w=400&q=80',
  'https://images.unsplash.com/photo-1537462715879-360eeb61a0ad?w=400&q=80',
  'https://images.unsplash.com/photo-1558618666-fcd25c85f82e?w=400&q=80',
  'https://images.unsplash.com/photo-1581092160562-40aa08e78837?w=400&q=80',
  'https://images.unsplash.com/photo-1581092918056-0c4c3acd3789?w=400&q=80',
  'https://images.unsplash.com/photo-1581092795360-fd1ca04f0952?w=400&q=80',
  'https://images.unsplash.com/photo-1504917595217-d4dc5ebe6122?w=400&q=80',
  'https://images.unsplash.com/photo-1621905252507-b35492cc74b4?w=400&q=80',
  'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=400&q=80',
  'https://images.unsplash.com/photo-1587293852726-70cdb56c2866?w=400&q=80',
];

const QUALITY_SYSTEMS = [
  'ISO 9001', 'ISO 14001', 'IATF 16949', 'ISO 13485',
  'AS9100', 'UL Listed', 'CE', 'RoHS',
];

const PRODUCTION_SCALES = [
  { label: 'Prototype', minScore: 0 },
  { label: 'Low Volume', minScore: 50 },
  { label: 'Mid Volume', minScore: 65 },
  { label: 'High Volume', minScore: 78 },
  { label: 'Mass Production', minScore: 88 },
];

let allSuppliers = [];
let currentTechName = '';
let activeRegions = new Set();
let activeQuality = new Set();
let activeScales = new Set();

function getThumbStack(supplierIndex) {
  const base = (supplierIndex * 5) % POOL_IMAGES.length;
  const thumbs = [];
  for (let i = 0; i < 4; i++) {
    thumbs.push(POOL_IMAGES[(base + i + 1) % POOL_IMAGES.length]);
  }
  return thumbs;
}

export function initSupplierGrid() {
  document.getElementById('supplier-grid-close')?.addEventListener('click', closeSupplierGrid);
  document.getElementById('supplier-grid-backdrop')?.addEventListener('click', closeSupplierGrid);

  document.addEventListener('keydown', (e) => {
    const modal = document.getElementById('supplier-grid-modal');
    if (modal && !modal.classList.contains('hidden') && e.key === 'Escape') {
      closeSupplierGrid();
    }
  });
}

export function openSupplierGrid(techName, suppliers) {
  currentTechName = techName;
  allSuppliers = suppliers;
  activeRegions.clear();
  activeQuality.clear();
  activeScales.clear();

  const backdrop = document.getElementById('supplier-grid-backdrop');
  const modal = document.getElementById('supplier-grid-modal');
  const title = document.getElementById('supplier-grid-title');
  const body = document.getElementById('supplier-grid-body');

  if (!modal || !body) {
    console.warn('[Atlas DT] Supplier grid modal not found in DOM');
    openSupplierCarousel(techName, suppliers);
    return;
  }

  const displayTitle = techName.length < 3 || techName === techName.toLowerCase() ? `Search Results: "${techName}"` : techName;
  title.textContent = `${displayTitle} — ${suppliers.length} Supplier${suppliers.length !== 1 ? 's' : ''}`;

  const regions = [...new Set(suppliers.map(s => s.country).filter(Boolean))].sort();

  renderFilters(regions);
  renderGridCards(suppliers);

  backdrop?.classList.remove('hidden');
  modal.classList.remove('hidden');
}

function renderFilters(regions) {
  const modal = document.getElementById('supplier-grid-modal');
  const existingFilters = modal.querySelector('.supplier-grid__filters');
  if (existingFilters) existingFilters.remove();

  const filterBar = document.createElement('div');
  filterBar.className = 'supplier-grid__filters';

  const regionChips = regions.map(r =>
    `<button class="sgrid-chip" data-filter-type="region" data-value="${r}">${r}</button>`
  ).join('');

  const qualityChips = QUALITY_SYSTEMS.map(q =>
    `<button class="sgrid-chip" data-filter-type="quality" data-value="${q}">${q}</button>`
  ).join('');

  const scaleChips = PRODUCTION_SCALES.map(s =>
    `<button class="sgrid-chip" data-filter-type="scale" data-value="${s.label}">${s.label}</button>`
  ).join('');

  filterBar.innerHTML = `
    <div class="sgrid-filter-grid">
      <div class="sgrid-filter-group">
        <span class="sgrid-filter-label">Select Region</span>
        <div class="sgrid-chips-row">${regionChips}</div>
      </div>
      <div class="sgrid-filter-group">
        <span class="sgrid-filter-label">Quality System</span>
        <div class="sgrid-chips-row">${qualityChips}</div>
      </div>
      <div class="sgrid-filter-group">
        <span class="sgrid-filter-label">Production Scale</span>
        <div class="sgrid-chips-row">${scaleChips}</div>
      </div>
      <div class="sgrid-filter-group">
        <span class="sgrid-filter-label">Search Tags</span>
        <div class="sgrid-search-box">
          <input type="text" class="sgrid-filter-search" id="sgrid-filter-tags" placeholder="Filter by name, technology, or keyword…" />
          <span class="sgrid-filter-count" id="sgrid-filter-count">${allSuppliers.length} results</span>
        </div>
      </div>
    </div>
  `;

  const header = modal.querySelector('.supplier-grid__header');
  header.after(filterBar);

  filterBar.querySelectorAll('.sgrid-chip').forEach(chip => {
    chip.addEventListener('click', () => {
      const type = chip.dataset.filterType;
      const value = chip.dataset.value;
      chip.classList.toggle('sgrid-chip--active');
      const setMap = { region: activeRegions, quality: activeQuality, scale: activeScales };
      const targetSet = setMap[type];
      if (targetSet) {
        targetSet.has(value) ? targetSet.delete(value) : targetSet.add(value);
      }
      applyFilters();
    });
  });

  filterBar.querySelector('#sgrid-filter-tags').addEventListener('input', () => applyFilters());
}

function applyFilters() {
  const tagVal = (document.getElementById('sgrid-filter-tags')?.value || '').toLowerCase().trim();
  let filtered = allSuppliers;

  if (activeRegions.size > 0) {
    filtered = filtered.filter(s => activeRegions.has(s.country));
  }
  if (activeQuality.size > 0) {
    filtered = filtered.filter(s => {
      const score = s.factoryScore || 0;
      return [...activeQuality].some(cert => score >= getMinScoreForCert(cert.toLowerCase()));
    });
  }
  if (activeScales.size > 0) {
    filtered = filtered.filter(s => {
      const score = s.factoryScore || 0;
      return [...activeScales].some(scaleName => {
        const scale = PRODUCTION_SCALES.find(ps => ps.label === scaleName);
        return scale && score >= scale.minScore;
      });
    });
  }
  if (tagVal) {
    filtered = filtered.filter(s => {
      const text = `${s.name} ${(s.techGroups || [s.techGroup]).filter(Boolean).join(' ')} ${(s.technologies || []).join(' ')} ${s.city} ${s.country} ${s.description || ''}`.toLowerCase();
      return text.includes(tagVal);
    });
  }

  renderGridCards(filtered);
  const countEl = document.getElementById('sgrid-filter-count');
  if (countEl) countEl.textContent = `${filtered.length} result${filtered.length !== 1 ? 's' : ''}`;
}

function getMinScoreForCert(cert) {
  const map = {
    'iso 9001': 60, 'iso 14001': 65, 'iatf 16949': 85,
    'iso 13485': 88, 'as9100': 89, 'ul listed': 82,
    'ce': 70, 'rohs': 65,
  };
  return map[cert] || 75;
}

function renderGridCards(suppliers) {
  const body = document.getElementById('supplier-grid-body');
  if (!body) return;
  body.innerHTML = '';

  if (suppliers.length === 0) {
    body.innerHTML = `
      <div style="grid-column: 1 / -1; text-align: center; padding: 60px 20px; color: #94a3b8;">
        <div style="font-size: 32px; margin-bottom: 12px;">🔍</div>
        <div style="font-size: 14px; color: #64748b;">No suppliers match your filters</div>
        <div style="font-size: 12px; margin-top: 6px; color: #94a3b8;">Try deselecting some chips</div>
      </div>
    `;
    return;
  }

  const DEFAULT_BANNER = 'https://images.unsplash.com/photo-1565043589221-1a6fd9ae45c7?w=1200&q=80';
  
  suppliers.forEach((s, index) => {
    let images = [];
    if (s.banner) images.push(s.banner);
    else if (s.bannerImage) images.push(s.bannerImage);
    
    if (s.images) {
      if (s.images.product) images.push(...s.images.product);
      if (s.images.facility) images.push(...s.images.facility);
      if (s.images.equipment) images.push(...s.images.equipment);
    }
    
    // Filter out empty/whitespace-only URLs
    images = images.filter(u => u && u.trim());
    
    if (images.length === 0) images.push(DEFAULT_BANNER);
    
    // limit grid preview to max 4 images
    images = images.slice(0, 4);

    const techTags = (s.technologies || []).slice(0, 3).map(t => `<span class="sgrid-tag">${t}</span>`).join('');

    let scoreColor = '#6b7280';
    if (s.factoryScore >= 90) scoreColor = '#10b981';
    else if (s.factoryScore >= 80) scoreColor = '#3b82f6';
    else if (s.factoryScore >= 70) scoreColor = '#f59e0b';

    const card = document.createElement('div');
    card.className = 'sgrid-card';
    card.style.animationDelay = `${(index % 12) * 40}ms`;

    const isAdded = Array.from(document.querySelectorAll('.shortlist-item')).some(item => item.dataset.id === String(s.id || s.name));

    // Build image mosaic HTML (2x2 grid, max 4 images)
    let mosaicHtml = '';
    if (images.length > 0) {
      const imgCount = Math.min(images.length, 4);
      // Dynamic grid: 1 image = full, 2 = side by side, 3 = 1 big + 2 small, 4 = 2x2
      const gridStyle = imgCount === 1
        ? 'grid-template-columns: 1fr; grid-template-rows: 140px;'
        : imgCount === 2
        ? 'grid-template-columns: 1fr 1fr; grid-template-rows: 140px;'
        : imgCount === 3
        ? 'grid-template-columns: 1fr 1fr; grid-template-rows: 90px 90px;'
        : 'grid-template-columns: 1fr 1fr; grid-template-rows: 90px 90px;';

      const imgTiles = images.slice(0, 4).map((url, i) => {
        // For 3 images, first image spans 2 rows
        const spanStyle = (imgCount === 3 && i === 0) ? 'grid-row: 1 / 3;' : '';
        return `<div style="overflow:hidden; border-radius:6px; ${spanStyle}">
          <img src="${safeImgUrl(url)}" alt="Supplier image" style="width:100%; height:100%; object-fit:cover; display:block; transition: transform 0.3s ease;" 
               onmouseover="this.style.transform='scale(1.05)'" onmouseout="this.style.transform='scale(1)'"
               onerror="this.parentElement.style.background='#f1f5f9'; this.style.display='none';">
        </div>`;
      }).join('');

      mosaicHtml = `
        <div style="display:grid; ${gridStyle} gap:4px; margin-bottom:16px; border-radius:8px; overflow:hidden;">
          ${imgTiles}
        </div>`;
    }

    card.innerHTML = `
      <div class="sgrid-card__body">
        <!-- Row 1: Name + Best For -->
        <div style="display: flex; justify-content: space-between; align-items: flex-start; gap: 12px; margin-bottom: 16px;">
          <div style="min-width: 0; flex: 1;">
            <h3 class="sgrid-card__name">${s.name}</h3>
            <div class="sgrid-card__location">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="vertical-align: -2px;"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
              ${s.city || '—'}, ${s.country || '—'}
            </div>
          </div>
          ${(s.bestFor && s.bestFor.length > 0) || (s.technologies && s.technologies.length > 0) ? `
          <div style="background: #f0fdf4; color: #166534; padding: 6px 10px; border-radius: 6px; font-size: 10px; font-weight: 800; border: 1px solid #bbf7d0; text-transform: uppercase; letter-spacing: 0.04em; flex-shrink: 0; max-width: 180px; line-height: 1.5; text-align: center;">
            <span style="color: #22c55e;">★</span> BEST FOR<br><span style="font-size: 11px; color: #15803d;">${(s.bestFor && s.bestFor[0]) || s.technologies[0]}</span>
          </div>` : ''}
        </div>

        <!-- Row 2: Sub-Technologies + Image Mosaic -->
        <div style="display: flex; gap: 16px; align-items: flex-start; margin-bottom: 16px;">
          <div style="flex: 1; min-width: 0;">
            <div style="font-size: 10px; font-weight: 800; color: #94a3b8; text-transform: uppercase; margin-bottom: 8px; letter-spacing: 0.06em;">Sub-Technologies</div>
            <div class="sgrid-card__tags">
              ${(s.technologies || []).slice(0, 5).map(t => `<span class="sgrid-tag">${t}</span>`).join('')}
            </div>
          </div>
          ${mosaicHtml ? `<div style="flex: 0 0 220px;">${mosaicHtml}</div>` : ''}
        </div>

        <!-- Row 3: Description -->
        <p class="sgrid-card__desc">${(s.description || '').slice(0, 160)}${(s.description || '').length > 160 ? '…' : ''}</p>
      </div>

      <!-- Action bar -->
      <div class="sgrid-card__actions">
        <button class="sgrid-card__shortlist-btn ${isAdded ? 'sgrid-card__shortlist-btn--added' : ''}" data-supplier-id="${s.id || s.name}">
          ${isAdded ? '<span style="display:flex;align-items:center;gap:6px;"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><polyline points="20 6 9 17 4 12"></polyline></svg> ADDED</span>' : '<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg> <span>SHORTLIST</span>'}
        </button>
        <button class="sgrid-card__details-btn">
          <span>VIEW DETAILS</span> →
        </button>
      </div>
    `;




    // Shortlist button - toggles persistent state
    card.querySelector('.sgrid-card__shortlist-btn').addEventListener('click', (e) => {
      e.stopPropagation();
      const btn = e.currentTarget;
      const isCurrentlyAdded = btn.classList.contains('sgrid-card__shortlist-btn--added');

      if (isCurrentlyAdded) {
        // Find index of shortlist item to remove
        const items = Array.from(document.querySelectorAll('.shortlist-item'));
        const idx = items.findIndex(item => item.dataset.id === String(s.id || s.name));
        if (idx !== -1) {
          window.dispatchEvent(new CustomEvent('prd-remove-from-shortlist', { detail: { index: idx } }));
        }
        btn.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg> <span>SHORTLIST</span>`;
        btn.classList.remove('sgrid-card__shortlist-btn--added');
      } else {
        window.dispatchEvent(new CustomEvent('prd-add-to-shortlist', {
          detail: { supplier: s, techName: currentTechName }
        }));
        btn.innerHTML = '<span>✓ ADDED</span>';
        btn.classList.add('sgrid-card__shortlist-btn--added');
      }
    });

    // Details button → open the single-supplier detail modal
    card.querySelector('.sgrid-card__details-btn').addEventListener('click', (e) => {
      e.stopPropagation();
      const reordered = [s, ...allSuppliers.filter(sup => sup !== s)];
      openSupplierCarousel(currentTechName, reordered);
    });

    // Card click → also open detail
    card.addEventListener('click', (e) => {
      if (e.target.closest('.sgrid-card__shortlist-btn') || e.target.closest('.sgrid-card__details-btn')) return;
      const reordered = [s, ...allSuppliers.filter(sup => sup !== s)];
      openSupplierCarousel(currentTechName, reordered);
    });

    body.appendChild(card);
  });

  body.scrollTop = 0;
}

export function closeSupplierGrid() {
  document.getElementById('supplier-grid-backdrop')?.classList.add('hidden');
  document.getElementById('supplier-grid-modal')?.classList.add('hidden');
}


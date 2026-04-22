import { MOCK_DESIGNERS } from '../data/mock-designers.js';
import { MOCK_JOBS } from '../data/mock-jobs.js';
import { MOCK_ESTIMATOR_PRODUCTS } from '../data/mock-estimator.js';

let shortlist = [];
let selectedEstimatorProduct = null;
let activeFilter = 'All Talent';
let searchQuery = '';
let scenarioState = {}; // { 'Phase Name': { active: true, alloc: 1.0, offWorkers: [] } }

/* ── CATEGORY FILTERS ─────────────────────────────────────── */
const FILTER_CATEGORIES = {
  'All Talent': () => true,
  'Industrial Design': d => d.tags.some(t => ['Consumer Electronics', 'Wearables', 'Industrial Design', 'Packaging'].includes(t)),
  'Mechanical Eng': d => d.tags.some(t => ['Injection Molding', 'Tooling', 'CNC', 'GD&T', 'Ansys', 'ISTA Testing'].includes(t)),
  'Electrical Eng': d => d.tags.some(t => ['PCBA', 'Altium', 'Firmware', 'IoT', 'BLE/WiFi', 'FCC Cert'].includes(t)),
  'UI/UX': d => d.tags.some(t => ['UI/UX', 'Figma', 'HMI Design', 'Embedded UI', 'User Research'].includes(t)),
};

export function initDesignersController() {
  const container = document.getElementById('designers-engine');
  if (!container) return;

  container.innerHTML = `
    <div class="de-header m-fade-up">
      <h1>Find Designers &amp; Engineers or Post Your Job</h1>
      <p id="de-header-desc" style="color: var(--color-steel-300); font-size: 1.1rem; margin-top: 12px; margin-bottom: 24px; max-width: 600px; margin-left: auto; margin-right: auto; line-height: 1.5;"></p>
      <div class="de-toggle-group" id="de-main-toggle">
        <button class="de-toggle-btn active" data-mode="hire">Hire Talent</button>
        <button class="de-toggle-btn" data-mode="work">Find Work</button>
      </div>
    </div>

    <div class="de-workspace m-fade-up" id="de-workspace" style="transition-delay: 150ms;"></div>
  `;

  // Inject modals into body so position:fixed is relative to the true viewport
  if (!document.getElementById('de-modal-backdrop')) {
    document.body.insertAdjacentHTML('beforeend', `
      <div class="de-modal-backdrop hidden" id="de-modal-backdrop"></div>
      <div class="de-profile-modal hidden" id="de-profile-modal"></div>
      <div class="de-post-job-modal hidden" id="de-post-job-modal"></div>
      <div class="de-proposal-modal hidden" id="de-proposal-modal"></div>
    `);
  }


  const toggleBtns = container.querySelectorAll('.de-toggle-btn');
  const workspace = document.getElementById('de-workspace');
  const backdrop = document.getElementById('de-modal-backdrop');

  // Close any open modal on backdrop click
  backdrop.addEventListener('click', closeAllModals);

  function setMode(mode) {
    toggleBtns.forEach(btn => btn.classList.toggle('active', btn.dataset.mode === mode));
    
    const desc = document.getElementById('de-header-desc');
    if (mode === 'hire') {
      if (desc) desc.innerHTML = 'Browse our curated network of highly vetted Industrial Designers, Mechanical Engineers, and UI/UX specialists ready to bring your vision to life.';
      renderHireView(workspace);
    } else {
      if (desc) desc.innerHTML = 'Submit your project details and allow top-tier hardware professionals to submit proposals and bids directly to your workspace.';
      renderWorkView(workspace);
    }
  }

  toggleBtns.forEach(btn => btn.addEventListener('click', () => setMode(btn.dataset.mode)));
  setMode('hire');
}

/* ── CLOSE MODALS ─────────────────────────────────────────── */
function closeAllModals() {
  document.getElementById('de-modal-backdrop')?.classList.add('hidden');
  document.getElementById('de-profile-modal')?.classList.add('hidden');
  document.getElementById('de-post-job-modal')?.classList.add('hidden');
  document.getElementById('de-proposal-modal')?.classList.add('hidden');
}

function openModal(id) {
  document.getElementById('de-modal-backdrop')?.classList.remove('hidden');
  document.getElementById(id)?.classList.remove('hidden');
}

/* ── HIRE VIEW ────────────────────────────────────────────── */
function renderHireView(workspace) {
  workspace.innerHTML = `
    <div class="de-hire-layout">
      <aside class="de-sidebar" id="de-sidebar-container"></aside>

      <div class="de-main-content">
        <div class="de-toolbar" style="display: flex; flex-wrap: wrap; gap: 16px; justify-content: space-between; align-items: center; margin-bottom: 24px;">
          <div class="de-filters" id="de-filters" style="display: flex; gap: 8px; flex-wrap: wrap; flex: 1;">
            ${Object.keys(FILTER_CATEGORIES).map(cat =>
    `<button class="de-filter-chip ${cat === activeFilter ? 'active' : ''}" data-filter="${cat}">${cat}</button>`
  ).join('')}
          </div>
          <div style="position: relative; max-width: 320px; width: 100%; flex-shrink: 0;">
            <svg style="position: absolute; left: 14px; top: 50%; transform: translateY(-50%); color: var(--color-steel-400);" xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
            <input type="text" id="de-search-input" placeholder="Search skills, tags, names..." style="width: 100%; border: 1px solid rgba(255,255,255,0.1); background: rgba(0,0,0,0.2); color: var(--color-white); border-radius: 8px; padding: 10px 14px 10px 38px; outline: none; font-size: 0.95rem; transition: border-color 0.2s;" onfocus="this.style.borderColor='var(--color-electric)'" onblur="this.style.borderColor='rgba(255,255,255,0.1)'">
          </div>
          <button class="de-post-job-btn" id="de-post-job-trigger" style="flex-shrink: 0;">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
            Post a Job
          </button>
        </div>
        <div class="de-grid-carousel" id="de-grid-container"></div>
      </div>
    </div>
  `;

  // Filter chips
  document.getElementById('de-filters').addEventListener('click', e => {
    const chip = e.target.closest('.de-filter-chip');
    if (!chip) return;
    activeFilter = chip.dataset.filter;
    document.querySelectorAll('.de-filter-chip').forEach(c => c.classList.toggle('active', c.dataset.filter === activeFilter));
    updateGrid();
  });

  // Search input
  const searchInput = document.getElementById('de-search-input');
  if (searchInput) {
    searchInput.addEventListener('input', (e) => {
      searchQuery = e.target.value.toLowerCase().trim();
      updateGrid();
    });
  }

  // Post a Job button
  document.getElementById('de-post-job-trigger')?.addEventListener('click', showPostJobModal);

  updateSidebar();
  updateGrid();
}

/* ── SIDEBAR ──────────────────────────────────────────────── */
function updateSidebar() {
  const container = document.getElementById('de-sidebar-container');
  if (!container) return;

  let totalRate = shortlist.reduce((sum, d) => {
    const val = parseFloat(d.rate.replace(/[^0-9.]/g, ''));
    return sum + (isNaN(val) ? 0 : val);
  }, 0);

  const shortlistHtml = shortlist.length === 0
    ? `<div class="de-shortlist-empty">
         <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" opacity="0.3"><circle cx="12" cy="8" r="4"/><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7"/></svg>
         <span>No designers selected.<br>Click "Add to Team" on any card.</span>
       </div>`
    : shortlist.map(d => `
        <div class="de-shortlist-item">
          <div class="de-shortlist-avatar" style="background-image: url('${d.avatar}')"></div>
          <div class="de-shortlist-info">
            <div class="de-shortlist-name">${d.name}</div>
            <div class="de-shortlist-role">${d.title}</div>
          </div>
          <div class="de-shortlist-rate">${d.rate}/hr</div>
          <button class="de-shortlist-remove" data-id="${d.id}" title="Remove">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
        </div>
      `).join('');

  container.innerHTML = `
    <div class="de-sidebar-inner">
      <div class="de-sidebar-header">
        <h2>Build Your Team</h2>
        <p>Shortlist experts to assemble your product development squad.</p>
      </div>

      <div class="de-shortlist">${shortlistHtml}</div>

      ${shortlist.length > 0 ? `
        <div class="de-total-rate">
          <span class="de-total-rate-label">Combined Rate</span>
          <span class="de-total-rate-value">$${totalRate}<span style="font-size:14px;font-weight:normal;color:var(--color-steel-400)">/hr</span></span>
        </div>
        ${estimatorResult ? `
          <div class="de-total-project-cost" style="margin-top: 12px; padding: 12px; background: rgba(59,130,246,0.1); border-radius: 8px; border: 1px solid rgba(59,130,246,0.2);">
            <div style="font-size:11px; text-transform:uppercase; color:var(--color-electric); font-weight:bold; margin-bottom: 4px;">Est. Project Cost</div>
            <div id="de-sidebar-total-cost" style="font-size:24px; font-weight:900; color:#fff;">
              <!-- Handled in updateSidebar after render -->
            </div>
          </div>
        ` : ''}
        <button class="de-sidebar-contact-btn" id="de-contact-team-btn" style="margin-top:20px;">
          <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>
          Contact Team (${shortlist.length})
        </button>
      ` : ''}
    </div>
  `;

  container.querySelectorAll('.de-shortlist-remove').forEach(btn => {
    btn.addEventListener('click', e => {
      shortlist = shortlist.filter(d => d.id !== e.currentTarget.dataset.id);
      updateSidebar();
      updateGrid();
      updateEstimator();
      updateScenarioPlanner();
    });
  });

  document.getElementById('de-contact-team-btn')?.addEventListener('click', () => {
    showContactTeamModal();
  });

  // Calculate and inject total project cost dynamically based on current allocations
  const costDiv = document.getElementById('de-sidebar-total-cost');
  if (costDiv && estimatorResult) {
    const totalProjectCost = estimatorResult.phases.reduce((sum, ph) => {
      const state = scenarioState[ph.name] || { active: true, alloc: 1.0, offWorkers: [] };
      if (!state.active || shortlist.length === 0) return sum;
      let phaseRate = 0;
      shortlist.forEach(member => {
         if (!state.offWorkers.includes(member.name)) {
            const val = parseFloat(member.rate.replace(/[^0-9.]/g, ''));
            phaseRate += (isNaN(val) ? 0 : val);
         }
      });
      return sum + (ph.hours * (phaseRate * state.alloc));
    }, 0);
    costDiv.textContent = '$' + Math.round(totalProjectCost).toLocaleString();
  }
}

/* ── TALENT GRID ──────────────────────────────────────────── */
function updateGrid() {
  const container = document.getElementById('de-grid-container');
  if (!container) return;

  const filterFn = FILTER_CATEGORIES[activeFilter] || (() => true);
  const filtered = MOCK_DESIGNERS.filter(d => {
    if (!filterFn(d)) return false;
    if (searchQuery) {
      const q = searchQuery;
      return (
        d.name.toLowerCase().includes(q) ||
        d.title.toLowerCase().includes(q) ||
        d.tags.some(t => t.toLowerCase().includes(q))
      );
    }
    return true;
  });

  if (filtered.length === 0) {
    container.innerHTML = `<div class="de-empty-state">No designers match this filter.</div>`;
    return;
  }

  container.innerHTML = filtered.map(d => {
    const isAdded = shortlist.some(s => s.id === d.id);
    const stars = renderStars(parseFloat(d.rating));
    return `
      <div class="de-designer-card minimalist-card" data-id="${d.id}">
        <img src="${d.avatar}" alt="${d.name}" class="minimalist-card-img" onerror="this.src='https://ui-avatars.com/api/?name=${encodeURIComponent(d.name)}&background=random'">
        <h3 class="minimalist-card-name">${d.name}</h3>
        <p class="minimalist-card-title">${d.title}</p>
        
        <div style="display: flex; gap: 6px; flex-wrap: wrap; justify-content: center; margin-bottom: 24px;">
          ${d.tags.slice(0, 3).map(t => `<span class="minimalist-card-tag">${t}</span>`).join('')}
          ${d.tags.length > 3 ? `<span class="minimalist-card-tag">+${d.tags.length - 3}</span>` : ''}
        </div>
        
        <div class="minimalist-card-footer">
          <div style="text-align: left;">
            <span class="minimalist-card-rate-label">Hourly Rate</span>
            <span class="minimalist-card-rate-val">${d.rate}</span>
          </div>
          <div style="display: flex; gap: 8px;">
            <button class="de-btn-message" data-id="${d.id}" style="background: transparent; color: #c4b5fd; border: 1px solid rgba(139,92,246,0.3); padding: 8px 12px; border-radius: 6px; font-weight: 600; font-size: 0.85rem; cursor: pointer; transition: all 0.2s;" onmouseover="this.style.background='rgba(139,92,246,0.1)'" onmouseout="this.style.background='transparent'" title="Contact Designer">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="vertical-align: middle;"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
            </button>
            <button class="de-btn-add-team ${isAdded ? 'added' : ''}" data-id="${d.id}" style="background: ${isAdded ? 'rgba(16,185,129,0.15)' : 'rgba(139,92,246,0.15)'}; color: ${isAdded ? '#10b981' : '#c4b5fd'}; border: 1px solid ${isAdded ? 'rgba(16,185,129,0.3)' : 'rgba(139,92,246,0.3)'}; padding: 8px 12px; border-radius: 6px; font-weight: 600; font-size: 0.85rem; cursor: pointer; transition: all 0.2s;" onmouseover="this.style.background='${isAdded ? 'rgba(16,185,129,0.25)' : 'rgba(139,92,246,0.25)'}'" onmouseout="this.style.background='${isAdded ? 'rgba(16,185,129,0.15)' : 'rgba(139,92,246,0.15)'}'" title="${isAdded ? 'Added to Team' : 'Add to Team'}">
              ${isAdded ? '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" style="vertical-align: middle;"><polyline points="20 6 9 17 4 12"/></svg>' : '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" style="vertical-align: middle;"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>'}
            </button>
          </div>
        </div>
      </div>
    `;
  }).join('');

  // View Profile (Entire Card Clickable)
  container.querySelectorAll('.de-designer-card').forEach(card => {
    card.addEventListener('click', e => {
      if (e.target.closest('.de-btn-add-team') || e.target.closest('.de-btn-message')) return;
      e.stopPropagation();
      const designer = MOCK_DESIGNERS.find(d => d.id === card.dataset.id);
      if (designer) showDesignerProfile(designer);
    });
  });

  // Message Designer directly from Grid
  container.querySelectorAll('.de-btn-message').forEach(btn => {
    btn.addEventListener('click', e => {
      e.stopPropagation();
      const designer = MOCK_DESIGNERS.find(d => d.id === btn.dataset.id);
      if (designer) showContactDesignerModal(designer);
    });
  });

  // Add/Remove team
  container.querySelectorAll('.de-btn-add-team').forEach(btn => {
    btn.addEventListener('click', e => {
      e.stopPropagation();
      const id = btn.dataset.id;
      const designer = MOCK_DESIGNERS.find(d => d.id === id);
      if (!designer) return;
      const isAdded = shortlist.some(s => s.id === id);
      if (isAdded) {
        shortlist = shortlist.filter(s => s.id !== id);
      } else {
        shortlist.push(designer);
      }
      updateSidebar();
      updateGrid();
      updateEstimator();
      updateScenarioPlanner();
    });
  });
}

/* ── STAR RENDERER ────────────────────────────────────────── */
function renderStars(rating) {
  return Array.from({ length: 5 }, (_, i) => {
    const filled = i < Math.floor(rating);
    return `<svg width="11" height="11" viewBox="0 0 24 24" fill="${filled ? 'currentColor' : 'none'}" stroke="currentColor" stroke-width="1.5" style="color:${filled ? '#f59e0b' : 'var(--color-slate-600)'}"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>`;
  }).join('');
}

/* ── DESIGNER PROFILE MODAL ───────────────────────────────── */
function showDesignerProfile(d) {
  const modal = document.getElementById('de-profile-modal');
  if (!modal) return;

  const isAdded = shortlist.some(s => s.id === d.id);
  const stars = renderStars(parseFloat(d.rating));

  modal.innerHTML = `
    <div class="de-pm-inner">
      <button class="de-pm-close" id="de-pm-close">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
      </button>

      <!-- Cover + Avatar -->
      <div class="de-pm-cover" style="background-image:url('${d.cover}')">
        <div class="de-pm-cover-overlay"></div>
      </div>
      <div class="de-pm-avatar" style="background-image:url('${d.avatar}')"></div>

      <!-- Header Info -->
      <div class="de-pm-header">
        <div class="de-pm-identity">
          <h2 class="de-pm-name">${d.name}</h2>
          <div class="de-pm-title">${d.title}</div>
          <div class="de-pm-meta-row">
            <span class="de-pm-meta-item">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
              ${d.location}
            </span>
            <span class="de-pm-meta-item ${d.availability === 'Available now' ? 'avail-green' : 'avail-amber'}">
              <svg width="8" height="8" viewBox="0 0 24 24" fill="currentColor"><circle cx="12" cy="12" r="10"/></svg>
              ${d.availability}
            </span>
            <div id="estimator-container">
            </div>
            
            <div id="scenario-planner-container" class="de-scenario-planner">
            </div>
          </div>
        </div>
        <div class="de-pm-stats">
          <div class="de-pm-stat">
            <span class="de-pm-stat-value">${d.rate}</span>
            <span class="de-pm-stat-label">/ hour</span>
          </div>
          <div class="de-pm-stat">
            <span class="de-pm-stat-value">${d.rating}</span>
            <span class="de-pm-stat-label">${stars}</span>
          </div>
          <div class="de-pm-stat">
            <span class="de-pm-stat-value">${d.successRate}</span>
            <span class="de-pm-stat-label">Success</span>
          </div>
        </div>
      </div>

      <div class="de-pm-body">
        <!-- Contact Information -->
        <section class="de-pm-section">
          <h4 class="de-pm-section-title">Contact</h4>
          <div class="de-pm-contact-info" style="display:flex;gap:12px;margin-bottom:12px;">
            <div style="background:rgba(255,255,255,0.05);padding:10px 12px;border-radius:8px;flex:1;">
              <div style="font-size:11px;color:var(--color-steel-400);text-transform:uppercase;margin-bottom:4px;">Email</div>
              <div style="font-size:13px;color:#fff;">${d.email || d.name.toLowerCase().replace(' ', '.') + '@example.com'}</div>
            </div>
            <div style="background:rgba(255,255,255,0.05);padding:10px 12px;border-radius:8px;flex:1;">
              <div style="font-size:11px;color:var(--color-steel-400);text-transform:uppercase;margin-bottom:4px;">Phone</div>
              <div style="font-size:13px;color:#fff;">${d.phone || '+1 ' + Math.floor(100 + Math.random() * 900) + ' 555 ' + Math.floor(1000 + Math.random() * 9000)}</div>
            </div>
            <a href="mailto:${d.email || d.name.toLowerCase().replace(' ', '.') + '@example.com'}" class="de-pm-message-btn" style="flex:1; display:inline-flex;align-items:center;justify-content:center;gap:8px;text-decoration:none;border:1px solid rgba(255,255,255,0.1);background:rgba(255,255,255,0.03);">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path><polyline points="22,6 12,13 2,6"></polyline></svg>
              Direct Email
            </a>
          </div>
        </section>

        <!-- Bio -->
        <section class="de-pm-section">
          <h4 class="de-pm-section-title">About</h4>
          <p class="de-pm-bio">${d.bio}</p>
        </section>

        <!-- Skills -->
        <section class="de-pm-section">
          <h4 class="de-pm-section-title">Skills &amp; Expertise</h4>
          <div class="de-designer-tags">
            ${d.tags.map(t => `<span class="de-designer-tag">${t}</span>`).join('')}
          </div>
        </section>

        <!-- Portfolio -->
        <section class="de-pm-section">
          <h4 class="de-pm-section-title">Portfolio</h4>
          <div class="de-pm-portfolio-grid">
            ${d.portfolio.map(p => `
              <div class="de-pm-portfolio-item">
                <div class="de-pm-portfolio-img" style="background-image:url('${p.img}')"></div>
                <div class="de-pm-portfolio-label">${p.title}</div>
              </div>
            `).join('')}
          </div>
        </section>

        <!-- Reviews -->
        <section class="de-pm-section">
          <h4 class="de-pm-section-title">Client Reviews <span style="color:var(--color-steel-400);font-weight:normal;">(${d.reviews} total)</span></h4>
          <div class="de-pm-reviews">
            ${d.reviewList.map(r => `
              <div class="de-pm-review">
                <div class="de-pm-review-header">
                  <span class="de-pm-review-author">${r.author}</span>
                  <span class="de-pm-review-stars">${renderStars(r.rating)}</span>
                </div>
                <p class="de-pm-review-text">"${r.text}"</p>
              </div>
            `).join('')}
          </div>
        </section>
      </div>

      <!-- Footer Actions -->
      <div class="de-pm-footer">
        <button class="de-btn-add-team ${isAdded ? 'added' : ''} de-pm-team-btn" data-id="${d.id}">
          ${isAdded
      ? `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg> Added to Team`
      : `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg> Add to Team`}
        </button>
        <button class="de-pm-message-btn" data-id="${d.id}">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
          Message
        </button>
      </div>
    </div>
  `;

  openModal('de-profile-modal');

  document.getElementById('de-pm-close')?.addEventListener('click', closeAllModals);

  modal.querySelector('.de-pm-team-btn')?.addEventListener('click', () => {
    const isNowAdded = shortlist.some(s => s.id === d.id);
    if (isNowAdded) {
      shortlist = shortlist.filter(s => s.id !== d.id);
    } else {
      shortlist.push(d);
    }
    closeAllModals();
    updateSidebar();
    updateGrid();
    updateEstimator();
  });

  modal.querySelector('.de-pm-message-btn')?.addEventListener('click', () => {
    closeAllModals();
    showContactDesignerModal(d);
  });
}

/* ── CONTACT DESIGNER MODAL ───────────────────────────────── */
function showContactDesignerModal(d) {
  const modal = document.getElementById('de-proposal-modal');
  if (!modal) return;

  modal.innerHTML = `
    <div class="de-form-modal-inner">
      <div class="de-form-modal-header">
        <div class="de-form-modal-title-row">
          <div class="de-form-modal-avatar" style="background-image:url('${d.avatar}')"></div>
          <div>
            <h3>Message ${d.name}</h3>
            <p>${d.title}</p>
          </div>
        </div>
        <button class="de-pm-close" id="de-contact-close">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
        </button>
      </div>
      <div class="de-form-modal-body">
        <div class="de-form-group">
          <label>Your Project Brief</label>
          <textarea class="de-form-textarea" placeholder="Describe your project, goals, and what you're looking for in a collaborator..." rows="5"></textarea>
        </div>
        <div class="de-form-row">
          <div class="de-form-group">
            <label>Estimated Budget</label>
            <select class="de-form-select">
              <option>Under $5,000</option>
              <option>$5,000 – $15,000</option>
              <option>$15,000 – $50,000</option>
              <option>$50,000+</option>
              <option>Ongoing / Retainer</option>
            </select>
          </div>
          <div class="de-form-group">
            <label>Timeline</label>
            <select class="de-form-select">
              <option>ASAP</option>
              <option>1–4 weeks</option>
              <option>1–3 months</option>
              <option>3–6 months</option>
              <option>Flexible</option>
            </select>
          </div>
        </div>
        <div class="de-form-group">
          <label>Your Name &amp; Email</label>
          <input class="de-form-input" type="text" placeholder="Name — email@company.com" />
        </div>
      </div>
      <div class="de-form-modal-footer">
        <button class="de-form-cancel-btn" id="de-contact-cancel">Cancel</button>
        <button class="de-form-submit-btn" id="de-contact-submit">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>
          Send Message
        </button>
      </div>
    </div>
  `;

  openModal('de-proposal-modal');
  document.getElementById('de-contact-close')?.addEventListener('click', closeAllModals);
  document.getElementById('de-contact-cancel')?.addEventListener('click', closeAllModals);
  document.getElementById('de-contact-submit')?.addEventListener('click', () => {
    showSuccessToast(`Message sent to ${d.name}!`);
    closeAllModals();
  });
}

/* ── CONTACT TEAM MODAL ───────────────────────────────────── */
function showContactTeamModal() {
  const modal = document.getElementById('de-proposal-modal');
  if (!modal) return;

  const names = shortlist.map(d => d.name).join(', ');

  modal.innerHTML = `
    <div class="de-form-modal-inner">
      <div class="de-form-modal-header">
        <div>
          <h3>Contact Your Team (${shortlist.length})</h3>
          <p style="color:var(--color-steel-400);font-size:12px;margin-top:4px;">${names}</p>
        </div>
        <button class="de-pm-close" id="de-team-msg-close">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
        </button>
      </div>
      <div class="de-form-modal-body">
        <div class="de-form-group">
          <label>Project Brief</label>
          <textarea class="de-form-textarea" placeholder="Describe your project for the full team — everyone on your shortlist will receive this message..." rows="5"></textarea>
        </div>
        <div class="de-form-row">
          <div class="de-form-group">
            <label>Budget Range</label>
            <select class="de-form-select">
              <option>$5,000 – $15,000</option>
              <option>$15,000 – $50,000</option>
              <option>$50,000 – $150,000</option>
              <option>$150,000+</option>
            </select>
          </div>
          <div class="de-form-group">
            <label>Start Date</label>
            <select class="de-form-select">
              <option>ASAP</option>
              <option>Within 2 weeks</option>
              <option>Next month</option>
              <option>Flexible</option>
            </select>
          </div>
        </div>
        <div class="de-form-group">
          <label>Your Name &amp; Email</label>
          <input class="de-form-input" type="text" placeholder="Name — email@company.com" />
        </div>
      </div>
      <div class="de-form-modal-footer">
        <button class="de-form-cancel-btn" id="de-team-msg-cancel">Cancel</button>
        <button class="de-form-submit-btn" id="de-team-msg-submit">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>
          Send to All (${shortlist.length})
        </button>
      </div>
    </div>
  `;

  openModal('de-proposal-modal');
  document.getElementById('de-team-msg-close')?.addEventListener('click', closeAllModals);
  document.getElementById('de-team-msg-cancel')?.addEventListener('click', closeAllModals);
  document.getElementById('de-team-msg-submit')?.addEventListener('click', () => {
    showSuccessToast(`Brief sent to ${shortlist.length} designers!`);
    closeAllModals();
  });
}

/* ── POST A JOB MODAL ─────────────────────────────────────── */
function showPostJobModal() {
  const modal = document.getElementById('de-post-job-modal');
  if (!modal) return;

  modal.innerHTML = `
    <div class="de-form-modal-inner de-form-modal-inner--wide">
      <div class="de-form-modal-header">
        <div>
          <h3>Post a Job</h3>
          <p>Describe your project and the designer or engineer you're looking for.</p>
        </div>
        <button class="de-pm-close" id="de-post-job-close">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
        </button>
      </div>
      <div class="de-form-modal-body">
        <div class="de-form-group">
          <label>Job Title *</label>
          <input class="de-form-input" type="text" placeholder="e.g. Mechanical Engineer for consumer product housing" />
        </div>
        <div class="de-form-group">
          <label>Project Description *</label>
          <textarea class="de-form-textarea" placeholder="Describe the project, deliverables, and any relevant context about your product..." rows="4"></textarea>
        </div>
        <div class="de-form-row">
          <div class="de-form-group">
            <label>Discipline</label>
            <select class="de-form-select">
              <option>Industrial Design</option>
              <option>Mechanical Engineering</option>
              <option>Electrical Engineering</option>
              <option>UI/UX Design</option>
              <option>Firmware / Software</option>
              <option>Packaging</option>
              <option>Full Team</option>
            </select>
          </div>
          <div class="de-form-group">
            <label>Project Type</label>
            <select class="de-form-select">
              <option>Fixed Price</option>
              <option>Hourly Rate</option>
              <option>Ongoing Retainer</option>
            </select>
          </div>
        </div>
        <div class="de-form-row">
          <div class="de-form-group">
            <label>Budget *</label>
            <input class="de-form-input" type="text" placeholder="e.g. $8,000 – $15,000" />
          </div>
          <div class="de-form-group">
            <label>Timeline</label>
            <input class="de-form-input" type="text" placeholder="e.g. 3–5 months" />
          </div>
        </div>
        <div class="de-form-group">
          <label>Required Skills (comma separated)</label>
          <input class="de-form-input" type="text" placeholder="e.g. SolidWorks, Injection Molding, DFM, Keyshot" />
        </div>
        <div class="de-form-group">
          <label>Your Company / Name &amp; Email</label>
          <input class="de-form-input" type="text" placeholder="Acme Hardware — hello@acme.com" />
        </div>
      </div>
      <div class="de-form-modal-footer">
        <button class="de-form-cancel-btn" id="de-post-job-cancel">Cancel</button>
        <button class="de-form-submit-btn" id="de-post-job-submit">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>
          Publish Job
        </button>
      </div>
    </div>
  `;

  openModal('de-post-job-modal');
  document.getElementById('de-post-job-close')?.addEventListener('click', closeAllModals);
  document.getElementById('de-post-job-cancel')?.addEventListener('click', closeAllModals);
  document.getElementById('de-post-job-submit')?.addEventListener('click', () => {
    showSuccessToast('Job posted! Designers will be notified.');
    closeAllModals();
  });
}

/* ── ESTIMATOR (TOP ARROW) ────────────────────────────────── */
let estimatorLoading = false;
let estimatorResult = null;

function updateEstimator() {
  const container = document.getElementById('de-estimator-container');
  if (!container) return;

  const searchHtml = `
    <div class="de-estimator-search-wrapper">
      <div class="de-estimator-search-bar">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--color-steel-400)" stroke-width="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
        <input type="text" id="de-estimator-input" placeholder="e.g. bluetooth speaker, drone..." value="${estimatorResult ? estimatorResult.product : ''}" />
        <button class="de-estimator-search-btn" id="de-estimator-go-btn">Estimate Timeline</button>
      </div>
    </div>
  `;

  if (estimatorLoading) {
    container.innerHTML = `
      <div class="de-estimator-top-inner">
        ${searchHtml}
        <div class="de-estimator-arrow loading">
           <div class="de-estimator-spinner" style="width:20px;height:20px;border-width:2px;border-top-color:var(--color-electric);border-radius:50%;animation:de-spin 0.8s linear infinite;margin-right:10px;"></div>
           <span style="font-size:13px;color:var(--color-steel-400);">AI is analysing development phases...</span>
        </div>
      </div>
    `;
    return;
  }

  let arrowHtml = '';
  if (estimatorResult && estimatorResult.phases) {
    const totalH = estimatorResult.phases.reduce((sum, p) => sum + p.hours, 0);
    const phasesHtml = estimatorResult.phases.map((ph, index) => {
      const pct = (ph.hours / totalH) * 100;
      const isLast = index === estimatorResult.phases.length - 1;
      const weeks = Math.ceil(ph.hours / 40);
      return `
        <div class="de-arrow-segment" style="width: ${pct}%;">
          <div class="de-arrow-segment-name">${ph.name}</div>
          <div class="de-arrow-segment-duration">${weeks} wk${weeks > 1 ? 's' : ''}</div>
          ${!isLast ? '<div class="de-arrow-tick"></div>' : ''}
        </div>
      `;
    }).join('');

    arrowHtml = `
      <div class="de-estimator-arrow">
        <div class="de-arrow-body">
          ${phasesHtml}
        </div>
        <div class="de-arrow-head"></div>
      </div>
    `;
  } else {
    arrowHtml = `
      <div class="de-estimator-arrow empty">
        <span style="font-size:13px;color:var(--color-steel-400);">Enter a product to generate an estimated timeline</span>
      </div>
    `;
  }

  container.innerHTML = `
    <div class="de-estimator-top-inner">
      ${searchHtml}
      ${arrowHtml}
    </div>
  `;

  const goBtn = document.getElementById('de-estimator-go-btn');
  const input = document.getElementById('de-estimator-input');
  if (goBtn && input) {
    const doEstimate = () => { const q = input.value.trim(); if (q) runEstimatorAI(q); };
    goBtn.addEventListener('click', doEstimate);
    input.addEventListener('keydown', e => { if (e.key === 'Enter') doEstimate(); });
  }
}

/* ── SCENARIO PLANNER ─────────────────────────────────────── */
function updateScenarioPlanner() {
  const container = document.getElementById('de-scenario-planner-container');
  if (!container) return;

  if (estimatorLoading) {
    container.innerHTML = `<div class="de-scenario-empty"><div class="de-estimator-spinner" style="margin:auto;border-top-color:var(--color-electric)"></div></div>`;
    return;
  }

  if (!estimatorResult) {
    container.innerHTML = `
      <div class="de-scenario-empty">
         <span style="color:var(--color-steel-500); font-size:14px;">Generate an estimate above to unlock phase planning.</span>
      </div>
    `;
    return;
  }

  const teamCount = shortlist.length;
  let totalScenarioCost = 0;

  const phasesHtml = estimatorResult.phases.map((ph, idx) => {
    if (!scenarioState[ph.name]) {
      scenarioState[ph.name] = { active: true, alloc: 1.0, offWorkers: [] };
    }
    const state = scenarioState[ph.name];

    let phaseRate = 0;
    let teamHtml = '';

    if (teamCount > 0) {
      const avatarsHtml = shortlist.map(member => {
        const isOff = state.offWorkers.includes(member.name);
        if (!isOff) {
          const val = parseFloat(member.rate.replace(/[^0-9.]/g, ''));
          phaseRate += (isNaN(val) ? 0 : val);
        }
        return `<div class="de-scenario-avatar ${isOff ? 'disabled' : ''}" 
                      style="background-image: url('${member.avatar}')" 
                      data-phase="${ph.name}" 
                      data-member="${member.name}" 
                      title="Toggle ${member.name} for this phase"></div>`;
      }).join('');
      teamHtml = `<div class="de-scenario-team">${avatarsHtml}</div>`;
    }

    const rateToUse = (teamCount > 0 && state.active) ? (phaseRate * state.alloc) : 0;
    const phaseCost = state.active ? (ph.hours * rateToUse) : 0;
    totalScenarioCost += phaseCost;

    if (teamCount === 0) {
      return `
        <div class="de-scenario-item dashed">
          <div class="de-scenario-item-title">${ph.name}</div>
          <div class="de-scenario-body-empty">
            Select team members to view costs
          </div>
        </div>
      `;
    }

    return `
      <div class="de-scenario-item ${state.active ? 'populated' : 'disabled'}">
        <div class="de-scenario-item-header">
           <label class="de-phase-toggle" title="Toggle entire phase">
              <input type="checkbox" class="de-phase-checkbox" data-phase="${ph.name}" ${state.active ? 'checked' : ''}>
              <span class="de-scenario-item-title">${ph.name} <span class="de-scenario-hours">· ${ph.hours}h</span></span>
           </label>
           <div class="de-scenario-cost">$ ${Math.round(phaseCost).toLocaleString()}</div>
        </div>
        ${teamHtml}
        <div class="de-scenario-slider-group" style="${!state.active ? 'opacity:0.3; pointer-events:none;' : ''}">
          <input type="range" class="de-scenario-slider" data-phase="${ph.name}" min="0" max="1" step="0.1" value="${state.alloc}" title="${Math.round(state.alloc * 100)}% effort" />
        </div>
      </div>
    `;
  }).join('');

  container.innerHTML = `
    <p class="de-scenario-section-title">Phase Spend Planner <span class="de-scenario-total-cost">Total: $ ${Math.round(totalScenarioCost).toLocaleString()}</span></p>
    <div class="de-scenario-grid">
      ${phasesHtml}
    </div>
  `;

  container.querySelectorAll('.de-scenario-slider').forEach(slider => {
    slider.addEventListener('input', e => {
      const phase = e.target.dataset.phase;
      scenarioState[phase].alloc = parseFloat(e.target.value);
      updateScenarioPlanner();
      updateSidebar();
    });
  });

  container.querySelectorAll('.de-phase-checkbox').forEach(cb => {
    cb.addEventListener('change', e => {
      const phase = e.target.dataset.phase;
      scenarioState[phase].active = e.target.checked;
      updateScenarioPlanner();
      updateSidebar();
    });
  });

  container.querySelectorAll('.de-scenario-avatar').forEach(av => {
    av.addEventListener('click', e => {
      const phase = e.currentTarget.dataset.phase;
      const mem = e.currentTarget.dataset.member;
      const state = scenarioState[phase];
      if (state.offWorkers.includes(mem)) {
        state.offWorkers = state.offWorkers.filter(m => m !== mem);
      } else {
        state.offWorkers.push(mem);
      }
      updateScenarioPlanner();
      updateSidebar();
    });
  });
}

async function runEstimatorAI(productName) {
  estimatorLoading = true;
  estimatorResult = null;
  scenarioState = {}; // reset allocations
  updateEstimator();
  updateScenarioPlanner();

  const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY;
  if (!GEMINI_API_KEY) { estimatorResult = getDefaultEstimate(productName); estimatorLoading = false; updateEstimator(); return; }

  const models = ['gemini-2.5-flash', 'gemini-2.0-flash'];
  const prompt = `You are a manufacturing cost estimator. For the product "${productName}", estimate NRE development phases and hours.
Return ONLY valid JSON: {"product":"${productName}","totalHours":"[number]","estimatedNRE":"[total dollar estimate at $85/hr]","phases":[{"name":"[phase]","hours":"[number]"}]}
Include 4-6 phases (Industrial Design, Mechanical Eng, Electronic Design, Firmware, Prototyping, Testing & Cert). Be realistic.`;

  const body = { contents: [{ parts: [{ text: prompt }] }], generationConfig: { temperature: 0.3, maxOutputTokens: 1024, responseMimeType: 'application/json' } };
  let result = null;

  for (const model of models) {
    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${GEMINI_API_KEY}`;
      const res = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      if (res.status === 429) { await new Promise(r => setTimeout(r, 3000)); continue; }
      if (!res.ok) continue;
      const data = await res.json();
      const raw = data?.candidates?.[0]?.content?.parts?.[0]?.text;
      if (raw) { result = JSON.parse(raw.replace(/^```(?:json)?\s*/i, '').replace(/\s*```\s*$/, '').trim()); break; }
    } catch (e) { console.warn('[Estimator]', model, e); }
  }

  estimatorResult = result || getDefaultEstimate(productName);
  estimatorLoading = false;
  updateEstimator();
  updateScenarioPlanner();
  updateSidebar();
}

function getDefaultEstimate(name) {
  return {
    product: name, totalHours: 480, estimatedNRE: 40800, phases: [
      { name: 'Industrial Design', hours: 80 }, { name: 'Mechanical Engineering', hours: 120 },
      { name: 'Prototyping & Iteration', hours: 100 }, { name: 'Testing & Certification', hours: 80 }, { name: 'Production Ramp', hours: 100 }
    ]
  };
}

/* ── FIND WORK VIEW ───────────────────────────────────────── */
function renderWorkView(workspace) {
  workspace.innerHTML = `
    <div class="de-work-layout">
      <div class="de-work-main">
        <div class="de-toolbar">
          <div class="de-filters">
            <button class="de-filter-chip active">Best Matches</button>
            <button class="de-filter-chip">Most Recent</button>
            <button class="de-filter-chip">Saved Jobs</button>
          </div>
          <div class="de-work-meta" style="font-size:12px;color:var(--color-steel-400);">${MOCK_JOBS.length} opportunities</div>
        </div>
        <div class="de-job-list">
          ${MOCK_JOBS.map(j => `
            <div class="de-job-card">
              <div class="de-job-info">
                <div class="de-job-meta">
                  <span class="de-job-meta-item" style="color:var(--color-emerald-glow);">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
                    Payment Verified
                  </span>
                  <span style="color:var(--color-slate-600)">•</span>
                  <span>${j.date}</span>
                  <span style="color:var(--color-slate-600)">•</span>
                  <span>by <strong>${j.poster}</strong></span>
                </div>
                <h3 class="de-job-title">${j.title}</h3>
                <p class="de-job-desc">${j.description}</p>
                <div class="de-designer-tags" style="margin-top:12px;">
                  ${j.tags.map(t => `<span class="de-designer-tag">${t}</span>`).join('')}
                </div>
              </div>
              <div class="de-job-actions">
                <div class="de-job-budget">${j.budget}</div>
                <div class="de-job-type">${j.type}</div>
                <button class="de-btn-apply" data-job-title="${j.title}" data-poster="${j.poster}">Submit Proposal</button>
                <button class="de-btn-save-job">
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/></svg>
                  Save
                </button>
              </div>
            </div>
          `).join('')}
        </div>
      </div>

      <!-- Right sidebar: designer profile prompt -->
      <div class="de-work-sidebar">
        <div class="de-work-sidebar-card">
          <div class="de-work-sidebar-icon">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="12" cy="8" r="4"/><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7"/></svg>
          </div>
          <h4>Complete Your Profile</h4>
          <p>A complete profile gets 3x more responses from companies. Add your portfolio and set your availability.</p>
          <button class="de-work-complete-profile-btn" id="de-complete-profile-btn">Set Up Profile</button>
        </div>
        <div class="de-work-sidebar-card">
          <h4 style="font-size:13px;margin-bottom:8px;">Your Skills</h4>
          <div class="de-designer-tags">
            <span class="de-designer-tag">Industrial Design</span>
            <span class="de-designer-tag">SolidWorks</span>
            <span class="de-designer-tag">Prototyping</span>
          </div>
          <button class="de-work-edit-skills-btn" style="margin-top:12px;">Edit Skills</button>
        </div>
      </div>
    </div>
  `;

  // Filter chips toggle
  workspace.querySelectorAll('.de-filter-chip').forEach(chip => {
    chip.addEventListener('click', () => {
      workspace.querySelectorAll('.de-filter-chip').forEach(c => c.classList.remove('active'));
      chip.classList.add('active');
    });
  });

  // Submit Proposal buttons
  workspace.querySelectorAll('.de-btn-apply').forEach(btn => {
    btn.addEventListener('click', () => showProposalModal(btn.dataset.jobTitle, btn.dataset.poster));
  });

  // Save Job buttons
  workspace.querySelectorAll('.de-btn-save-job').forEach(btn => {
    btn.addEventListener('click', () => {
      btn.classList.toggle('saved');
      btn.textContent = btn.classList.contains('saved') ? '✓ Saved' : 'Save';
    });
  });

  // Complete profile
  document.getElementById('de-complete-profile-btn')?.addEventListener('click', showDesignerRegistrationModal);
}

/* ── SUBMIT PROPOSAL MODAL ────────────────────────────────── */
function showProposalModal(jobTitle, poster) {
  const modal = document.getElementById('de-proposal-modal');
  if (!modal) return;

  modal.innerHTML = `
    <div class="de-form-modal-inner">
      <div class="de-form-modal-header">
        <div>
          <h3>Submit Proposal</h3>
          <p style="color:var(--color-steel-400);font-size:12px;margin-top:4px;">${jobTitle} — posted by ${poster}</p>
        </div>
        <button class="de-pm-close" id="de-proposal-close">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
        </button>
      </div>
      <div class="de-form-modal-body">
        <div class="de-form-group">
          <label>Cover Letter *</label>
          <textarea class="de-form-textarea" placeholder="Introduce yourself and explain why you're the right fit for this project. Mention relevant experience and portfolio work..." rows="5"></textarea>
        </div>
        <div class="de-form-row">
          <div class="de-form-group">
            <label>Your Rate for This Project</label>
            <input class="de-form-input" type="text" placeholder="e.g. $90/hr or $12,000 fixed" />
          </div>
          <div class="de-form-group">
            <label>Estimated Duration</label>
            <input class="de-form-input" type="text" placeholder="e.g. 6–8 weeks" />
          </div>
        </div>
        <div class="de-form-group">
          <label>Relevant Portfolio Links</label>
          <input class="de-form-input" type="text" placeholder="Behance, Dribbble, or direct links..." />
        </div>
        <div class="de-form-group">
          <label>Your Email</label>
          <input class="de-form-input" type="email" placeholder="you@example.com" />
        </div>
      </div>
      <div class="de-form-modal-footer">
        <button class="de-form-cancel-btn" id="de-proposal-cancel">Cancel</button>
        <button class="de-form-submit-btn" id="de-proposal-submit">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>
          Submit Proposal
        </button>
      </div>
    </div>
  `;

  openModal('de-proposal-modal');
  document.getElementById('de-proposal-close')?.addEventListener('click', closeAllModals);
  document.getElementById('de-proposal-cancel')?.addEventListener('click', closeAllModals);
  document.getElementById('de-proposal-submit')?.addEventListener('click', () => {
    showSuccessToast('Proposal submitted successfully!');
    closeAllModals();
  });
}

/* ── DESIGNER REGISTRATION MODAL ─────────────────────────── */
function showDesignerRegistrationModal() {
  const modal = document.getElementById('de-post-job-modal');
  if (!modal) return;

  modal.innerHTML = `
    <div class="de-form-modal-inner de-form-modal-inner--wide">
      <div class="de-form-modal-header">
        <div>
          <h3>Set Up Your Designer Profile</h3>
          <p>Complete your profile to start receiving project inquiries from hardware companies.</p>
        </div>
        <button class="de-pm-close" id="de-reg-close">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
        </button>
      </div>
      <div class="de-form-modal-body">
        <div class="de-form-row">
          <div class="de-form-group">
            <label>Full Name *</label>
            <input class="de-form-input" type="text" placeholder="Your name or studio name" />
          </div>
          <div class="de-form-group">
            <label>Professional Title *</label>
            <input class="de-form-input" type="text" placeholder="e.g. Senior Industrial Designer" />
          </div>
        </div>
        <div class="de-form-group">
          <label>Bio / About You *</label>
          <textarea class="de-form-textarea" placeholder="Describe your background, specialization, and the kind of projects you love working on..." rows="4"></textarea>
        </div>
        <div class="de-form-row">
          <div class="de-form-group">
            <label>Hourly Rate (USD)</label>
            <input class="de-form-input" type="text" placeholder="e.g. $85" />
          </div>
          <div class="de-form-group">
            <label>Location</label>
            <input class="de-form-input" type="text" placeholder="City, Country" />
          </div>
        </div>
        <div class="de-form-group">
          <label>Skills (comma separated)</label>
          <input class="de-form-input" type="text" placeholder="e.g. SolidWorks, Injection Molding, DFM, Keyshot" />
        </div>
        <div class="de-form-row">
          <div class="de-form-group">
            <label>Discipline</label>
            <select class="de-form-select">
              <option>Industrial Design</option>
              <option>Mechanical Engineering</option>
              <option>Electrical Engineering</option>
              <option>UI/UX Design</option>
              <option>Firmware / Software</option>
              <option>Packaging</option>
            </select>
          </div>
          <div class="de-form-group">
            <label>Availability</label>
            <select class="de-form-select">
              <option>Available now</option>
              <option>Available in 1 week</option>
              <option>Available in 2 weeks</option>
              <option>Not available</option>
            </select>
          </div>
        </div>
        <div class="de-form-group">
          <label>Portfolio Links (Behance, Dribbble, personal site...)</label>
          <input class="de-form-input" type="text" placeholder="https://your-portfolio.com" />
        </div>
        <div class="de-form-group">
          <label>Email *</label>
          <input class="de-form-input" type="email" placeholder="you@example.com" />
        </div>
      </div>
      <div class="de-form-modal-footer">
        <button class="de-form-cancel-btn" id="de-reg-cancel">Cancel</button>
        <button class="de-form-submit-btn" id="de-reg-submit">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
          Create Profile
        </button>
      </div>
    </div>
  `;

  openModal('de-post-job-modal');
  document.getElementById('de-reg-close')?.addEventListener('click', closeAllModals);
  document.getElementById('de-reg-cancel')?.addEventListener('click', closeAllModals);
  document.getElementById('de-reg-submit')?.addEventListener('click', () => {
    showSuccessToast('Profile created! You\'ll start receiving inquiries soon.');
    closeAllModals();
  });
}

/* ── SUCCESS TOAST ────────────────────────────────────────── */
function showSuccessToast(message) {
  const existing = document.getElementById('de-toast');
  if (existing) existing.remove();

  const toast = document.createElement('div');
  toast.id = 'de-toast';
  toast.className = 'de-toast';
  toast.innerHTML = `
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>
    ${message}
  `;
  document.body.appendChild(toast);

  requestAnimationFrame(() => toast.classList.add('de-toast--visible'));
  setTimeout(() => {
    toast.classList.remove('de-toast--visible');
    setTimeout(() => toast.remove(), 400);
  }, 3500);
}

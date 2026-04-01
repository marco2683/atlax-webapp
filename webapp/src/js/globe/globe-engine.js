/* ============================================================
   PRD — 3D Globe Engine (v2 — Slower rotation, stop on search)
   ============================================================ */

import Globe from 'globe.gl';
import * as THREE from 'three';

const STAGE_COLORS = {
  design:        '#3b82f6',
  prototype:     '#8b5cf6',
  manufacturing: '#10b981',
  specialized:   '#ef4444',
};

/**
 * Initialize the interactive 3D globe.
 */
export function initGlobe(containerId, suppliers = []) {
  const container = document.getElementById(containerId);
  if (!container) return createNoopController();

  const isLightMode = document.body.classList.contains('theme-light');
  
  const globe = Globe()
    .globeImageUrl(isLightMode ? '//unpkg.com/three-globe/example/img/earth-blue-marble.jpg' : '//unpkg.com/three-globe/example/img/earth-night.jpg')
    .bumpImageUrl('//unpkg.com/three-globe/example/img/earth-topology.png')
    .backgroundImageUrl(isLightMode ? null : '//unpkg.com/three-globe/example/img/night-sky.png')
    .backgroundColor('rgba(0,0,0,0)')
    .showAtmosphere(true)
    .atmosphereColor(isLightMode ? '#93c5fd' : '#3b82f6')
    .atmosphereAltitude(0.15)

    // Points (supplier dots only — clean, small)
    .pointsData([])
    .pointLat('lat')
    .pointLng('lng')
    .pointAltitude(0.012)
    .pointRadius('size')
    .pointColor('color')
    .pointResolution(6)

    // Rings (pulsing effect)
    .ringsData([])
    .ringLat('lat')
    .ringLng('lng')
    .ringColor(() => '#3b82f6')
    .ringAltitude(0.015)
    .ringMaxRadius(1.2)
    .ringPropagationSpeed(1.5)
    .ringRepeatPeriod(1800)

    // Arcs (shortlist network)
    .arcsData([])
    .arcColor(() => '#00ffff') // Cyan-ish
    .arcAltitude('alt')
    .arcStroke(0.12) // Thinner as requested
    .arcDashLength(0.4)
    .arcDashGap(0.1)
    .arcDashAnimateTime(1600)

    // No labels on globe (they go to the side panel)
    .labelsData([])

    // Interaction
    .onPointClick((point) => {
      document.dispatchEvent(new CustomEvent('supplier-click', { detail: point }));
    })
    .onPointHover((point) => {
      container.style.cursor = point ? 'pointer' : 'default';
    })

    (container);

  // ── Sizing ─────────────────────────────────────────────
  function resize() {
    globe.width(container.clientWidth).height(container.clientHeight);
  }
  resize();
  window.addEventListener('resize', resize);

  // ── Scene Tweaks ───────────────────────────────────────
  const renderer = globe.renderer();
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.1;

  const ambientLight = new THREE.AmbientLight(0x3b82f6, 0.12);
  globe.scene().add(ambientLight);

  // ── Controls — SLOW rotation ───────────────────────────
  const controls = globe.controls();
  controls.autoRotate = true;
  controls.autoRotateSpeed = 0.15;  // Very slow
  controls.enableDamping = true;
  controls.dampingFactor = 0.08;

  // Initial position (Asia)
  globe.pointOfView({ lat: 22.5, lng: 114, altitude: 2.2 }, 0);

  // ── Pause on interaction, resume after long idle ───────
  let idleTimer;
  let rotationStopped = false;

  container.addEventListener('pointerdown', () => {
    controls.autoRotate = false;
    clearTimeout(idleTimer);
  });

  container.addEventListener('pointerup', () => {
    if (rotationStopped) return; // Don't resume if search stopped it
    clearTimeout(idleTimer);
    idleTimer = setTimeout(() => { controls.autoRotate = true; }, 12000);
  });

  // ── Controller API ─────────────────────────────────────
  let currentSuppliers = [];
  let activeStageFilter = null;
  let shortlistedIds = new Set();

  /**
   * Stop globe rotation (called on search).
   */
  function stopRotation() {
    rotationStopped = true;
    controls.autoRotate = false;
    clearTimeout(idleTimer);
  }

  /**
   * Show suppliers as dots on the globe.
   */
  function showSuppliers(suppliers) {
    currentSuppliers = suppliers;
    renderPoints();

    // Fly to show all points
    if (suppliers.length > 0) {
      const avgLat = suppliers.reduce((s, p) => s + p.lat, 0) / suppliers.length;
      const avgLng = suppliers.reduce((s, p) => s + p.lng, 0) / suppliers.length;
      globe.pointOfView({ lat: avgLat, lng: avgLng, altitude: 2.0 }, 1800);
    }
  }

  function filterByStage(stage) {
    activeStageFilter = stage;
    renderPoints();
  }

  function renderPoints() {
    let filtered = currentSuppliers;
    if (activeStageFilter) {
      filtered = filtered.filter(s => s.stage === activeStageFilter);
    }

    const points = filtered.map(s => {
      const sid = String(s.id || s.name);
      const isShortlisted = shortlistedIds.has(sid);
      return {
        ...s,
        color: isShortlisted ? '#10b981' : '#3b82f6',
        size: isShortlisted ? 0.55 : 0.35,
      };
    });

    globe.pointsData(points);
    
    // Add pulsing rings for all current suppliers + user location hub
    const ringData = filtered.map(s => ({ lat: s.lat, lng: s.lng }));
    ringData.push({ lat: userLocation.lat, lng: userLocation.lng });
    globe.ringsData(ringData);
  }

  // ── User Location Hub (IP Based) ─────────────────────────
  let userLocation = { lat: 22.3193, lng: 114.1694, name: 'My Location' }; // Default HK
  
  async function fetchUserLocation() {
    try {
      const resp = await fetch('https://ipapi.co/json/');
      const data = await resp.json();
      if (data.latitude && data.longitude) {
        userLocation = { lat: data.latitude, lng: data.longitude, name: 'My Location' };
        console.log('User location fetched via IP:', userLocation);
        // Refresh rings to include User if needed, or update network if active
      }
    } catch (e) {
      console.warn('Failed to fetch user location via IP, using default.', e);
    }
  }
  fetchUserLocation();

  /**
   * Update the shortlist network visualization.
   */
  function updateShortlistNetwork(shortlist) {
    if (!shortlist || shortlist.length < 1) {
      globe.arcsData([]);
      return;
    }

    const arcs = [];
    const points = [userLocation, ...shortlist.map(s => ({ 
      lat: s.supplier.lat, 
      lng: s.supplier.lng, 
      name: s.supplier.name 
    }))];
    
    for (let i = 0; i < points.length; i++) {
      const start = points[i];
      const end = points[(i + 1) % points.length];
      
      // Calculate distance for dynamic altitude to prevent "cutting through earth"
      const dLat = (end.lat - start.lat) * Math.PI / 180;
      const dLng = (end.lng - start.lng) * Math.PI / 180;
      const dist = Math.sqrt(dLat * dLat + dLng * dLng); // Simple Euclidean for alt scaling
      const dynamicAlt = Math.min(0.5, Math.max(0.12, dist * 0.25));

      arcs.push({
        startLat: start.lat,
        startLng: start.lng,
        endLat: end.lat,
        endLng: end.lng,
        color: ['#00ffff', '#00ffff'], // Cyan gradient (effectively solid)
        name: `${start.name || 'Your Location'} → ${end.name || 'Your Location'}`,
        alt: dynamicAlt
      });
    }

    globe
      .arcDashLength(0.4)
      .arcDashGap(4)
      .arcDashInitialGap(() => Math.random() * 5)
      .arcDashAnimateTime(5000) // Much slower, subtle animation
      .arcStroke(0.12)
      .arcAltitude('alt');

    globe.arcsData(arcs);
  }

  /**
   * Fly camera to a specific lat/lng.
   */
  function flyTo(lat, lng) {
    globe.pointOfView({ lat, lng, altitude: 1.6 }, 1200);
  }

  // ── Performance Optimization for Typing ─────────────────
  let isLowPower = false;
  let shortlistActive = false;

  function setLowPower(on) {
    if (on === isLowPower) return;
    isLowPower = on;

    if (on) {
      // Pause rotations and animations to free up main thread
      controls.autoRotate = false;
      globe.arcDashAnimateTime(0);
      globe.ringPropagationSpeed(0);
      globe.pointerEvents(false); // Disable raycasting/hover while typing
    } else {
      // Resume only if not globally stopped by search
      if (!rotationStopped) controls.autoRotate = true;
      globe.arcDashAnimateTime(shortlistActive ? 5000 : 0);
      globe.ringPropagationSpeed(1.5);
      globe.pointerEvents(true);
    }
  }

  // Global focus listener to detect when user is typing
  document.addEventListener('focusin', (e) => {
    const isInput = ['INPUT', 'TEXTAREA'].includes(e.target.tagName) || e.target.isContentEditable;
    if (isInput) setLowPower(true);
  }, true);

  document.addEventListener('focusout', (e) => {
    const isInput = ['INPUT', 'TEXTAREA'].includes(e.target.tagName) || e.target.isContentEditable;
    if (isInput) setLowPower(false);
  }, true);

  /**
   * Highlight a specific supplier by name or ID.
   */
  function highlightSupplier(supplierIdentifier) {
    if (isLowPower) return; // Skip highlight if typing
    let filtered = currentSuppliers;
    if (activeStageFilter) {
      filtered = filtered.filter(s => s.stage === activeStageFilter);
    }

    const points = filtered.map(s => {
      const isMatch = s.name === supplierIdentifier || s.id === supplierIdentifier;
      if (isMatch) {
        return { ...s, color: '#ffffff', size: 0.6 };
      }
      return {
        ...s,
        color: STAGE_COLORS[s.stage] || '#ffffff',
        size: 0.18,
      };
    });

    globe.pointsData(points);
  }

  function clearHighlight() {
    renderPoints();
  }

  return {
    globe,
    stopRotation,
    showSuppliers,
    filterByStage,
    flyTo,
    resize,
    highlightSupplier,
    clearHighlight,
    updateShortlistNetwork: (sl) => {
      shortlistActive = sl && sl.length > 0;
      // Update the set of shortlisted IDs so dots can be recolored
      shortlistedIds.clear();
      if (sl) {
        sl.forEach(item => {
          const sid = String(item.supplier?.id || item.supplier?.name || '');
          if (sid) shortlistedIds.add(sid);
        });
      }
      renderPoints(); // Re-render dots with green for shortlisted
      updateShortlistNetwork(sl);
    },
    setGlobeTheme: (isLight) => {
      globe.globeImageUrl(isLight ? '//unpkg.com/three-globe/example/img/earth-blue-marble.jpg' : '//unpkg.com/three-globe/example/img/earth-night.jpg');
      globe.backgroundImageUrl(isLight ? null : '//unpkg.com/three-globe/example/img/night-sky.png');
      globe.atmosphereColor(isLight ? '#93c5fd' : '#3b82f6');
    }
  };
}

function createNoopController() {
  return {
    globe: null,
    stopRotation: () => {},
    showSuppliers: () => {},
    filterByStage: () => {},
    flyTo: () => {},
    resize: () => {},
    highlightSupplier: () => {},
    clearHighlight: () => {},
  };
}

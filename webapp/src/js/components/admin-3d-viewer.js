/**
 * admin-3d-viewer.js
 * ──────────────────────────────────────────────────
 * Full-screen 3D part viewer modal for the admin RFQ panel.
 * Features:
 *   - Light studio background
 *   - OrbitControls (drag/zoom/pan)
 *   - Click-to-annotate: click a surface point to pin a text label
 *   - Annotation list sidebar with edit/delete
 *   - STEP/STP, STL, OBJ support via dynamic import
 * ──────────────────────────────────────────────────
 */

let _modal = null;
let _animId = null;
let _cleanup = null;

// ── CSS (injected once) ────────────────────────────
const VIEWER_CSS_ID = 'admin-3d-viewer-css';
function injectCSS() {
  if (document.getElementById(VIEWER_CSS_ID)) return;
  const style = document.createElement('style');
  style.id = VIEWER_CSS_ID;
  style.textContent = `
    .a3d-backdrop {
      position:fixed;inset:0;z-index:99999;background:rgba(0,0,0,0.55);
      display:flex;align-items:center;justify-content:center;
      animation:a3d-fadeIn .2s ease;
    }
    @keyframes a3d-fadeIn { from{opacity:0} to{opacity:1} }

    .a3d-modal {
      width:92vw;max-width:1400px;height:88vh;
      background:#fff;border-radius:16px;overflow:hidden;
      display:flex;flex-direction:column;
      box-shadow:0 24px 80px rgba(0,0,0,0.25);
    }

    .a3d-header {
      display:flex;align-items:center;justify-content:space-between;
      padding:14px 24px;border-bottom:1px solid #e5e7eb;background:#fafbfc;
      flex-shrink:0;
    }
    .a3d-header h3 { margin:0;font-size:15px;font-weight:700;color:#0f172a;font-family:Inter,sans-serif; }
    .a3d-header-sub { font-size:11px;color:#64748b;margin-left:8px;font-weight:400; }
    .a3d-close {
      width:32px;height:32px;border-radius:8px;border:1px solid #e2e8f0;
      background:#fff;cursor:pointer;display:flex;align-items:center;justify-content:center;
      color:#475569;transition:all .15s;
    }
    .a3d-close:hover { background:#f1f5f9;color:#0f172a; }

    .a3d-body { display:flex;flex:1;min-height:0; }

    /* Viewer canvas area */
    .a3d-canvas-wrap {
      flex:1;position:relative;background:#f0f2f5;overflow:hidden;
    }
    .a3d-canvas-wrap canvas { display:block;width:100%;height:100%; }

    /* Toolbar */
    .a3d-toolbar {
      position:absolute;bottom:16px;left:50%;transform:translateX(-50%);
      display:flex;gap:6px;padding:6px 10px;background:rgba(255,255,255,0.92);
      border-radius:10px;border:1px solid #e2e8f0;backdrop-filter:blur(8px);
      box-shadow:0 2px 12px rgba(0,0,0,0.08);
    }
    .a3d-tool-btn {
      padding:6px 12px;border-radius:6px;border:1px solid transparent;
      background:transparent;font-size:11px;font-weight:600;font-family:Inter,sans-serif;
      color:#475569;cursor:pointer;display:flex;align-items:center;gap:4px;transition:all .15s;
    }
    .a3d-tool-btn:hover { background:#f1f5f9;color:#0f172a; }
    .a3d-tool-btn--active { background:#eff6ff;color:#2563eb;border-color:#bfdbfe; }

    /* Loading */
    .a3d-loading {
      position:absolute;inset:0;display:flex;flex-direction:column;
      align-items:center;justify-content:center;gap:12px;background:#f0f2f5;
    }
    .a3d-spinner {
      width:36px;height:36px;border:3px solid #e2e8f0;border-top-color:#3b82f6;
      border-radius:50%;animation:a3d-spin .8s linear infinite;
    }
    @keyframes a3d-spin { to{transform:rotate(360deg)} }

    /* Annotation pin on canvas */
    .a3d-pin {
      position:absolute;pointer-events:none;transform:translate(-50%,-100%);
      transition:opacity .15s;
    }
    .a3d-pin-dot {
      width:10px;height:10px;border-radius:50%;background:#ef4444;
      border:2px solid #fff;box-shadow:0 1px 4px rgba(0,0,0,0.3);margin:0 auto;
    }
    .a3d-pin-label {
      margin-top:4px;padding:3px 8px;background:rgba(15,23,42,0.85);color:#fff;
      border-radius:5px;font-size:10px;font-family:Inter,sans-serif;font-weight:600;
      white-space:nowrap;text-align:center;
    }

    /* Sidebar */
    .a3d-sidebar {
      width:280px;border-left:1px solid #e5e7eb;background:#fafbfc;
      display:flex;flex-direction:column;flex-shrink:0;overflow:hidden;
    }
    .a3d-sidebar-title {
      padding:14px 16px;font-size:11px;font-weight:700;text-transform:uppercase;
      color:#94a3b8;letter-spacing:0.5px;border-bottom:1px solid #e5e7eb;
    }
    .a3d-annotations {
      flex:1;overflow-y:auto;padding:8px;
    }
    .a3d-ann-item {
      padding:10px 12px;border-radius:8px;background:#fff;border:1px solid #e5e7eb;
      margin-bottom:6px;font-size:12px;font-family:Inter,sans-serif;position:relative;
    }
    .a3d-ann-item:hover { border-color:#bfdbfe; }
    .a3d-ann-num {
      display:inline-flex;align-items:center;justify-content:center;
      width:18px;height:18px;border-radius:50%;background:#ef4444;color:#fff;
      font-size:9px;font-weight:700;margin-right:6px;vertical-align:middle;
    }
    .a3d-ann-text { color:#0f172a;font-weight:500; }
    .a3d-ann-delete {
      position:absolute;top:8px;right:8px;background:none;border:none;
      color:#94a3b8;cursor:pointer;font-size:14px;line-height:1;
    }
    .a3d-ann-delete:hover { color:#ef4444; }
    .a3d-ann-empty {
      padding:20px;text-align:center;color:#94a3b8;font-size:11px;
      font-family:Inter,sans-serif;
    }

    /* Hint overlay */
    .a3d-hint {
      position:absolute;top:16px;left:16px;padding:6px 12px;
      background:rgba(255,255,255,0.9);border-radius:8px;border:1px solid #e2e8f0;
      font-size:11px;color:#64748b;font-family:Inter,sans-serif;
      pointer-events:none;transition:opacity .3s;
    }
  `;
  document.head.appendChild(style);
}

// ── Public API ─────────────────────────────────────
/**
 * Open the 3D viewer modal for a given part.
 * @param {Object} part - Part data { name, storage_path, bucket, admin_notes, annotations, ... }
 * @param {Function} onSave - Called with updated part data when annotations change
 */
export async function openAdmin3DViewer(part, onSave) {
  injectCSS();
  close3DViewer(); // close any existing

  const supaUrl = import.meta.env.VITE_SUPABASE_URL || 'https://qvxrwbcmyrugjevgvujb.supabase.co';
  const ext = (part.storage_path || '').split('.').pop().toLowerCase();
  const fileName = part.name || part.file_name || 'Part';
  const annotations = [...(part.annotations || [])]; // local copy

  // ── Build DOM ──
  const backdrop = document.createElement('div');
  backdrop.className = 'a3d-backdrop';
  backdrop.innerHTML = `
    <div class="a3d-modal">
      <div class="a3d-header">
        <div>
          <h3>🧊 ${fileName} <span class="a3d-header-sub">${ext.toUpperCase()} · 3D Viewer</span></h3>
        </div>
        <button class="a3d-close" id="a3d-close-btn" title="Close">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
        </button>
      </div>
      <div class="a3d-body">
        <div class="a3d-canvas-wrap" id="a3d-canvas-wrap">
          <div class="a3d-loading">
            <div class="a3d-spinner"></div>
            <div style="font-size:12px;color:#64748b;font-family:Inter,sans-serif;">Loading 3D model…</div>
          </div>
          <div class="a3d-hint" id="a3d-hint">🖱 Drag to rotate · Scroll to zoom</div>
          <div class="a3d-toolbar" style="display:none;" id="a3d-toolbar">
            <button class="a3d-tool-btn" id="a3d-btn-orbit" title="Orbit mode">🖱 Orbit</button>
            <button class="a3d-tool-btn" id="a3d-btn-annotate" title="Click surface to annotate">📌 Annotate</button>
            <button class="a3d-tool-btn" id="a3d-btn-reset" title="Reset camera">⟲ Reset View</button>
          </div>
        </div>
        <div class="a3d-sidebar">
          <div class="a3d-sidebar-title">Annotations (${annotations.length})</div>
          <div class="a3d-annotations" id="a3d-annotations-list">
            <div class="a3d-ann-empty">Click 📌 Annotate then click on the model to add notes.</div>
          </div>
        </div>
      </div>
    </div>`;
  document.body.appendChild(backdrop);
  _modal = backdrop;

  // ── Close handlers ──
  const closeBtn = backdrop.querySelector('#a3d-close-btn');
  closeBtn.addEventListener('click', () => close3DViewer());
  backdrop.addEventListener('click', (e) => { if (e.target === backdrop) close3DViewer(); });
  const escHandler = (e) => { if (e.key === 'Escape') close3DViewer(); };
  document.addEventListener('keydown', escHandler);

  // ── State ──
  let annotateMode = false;
  const canvasWrap = backdrop.querySelector('#a3d-canvas-wrap');
  const toolbar = backdrop.querySelector('#a3d-toolbar');
  const hint = backdrop.querySelector('#a3d-hint');
  const orbitBtn = backdrop.querySelector('#a3d-btn-orbit');
  const annotateBtn = backdrop.querySelector('#a3d-btn-annotate');
  const resetBtn = backdrop.querySelector('#a3d-btn-reset');
  const listEl = backdrop.querySelector('#a3d-annotations-list');

  // ── Load Three.js ──
  try {
    const THREE = await import('three');
    const { OrbitControls } = await import('three/addons/controls/OrbitControls.js');

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0xf0f2f5); // Light bg

    const w = canvasWrap.clientWidth;
    const h = canvasWrap.clientHeight;
    const camera = new THREE.PerspectiveCamera(45, w / h, 0.1, 100000);
    camera.position.set(5, 3, 5);

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(w, h);
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.4;

    // Remove loading, insert canvas
    canvasWrap.querySelector('.a3d-loading').remove();
    canvasWrap.insertBefore(renderer.domElement, canvasWrap.firstChild);
    toolbar.style.display = 'flex';

    // Controls
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.08;

    // ── Studio lighting (light background) ──
    scene.add(new THREE.AmbientLight(0xffffff, 0.6));
    const key = new THREE.DirectionalLight(0xffffff, 1.2);
    key.position.set(5, 10, 7);
    scene.add(key);
    const fill = new THREE.DirectionalLight(0xd4e5ff, 0.4);
    fill.position.set(-5, 3, -5);
    scene.add(fill);
    const rim = new THREE.DirectionalLight(0xffffff, 0.25);
    rim.position.set(0, -5, 5);
    scene.add(rim);

    // Ground grid
    const grid = new THREE.GridHelper(50, 50, 0xd4d4d8, 0xe5e7eb);
    grid.position.y = -0.01;
    scene.add(grid);

    // Ground plane (subtle shadow catcher)
    const groundGeo = new THREE.PlaneGeometry(200, 200);
    const groundMat = new THREE.ShadowMaterial({ opacity: 0.05 });
    const ground = new THREE.Mesh(groundGeo, groundMat);
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = -0.02;
    scene.add(ground);

    // ── Load model ──
    const meshGroup = new THREE.Group();
    scene.add(meshGroup);

    const bucket = part.bucket || 'rfq-uploads';
    const { supabase } = await import('../utils/supabaseClient.js');
    const { data: fileData, error: dlErr } = await supabase.storage.from(bucket).download(part.storage_path);
    if (dlErr || !fileData) throw new Error(dlErr?.message || 'Download failed');

    const buffer = await fileData.arrayBuffer();
    const material = new THREE.MeshPhysicalMaterial({
      color: 0x7daaca, metalness: 0.15, roughness: 0.45, clearcoat: 0.2,
      side: THREE.DoubleSide,
    });

    if (['step', 'stp'].includes(ext)) {
      const occtMod = await import('occt-import-js');
      const occt = await (occtMod.default || occtMod)({ locateFile: n => `/${n}` });
      const result = occt.ReadStepFile(new Uint8Array(buffer), null);
      for (const m of (result.meshes || [])) {
        const g = new THREE.BufferGeometry();
        g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(m.attributes.position.array), 3));
        if (m.attributes.normal?.array) g.setAttribute('normal', new THREE.BufferAttribute(new Float32Array(m.attributes.normal.array), 3));
        if (m.index) g.setIndex(new THREE.BufferAttribute(new Uint32Array(m.index.array), 1));
        if (!m.attributes.normal?.array) g.computeVertexNormals();
        meshGroup.add(new THREE.Mesh(g, material));
      }
    } else if (ext === 'stl') {
      const { STLLoader } = await import('three/addons/loaders/STLLoader.js');
      const geometry = new STLLoader().parse(buffer);
      geometry.computeVertexNormals();
      meshGroup.add(new THREE.Mesh(geometry, material));
    } else if (ext === 'obj') {
      const { OBJLoader } = await import('three/addons/loaders/OBJLoader.js');
      const text = new TextDecoder().decode(buffer);
      const obj = new OBJLoader().parse(text);
      obj.traverse(c => { if (c.isMesh) c.material = material; });
      meshGroup.add(obj);
    }

    // Frame camera
    const box = new THREE.Box3().setFromObject(meshGroup);
    const center = box.getCenter(new THREE.Vector3());
    const size = box.getSize(new THREE.Vector3());
    const maxDim = Math.max(size.x, size.y, size.z);

    // Position grid under model
    grid.position.y = box.min.y - 0.01;
    ground.position.y = box.min.y - 0.02;

    const dist = maxDim * 1.8;
    const initPos = new THREE.Vector3(
      center.x + dist * 0.7,
      center.y + dist * 0.5,
      center.z + dist * 0.7
    );
    camera.position.copy(initPos);
    controls.target.copy(center);
    controls.minDistance = maxDim * 0.2;
    controls.maxDistance = maxDim * 10;
    controls.update();

    // ── Raycaster for annotations ──
    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();
    const pinElements = [];

    function renderAnnotationsList() {
      const title = backdrop.querySelector('.a3d-sidebar-title');
      if (title) title.textContent = `Annotations (${annotations.length})`;
      if (annotations.length === 0) {
        listEl.innerHTML = '<div class="a3d-ann-empty">Click 📌 Annotate then click on the model to add notes.</div>';
        return;
      }
      listEl.innerHTML = annotations.map((a, i) => `
        <div class="a3d-ann-item" data-ann-idx="${i}">
          <span class="a3d-ann-num">${i + 1}</span>
          <span class="a3d-ann-text">${a.text}</span>
          <button class="a3d-ann-delete" data-del-idx="${i}" title="Delete">&times;</button>
        </div>
      `).join('');

      listEl.querySelectorAll('.a3d-ann-delete').forEach(btn => {
        btn.addEventListener('click', (e) => {
          e.stopPropagation();
          const idx = parseInt(btn.dataset.delIdx);
          annotations.splice(idx, 1);
          // Remove pin
          if (pinElements[idx]) { pinElements[idx].el.remove(); pinElements.splice(idx, 1); }
          renderAnnotationsList();
          updatePinNumbers();
          if (onSave) onSave({ ...part, annotations: [...annotations] });
        });
      });
    }

    function updatePinNumbers() {
      pinElements.forEach((p, i) => {
        p.label.textContent = `${i + 1}. ${annotations[i]?.text || ''}`;
      });
    }

    function addAnnotationPin(worldPos, text, idx) {
      const el = document.createElement('div');
      el.className = 'a3d-pin';
      const dot = document.createElement('div');
      dot.className = 'a3d-pin-dot';
      const label = document.createElement('div');
      label.className = 'a3d-pin-label';
      label.textContent = `${idx + 1}. ${text}`;
      el.appendChild(dot);
      el.appendChild(label);
      canvasWrap.appendChild(el);
      pinElements.push({ el, label, world: worldPos.clone() });
    }

    function updatePinPositions() {
      pinElements.forEach(p => {
        const projected = p.world.clone().project(camera);
        const x = (projected.x * 0.5 + 0.5) * canvasWrap.clientWidth;
        const y = (-projected.y * 0.5 + 0.5) * canvasWrap.clientHeight;
        p.el.style.left = x + 'px';
        p.el.style.top = y + 'px';
        p.el.style.opacity = projected.z < 1 ? '1' : '0';
      });
    }

    // Restore existing annotations
    annotations.forEach((a, i) => {
      if (a.position) addAnnotationPin(new THREE.Vector3(a.position.x, a.position.y, a.position.z), a.text, i);
    });
    renderAnnotationsList();

    // ── Canvas click for annotation ──
    renderer.domElement.addEventListener('click', (e) => {
      if (!annotateMode) return;
      const rect = renderer.domElement.getBoundingClientRect();
      mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
      raycaster.setFromCamera(mouse, camera);

      const meshes = [];
      meshGroup.traverse(c => { if (c.isMesh) meshes.push(c); });
      const hits = raycaster.intersectObjects(meshes, true);
      if (hits.length === 0) return;

      const point = hits[0].point;
      const text = prompt('Annotation note:');
      if (!text || !text.trim()) return;

      const annData = { text: text.trim(), position: { x: point.x, y: point.y, z: point.z } };
      annotations.push(annData);
      addAnnotationPin(point, text.trim(), annotations.length - 1);
      renderAnnotationsList();
      if (onSave) onSave({ ...part, annotations: [...annotations] });
    });

    // ── Toolbar handlers ──
    function setMode(mode) {
      annotateMode = mode === 'annotate';
      orbitBtn.classList.toggle('a3d-tool-btn--active', mode === 'orbit');
      annotateBtn.classList.toggle('a3d-tool-btn--active', mode === 'annotate');
      controls.enabled = !annotateMode;
      renderer.domElement.style.cursor = annotateMode ? 'crosshair' : 'grab';
      hint.textContent = annotateMode ? '📌 Click on the model surface to place an annotation' : '🖱 Drag to rotate · Scroll to zoom';
    }
    setMode('orbit');

    orbitBtn.addEventListener('click', () => setMode('orbit'));
    annotateBtn.addEventListener('click', () => setMode('annotate'));
    resetBtn.addEventListener('click', () => {
      camera.position.copy(initPos);
      controls.target.copy(center);
      controls.update();
    });

    // ── Animation loop ──
    function animate() {
      if (!document.body.contains(canvasWrap)) return;
      _animId = requestAnimationFrame(animate);
      controls.update();
      updatePinPositions();
      renderer.render(scene, camera);
    }
    animate();

    // ── Resize ──
    const ro = new ResizeObserver(() => {
      if (!canvasWrap.clientWidth || !canvasWrap.clientHeight) return;
      camera.aspect = canvasWrap.clientWidth / canvasWrap.clientHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(canvasWrap.clientWidth, canvasWrap.clientHeight);
    });
    ro.observe(canvasWrap);

    _cleanup = () => {
      ro.disconnect();
      renderer.dispose();
      document.removeEventListener('keydown', escHandler);
    };

  } catch (err) {
    console.error('[Admin 3D Viewer] Error:', err);
    const loading = canvasWrap.querySelector('.a3d-loading');
    if (loading) {
      loading.innerHTML = `<div style="color:#ef4444;font-size:13px;font-family:Inter,sans-serif;text-align:center;">
        <div style="font-size:32px;margin-bottom:8px;">⚠️</div>
        Failed to load 3D model<br><span style="font-size:11px;color:#94a3b8;">${err.message}</span>
      </div>`;
    }
  }
}

export function close3DViewer() {
  if (_animId) { cancelAnimationFrame(_animId); _animId = null; }
  if (_cleanup) { _cleanup(); _cleanup = null; }
  if (_modal) { _modal.remove(); _modal = null; }
}

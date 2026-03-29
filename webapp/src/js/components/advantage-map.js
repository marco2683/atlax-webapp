/**
 * ── ADVANTAGE INTERCONNECTION MAP V3 ────────────────────────────
 * Logic for the organic "Constellation" mapping.
 */

document.addEventListener('DOMContentLoaded', () => {
  const container = document.getElementById('matrix-container');
  const canvas = document.getElementById('matrix-canvas');
  const nodes = document.querySelectorAll('.node');
  const overlay = document.getElementById('matrix-overlay');
  const closeBtn = document.getElementById('close-overlay');
  const resetBtn = document.getElementById('reset-map-btn');
  
  // State
  let isExpanded = false;
  let currentIntent = null;

  // Constellation Node Positions (24 Tech Nodes + 8 Intents)
  const POSITIONS = {
    // Stage 1: Intent (Far Left Alignment when expanded)
    'wearable': { top: '50%', left: '5%' },
    'skin':     { top: '50%', left: '5%' },
    'bone':     { top: '50%', left: '5%' },
    'apple':    { top: '50%', left: '5%' },
    'optical':  { top: '50%', left: '5%' },
    'acoustic': { top: '50%', left: '5%' },
    'thermal':  { top: '50%', left: '5%' },
    'woven':    { top: '50%', left: '5%' },
    
    // Stage 2: Material (Broadened ~24-38% spread)
    'tpu-soft':             { top: '15%', left: '26%' },
    'ceramic-pa':           { top: '26%', left: '38%' },
    'abs-mica':             { top: '37%', left: '24%' },
    'optical-pc':           { top: '48%', left: '36%' },
    'liquid-silicone':      { top: '59%', left: '25%' },
    'highly-conductive-pa': { top: '70%', left: '37%' },
    'carbon-infused-pa':    { top: '81%', left: '24%' },
    'high-density-epp':     { top: '92%', left: '38%' },
    
    // Stage 3: Process (Broadened ~48-64% spread)
    'overmold':             { top: '14%', left: '62%' },
    'multi-spray':          { top: '25%', left: '48%' },
    'iml':                  { top: '35%', left: '64%' },
    'diamond-turning':      { top: '46%', left: '50%' },
    'micro-edm':            { top: '57%', left: '62%' },
    'five-axis-cnc':        { top: '68%', left: '48%' },
    'ultrasonic-welding':   { top: '79%', left: '64%' },
    'high-speed-im':        { top: '90%', left: '50%' },
    
    // Stage 4: Output (Broadened ~76-92% spread)
    'production-im':        { top: '16%', left: '78%' },
    'precision-cnc':        { top: '27%', left: '92%' },
    'optical-injection':    { top: '38%', left: '76%' },
    'compression-molding':  { top: '49%', left: '90%' },
    'insert-molding':       { top: '60%', left: '78%' },
    'extrusion':            { top: '71%', left: '92%' },
    'lsr-molding':          { top: '82%', left: '76%' },
    'vacuum-casting':       { top: '93%', left: '90%' }
  };

  const MAPPINGS = {
    'wearable': {
      title: 'Ergonomic Wearable Seal',
      desc: 'Achieving a biological interface requires ultra-low shore hardness elastomers. We engineer the transition from rigid electronic housing to soft ergonomic contact points.',
      compromise: 'Wearable steel tool requires nano-pulse laser texturing to create a non-porous yet organic surface that resistant to skin oils while maintaining "soft-touch" tactile feedback.',
      path: ['wearable', 'tpu-soft', 'overmold', 'production-im'],
      product_img: '/assets/images/sensory/wearable_product.png',
      steel_img: '/assets/images/sensory/wearable_steel.png'
    },
    'skin': {
      title: 'Sensory Surface Tension',
      desc: 'Creating human-centric surface intuition requires a combination of low-shore hardness elastomers and specific mineral fillers to break surface tension.',
      compromise: 'The steel mold must be laser-textured with micro-irregularities to reproduce the random 패턴 of human skin pattern.',
      path: ['skin', 'tpu-soft', 'multi-spray', 'production-im'],
      product_img: '/assets/images/sensory/skin_product.png',
      steel_img: '/assets/images/sensory/skin_steel.png'
    },
    'bone': {
      title: 'Structural Inertia & Density',
      desc: 'Achieving a "bone-like" feel is about mass distribution and acoustic damping. We modify high-performance composites with mica and mineral fillers.',
      compromise: 'For the skeletal ceramic component, the mold is sandblasted to create a specific Ra-value for ceramic layer adhesion.',
      path: ['bone', 'ceramic-pa', 'multi-spray', 'precision-cnc'],
      product_img: '/assets/images/sensory/bone_product.png',
      steel_img: '/assets/images/sensory/bone_steel.png'
    },
    'apple': {
      title: 'Silky Matte Engineering',
      desc: 'The premium "ProMax" feel is a result of ultra-fine micro-bead blasting and subsequent high-depth PVD coatings.',
      compromise: 'Achieving this in steel requires zero-tolerance micro-bead blasting of the tool itself. Any variation in pressure leads to visual "hotspots" in the final plastic part.',
      path: ['apple', 'abs-mica', 'iml', 'production-im'],
      product_img: '/assets/images/sensory/apple_product.png',
      steel_img: '/assets/images/sensory/apple_steel.png'
    },
    'optical': {
      title: 'Glass-like Transparency',
      desc: 'Achieving perfect optical clarity in plastics demands molecular-level flow control to prevent stress-birefringence.',
      compromise: 'The steel mold must undergo SPI A-1 diamond polishing. A single microscopic scratch on the core block ruins the entire optic.',
      path: ['optical', 'optical-pc', 'diamond-turning', 'optical-injection'],
      product_img: '/assets/images/sensory/optical_product.png',
      steel_img: '/assets/images/sensory/optical_steel.png'
    },
    'acoustic': {
      title: 'Acoustic Mass & Dampening',
      desc: 'A premium product must feel solid and sound "dead" when dropped. We engineer high-density foam structures merged with rigid substrates.',
      compromise: 'Ultrasonically welding dissimilar substrates requires mathematically perfect energy directors machined directly into the tool.',
      path: ['acoustic', 'high-density-epp', 'ultrasonic-welding', 'vacuum-casting'],
      product_img: '/assets/images/sensory/acoustic_product.png',
      steel_img: '/assets/images/sensory/acoustic_steel.png'
    },
    'thermal': {
      title: 'Thermal Inertia (Cold-Touch)',
      desc: 'To make plastic feel like cold metal, we saturate polyamides with highly conductive metallic and ceramic particulates.',
      compromise: 'These highly abrasive fillers destroy standard tool steel in days. The mold requires carbide inserts and micro-EDM surfacing.',
      path: ['thermal', 'highly-conductive-pa', 'micro-edm', 'insert-molding'],
      product_img: '/assets/images/sensory/thermal_product.png',
      steel_img: '/assets/images/sensory/thermal_steel.png'
    },
    'woven': {
      title: 'Fabric-like Micro-Texture',
      desc: 'Marrying the aesthetics of woven mesh with the structural integrity of carbon-fiber reinforced plastics.',
      compromise: 'Requires 5-axis CNC micro-milling to engrave precise overlapping textile patterns directly into hardened H13 tool steel.',
      path: ['woven', 'carbon-infused-pa', 'five-axis-cnc', 'compression-molding'],
      product_img: '/assets/images/sensory/woven_product.png',
      steel_img: '/assets/images/sensory/woven_steel.png'
    }
  };

  const TECH_DETAILS = {
    'tpu-soft': { 
        title: 'Soft-Touch TPU', tag: 'Material', img: '/assets/images/sensory/wearable_product.png',
        desc: 'Advanced Thermoplastic Polyurethane engineered with shore hardness ratings ranging from 40A to 90A. This material offers exceptional chemical resistance and high-elongation properties, making it the industry standard for ergonomic seals, dampening interfaces, and flexible structural joints in wearable hardware.' 
    },
    'ceramic-pa': { 
        title: 'Ceramic-filled Polyamide', tag: 'Material', img: '/assets/images/sensory/bone_product.png',
        desc: 'A high-performance PA66 matrix reinforced with sub-micron ceramic micro-spheres. This formulation significantly increases seismic modulus and compressive strength while providing a distinct matte, stone-like tactile quality often utilized in luxury consumer electronics to simulate the inertia of natural bone.' 
    },
    'abs-mica': { 
        title: 'Mica-infused ABS', tag: 'Material', img: '/assets/images/sensory/apple_product.png',
        desc: 'Acrylonitrile Butadiene Styrene blended with high-aspect-ratio mica flakes. The mica reinforcement enhances geometric stability at elevated temperatures and provides a deep, intrinsic metallic luster that eliminates the need for paint while maintaining high impact resistance.' 
    },
    'optical-pc': { 
        title: 'Optical Grade Polycarbonate', tag: 'Material', img: '/assets/images/sensory/optical_product.png',
        desc: 'Ultra-pure polycarbonate resin synthesized for maximum light transmission (92%+) and zero-stress birefringence. This material is processed using specific thermal profiling to ensure absolute clarity for precision lenses and complex light-guiding structural components.' 
    },
    'liquid-silicone': { 
        title: 'LSR (Liquid Silicone)', tag: 'Material', img: '/assets/images/sensory/skin_product.png',
        desc: 'A two-part platinum-cured elastomer optimized for rapid cycle times and complex geometries. LSR provides exceptional biological compatibility, high thermal stability (-60°C to 250°C), and a resilient "skin-touch" texture that remains stable over long-term environmental exposure.' 
    },
    'highly-conductive-pa': { 
        title: 'Thermally Conductive PA', tag: 'Material', img: '/assets/images/sensory/thermal_product.png',
        desc: 'A specialty Polyamide matrix saturated with proprietary metallic and ceramic fillers to achieve thermal conductivity ratings up to 20 W/mK. This material allows designers to use structural plastic housings as passive heat sinks for internal electronic components.' 
    },
    'carbon-infused-pa': { 
        title: 'Carbon Fiber PA', tag: 'Material', img: '/assets/images/sensory/woven_product.png',
        desc: 'Engineering-grade Polyamide reinforced with high-modulus short-strand carbon fibers. This material provides an industry-leading strength-to-weight ratio, allowing for structural wall thicknesses as low as 0.8mm while maintaining the rigidity of cast aluminum.' 
    },
    'high-density-epp': { 
        title: 'High-Density EPS/EPP', tag: 'Material', img: '/assets/images/sensory/acoustic_product.png',
        desc: 'Closed-cell Expanded Polypropylene engineered for precise acoustic isolation and impact energy management. The high-density cellular structure allows for complex 3D molding of internal cavities to tune the acoustic resonance of audio hardware.' 
    },
    
    'overmold': { 
        title: '2K Overmolding', tag: 'Process', img: '/assets/images/sensory/wearable_steel.png',
        desc: 'A high-precision multi-shot injection process where a secondary soft elastomer is chemically bonded onto a rigid substrate in a single tool. This eliminates mechanical fasteners and ensures water-tight seals (IP68) with molecular-level adhesion between dissimilar materials.' 
    },
    'multi-spray': { 
        title: 'Multi-layer PVD', tag: 'Texture', img: '/assets/images/sensory/apple_steel.png',
        desc: 'Physical Vapor Deposition applied in high-vacuum chambers to create multi-layered metallic coatings. By layering different refractory metals, we can achieve specific refractive indices and surface hardness ratings exceeding 2000 HV, creating finishes that are virtually immune to scratching.' 
    },
    'iml': { 
        title: 'In-Mold Labeling', tag: 'Process', img: '/assets/images/sensory/apple_product.png',
        desc: 'Deep-draw graphic films are inserted into the mold cavity prior to injection. The molten resin bonds with the film, encapsulating the high-resolution graphics within the part structure to ensure the interface remains impervious to wear, chemicals, and mechanical abrasion.' 
    },
    'diamond-turning': { 
        title: 'Nano-Diamond Turning', tag: 'Process', img: '/assets/images/sensory/optical_steel.png',
        desc: 'Ultra-precision machining using single-point natural diamond tools on air-bearing spindles. This process achieves sub-nanometer surface finishes (Ra < 5nm), allowing for the Direct-to-Steel machining of optical-grade tool inserts without the need for manual polishing.' 
    },
    'micro-edm': { 
        title: 'Micro-EDM Sparking', tag: 'Texture', img: '/assets/images/sensory/thermal_steel.png',
        desc: 'Electrical Discharge Machining using specialized micro-electrodes to erode hardened H13 tool steel. This process is utilized to create intricate micro-textures and precise geometric patterns that define the tactile and visual signature of high-end technical components.' 
    },
    'five-axis-cnc': { 
        title: '5-Axis CNC Milling', tag: 'Process', img: '/assets/images/sensory/woven_steel.png',
        desc: 'High-speed technical milling utilizing simultaneous 5-axis motion to engrave complex 3D patterns and undercut geometries directly into mold cores. This allows for the manufacturing of wrap-around textures and seamless parting lines on complex organic surfaces.' 
    },
    'ultrasonic-welding': { 
        title: 'Ultrasonic Welding', tag: 'Process', img: '/assets/images/sensory/acoustic_steel.png',
        desc: 'Utilizing high-frequency acoustic vibrations (20kHz - 40kHz) to create localized solid-state molecular welds. This process creates exceptionally strong, clean, and repeatable hermetic seals between technical plastic components without the use of messy adhesives or mechanical fasteners.' 
    },
    'high-speed-im': { 
        title: 'High-Speed IM', tag: 'Process', img: '/assets/images/sensory/skin_steel.png',
        desc: 'Specialized injection molding using high-acceleration hydraulic systems and vacuum-vented tool cavities. This allows for the production of ultra-thin wall components and complex textures that standard molding cycles cannot replicate due to material freeze-off.' 
    },
    
    'production-im': { 
        title: 'Production IM', tag: 'Technology', img: '/assets/images/sensory/wearable_product.png',
        desc: 'Fully-industrialized high-cavitation injection molding scaled for global hardware deployment. We utilize scientific molding principles and real-time cavity pressure monitoring to ensure zero-defect production across millions of units.' 
    },
    'precision-cnc': { 
        title: 'Precision CNC', tag: 'Technology', img: '/assets/images/sensory/bone_steel.png',
        desc: 'Robotic post-processing of molded technical parts to achieve aerospace-grade tolerances (±0.005mm). This hybrid approach combines the speed of injection molding with the precision of secondary machining for sensor mounts and optical alignment features.' 
    },
    'optical-injection': { 
        title: 'Optical Injection', tag: 'Technology', img: '/assets/images/sensory/optical_product.png',
        desc: 'Class-100 cleanroom manufacturing utilizing specialized optical-grade screw geometries and thermal control systems. This ensures the production of complex light-pipes and transparent structural housings with zero particulate contamination.' 
    },
    'compression-molding': { 
        title: 'Compression Molding', tag: 'Technology', img: '/assets/images/sensory/woven_product.png',
        desc: 'High-pressure processing for advanced composites and high-spec elastomers. This method ensures uniform material distribution and minimal internal stress for heavy-duty structural parts and large-format acoustic components.' 
    },
    'insert-molding': { 
        title: 'Insert Molding', tag: 'Technology', img: '/assets/images/sensory/thermal_product.png',
        desc: 'Automated encapsulation of metal sensors, fasteners, and wireless charging coils within technical plastics. This creates a unified hybrid functional part that combines electrical conductivity with mechanical protection in a single step.' 
    },
    'extrusion': { 
        title: 'Profile Extrusion', tag: 'Technology', img: '/assets/images/sensory/skin_product.png',
        desc: 'Continuous manufacturing of technical thermoplastic profiles with complex internal geometries. Our extrusion lines utilize real-time laser gauging to maintain wall-thickness uniformity for high-length structural rails and seals.' 
    },
    'lsr-molding': { 
        title: 'LSR Molding', tag: 'Technology', img: '/assets/images/sensory/bone_product.png',
        desc: 'Advanced cold-runner injection molding of liquid silicone elastomers. This specialized process is used to manufacture ultra-precise ergonomic seals and high-durability buttons that maintain their tactile response over millions of cycles.' 
    },
    'vacuum-casting': { 
        title: 'Vacuum Casting', tag: 'Technology', img: '/assets/images/sensory/acoustic_product.png',
        desc: 'Polyurethane casting under high vacuum utilizing silicone master tools. This bridge-manufacturing technology allows for the production of functional, market-ready hardware in low-volume series (50-200 units) before committing to steel tooling.' 
    }
  };

  const techModal = document.getElementById('tech-modal');
  const closeTechBtn = document.getElementById('close-tech-modal');

  /**
   * Apply positions to nodes
   */
  function initNodes() {
    nodes.forEach(node => {
      const id = node.getAttribute('data-id');
      const pos = POSITIONS[id];
      if (pos) {
        node.style.top = pos.top;
        node.style.left = pos.left;
      }
    });
  }

  /**
   * Draw curved SVG paths only for the current intent
   */
  function drawAllPaths() {
    canvas.innerHTML = '';
    if (!currentIntent) return;

    const rect = canvas.getBoundingClientRect();

    const getPos = (id) => {
      const el = document.querySelector(`[data-id="${id}"]`);
      if (!el) return null;
      const r = el.getBoundingClientRect();
      return {
        x: r.left + r.width / 2 - rect.left,
        y: r.top + r.height / 2 - rect.top
      };
    };

    const pathNodes = MAPPINGS[currentIntent].path;
    for (let i = 0; i < pathNodes.length - 1; i++) {
        const start = getPos(pathNodes[i]);
        const end = getPos(pathNodes[i+1]);
        if (!start || !end) continue;

        const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        const dx = end.x - start.x;
        const cp1x = start.x + dx * 0.4;
        const cp2x = start.x + dx * 0.6;
        
        const d = `M ${start.x} ${start.y} C ${cp1x} ${start.y}, ${cp2x} ${end.y}, ${end.x} ${end.y}`;
        path.setAttribute('d', d);
        path.setAttribute('class', `matrix-path path-${currentIntent}`);
        canvas.appendChild(path);
    }
  }

  function expandMap() {
    if (isExpanded) return;
    isExpanded = true;
    container.classList.add('is-expanded');
    initNodes();
    
    setTimeout(() => {
        drawAllPaths();
    }, 600);
  }

  function highlightPath(id) {
    nodes.forEach(n => n.classList.remove('active'));
    document.querySelectorAll('.matrix-path').forEach(p => p.classList.remove('active'));

    if (!id) return;

    const data = MAPPINGS[id];
    data.path.forEach(nodeId => {
      const node = document.querySelector(`[data-id="${nodeId}"]`);
      if (node) node.classList.add('active');
    });

    document.querySelectorAll(`.path-${id}`).forEach(p => p.classList.add('active'));
  }

  function showOverlay(id) {
    const data = MAPPINGS[id];
    document.getElementById('overlay-img-product').src = data.product_img;
    document.getElementById('overlay-img-steel').src = data.steel_img;
    document.getElementById('overlay-title').innerText = data.title;
    document.getElementById('overlay-desc').innerText = data.desc;
    document.getElementById('overlay-compromise').innerText = data.compromise;
    overlay.classList.remove('hidden');
  }

  function showTechModal(id) {
    const data = TECH_DETAILS[id];
    if (!data) return;
    document.getElementById('tech-modal-tag').innerText = data.tag;
    document.getElementById('tech-modal-title').innerText = data.title;
    document.getElementById('tech-modal-desc').innerText = data.desc;
    const modalImg = document.getElementById('tech-modal-img');
    if (modalImg) modalImg.src = data.img;
    techModal.classList.remove('hidden');
  }

  // Interactivity
  // (Removed container click listener because it caused mis-clicks to expand map without a target)

  nodes.forEach(node => {
    const id = node.getAttribute('data-id');
    const isIntent = node.getAttribute('data-type') === 'intent';

    node.addEventListener('mouseenter', () => {
      if (isExpanded && isIntent && id === currentIntent) highlightPath(id);
    });

    node.addEventListener('mouseleave', () => {
      if (isExpanded && isIntent && overlay.classList.contains('hidden')) highlightPath(null);
    });

    node.addEventListener('click', (e) => {
      if (isIntent) {
        const wasAlreadyExpanded = isExpanded;
        const wasAlreadyCurrent = (id === currentIntent);
        currentIntent = id;
        nodes.forEach(n => n.classList.remove('active-intent'));
        node.classList.add('active-intent');

        if (!wasAlreadyExpanded) {
            expandMap();
            setTimeout(() => { highlightPath(id); }, 600);
        } else {
            drawAllPaths();
            highlightPath(id);
            if (wasAlreadyCurrent) showOverlay(id);
        }
      } else if (isExpanded) {
        showTechModal(id);
      }
      e.stopPropagation();
    });
  });

  closeBtn.addEventListener('click', () => {
    overlay.classList.add('hidden');
    highlightPath(null);
  });

  closeTechBtn.addEventListener('click', () => {
    techModal.classList.add('hidden');
  });

  [overlay, techModal].forEach(m => {
    m.addEventListener('click', (e) => {
      if (e.target === m) m.classList.add('hidden');
    });
  });

  if (resetBtn) {
    resetBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      isExpanded = false;
      currentIntent = null;
      container.classList.remove('is-expanded');
      nodes.forEach(n => n.classList.remove('active-intent'));
      canvas.innerHTML = '';
      highlightPath(null);
      setTimeout(initNodes, 800);
    });
  }

  let resizeTimer;
  window.addEventListener('resize', () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(drawAllPaths, 200);
  });

  initNodes();
  setTimeout(drawAllPaths, 500);

  let driftOffset = 0;
  function drift() {
    driftOffset += 0.01;
    nodes.forEach((node, i) => {
      const noiseX = Math.sin(driftOffset + i) * 5;
      const noiseY = Math.cos(driftOffset * 0.8 + i) * 5;
      node.style.setProperty('--drift-x', `${noiseX}px`);
      node.style.setProperty('--drift-y', `${noiseY}px`);
    });
    requestAnimationFrame(drift);
  }
  drift();
});

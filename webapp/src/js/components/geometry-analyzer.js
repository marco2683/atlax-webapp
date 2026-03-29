/**
 * geometry-analyzer.js  v3
 * ────────────────────────────────────────────────────────
 * Analyzes 3D CAD files (STEP/STP, STL, OBJ) using:
 *   - occt-import-js (WASM) for STEP/STP/IGES/BREP
 *   - Three.js for STL/OBJ
 * Provides volume, surface area, bounding box, mass,
 * and an ISO-view thumbnail rendered offscreen.
 * ────────────────────────────────────────────────────────
 */

import * as THREE from 'three';
import { STLLoader } from 'three/addons/loaders/STLLoader.js';
import { OBJLoader } from 'three/addons/loaders/OBJLoader.js';

// ── OCCT lazy loader ────────────────────────────────────
let occtInstance = null;

async function getOCCT() {
  if (occtInstance) return occtInstance;

  // occt-import-js ships a UMD module. We import it and call the factory.
  const mod = await import('occt-import-js');
  const factory = mod.default || mod;

  // The factory needs to know where the .wasm file is.
  // When served via Vite, public/ files are at the root.
  occtInstance = await factory({
    locateFile: (name) => `/${name}`,
  });

  console.log('[Geometry] OCCT WASM loaded successfully');
  return occtInstance;
}

// ── Public API ──────────────────────────────────────────

/**
 * Analyze a 3D file. Returns geometry metrics and Three.js BufferGeometry.
 * @param {File} file - The uploaded file
 * @returns {Promise<Object>} Analysis results
 */
export async function analyzeFile(file) {
  const ext = file.name.split('.').pop().toLowerCase();

  if (['step', 'stp', 'iges', 'igs'].includes(ext)) {
    return analyzeSTEP(file, ext);
  } else if (ext === 'stl') {
    return analyzeSTL(file);
  } else if (ext === 'obj') {
    return analyzeOBJ(file);
  } else {
    throw new Error(`Unsupported format: .${ext}`);
  }
}

/**
 * Render an ISO-view thumbnail into a container element.
 * Returns a cleanup function.
 */
export function renderThumbnail(geometry, container, size = 120) {
  if (!geometry) return () => {};

  // Offscreen canvas
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setSize(size, size);
  renderer.setPixelRatio(2); // retina
  renderer.setClearColor(0x000000, 0);
  container.innerHTML = '';
  container.appendChild(renderer.domElement);
  renderer.domElement.style.borderRadius = '8px';

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(35, 1, 0.1, 100000);

  // Lights
  scene.add(new THREE.AmbientLight(0xffffff, 0.6));
  const dirLight = new THREE.DirectionalLight(0xffffff, 0.8);
  dirLight.position.set(1, 1, 1);
  scene.add(dirLight);

  // Mesh
  const material = new THREE.MeshPhongMaterial({
    color: 0x6699cc,
    specular: 0x222222,
    shininess: 40,
    flatShading: false,
  });

  let mesh;
  if (geometry.isBufferGeometry) {
    mesh = new THREE.Mesh(geometry, material);
  } else if (geometry.isGroup) {
    mesh = geometry;
  } else {
    mesh = new THREE.Mesh(geometry, material);
  }

  scene.add(mesh);

  // Fit camera to model (ISO view)
  const box = new THREE.Box3().setFromObject(mesh);
  const center = box.getCenter(new THREE.Vector3());
  const bSize = box.getSize(new THREE.Vector3());
  const maxDim = Math.max(bSize.x, bSize.y, bSize.z);
  const fov = camera.fov * (Math.PI / 180);
  let dist = maxDim / (2 * Math.tan(fov / 2));
  dist *= 1.6;

  // ISO angle
  camera.position.set(
    center.x + dist * 0.7,
    center.y + dist * 0.7,
    center.z + dist * 0.7
  );
  camera.lookAt(center);
  camera.updateProjectionMatrix();

  renderer.render(scene, camera);

  return () => {
    renderer.dispose();
    if (geometry.dispose) geometry.dispose();
    container.innerHTML = '';
  };
}

// ═══ STEP/STP/IGES Analysis (via occt-import-js) ═══════

async function analyzeSTEP(file, ext) {
  const occt = await getOCCT();
  const buffer = await file.arrayBuffer();
  const fileBuffer = new Uint8Array(buffer);

  let result;
  if (['step', 'stp'].includes(ext)) {
    result = occt.ReadStepFile(fileBuffer, null);
  } else {
    result = occt.ReadIgesFile(fileBuffer, null);
  }

  if (!result || !result.meshes || result.meshes.length === 0) {
    throw new Error('No geometry found in file');
  }

  // Convert OCCT meshes to Three.js geometries and merge
  const group = new THREE.Group();
  let totalTriangles = 0;

  for (const resultMesh of result.meshes) {
    const geom = new THREE.BufferGeometry();
    geom.setAttribute('position', new THREE.Float32BufferAttribute(resultMesh.attributes.position.array, 3));

    if (resultMesh.attributes.normal) {
      geom.setAttribute('normal', new THREE.Float32BufferAttribute(resultMesh.attributes.normal.array, 3));
    }

    const index = Uint32Array.from(resultMesh.index.array);
    geom.setIndex(new THREE.BufferAttribute(index, 1));

    const color = resultMesh.color
      ? new THREE.Color(resultMesh.color[0], resultMesh.color[1], resultMesh.color[2])
      : new THREE.Color(0x6699cc);

    const mat = new THREE.MeshPhongMaterial({ color, specular: 0x111111, shininess: 30 });

    // Handle brep_faces for per-face coloring
    if (resultMesh.brep_faces && resultMesh.brep_faces.length > 0) {
      const materials = [mat];
      for (const face of resultMesh.brep_faces) {
        const fColor = face.color ? new THREE.Color(face.color[0], face.color[1], face.color[2]) : color;
        materials.push(new THREE.MeshPhongMaterial({ color: fColor, specular: 0x111111, shininess: 30 }));
      }

      const triCount = resultMesh.index.array.length / 3;
      let triIdx = 0;
      let faceIdx = 0;
      while (triIdx < triCount) {
        let first = triIdx, last, matIdx;
        if (faceIdx >= resultMesh.brep_faces.length) {
          last = triCount; matIdx = 0;
        } else if (triIdx < resultMesh.brep_faces[faceIdx].first) {
          last = resultMesh.brep_faces[faceIdx].first; matIdx = 0;
        } else {
          last = resultMesh.brep_faces[faceIdx].last + 1;
          matIdx = faceIdx + 1;
          faceIdx++;
        }
        geom.addGroup(first * 3, (last - first) * 3, matIdx);
        triIdx = last;
      }

      const mesh = new THREE.Mesh(geom, materials);
      mesh.name = resultMesh.name || '';
      group.add(mesh);
    } else {
      const mesh = new THREE.Mesh(geom, mat);
      mesh.name = resultMesh.name || '';
      group.add(mesh);
    }

    totalTriangles += resultMesh.index.array.length / 3;
  }

  // Compute bounds from group
  const box = new THREE.Box3().setFromObject(group);
  const bSize = box.getSize(new THREE.Vector3());

  // Compute volume and surface area from all geometries
  let totalVolume = 0;
  let totalSurface = 0;

  group.traverse((child) => {
    if (child.isMesh && child.geometry) {
      const { volume, area } = computeVolumeAndArea(child.geometry);
      totalVolume += volume;
      totalSurface += area;
    }
  });

  const volumeCm3 = Math.abs(totalVolume) / 1000; // mm³ → cm³
  const surfaceCm2 = totalSurface / 100; // mm² → cm²
  const massGrams = volumeCm3 * 2.7; // aluminum default

  return {
    boundingBox: {
      x: parseFloat(bSize.x.toFixed(1)),
      y: parseFloat(bSize.y.toFixed(1)),
      z: parseFloat(bSize.z.toFixed(1)),
    },
    volume: parseFloat(volumeCm3.toFixed(2)),
    surfaceArea: parseFloat(surfaceCm2.toFixed(2)),
    mass: parseFloat(massGrams.toFixed(1)),
    triangleCount: totalTriangles,
    geometry: group, // Three.js Group for thumbnail
  };
}

// ═══ STL Analysis ═══════════════════════════════════════

async function analyzeSTL(file) {
  const buffer = await file.arrayBuffer();
  const loader = new STLLoader();
  const geometry = loader.parse(buffer);

  geometry.computeBoundingBox();
  geometry.computeVertexNormals();

  const bb = geometry.boundingBox;
  const size = new THREE.Vector3();
  bb.getSize(size);

  const { volume, area } = computeVolumeAndArea(geometry);
  const volumeCm3 = Math.abs(volume) / 1000;
  const surfaceCm2 = area / 100;
  const massGrams = volumeCm3 * 2.7;
  const triCount = geometry.index
    ? geometry.index.count / 3
    : geometry.attributes.position.count / 3;

  return {
    boundingBox: {
      x: parseFloat(size.x.toFixed(1)),
      y: parseFloat(size.y.toFixed(1)),
      z: parseFloat(size.z.toFixed(1)),
    },
    volume: parseFloat(volumeCm3.toFixed(2)),
    surfaceArea: parseFloat(surfaceCm2.toFixed(2)),
    mass: parseFloat(massGrams.toFixed(1)),
    triangleCount: triCount,
    geometry, // Three.js BufferGeometry for thumbnail
  };
}

// ═══ OBJ Analysis ═══════════════════════════════════════

async function analyzeOBJ(file) {
  const text = await file.text();
  const loader = new OBJLoader();
  const obj = loader.parse(text);

  let totalTris = 0;
  let totalVolume = 0;
  let totalArea = 0;

  obj.traverse((child) => {
    if (child.isMesh && child.geometry) {
      child.geometry.computeBoundingBox();
      child.geometry.computeVertexNormals();
      const { volume, area } = computeVolumeAndArea(child.geometry);
      totalVolume += volume;
      totalArea += area;
      totalTris += child.geometry.index
        ? child.geometry.index.count / 3
        : child.geometry.attributes.position.count / 3;
    }
  });

  const box = new THREE.Box3().setFromObject(obj);
  const size = new THREE.Vector3();
  box.getSize(size);

  const volumeCm3 = Math.abs(totalVolume) / 1000;
  const surfaceCm2 = totalArea / 100;
  const massGrams = volumeCm3 * 2.7;

  return {
    boundingBox: {
      x: parseFloat(size.x.toFixed(1)),
      y: parseFloat(size.y.toFixed(1)),
      z: parseFloat(size.z.toFixed(1)),
    },
    volume: parseFloat(volumeCm3.toFixed(2)),
    surfaceArea: parseFloat(surfaceCm2.toFixed(2)),
    mass: parseFloat(massGrams.toFixed(1)),
    triangleCount: totalTris,
    geometry: obj, // Three.js Group for thumbnail
  };
}

// ═══ Volume & Surface Area (signed volume method) ══════

function computeVolumeAndArea(geometry) {
  const pos = geometry.attributes.position;
  const idx = geometry.index;

  let volume = 0;
  let area = 0;
  const a = new THREE.Vector3(), b = new THREE.Vector3(), c = new THREE.Vector3();
  const ab = new THREE.Vector3(), ac = new THREE.Vector3();

  const triCount = idx ? idx.count / 3 : pos.count / 3;

  for (let i = 0; i < triCount; i++) {
    const i0 = idx ? idx.getX(i * 3) : i * 3;
    const i1 = idx ? idx.getX(i * 3 + 1) : i * 3 + 1;
    const i2 = idx ? idx.getX(i * 3 + 2) : i * 3 + 2;

    a.fromBufferAttribute(pos, i0);
    b.fromBufferAttribute(pos, i1);
    c.fromBufferAttribute(pos, i2);

    // Signed volume of tetrahedron (origin, a, b, c)
    volume += a.dot(b.clone().cross(c)) / 6.0;

    // Triangle area
    ab.subVectors(b, a);
    ac.subVectors(c, a);
    area += ab.cross(ac).length() / 2.0;
  }

  return { volume, area };
}

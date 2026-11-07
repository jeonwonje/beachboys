// Everything on the beach that isn't sand or debris: the treeline and headlands
// that close the play area, things to steer around, and the clear-out skips.
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { BOUNDS, height } from './terrain.js';

export const STATIONS = [
  { x: -24, z: -10 },
  { x: 2, z: -12 },
  { x: 26, z: -9 },
].map((s) => ({ ...s, r: 2.1 }));

function rng(seed) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

const paint = (g, color) => {
  const c = new THREE.Color(color);
  const a = new Float32Array(g.getAttribute('position').count * 3);
  for (let i = 0; i < a.length; i += 3) a.set([c.r, c.g, c.b], i);
  g.setAttribute('color', new THREE.BufferAttribute(a, 3));
  return g;
};

// Merging needs one shape of geometry: no index, position, normal and colour only.
const clean = (g) => {
  const n = g.index ? g.toNonIndexed() : g;
  n.deleteAttribute('uv');
  n.computeVertexNormals();
  return n;
};

function palmGeometry() {
  const trunk = new THREE.CylinderGeometry(0.09, 0.17, 5.4, 7, 7).translate(0, 2.7, 0);
  const t = trunk.getAttribute('position');
  for (let i = 0; i < t.count; i++) {
    const y = t.getY(i);
    t.setX(i, t.getX(i) + (y / 5.4) ** 2 * 0.9);
  }
  const parts = [paint(clean(trunk), '#7b6348')];
  const R = rng(9);
  for (let f = 0; f < 9; f++) {
    const a = (f / 9) * Math.PI * 2 + R() * 0.3;
    const len = 2 + R() * 0.5;
    const blade = new THREE.PlaneGeometry(len, 0.56, 6, 2).translate(len / 2, 0, 0);
    const b = blade.getAttribute('position');
    for (let i = 0; i < b.count; i++) {
      const u = b.getX(i) / len;
      const v = b.getY(i);
      // Taper the blade, fold it along the rib and let it droop.
      const w = v * Math.sin(Math.min(1, u * 1.2 + 0.08) * Math.PI);
      b.setXYZ(i, b.getX(i), 0.28 * u - 1.35 * u * u - Math.abs(w) * 0.55, w);
    }
    blade.rotateY(a).translate(0.9, 5.4, 0);
    parts.push(paint(clean(blade), f % 2 ? '#3d7c34' : '#2f6a2c'));
  }
  return mergeGeometries(parts);
}

function rockGeometry(seed) {
  const g = new THREE.IcosahedronGeometry(1, 1);
  const p = g.getAttribute('position');
  const R = rng(seed);
  const moved = new Map();
  for (let i = 0; i < p.count; i++) {
    const key = `${p.getX(i).toFixed(3)},${p.getY(i).toFixed(3)},${p.getZ(i).toFixed(3)}`;
    if (!moved.has(key)) moved.set(key, 0.74 + R() * 0.46);
    const m = moved.get(key);
    p.setXYZ(i, p.getX(i) * m, p.getY(i) * m * 0.72, p.getZ(i) * m);
  }
  g.computeVertexNormals();
  return g;
}

function umbrellaGeometry(color) {
  const pole = paint(clean(new THREE.CylinderGeometry(0.025, 0.025, 2.2, 6).translate(0, 1.1, 0)), '#e8e4d8');
  const parts = [pole];
  for (let i = 0; i < 8; i++) {
    const seg = new THREE.ConeGeometry(1.25, 0.5, 8, 1, true, (i / 8) * Math.PI * 2, (Math.PI * 2) / 8).translate(0, 2.2, 0);
    parts.push(paint(clean(seg), i % 2 ? color : '#f5efe0'));
  }
  return mergeGeometries(parts);
}

export function createProps(scene, level) {
  const R = rng(4242);
  const colliders = [];
  const standard = (opts) => new THREE.MeshStandardMaterial({ roughness: 0.85, metalness: 0, ...opts });
  const dummy = new THREE.Object3D();
  const free = (x, z, room) => colliders.every((c) => Math.hypot(c.x - x, c.z - z) > c.r + room) && STATIONS.every((s) => Math.hypot(s.x - x, s.z - z) > s.r + room + 1.5);

  // Palms: a dense line inland, and a few out on the sand to steer around.
  const palms = [];
  for (let i = 0; i < 86; i++) palms.push({ x: -74 + R() * 148, z: BOUNDS.minZ - 3.5 - R() * 22, block: false });
  for (let i = 0; i < 40; i++) {
    const x = BOUNDS.minX + 2 + R() * (BOUNDS.maxX - BOUNDS.minX - 4);
    const z = BOUNDS.minZ + 1 + R() * 18;
    if (palms.filter((p) => p.block).length < 13 && free(x, z, 4)) {
      palms.push({ x, z, block: true });
      colliders.push({ x, z, r: 0.28 });
    }
  }
  const palmMesh = new THREE.InstancedMesh(palmGeometry(), standard({ vertexColors: true, side: THREE.DoubleSide }), palms.length);
  palmMesh.frustumCulled = false;
  palms.forEach((p, i) => {
    dummy.position.set(p.x, height(p.x, p.z, level) - 0.08, p.z);
    dummy.rotation.set(0, R() * Math.PI * 2, 0);
    dummy.scale.setScalar(p.block ? 0.85 + R() * 0.35 : 1 + R() * 0.8);
    dummy.updateMatrix();
    palmMesh.setMatrixAt(i, dummy.matrix);
  });
  scene.add(palmMesh);

  // Bushes close the gaps under the treeline.
  const bushes = new THREE.InstancedMesh(rockGeometry(3), standard({ color: '#3b6f2e', flatShading: true }), 150);
  bushes.frustumCulled = false;
  const tint = new THREE.Color();
  for (let i = 0; i < 150; i++) {
    const x = -78 + R() * 156;
    const z = BOUNDS.minZ - 3 - R() * 16;
    dummy.position.set(x, height(x, z, level) + 0.3, z);
    dummy.rotation.set(0, R() * 6, 0);
    dummy.scale.set(1.4 + R() * 2.6, 1 + R() * 2, 1.4 + R() * 2.6);
    dummy.updateMatrix();
    bushes.setMatrixAt(i, dummy.matrix);
    bushes.setColorAt(i, tint.setHSL(0.27 + R() * 0.07, 0.42, 0.24 + R() * 0.12));
  }
  scene.add(bushes);

  // Rock: headlands at both ends, and boulders on the sand.
  const headland = [];
  for (let i = 0; i < 70; i++) {
    const side = i % 2 ? 1 : -1;
    const z = -30 + (i / 70) * 62;
    const size = 2.2 + R() * 3.4;
    headland.push({ x: side * (BOUNDS.maxX + 2.8 + R() * 8 + size * 0.4), z, size, solid: false });
  }
  for (let i = 0; i < 40; i++) {
    const x = BOUNDS.minX + 3 + R() * (BOUNDS.maxX - BOUNDS.minX - 6);
    const z = -20 + R() * 25;
    const size = 0.55 + R() * 0.75;
    if (headland.filter((r) => r.solid).length < 11 && free(x, z, 5)) {
      headland.push({ x, z, size, solid: true });
      colliders.push({ x, z, r: size * 0.85 });
    }
  }
  const rockMesh = new THREE.InstancedMesh(rockGeometry(17), standard({ color: '#77736a', flatShading: true, roughness: 0.95 }), headland.length);
  rockMesh.frustumCulled = false;
  headland.forEach((r, i) => {
    dummy.position.set(r.x, height(r.x, r.z, level) + r.size * 0.12, r.z);
    dummy.rotation.set(R() * 0.4, R() * 6, R() * 0.4);
    dummy.scale.setScalar(r.size);
    dummy.updateMatrix();
    rockMesh.setMatrixAt(i, dummy.matrix);
    rockMesh.setColorAt(i, tint.setHSL(0.09, 0.08, 0.36 + R() * 0.24));
  });
  rockMesh.castShadow = true;
  scene.add(rockMesh);

  // Driftwood logs: a solid row of circles along each one.
  const logs = [];
  for (let i = 0; i < 30 && logs.length < 7; i++) {
    const x = BOUNDS.minX + 4 + R() * (BOUNDS.maxX - BOUNDS.minX - 8);
    const z = -7 + R() * 9;
    if (free(x, z, 4)) logs.push({ x, z, a: R() * Math.PI, len: 2 + R() * 1.6 });
    if (logs.length) {
      const l = logs[logs.length - 1];
      if (l.x === x) for (let t = -0.5; t <= 0.5; t += 0.25) colliders.push({ x: l.x + Math.cos(l.a) * l.len * t, z: l.z - Math.sin(l.a) * l.len * t, r: 0.16 });
    }
  }
  const logMesh = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.1, 0.15, 1, 7, 1).rotateZ(Math.PI / 2), standard({ color: '#8c7963' }), logs.length);
  logMesh.castShadow = true;
  logMesh.frustumCulled = false;
  logs.forEach((l, i) => {
    dummy.position.set(l.x, height(l.x, l.z, level) + 0.07, l.z);
    dummy.rotation.set(0, l.a, 0);
    dummy.scale.set(l.len, 1, 1);
    dummy.updateMatrix();
    logMesh.setMatrixAt(i, dummy.matrix);
  });
  scene.add(logMesh);

  // Beach umbrellas: you can drive past the canopy, but not through the pole.
  [
    ['#d8590f', -32, -15],
    ['#2a50c7', -9, -19],
    ['#0f7f70', 14, -17],
    ['#f4c404', 34, -14],
    ['#b4322a', -15, -3],
  ].forEach(([c, x, z]) => {
    const m = new THREE.Mesh(umbrellaGeometry(c), standard({ vertexColors: true, side: THREE.DoubleSide, roughness: 0.7 }));
    m.position.set(x, height(x, z, level) - 0.02, z);
    m.rotation.z = 0.08;
    m.castShadow = true;
    scene.add(m);
    colliders.push({ x, z, r: 0.08 });
  });

  // Far hills behind the trees.
  const hills = new THREE.MeshBasicMaterial({ color: '#7f97a5', fog: false });
  [
    [-210, 300, 34],
    [40, 380, 52],
    [290, 300, 30],
  ].forEach(([x, w, h], n) => {
    const s = new THREE.Shape();
    s.moveTo(-w / 2, 0);
    for (let i = 1; i < 22; i++) {
      const t = i / 22;
      s.lineTo(-w / 2 + w * t, h * Math.sin(t * Math.PI) ** 0.7 * (0.8 + 0.2 * Math.sin(t * 17 + n * 3)));
    }
    s.lineTo(w / 2, 0);
    const m = new THREE.Mesh(new THREE.ShapeGeometry(s), hills);
    m.position.set(x, 0, -300);
    scene.add(m);
  });

  // Clear-out skips.
  const stationMats = {
    box: standard({ color: '#2a50c7', metalness: 0.3, roughness: 0.55 }),
    rim: standard({ color: '#f4c404', roughness: 0.5 }),
    ring: new THREE.MeshBasicMaterial({ color: '#f4c404', transparent: true, opacity: 0.85, depthWrite: false, toneMapped: false }),
    fill: new THREE.MeshBasicMaterial({ color: '#f4c404', transparent: true, opacity: 0.16, depthWrite: false, toneMapped: false }),
  };
  const rings = STATIONS.map((st) => {
    const y = height(st.x, st.z, level);
    const skip = new THREE.Group();
    skip.position.set(st.x, y, st.z);
    const walls = [
      [1.3, 0.62, 0.06, 0, 0.31, -0.46],
      [1.3, 0.62, 0.06, 0, 0.31, 0.46],
      [0.06, 0.62, 0.92, -0.65, 0.31, 0],
      [0.06, 0.62, 0.92, 0.65, 0.31, 0],
      [1.3, 0.05, 0.92, 0, 0.03, 0],
    ];
    for (const [w, h, d, x, yy, z] of walls) {
      const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), stationMats.box);
      m.position.set(x, yy, z);
      m.castShadow = true;
      skip.add(m);
    }
    const rim = new THREE.Mesh(new THREE.BoxGeometry(1.42, 0.05, 1.04), stationMats.rim);
    rim.position.y = 0.64;
    rim.scale.set(1, 1, 1);
    skip.add(rim);
    const hole = new THREE.Mesh(new THREE.BoxGeometry(1.26, 0.06, 0.86), standard({ color: '#14161a' }));
    hole.position.y = 0.645;
    skip.add(hole);
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 2.8, 6), stationMats.rim);
    pole.position.set(0.7, 1.4, -0.5);
    skip.add(pole);
    const flag = new THREE.Mesh(new THREE.PlaneGeometry(0.7, 0.42).translate(0.35, 0, 0), new THREE.MeshStandardMaterial({ color: '#f4c404', side: THREE.DoubleSide }));
    flag.position.set(0.7, 2.58, -0.5);
    skip.add(flag);
    scene.add(skip);
    colliders.push({ x: st.x, z: st.z, r: 0.62 });
    st.drop = { x: st.x, y: y + 0.66, z: st.z };

    // A ring on the sand, laid over the relief.
    const onSand = (g) => {
      const rp = g.getAttribute('position');
      for (let i = 0; i < rp.count; i++) rp.setY(i, height(st.x + rp.getX(i), st.z + rp.getZ(i), level) + 0.035);
      return g;
    };
    const ring = new THREE.Mesh(onSand(new THREE.RingGeometry(st.r - 0.24, st.r, 72, 1).rotateX(-Math.PI / 2)), stationMats.ring);
    ring.position.set(st.x, 0, st.z);
    const fill = new THREE.Mesh(onSand(new THREE.RingGeometry(0.1, st.r - 0.24, 48, 5).rotateX(-Math.PI / 2)), stationMats.fill);
    fill.position.set(st.x, 0, st.z);
    scene.add(ring, fill);
    return ring;
  });

  return {
    colliders,
    update(time) {
      stationMats.ring.opacity = 0.72 + 0.26 * Math.sin(time * 3);
      void rings;
    },
  };
}

// Debris on the beach and debris in the machine. The classes follow the test
// set used on the bench: bottles, cans, cups, caps, twigs, rope, wrappers.
import * as THREE from 'three';
import { PATH_Z, SHORE_Z } from './world.js';
import { GROUND_Y } from './rover.js';

const rand = (() => {
  let s = 20261106;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
})();

function shapes() {
  const bottle = new THREE.CylinderGeometry(0.032, 0.036, 0.19, 10).rotateZ(Math.PI / 2);
  const neck = new THREE.CylinderGeometry(0.013, 0.03, 0.05, 8).rotateZ(-Math.PI / 2).translate(0.118, 0, 0);
  return [
    { geo: mergeTwo(bottle, neck), colors: ['#bfe4ea', '#8fd0dc', '#e5f3f2'], y: 0.03, weight: 3, rough: 0.2 },
    { geo: new THREE.CylinderGeometry(0.027, 0.027, 0.1, 12).rotateZ(Math.PI / 2), colors: ['#c8352b', '#3166b0', '#d5d8da'], y: 0.026, weight: 2, metal: 0.8 },
    { geo: new THREE.CylinderGeometry(0.04, 0.03, 0.09, 12, 1, true).rotateZ(1.32), colors: ['#f1efe7', '#dcdbd2'], y: 0.03, weight: 2 },
    { geo: new THREE.CylinderGeometry(0.016, 0.016, 0.012, 10), colors: ['#2d70c9', '#e24a3c', '#f4f0e4'], y: 0.006, weight: 3 },
    { geo: twig(0.34), colors: ['#6c4b2d', '#7f5b37', '#5a3e25'], y: 0.012, weight: 5 },
    { geo: twig(0.62), colors: ['#5d4128', '#4a3421'], y: 0.02, weight: 2 },
    { geo: rope(), colors: ['#2fa18e', '#d96b24', '#e0c95b'], y: 0.012, weight: 2 },
    { geo: new THREE.PlaneGeometry(0.15, 0.09, 3, 2).rotateX(-Math.PI / 2), colors: ['#d8392f', '#f0b429', '#e8e8e4', '#3a7bd5'], y: 0.008, weight: 4, double: true },
    { geo: new THREE.BoxGeometry(0.14, 0.012, 0.1), colors: ['#b48a5c', '#a57c4f'], y: 0.008, weight: 2 },
  ];
}

function mergeTwo(a, b) {
  const g = new THREE.BufferGeometry();
  const pa = a.toNonIndexed().getAttribute('position');
  const pb = b.toNonIndexed().getAttribute('position');
  const arr = new Float32Array(pa.count * 3 + pb.count * 3);
  arr.set(pa.array, 0);
  arr.set(pb.array, pa.count * 3);
  g.setAttribute('position', new THREE.BufferAttribute(arr, 3));
  g.computeVertexNormals();
  return g;
}

function twig(len) {
  const pts = [];
  for (let i = 0; i <= 4; i++) {
    const t = i / 4 - 0.5;
    pts.push(new THREE.Vector3(t * len, Math.sin(i * 1.9) * 0.008, Math.sin(i * 2.7) * 0.022));
  }
  return new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 10, 0.009, 5);
}

function rope() {
  const pts = [];
  for (let i = 0; i <= 12; i++) {
    const a = i * 0.9;
    pts.push(new THREE.Vector3(Math.cos(a) * (0.05 + i * 0.008), 0.002, Math.sin(a) * (0.04 + i * 0.006)));
  }
  return new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 40, 0.006, 5);
}

export function createDebris(scene, { startX = 0.9, endX = 44, count = 300 } = {}) {
  const kinds = shapes();
  const weights = kinds.flatMap((k, i) => Array(k.weight).fill(i));
  const items = kinds.map(() => []);

  for (let i = 0; i < count; i++) {
    const k = weights[Math.floor(rand() * weights.length)];
    // Debris collects in a tide-shaped band, densest near the water.
    const onPath = i % 4 === 0;
    const z = onPath ? PATH_Z + (rand() - 0.5) * 0.36 : 2.1 + Math.pow(rand(), 0.7) * (SHORE_Z - 2.6);
    items[k].push({
      x: startX + rand() * (endX - startX),
      z,
      rot: rand() * Math.PI * 2,
      tilt: (rand() - 0.5) * 0.25,
      s: 0.82 + rand() * 0.5,
      arrive: rand(), // when the tide brings this one in, 0 to 1
      c: kinds[k].colors[Math.floor(rand() * kinds[k].colors.length)],
      gone: 0,
    });
  }

  const dummy = new THREE.Object3D();
  const color = new THREE.Color();
  const groups = kinds.map((kind, i) => {
    const mat = new THREE.MeshStandardMaterial({
      roughness: kind.rough ?? 0.7,
      metalness: kind.metal ?? 0,
      side: kind.double ? THREE.DoubleSide : THREE.FrontSide,
    });
    const im = new THREE.InstancedMesh(kind.geo, mat, items[i].length);
    im.castShadow = true;
    im.frustumCulled = false;
    items[i].forEach((it, j) => im.setColorAt(j, color.set(it.c)));
    if (im.instanceColor) im.instanceColor.needsUpdate = true;
    scene.add(im);
    return { im, kind, list: items[i] };
  });

  return {
    update(dt, { tide, roverX }) {
      for (const g of groups) {
        g.list.forEach((it, j) => {
          // Taken by the machine once the intake reaches it.
          const intakeX = roverX + 1.14;
          if (Math.abs(it.z - PATH_Z) < 0.2 && it.x < intakeX) it.gone = Math.min(1, it.gone + dt * 5);
          else if (it.x > intakeX + 0.3) it.gone = 0;
          const a = THREE.MathUtils.smoothstep(tide, it.arrive * 0.8, it.arrive * 0.8 + 0.2);
          const s = a * (1 - it.gone) * it.s;
          const wash = (1 - a) * 2.2;
          dummy.position.set(it.x, g.kind.y, it.z + wash);
          dummy.rotation.set(it.tilt, it.rot, it.tilt * 0.6);
          dummy.scale.setScalar(Math.max(s, 0.0001));
          dummy.updateMatrix();
          g.im.setMatrixAt(j, dummy.matrix);
        });
        g.im.instanceMatrix.needsUpdate = true;
      }
    },
  };
}

// What the machine is doing inside: items riding up the belt, tumbling in the
// half-drum and landing in the bin, with sand falling out at each stage.
export function createFlow(lift) {
  const path = new THREE.CatmullRomCurve3(
    [
      [0.93, GROUND_Y + 0.03, 0],
      [0.82, -0.08, 0],
      [0.55, 0.28, 0],
      [0.31, 0.57, 0],
      [0.2, 0.6, 0],
      [0.09, 0.42, 0.03],
      [-0.03, 0.34, -0.04],
      [-0.17, 0.33, 0.03],
      [-0.3, 0.37, -0.02],
      [-0.42, 0.25, 0.01],
      [-0.47, 0.03, 0],
    ].map((p) => new THREE.Vector3(...p)),
    false,
    'catmullrom',
    0.5,
  );

  const palette = ['#c8352b', '#bfe4ea', '#f0b429', '#6c4b2d', '#2fa18e', '#e8e8e4', '#3166b0', '#d96b24'];
  const N = 16;
  const geo = new THREE.BoxGeometry(0.06, 0.018, 0.038);
  const mat = new THREE.MeshStandardMaterial({ roughness: 0.55 });
  const carried = new THREE.InstancedMesh(geo, mat, N);
  carried.frustumCulled = false;
  carried.castShadow = true;
  const color = new THREE.Color();
  for (let i = 0; i < N; i++) carried.setColorAt(i, color.set(palette[i % palette.length]));
  lift.add(carried);

  // Pile growing in the bin.
  const PILE = 46;
  const pile = new THREE.InstancedMesh(new THREE.BoxGeometry(0.052, 0.02, 0.036), mat, PILE);
  pile.frustumCulled = false;
  const pileAt = [];
  for (let i = 0; i < PILE; i++) {
    pile.setColorAt(i, color.set(palette[i % palette.length]));
    const row = i / PILE;
    pileAt.push({
      x: -0.462 + (rand() - 0.5) * 0.17,
      y: -0.075 + row * 0.2,
      z: (rand() - 0.5) * 0.26,
      r: [rand() * 3, rand() * 3, rand() * 3],
    });
  }
  lift.add(pile);

  // Sand: three sources falling under gravity, looped.
  const S = 900;
  const pos = new Float32Array(S * 3);
  const seeds = [];
  for (let i = 0; i < S; i++) {
    const src = i % 3;
    let x;
    let y;
    let floor;
    if (src === 0) {
      // Through the belt mesh on the climb.
      const t = rand();
      x = 0.82 - t * 0.5;
      y = -0.07 + t * 0.55;
      floor = GROUND_Y;
    } else {
      // Through the half-drum screen, down onto the tray.
      x = -0.3 + rand() * 0.4;
      y = 0.27 + rand() * 0.05;
      floor = 0.21;
    }
    seeds.push({ x, y, z: (rand() - 0.5) * 0.3, floor, v: 0.5 + rand() * 0.8, ph: rand() });
  }
  const sandGeo = new THREE.BufferGeometry();
  sandGeo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  const sandMat = new THREE.PointsMaterial({ color: '#b89a6c', size: 0.011, transparent: true, opacity: 0, depthWrite: false });
  const sand = new THREE.Points(sandGeo, sandMat);
  sand.frustumCulled = false;
  lift.add(sand);

  const dummy = new THREE.Object3D();
  const p = new THREE.Vector3();
  let t = 0;
  return {
    update(dt, { flow, fill }) {
      t += dt * flow;
      const visible = flow > 0.02;
      carried.visible = visible;
      sand.visible = visible;
      if (visible) {
        for (let i = 0; i < N; i++) {
          const u = (t * 0.085 + i / N) % 1;
          path.getPoint(u, p);
          const wob = Math.sin(t * 2.1 + i) * 0.1;
          dummy.position.copy(p);
          dummy.position.z += ((i % 5) - 2) * 0.05 * (1 - Math.abs(u - 0.5));
          dummy.rotation.set(i + t * (u > 0.5 ? 2.4 : 0) + wob, i * 2.1, u < 0.42 ? -0.87 : i + t * 2);
          const scale = u < 0.015 ? u / 0.015 : u > 0.98 ? (1 - u) / 0.02 : 1;
          dummy.scale.setScalar(Math.max(scale * Math.min(flow * 1.2, 1), 0.0001));
          dummy.updateMatrix();
          carried.setMatrixAt(i, dummy.matrix);
        }
        carried.instanceMatrix.needsUpdate = true;

        for (let i = 0; i < S; i++) {
          const q = seeds[i];
          const life = (t * q.v * 0.75 + q.ph) % 1;
          const fall = (q.y - q.floor) * life * life;
          pos[i * 3] = q.x + Math.sin(q.ph * 30) * 0.008;
          pos[i * 3 + 1] = q.y - fall;
          pos[i * 3 + 2] = q.z;
        }
        sandGeo.attributes.position.needsUpdate = true;
        sandMat.opacity = Math.min(flow, 1) * 0.95;
      }
      // Pile in the bin.
      const shown = Math.floor(fill * PILE);
      for (let i = 0; i < PILE; i++) {
        const a = pileAt[i];
        dummy.position.set(a.x, a.y, a.z);
        dummy.rotation.set(a.r[0], a.r[1], a.r[2]);
        dummy.scale.setScalar(i < shown ? 1 : 0.0001);
        dummy.updateMatrix();
        pile.setMatrixAt(i, dummy.matrix);
      }
      pile.instanceMatrix.needsUpdate = true;
    },
  };
}

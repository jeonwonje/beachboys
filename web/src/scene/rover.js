// The BeachBoy model from the team's CAD assembly, painted to match the photos
// and given its kinematics: spokes run around the belt loop, sprockets and the
// paddle turn, the half-drum rocks between its limit switches, and wheels roll.
// Part names are <part>__<paint>, made by tools/step-to-parts.py.
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/examples/jsm/libs/meshopt_decoder.module.js';

// The tyres touch the ground here in model space.
export const GROUND_Y = -0.254;

// Belt frame measured from the CAD axles. Matches tools/step-to-parts.py.
const BELT = { dx: 0.6519, dy: -0.7583, uHead: -0.17, uTail: 0.6, nC: 0.49, r: 0.065, rows: 10 };
{
  const l = Math.hypot(BELT.dx, BELT.dy);
  BELT.dx /= l;
  BELT.dy /= l;
}
const BELT_SPEED = 0.34;
const WHEEL_R = 0.186;
const SPROCKET_R = 0.054;

// Parts baked around their own axle, in model space (x, y).
const AXLES = {
  k_wheel_fl: [0.225, -0.068],
  k_wheel_fr: [0.225, -0.068],
  k_wheel_rl: [-0.225, -0.068],
  k_wheel_rr: [-0.225, -0.068],
  c_spr_head: [0.256, 0.447],
  c_spr_mid: [0.483, 0.184],
  c_spr_tail: [0.764, -0.143],
  c_paddle_spin: [0.94, -0.132],
};

// Half-drum rocks about this axis: pivot, tilt and period from the design.
const DRUM_PIVOT = new THREE.Vector3(-0.33, 0.431, 0);
const DRUM_AXIS = new THREE.Vector3(0.102, 0.506, 0).sub(DRUM_PIVOT).normalize();
const DRUM_SWING = THREE.MathUtils.degToRad(23);
const DRUM_PERIOD = 0.943;

// Colours picked off the photos of the real machine.
const PAINT = {
  orange: { color: '#d8590f', metal: 0.1, rough: 0.46 },
  graphite: { color: '#22262b', metal: 0.45, rough: 0.5 },
  black: { color: '#121316', metal: 0.15, rough: 0.6 },
  rubber: { color: '#0d0e0f', metal: 0, rough: 0.92 },
  hub: { color: '#34383d', metal: 0.75, rough: 0.42 },
  alu: { color: '#b4b9be', metal: 0.85, rough: 0.38 },
  steel: { color: '#c3c7cb', metal: 0.85, rough: 0.36 },
  rim: { color: '#d4d7da', metal: 0.9, rough: 0.28 },
  blue: { color: '#2a50c7', metal: 0.05, rough: 0.56 },
  yellow: { color: '#f4c404', metal: 0, rough: 0.56 },
  teal: { color: '#21b09a', metal: 0, rough: 0.5 },
  white: { color: '#e7ebef', metal: 0, rough: 0.5 },
  belt: { color: '#8f9499', metal: 0.7, rough: 0.58 },
  acrylic: { color: '#d8ecf4', metal: 0, rough: 0.08, opacity: 0.26 },
  screen: { color: '#c9ccd0', metal: 0.8, rough: 0.4, grid: 0.018, wire: 0.17 },
  binmesh: { color: '#1b1d20', metal: 0.1, rough: 0.7, grid: 0.022, wire: 0.3 },
  pcb: { color: '#14663f', metal: 0.2, rough: 0.5 },
  brass: { color: '#c19a3d', metal: 0.9, rough: 0.35 },
  battery: { color: '#2f62b8', metal: 0.2, rough: 0.5 },
};
const FALLBACK = { color: '#8d9297', metal: 0.5, rough: 0.5 };

// How far each subsystem moves when the machine is taken apart, in metres.
const SUB_OFFSET = { conveyor: [0.42, 0.06, 0], drum: [0, 0.42, 0], bin: [-0.46, 0, 0], carrier: [0, 0, 0], electronics: [0, 0, 0] };
const PART_OFFSET = {
  c_paddle: [0.11, 0, 0],
  c_paddle_spin: [0.11, 0, 0],
  c_skid: [0, -0.07, 0],
  c_drive: [0, 0, -0.1],
  c_mount: [-0.06, 0.04, 0],
  d_drive: [0, -0.06, -0.24],
  d_wheels: [0, 0.02, 0],
  b_bin: [-0.24, 0, 0],
  b_tray: [-0.24, 0, 0],
  b_frame: [-0.24, 0, 0],
  b_pins: [-0.24, 0.05, 0],
  b_vplate: [0, 0.03, 0],
};

const subOf = (key) => ({ c: 'conveyor', d: 'drum', b: 'bin', k: 'carrier', e: 'electronics' })[key[0]];
// Hidden inside other parts, so drawing their shadows adds nothing.
const NO_SHADOW = /^(c_spr_|e_)/;

function makeMaterial(spec) {
  const m = new THREE.MeshStandardMaterial({
    color: spec.color,
    metalness: spec.metal,
    roughness: spec.rough,
    side: THREE.DoubleSide,
    transparent: spec.opacity !== undefined,
    opacity: spec.opacity ?? 1,
    depthWrite: spec.opacity === undefined || spec.opacity > 0.6,
    emissive: new THREE.Color('#ff7a1a'),
    emissiveIntensity: 0,
  });
  m.userData.baseOpacity = m.opacity;
  m.userData.noShadow = !!spec.grid;
  // CAD models the screens as plain sheets. Cut the wire pattern here instead
  // of carrying thousands of wires in the mesh.
  if (spec.grid) {
    m.onBeforeCompile = (shader) => {
      shader.uniforms.uGrid = { value: spec.grid };
      shader.uniforms.uWire = { value: spec.wire };
      shader.vertexShader = shader.vertexShader
        .replace('#include <common>', '#include <common>\nvarying vec3 vObj;')
        .replace('#include <begin_vertex>', '#include <begin_vertex>\nvObj = position;');
      shader.fragmentShader = shader.fragmentShader
        .replace('#include <common>', '#include <common>\nvarying vec3 vObj; uniform float uGrid; uniform float uWire;')
        .replace(
          '#include <clipping_planes_fragment>',
          `#include <clipping_planes_fragment>
           vec3 gr = abs(fract(vObj/uGrid)-.5)*2.;
           float along = abs(fract(vObj.z/uGrid)-.5)*2.;
           float across = abs(fract(length(vObj.xy)/uGrid)-.5)*2.;
           if(min(along,across) > uWire*1.0 && min(gr.x,gr.y) > uWire) discard;`,
        );
    };
    m.customProgramCacheKey = () => `grid-${spec.grid}-${spec.wire}`;
  }
  return m;
}

// Compression stores each part as integers plus a scale and offset on its node.
// The site moves parts by hand, so put every vertex back in model-space metres.
function bakeIntoModelSpace(mesh) {
  const g = mesh.geometry;
  for (const name of ['position', 'normal']) {
    const a = g.getAttribute(name);
    const out = new Float32Array(a.count * 3);
    for (let i = 0; i < a.count; i++) {
      out[i * 3] = a.getX(i);
      out[i * 3 + 1] = a.getY(i);
      out[i * 3 + 2] = a.getZ(i);
    }
    g.setAttribute(name, new THREE.BufferAttribute(out, 3));
  }
  g.applyMatrix4(mesh.matrixWorld);
  g.computeBoundingSphere();
  g.computeBoundingBox();
}

export async function loadRover(url, onProgress) {
  const loader = new GLTFLoader().setMeshoptDecoder(MeshoptDecoder);
  const gltf = await new Promise((res, rej) =>
    loader.load(url, res, (e) => e.total && onProgress?.(e.loaded / e.total), rej),
  );

  const root = new THREE.Group();
  const lift = new THREE.Group();
  lift.position.y = -GROUND_Y;
  root.add(lift);

  const parts = {};
  const spokeSources = [];

  const partFor = (key) => {
    if (!parts[key]) {
      const group = new THREE.Group();
      parts[key] = { key, sub: subOf(key), group, meshes: [], glow: 0, op: 1 };
      if (AXLES[key]) parts[key].base = new THREE.Vector3(AXLES[key][0], AXLES[key][1], 0);
      lift.add(group);
    }
    return parts[key];
  };

  const meshes = [];
  gltf.scene.updateMatrixWorld(true);
  gltf.scene.traverse((o) => o.isMesh && meshes.push(o));
  for (const o of meshes) {
    bakeIntoModelSpace(o);
    const [key, paint] = o.name.split('__');
    const spec = PAINT[paint] ?? FALLBACK;
    const material = makeMaterial(spec);
    if (key === 'c_spoke') {
      spokeSources.push({ geometry: o.geometry, material });
      continue;
    }
    const mesh = new THREE.Mesh(o.geometry, material);
    const opaque = !spec.opacity;
    mesh.castShadow = opaque && !spec.grid && !NO_SHADOW.test(key);
    mesh.userData.castsShadow = mesh.castShadow;
    mesh.receiveShadow = opaque;
    const part = partFor(key);
    part.group.add(mesh);
    part.meshes.push(mesh);
  }

  // Spoke rows ride as instances on the belt loop.
  const belt = partFor('c_belt');
  const rowMeshes = spokeSources.map((src) => {
    const im = new THREE.InstancedMesh(src.geometry, src.material, BELT.rows);
    im.castShadow = true;
    im.userData.castsShadow = true;
    im.frustumCulled = false;
    belt.group.add(im);
    belt.meshes.push(im);
    return im;
  });

  const S = BELT.uTail - BELT.uHead;
  const arc = Math.PI * BELT.r;
  const loopLen = 2 * S + 2 * arc;
  const M = new THREE.Matrix4();
  const X = new THREE.Vector3();
  const Y = new THREE.Vector3();
  const Z = new THREE.Vector3(0, 0, 1);
  const P = new THREE.Vector3();

  function placeRows(travel) {
    for (let i = 0; i < BELT.rows; i++) {
      const s = (travel + (i * loopLen) / BELT.rows) % loopLen;
      let u;
      let theta;
      if (s < S) {
        u = BELT.uTail - s;
        theta = 0;
      } else if (s < S + arc) {
        u = BELT.uHead;
        theta = (s - S) / BELT.r;
      } else if (s < 2 * S + arc) {
        u = BELT.uHead + (s - S - arc);
        theta = Math.PI;
      } else {
        u = BELT.uTail;
        theta = Math.PI + (s - 2 * S - arc) / BELT.r;
      }
      const c = Math.cos(theta);
      const sn = Math.sin(theta);
      // Local u, n axes in model space, spun about the sprocket.
      const eu = [BELT.dx, BELT.dy];
      const en = [-BELT.dy, BELT.dx];
      X.set(eu[0] * c + en[0] * sn, eu[1] * c + en[1] * sn, 0);
      Y.set(-eu[0] * sn + en[0] * c, -eu[1] * sn + en[1] * c, 0);
      P.set(eu[0] * u + en[0] * BELT.nC, eu[1] * u + en[1] * BELT.nC, 0);
      M.makeBasis(X, Y, Z).setPosition(P);
      for (const im of rowMeshes) im.setMatrixAt(i, M);
    }
    for (const im of rowMeshes) im.instanceMatrix.needsUpdate = true;
  }
  placeRows(0);

  const state = { dist: 0, paddleAngle: 0, drumPhase: 0 };
  const off = new THREE.Vector3();
  const q = new THREE.Quaternion();

  return {
    root,
    parts,
    lift,
    // Compile the see-through variant of every material up front, so the first
    // chapter that ghosts part of the machine doesn't stutter.
    async precompile(renderer, scene, camera) {
      const mats = Object.values(parts).flatMap((p) => p.meshes.map((m) => m.material));
      const was = mats.map((m) => m.transparent);
      mats.forEach((m) => {
        m.transparent = true;
        m.needsUpdate = true;
      });
      await renderer.compileAsync(scene, camera);
      mats.forEach((m, i) => {
        m.transparent = was[i];
        m.needsUpdate = true;
      });
      await renderer.compileAsync(scene, camera);
    },
    // Where a point on the model has moved to once exploded.
    partOffset(key, explode, focus) {
      const part = parts[key];
      if (!part) return new THREE.Vector3();
      const v = new THREE.Vector3().fromArray(SUB_OFFSET[part.sub]).multiplyScalar(explode);
      const po = PART_OFFSET[key];
      if (po) v.add(new THREE.Vector3().fromArray(po).multiplyScalar(focus[part.sub] ?? 0));
      return v;
    },
    update(dt, s) {
      // s: { explode, focus, belt, rock, rockAmp, roll, highlight }
      state.dist += dt * s.belt * BELT_SPEED;
      state.drumPhase += (dt * s.rock * 2 * Math.PI) / DRUM_PERIOD;
      state.paddleAngle += dt * s.belt * 1.8;
      if (s.belt > 0) placeRows(state.dist % loopLen);

      const maxFocus = Math.max(s.focus.conveyor, s.focus.drum, s.focus.bin, s.focus.electronics);
      for (const p of Object.values(parts)) {
        const f = s.focus[p.sub] ?? 0;
        // The electronics sit inside the carrier, so they only draw when shown.
        // When they are shown, the module fades out completely so they can be seen.
        const isModule = p.sub === 'conveyor' || p.sub === 'drum' || p.sub === 'bin';
        p.group.visible = p.sub === 'electronics' ? f > 0.01 : !(isModule && s.focus.electronics > 0.97);
        if (!p.group.visible) continue;

        off.fromArray(SUB_OFFSET[p.sub]).multiplyScalar(s.explode);
        const po = PART_OFFSET[p.key];
        if (po) {
          off.x += po[0] * f;
          off.y += po[1] * f;
          off.z += po[2] * f;
        }
        p.group.position.copy(off);
        p.group.quaternion.identity();

        if (p.base) {
          p.group.position.add(p.base);
          // Driving towards +x turns the wheels clockwise seen from +z. The top
          // of the belt runs towards the head, which turns the sprockets the
          // other way. The paddle ratchets counter-clockwise.
          const angle = p.key.startsWith('k_wheel')
            ? -s.roll / WHEEL_R
            : p.key === 'c_paddle_spin'
              ? state.paddleAngle
              : state.dist / SPROCKET_R;
          p.group.quaternion.setFromAxisAngle(Z, angle);
        }
        if (p.key === 'd_drum') {
          const a = Math.sin(state.drumPhase) * DRUM_SWING * s.rockAmp;
          q.setFromAxisAngle(DRUM_AXIS, a);
          p.group.quaternion.copy(q);
          const pv = DRUM_PIVOT.clone();
          p.group.position.add(pv.clone().sub(pv.applyQuaternion(q)));
        }

        let target = p.sub === 'carrier' ? 1 - 0.8 * maxFocus : 1 - 0.84 * Math.max(0, maxFocus - f);
        if (isModule) target = Math.min(target, 1 - s.focus.electronics);
        p.op += (target - p.op) * Math.min(1, dt * 7);
        if (Math.abs(target - p.op) < 0.002) p.op = target;
        const hl = s.highlight;
        const wantGlow = hl === p.key || hl === p.sub ? 0.5 : 0;
        p.glow += (wantGlow - p.glow) * Math.min(1, dt * 9);
        if (Math.abs(wantGlow - p.glow) < 0.002) p.glow = wantGlow;
        for (const m of p.meshes) {
          const mat = m.material;
          const opacity = mat.userData.baseOpacity * p.op;
          if (mat.opacity === opacity && mat.emissiveIntensity === p.glow) continue;
          const see = opacity < 0.985;
          if (mat.transparent !== see) {
            mat.transparent = see;
            mat.needsUpdate = true;
          }
          mat.opacity = opacity;
          mat.depthWrite = opacity > 0.6;
          mat.emissiveIntensity = p.glow;
          m.castShadow = opacity > 0.6 && !!m.userData.castsShadow;
        }
      }
    },
  };
}
